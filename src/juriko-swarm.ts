import { LLMClient } from './llm/client';
import { AgentSwarm, TaskPriority } from './orchestration';

export class JurikoSwarm {
  private swarm: AgentSwarm;
  private llmClient: LLMClient;

  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient;
    this.swarm = new AgentSwarm(llmClient, {
      maxConcurrentTasks: 5,
      taskTimeout: 300000, // 5 minutes
      retryAttempts: 2,
      loadBalancing: true,
      failoverEnabled: true,
      loggingLevel: 'info'
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.swarm.on('swarm_event', (event) => {
      switch (event.type) {
        case 'task_completed':
          console.log(`✅ Task completed: ${event.taskId}`);
          break;
        case 'task_failed':
          console.log(`❌ Task failed: ${event.taskId} - ${event.data?.result?.error}`);
          break;
        case 'swarm_overloaded':
          console.log(`⚠️  Swarm is overloaded - tasks are queued`);
          break;
        case 'swarm_idle':
          console.log(`💤 Swarm is idle - all tasks completed`);
          break;
      }
    });
  }

  /**
   * Execute a task using the agent swarm
   */
  async executeTask(
    description: string,
    options?: {
      priority?: 'low' | 'medium' | 'high' | 'critical';
      capabilities?: string[];
      context?: any;
    }
  ): Promise<string> {
    const priority = this.mapPriority(options?.priority || 'medium');
    const capabilities = options?.capabilities || this.inferCapabilities(description);
    
    const taskId = await this.swarm.submitTask(
      description,
      capabilities,
      priority,
      options?.context
    );

    return taskId;
  }

  /**
   * Execute a task and wait for completion
   */
  async executeTaskAndWait(
    description: string,
    options?: {
      priority?: 'low' | 'medium' | 'high' | 'critical';
      capabilities?: string[];
      context?: any;
      timeout?: number;
    }
  ): Promise<{
    success: boolean;
    result?: any;
    error?: string;
    executionTime?: number;
  }> {
    const taskId = await this.executeTask(description, options);
    const timeout = options?.timeout || 300000; // 5 minutes default
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkCompletion = () => {
        const task = this.swarm.getTask(taskId);
        
        if (task?.result) {
          resolve({
            success: task.result.success,
            result: task.result.output,
            error: task.result.error,
            executionTime: Date.now() - startTime
          });
        } else if (Date.now() - startTime > timeout) {
          resolve({
            success: false,
            error: 'Task execution timeout',
            executionTime: Date.now() - startTime
          });
        } else {
          setTimeout(checkCompletion, 1000);
        }
      };

      checkCompletion();
    });
  }

  /**
   * Get the status of a specific task
   */
  getTaskStatus(taskId: string): {
    id: string;
    status: string;
    description: string;
    assignedAgent?: string;
    result?: any;
    createdAt: Date;
    updatedAt: Date;
  } | null {
    const task = this.swarm.getTask(taskId);
    
    if (!task) {
      return null;
    }

    return {
      id: task.id,
      status: task.status,
      description: task.description,
      assignedAgent: task.assignedAgentId,
      result: task.result,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    };
  }

  /**
   * Get overall swarm status
   */
  getSwarmStatus(): {
    isRunning: boolean;
    activeTasks: number;
    pendingTasks: number;
    completedTasks: number;
    agents: Array<{
      id: string;
      name: string;
      status: string;
      currentTasks: number;
      completedTasks: number;
      successRate: number;
    }>;
  } {
    const status = this.swarm.getSwarmStatus();
    const agentStates = this.swarm.getAgentStates();

    return {
      ...status,
      agents: agentStates.map(state => ({
        id: state.id,
        name: this.swarm['agents'].get(state.id)?.getProfile().name || 'Unknown',
        status: state.status,
        currentTasks: state.currentTasks.length,
        completedTasks: state.completedTasks,
        successRate: state.performance.successRate
      }))
    };
  }

  /**
   * List all active tasks
   */
  getActiveTasks(): Array<{
    id: string;
    description: string;
    status: string;
    assignedAgent?: string;
    priority: number;
    createdAt: Date;
  }> {
    return this.swarm.getActiveTasks().map(task => ({
      id: task.id,
      description: task.description,
      status: task.status,
      assignedAgent: task.assignedAgentId,
      priority: task.priority,
      createdAt: task.createdAt
    }));
  }

  /**
   * List completed tasks
   */
  getCompletedTasks(): Array<{
    id: string;
    description: string;
    status: string;
    assignedAgent?: string;
    success: boolean;
    result?: any;
    error?: string;
    executionTime?: number;
    createdAt: Date;
    completedAt: Date;
  }> {
    return this.swarm.getCompletedTasks().map(task => ({
      id: task.id,
      description: task.description,
      status: task.status,
      assignedAgent: task.assignedAgentId,
      success: task.result?.success || false,
      result: task.result?.output,
      error: task.result?.error,
      executionTime: task.result?.executionTime,
      createdAt: task.createdAt,
      completedAt: task.updatedAt
    }));
  }

  /**
   * Shutdown the swarm gracefully
   */
  async shutdown(): Promise<void> {
    await this.swarm.shutdown();
  }

  private mapPriority(priority: string): TaskPriority {
    switch (priority.toLowerCase()) {
      case 'low': return TaskPriority.LOW;
      case 'medium': return TaskPriority.MEDIUM;
      case 'high': return TaskPriority.HIGH;
      case 'critical': return TaskPriority.CRITICAL;
      default: return TaskPriority.MEDIUM;
    }
  }

  private inferCapabilities(description: string): string[] {
    const capabilities: string[] = [];
    const lowerDesc = description.toLowerCase();

    // Coding capabilities
    if (lowerDesc.includes('code') || lowerDesc.includes('program') || 
        lowerDesc.includes('implement') || lowerDesc.includes('develop') ||
        lowerDesc.includes('function') || lowerDesc.includes('class') ||
        lowerDesc.includes('api') || lowerDesc.includes('bug') ||
        lowerDesc.includes('debug') || lowerDesc.includes('refactor')) {
      capabilities.push('code_generation', 'code_analysis', 'debugging');
    }

    // Research capabilities
    if (lowerDesc.includes('research') || lowerDesc.includes('analyze') ||
        lowerDesc.includes('investigate') || lowerDesc.includes('find') ||
        lowerDesc.includes('search') || lowerDesc.includes('information') ||
        lowerDesc.includes('data') || lowerDesc.includes('report')) {
      capabilities.push('web_research', 'data_analysis', 'report_generation');
    }

    // File system capabilities
    if (lowerDesc.includes('file') || lowerDesc.includes('directory') ||
        lowerDesc.includes('folder') || lowerDesc.includes('create') ||
        lowerDesc.includes('edit') || lowerDesc.includes('modify')) {
      capabilities.push('file_operations');
    }

    // Testing capabilities
    if (lowerDesc.includes('test') || lowerDesc.includes('testing') ||
        lowerDesc.includes('unit test') || lowerDesc.includes('integration')) {
      capabilities.push('testing');
    }

    // Documentation capabilities
    if (lowerDesc.includes('document') || lowerDesc.includes('readme') ||
        lowerDesc.includes('documentation') || lowerDesc.includes('comment')) {
      capabilities.push('documentation');
    }

    // If no specific capabilities inferred, use general ones
    if (capabilities.length === 0) {
      capabilities.push('general_assistance');
    }

    return capabilities;
  }
}