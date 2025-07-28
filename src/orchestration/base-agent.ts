import { EventEmitter } from 'events';
import { LLMClient } from '../llm/client';
import { 
  AgentProfile, 
  Task, 
  TaskStatus, 
  TaskResult, 
  AgentMessage, 
  MessageType,
  AgentState,
  AgentStatus,
  AgentPerformance
} from './types';
import { MultiLLMAgent } from '../agent/multi-llm-agent';

export abstract class BaseAgent extends EventEmitter {
  protected profile: AgentProfile;
  protected llmClient: LLMClient;
  protected state: AgentState;
  protected currentTasks: Map<string, Task> = new Map();
  protected messageQueue: AgentMessage[] = [];
  protected performance: AgentPerformance;

  constructor(profile: AgentProfile, llmClient: LLMClient) {
    super();
    this.profile = profile;
    this.llmClient = llmClient;
    this.performance = {
      averageExecutionTime: 0,
      successRate: 1.0,
      taskCompletionRate: 1.0,
      qualityScore: 1.0
    };
    this.state = {
      id: profile.id,
      status: AgentStatus.IDLE,
      currentTasks: [],
      completedTasks: 0,
      failedTasks: 0,
      lastActivity: new Date(),
      performance: this.performance
    };
  }

  // Abstract methods that must be implemented by specialized agents
  abstract canHandleTask(task: Task): boolean;
  abstract executeTask(task: Task): Promise<TaskResult>;
  abstract getSpecializedSystemPrompt(): string;

  // Common agent functionality
  async assignTask(task: Task): Promise<boolean> {
    if (!this.canHandleTask(task)) {
      return false;
    }

    if (this.currentTasks.size >= this.profile.maxConcurrentTasks) {
      this.state.status = AgentStatus.OVERLOADED;
      return false;
    }

    this.currentTasks.set(task.id, task);
    task.status = TaskStatus.ASSIGNED;
    task.assignedAgentId = this.profile.id;
    this.state.currentTasks = Array.from(this.currentTasks.values());
    this.state.status = AgentStatus.BUSY;
    this.state.lastActivity = new Date();

    this.emit('task_assigned', { agentId: this.profile.id, task });
    
    // Execute task asynchronously
    this.processTask(task).catch(error => {
      this.emit('task_error', { agentId: this.profile.id, task, error });
    });

    return true;
  }

  private async processTask(task: Task): Promise<void> {
    const startTime = Date.now();
    
    try {
      task.status = TaskStatus.IN_PROGRESS;
      this.emit('task_started', { agentId: this.profile.id, task });

      const result = await this.executeTask(task);
      const executionTime = Date.now() - startTime;
      
      result.executionTime = executionTime;
      task.result = result;
      task.status = result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED;
      task.updatedAt = new Date();

      // Update performance metrics
      this.updatePerformance(result, executionTime);

      // Remove from current tasks
      this.currentTasks.delete(task.id);
      this.state.currentTasks = Array.from(this.currentTasks.values());

      // Update agent status
      if (this.currentTasks.size === 0) {
        this.state.status = AgentStatus.IDLE;
      }

      if (result.success) {
        this.state.completedTasks++;
        this.emit('task_completed', { agentId: this.profile.id, task, result });
      } else {
        this.state.failedTasks++;
        this.emit('task_failed', { agentId: this.profile.id, task, result });
      }

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      const result: TaskResult = {
        success: false,
        error: error.message,
        executionTime
      };

      task.result = result;
      task.status = TaskStatus.FAILED;
      task.updatedAt = new Date();

      this.currentTasks.delete(task.id);
      this.state.currentTasks = Array.from(this.currentTasks.values());
      this.state.failedTasks++;
      this.state.status = this.currentTasks.size === 0 ? AgentStatus.IDLE : AgentStatus.BUSY;

      this.updatePerformance(result, executionTime);
      this.emit('task_failed', { agentId: this.profile.id, task, result });
    }
  }

  private updatePerformance(result: TaskResult, executionTime: number): void {
    const totalTasks = this.state.completedTasks + this.state.failedTasks;
    
    // Update average execution time
    this.performance.averageExecutionTime = 
      (this.performance.averageExecutionTime * (totalTasks - 1) + executionTime) / totalTasks;
    
    // Update success rate
    this.performance.successRate = this.state.completedTasks / totalTasks;
    
    // Update task completion rate (tasks completed vs assigned)
    this.performance.taskCompletionRate = this.state.completedTasks / totalTasks;
    
    // Quality score is a combination of success rate and speed (lower execution time = higher quality)
    const speedScore = Math.max(0, 1 - (executionTime / 60000)); // Normalize to 60 seconds max
    this.performance.qualityScore = (this.performance.successRate * 0.7) + (speedScore * 0.3);
    
    this.state.performance = this.performance;
  }

  async sendMessage(message: AgentMessage): Promise<void> {
    this.emit('message_sent', { agentId: this.profile.id, message });
  }

  async receiveMessage(message: AgentMessage): Promise<void> {
    this.messageQueue.push(message);
    this.emit('message_received', { agentId: this.profile.id, message });
    
    // Process message based on type
    await this.processMessage(message);
  }

  private async processMessage(message: AgentMessage): Promise<void> {
    switch (message.type) {
      case MessageType.COLLABORATION_REQUEST:
        await this.handleCollaborationRequest(message);
        break;
      case MessageType.RESOURCE_REQUEST:
        await this.handleResourceRequest(message);
        break;
      case MessageType.STATUS_UPDATE:
        await this.handleStatusUpdate(message);
        break;
      default:
        // Handle other message types as needed
        break;
    }
  }

  private async handleCollaborationRequest(message: AgentMessage): Promise<void> {
    // Implement collaboration logic
    // This could involve sharing context, delegating subtasks, etc.
  }

  private async handleResourceRequest(message: AgentMessage): Promise<void> {
    // Implement resource sharing logic
    // This could involve sharing file contents, analysis results, etc.
  }

  private async handleStatusUpdate(message: AgentMessage): Promise<void> {
    // Handle status updates from other agents
  }

  getProfile(): AgentProfile {
    return this.profile;
  }

  getState(): AgentState {
    return { ...this.state };
  }

  getCurrentTasks(): Task[] {
    return Array.from(this.currentTasks.values());
  }

  getPerformance(): AgentPerformance {
    return { ...this.performance };
  }

  isAvailable(): boolean {
    return this.state.status === AgentStatus.IDLE || 
           (this.state.status === AgentStatus.BUSY && 
            this.currentTasks.size < this.profile.maxConcurrentTasks);
  }

  getCapabilityScore(requiredCapabilities: string[]): number {
    let totalScore = 0;
    let matchedCapabilities = 0;

    for (const required of requiredCapabilities) {
      const capability = this.profile.capabilities.find(c => c.name === required);
      if (capability) {
        totalScore += capability.priority;
        matchedCapabilities++;
      }
    }

    // Return average score for matched capabilities, 0 if no matches
    return matchedCapabilities > 0 ? totalScore / matchedCapabilities : 0;
  }
}