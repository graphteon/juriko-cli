import { MultiLLMAgent } from './agent/multi-llm-agent';
import { LLMClient } from './llm/client';
import { JurikoSwarm } from './juriko-swarm';

export class JurikoWithSwarm extends MultiLLMAgent {
  private swarm: JurikoSwarm;

  constructor(llmClient: LLMClient) {
    super(llmClient);
    this.swarm = new JurikoSwarm(llmClient);
  }

  async processUserMessage(message: string): Promise<any> {
    // Check if this is a swarm command
    if (message.toLowerCase().startsWith('swarm ')) {
      return await this.handleSwarmCommand(message);
    }
    
    // Check if this is a complex task that should use swarm
    if (this.shouldUseSwarm(message)) {
      return await this.handleSwarmCommand(`swarm ${message}`);
    }

    // Use regular JURIKO processing
    return await super.processUserMessage(message);
  }

  private async handleSwarmCommand(message: string): Promise<any> {
    const taskDescription = message.substring(6); // Remove "swarm " prefix
    
    try {
      const result = await this.swarm.executeTaskAndWait(taskDescription, {
        priority: 'high',
        timeout: 300000 // 5 minutes
      });

      if (result.success) {
        return [{
          type: 'assistant' as const,
          content: `✅ Swarm task completed successfully!\n\n${result.result}`,
          timestamp: new Date()
        }];
      } else {
        return [{
          type: 'assistant' as const,
          content: `❌ Swarm task failed: ${result.error}`,
          timestamp: new Date()
        }];
      }
    } catch (error: any) {
      return [{
        type: 'assistant' as const,
        content: `❌ Error executing swarm task: ${error.message}`,
        timestamp: new Date()
      }];
    }
  }

  private shouldUseSwarm(message: string): boolean {
    const swarmKeywords = [
      'create a complete', 'build a full', 'develop an entire',
      'implement and test', 'research and implement', 'analyze and create',
      'comprehensive', 'end-to-end', 'full stack', 'multiple files',
      'complex project', 'entire system', 'complete solution'
    ];

    const lowerMessage = message.toLowerCase();
    return swarmKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  async getSwarmStatus() {
    return this.swarm.getSwarmStatus();
  }

  async getActiveTasks() {
    return this.swarm.getActiveTasks();
  }

  async getCompletedTasks() {
    return this.swarm.getCompletedTasks();
  }

  async shutdown() {
    await this.swarm.shutdown();
  }
}