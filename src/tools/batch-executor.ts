import { LLMToolCall } from '../llm/types';
import { ToolResult } from '../types';

export interface BatchResult {
  results: ToolResult[];
  executionTime: number;
  parallelCount: number;
  sequentialCount: number;
  totalTools: number;
}

export interface BatchMetrics {
  batchId: string;
  startTime: number;
  endTime: number;
  toolCalls: LLMToolCall[];
  results: ToolResult[];
  parallelBatches: number;
  sequentialBatches: number;
}

export interface ToolDependency {
  toolName: string;
  dependsOn: string[];
  canRunInParallel: boolean;
  category: 'read' | 'write' | 'compute' | 'network';
}

export class BatchToolExecutor {
  private static readonly READ_ONLY_TOOLS = [
    'view_file',
    'bash_read_only',
    'list_files',
    'search_files',
    'get_file_info'
  ];

  private static readonly WRITE_TOOLS = [
    'create_file',
    'str_replace_editor',
    'delete_file',
    'move_file',
    'copy_file'
  ];

  private static readonly COMPUTE_TOOLS = [
    'create_todo_list',
    'update_todo_list',
    'condense_conversation'
  ];

  private static readonly NETWORK_TOOLS = [
    'web_search',
    'api_call',
    'fetch_url'
  ];

  private static readonly BASH_TOOLS = [
    'bash',
    'execute_command',
    'run_script'
  ];

  async executeBatch(
    toolCalls: LLMToolCall[],
    executor: (toolCall: LLMToolCall) => Promise<ToolResult>
  ): Promise<BatchResult> {
    const startTime = Date.now();
    const batchId = this.generateBatchId();
    
    // Analyze tool dependencies and create execution batches
    const executionPlan = this.createExecutionPlan(toolCalls);
    const results: ToolResult[] = [];
    let parallelCount = 0;
    let sequentialCount = 0;

    // Execute batches in order (some sequential, some parallel)
    for (const batch of executionPlan) {
      if (batch.length === 1) {
        // Single tool execution (sequential)
        const result = await executor(batch[0]);
        results.push(result);
        sequentialCount++;
      } else {
        // Parallel execution
        const batchResults = await this.executeParallel(batch, executor);
        results.push(...batchResults);
        parallelCount += batch.length;
      }
    }

    const executionTime = Date.now() - startTime;

    return {
      results,
      executionTime,
      parallelCount,
      sequentialCount,
      totalTools: toolCalls.length
    };
  }

  private createExecutionPlan(toolCalls: LLMToolCall[]): LLMToolCall[][] {
    const batches: LLMToolCall[][] = [];
    const pendingTools = [...toolCalls];
    
    while (pendingTools.length > 0) {
      const currentBatch: LLMToolCall[] = [];
      const remainingTools: LLMToolCall[] = [];
      
      // Group tools that can run in parallel
      for (const toolCall of pendingTools) {
        if (this.canAddToBatch(toolCall, currentBatch)) {
          currentBatch.push(toolCall);
        } else {
          remainingTools.push(toolCall);
        }
      }
      
      // If no tools could be added to current batch, take the first one
      if (currentBatch.length === 0 && remainingTools.length > 0) {
        currentBatch.push(remainingTools.shift()!);
      }
      
      batches.push(currentBatch);
      pendingTools.splice(0, pendingTools.length, ...remainingTools);
    }
    
    return batches;
  }

  private canAddToBatch(toolCall: LLMToolCall, currentBatch: LLMToolCall[]): boolean {
    if (currentBatch.length === 0) return true;
    
    const toolCategory = this.getToolCategory(toolCall.function.name);
    const batchCategories = currentBatch.map(tc => this.getToolCategory(tc.function.name));
    
    // Rules for parallel execution:
    // 1. Read-only tools can run in parallel with each other
    // 2. Compute tools can run in parallel with read-only tools
    // 3. Network tools can run in parallel with read-only and compute tools
    // 4. Write tools must run sequentially (one at a time)
    // 5. Bash tools must run sequentially (can affect file system state)
    
    switch (toolCategory) {
      case 'read':
        // Read tools can run with other read, compute, or network tools
        return !batchCategories.includes('write') && !batchCategories.includes('bash');
        
      case 'compute':
        // Compute tools can run with read and other compute tools
        return !batchCategories.includes('write') && !batchCategories.includes('bash') && !batchCategories.includes('network');
        
      case 'network':
        // Network tools can run with read tools only
        return batchCategories.every(cat => cat === 'read');
        
      case 'write':
        // Write tools must run alone
        return false;
        
      case 'bash':
        // Bash tools must run alone
        return false;
        
      default:
        // Unknown tools run sequentially for safety
        return false;
    }
  }

  private getToolCategory(toolName: string): 'read' | 'write' | 'compute' | 'network' | 'bash' {
    if (BatchToolExecutor.READ_ONLY_TOOLS.includes(toolName)) {
      return 'read';
    }
    if (BatchToolExecutor.WRITE_TOOLS.includes(toolName)) {
      return 'write';
    }
    if (BatchToolExecutor.COMPUTE_TOOLS.includes(toolName)) {
      return 'compute';
    }
    if (BatchToolExecutor.NETWORK_TOOLS.includes(toolName)) {
      return 'network';
    }
    if (BatchToolExecutor.BASH_TOOLS.includes(toolName) || toolName === 'bash') {
      return 'bash';
    }
    
    // Default to sequential execution for unknown tools
    return 'write';
  }

  private async executeParallel(
    batch: LLMToolCall[],
    executor: (toolCall: LLMToolCall) => Promise<ToolResult>
  ): Promise<ToolResult[]> {
    try {
      const promises = batch.map(async (toolCall, index) => {
        try {
          const result = await executor(toolCall);
          return { ...result, batchIndex: index, toolCall };
        } catch (error: any) {
          return {
            success: false,
            error: `Batch execution error for ${toolCall.function.name}: ${error.message}`,
            batchIndex: index,
            toolCall
          } as ToolResult & { batchIndex: number; toolCall: LLMToolCall };
        }
      });

      const results = await Promise.all(promises);
      
      // Sort results by original batch index to maintain order
      return results
        .sort((a, b) => (a as any).batchIndex - (b as any).batchIndex)
        .map(({ batchIndex, toolCall, ...result }) => result);
        
    } catch (error: any) {
      // If parallel execution fails, fall back to sequential
      console.warn('Parallel execution failed, falling back to sequential:', error.message);
      const results: ToolResult[] = [];
      
      for (const toolCall of batch) {
        try {
          const result = await executor(toolCall);
          results.push(result);
        } catch (error: any) {
          results.push({
            success: false,
            error: `Sequential fallback error for ${toolCall.function.name}: ${error.message}`
          });
        }
      }
      
      return results;
    }
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility methods for analysis and debugging
  static analyzeBatchPotential(toolCalls: LLMToolCall[]): {
    totalTools: number;
    parallelizable: number;
    sequential: number;
    estimatedSpeedup: number;
  } {
    const executor = new BatchToolExecutor();
    const executionPlan = executor.createExecutionPlan(toolCalls);
    
    let parallelizable = 0;
    let sequential = 0;
    
    for (const batch of executionPlan) {
      if (batch.length > 1) {
        parallelizable += batch.length;
      } else {
        sequential += batch.length;
      }
    }
    
    // Estimate speedup based on parallel vs sequential execution
    const estimatedSpeedup = parallelizable > 0 
      ? (toolCalls.length / (sequential + executionPlan.filter(b => b.length > 1).length))
      : 1;
    
    return {
      totalTools: toolCalls.length,
      parallelizable,
      sequential,
      estimatedSpeedup: Math.round(estimatedSpeedup * 100) / 100
    };
  }

  static getToolCategories(): {
    readOnly: string[];
    write: string[];
    compute: string[];
    network: string[];
    bash: string[];
  } {
    return {
      readOnly: [...BatchToolExecutor.READ_ONLY_TOOLS],
      write: [...BatchToolExecutor.WRITE_TOOLS],
      compute: [...BatchToolExecutor.COMPUTE_TOOLS],
      network: [...BatchToolExecutor.NETWORK_TOOLS],
      bash: [...BatchToolExecutor.BASH_TOOLS]
    };
  }
}