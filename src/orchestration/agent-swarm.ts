import { EventEmitter } from 'events';
import { LLMClient } from '../llm/client';
import { 
  Task, 
  TaskStatus, 
  TaskPriority,
  OrchestrationConfig,
  SwarmEvent,
  SwarmEventType,
  AgentState
} from './types';
import { BaseAgent } from './base-agent';
import { CoordinatorAgent } from './agents/coordinator-agent';
import { CodingAgent } from './agents/coding-agent';
import { ResearchAgent } from './agents/research-agent';

export class AgentSwarm extends EventEmitter {
  private agents: Map<string, BaseAgent> = new Map();
  private coordinator: CoordinatorAgent;
  private taskQueue: Task[] = [];
  private activeTasks: Map<string, Task> = new Map();
  private completedTasks: Map<string, Task> = new Map();
  private config: OrchestrationConfig;
  private isRunning: boolean = false;
  private taskIdCounter: number = 1;

  constructor(llmClient: LLMClient, config?: Partial<OrchestrationConfig>) {
    super();
    
    this.config = {
      maxConcurrentTasks: 10,
      taskTimeout: 300000, // 5 minutes
      retryAttempts: 3,
      loadBalancing: true,
      failoverEnabled: true,
      loggingLevel: 'info',
      ...config
    };

    // Initialize coordinator agent
    this.coordinator = new CoordinatorAgent(llmClient);
    this.registerAgent(this.coordinator);

    // Initialize specialized agents
    this.initializeSpecializedAgents(llmClient);

    // Set up event listeners
    this.setupEventListeners();
  }

  private initializeSpecializedAgents(llmClient: LLMClient): void {
    // Register specialized agents
    const codingAgent = new CodingAgent(llmClient);
    const researchAgent = new ResearchAgent(llmClient);

    this.registerAgent(codingAgent);
    this.registerAgent(researchAgent);

    // Register agents with coordinator
    this.coordinator.registerAgent(codingAgent);
    this.coordinator.registerAgent(researchAgent);
  }

  private setupEventListeners(): void {
    // Listen to agent events
    for (const agent of this.agents.values()) {
      agent.on('task_completed', (event) => this.handleTaskCompleted(event));
      agent.on('task_failed', (event) => this.handleTaskFailed(event));
      agent.on('task_assigned', (event) => this.handleTaskAssigned(event));
      agent.on('message_sent', (event) => this.handleAgentMessage(event));
    }
  }

  registerAgent(agent: BaseAgent): void {
    const agentId = agent.getProfile().id;
    this.agents.set(agentId, agent);
    
    // Set up event listeners for new agent
    agent.on('task_completed', (event) => this.handleTaskCompleted(event));
    agent.on('task_failed', (event) => this.handleTaskFailed(event));
    agent.on('task_assigned', (event) => this.handleTaskAssigned(event));
    agent.on('message_sent', (event) => this.handleAgentMessage(event));

    this.emitSwarmEvent(SwarmEventType.AGENT_REGISTERED, agentId);
    
    if (this.config.loggingLevel === 'debug' || this.config.loggingLevel === 'info') {
      console.log(`Agent registered: ${agent.getProfile().name} (${agentId})`);
    }
  }

  unregisterAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      // Remove all event listeners
      agent.removeAllListeners();
      this.agents.delete(agentId);
      this.emitSwarmEvent(SwarmEventType.AGENT_DEREGISTERED, agentId);
      
      if (this.config.loggingLevel === 'debug' || this.config.loggingLevel === 'info') {
        console.log(`Agent unregistered: ${agentId}`);
      }
    }
  }

  async submitTask(
    description: string, 
    requiredCapabilities: string[] = [],
    priority: TaskPriority = TaskPriority.MEDIUM,
    context?: any
  ): Promise<string> {
    const task: Task = {
      id: `task-${this.taskIdCounter++}`,
      description,
      priority,
      requiredCapabilities,
      context,
      status: TaskStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.taskQueue.push(task);
    this.emitSwarmEvent(SwarmEventType.TASK_CREATED, undefined, task.id, { task });

    if (this.config.loggingLevel === 'debug' || this.config.loggingLevel === 'info') {
      console.log(`Task submitted: ${task.id} - ${task.description}`);
    }

    // Start processing if not already running
    if (!this.isRunning) {
      this.startProcessing();
    }

    return task.id;
  }

  private async startProcessing(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    while (this.taskQueue.length > 0 || this.activeTasks.size > 0) {
      // Process pending tasks
      await this.processPendingTasks();
      
      // Wait a bit before next iteration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check for timeouts
      this.checkTaskTimeouts();
    }
    
    this.isRunning = false;
    this.emitSwarmEvent(SwarmEventType.SWARM_IDLE);
  }

  private async processPendingTasks(): Promise<void> {
    // Sort tasks by priority
    this.taskQueue.sort((a, b) => b.priority - a.priority);

    while (this.taskQueue.length > 0 && this.activeTasks.size < this.config.maxConcurrentTasks) {
      const task = this.taskQueue.shift()!;
      
      // Try to assign task to an appropriate agent
      const success = await this.assignTask(task);
      
      if (success) {
        this.activeTasks.set(task.id, task);
        this.emitSwarmEvent(SwarmEventType.TASK_ASSIGNED, task.assignedAgentId, task.id, { task });
      } else {
        // Put task back in queue if no agent available
        this.taskQueue.unshift(task);
        break; // Stop trying to assign more tasks for now
      }
    }

    // Check if swarm is overloaded
    if (this.taskQueue.length > 0 && this.activeTasks.size >= this.config.maxConcurrentTasks) {
      this.emitSwarmEvent(SwarmEventType.SWARM_OVERLOADED);
    }
  }

  private async assignTask(task: Task): Promise<boolean> {
    // Always try coordinator first for complex tasks
    if (this.isComplexTask(task)) {
      const success = await this.coordinator.assignTask(task);
      if (success) {
        return true;
      }
    }

    // Find the best agent for this task
    const bestAgent = this.findBestAgent(task);
    
    if (bestAgent && bestAgent.isAvailable()) {
      return await bestAgent.assignTask(task);
    }

    return false;
  }

  private isComplexTask(task: Task): boolean {
    // Determine if task should be handled by coordinator
    const complexityIndicators = [
      task.requiredCapabilities.length > 2,
      task.description.length > 200,
      task.description.toLowerCase().includes('multiple'),
      task.description.toLowerCase().includes('complex'),
      task.description.toLowerCase().includes('comprehensive'),
      task.description.toLowerCase().includes('end-to-end')
    ];

    return complexityIndicators.filter(Boolean).length >= 2;
  }

  private findBestAgent(task: Task): BaseAgent | null {
    let bestAgent: BaseAgent | null = null;
    let bestScore = 0;

    for (const agent of this.agents.values()) {
      if (!agent.isAvailable() || agent === this.coordinator) continue;

      const score = agent.getCapabilityScore(task.requiredCapabilities);
      
      // Apply load balancing if enabled
      if (this.config.loadBalancing) {
        const currentLoad = agent.getCurrentTasks().length / agent.getProfile().maxConcurrentTasks;
        const adjustedScore = score * (1 - currentLoad * 0.5); // Reduce score based on current load
        
        if (adjustedScore > bestScore) {
          bestScore = adjustedScore;
          bestAgent = agent;
        }
      } else {
        if (score > bestScore) {
          bestScore = score;
          bestAgent = agent;
        }
      }
    }

    return bestAgent;
  }

  private checkTaskTimeouts(): void {
    const now = new Date();
    
    for (const [taskId, task] of this.activeTasks) {
      const elapsed = now.getTime() - task.updatedAt.getTime();
      
      if (elapsed > this.config.taskTimeout) {
        // Task has timed out
        task.status = TaskStatus.FAILED;
        task.result = {
          success: false,
          error: 'Task timed out',
          executionTime: elapsed
        };
        
        this.activeTasks.delete(taskId);
        this.completedTasks.set(taskId, task);
        
        this.emitSwarmEvent(SwarmEventType.TASK_FAILED, task.assignedAgentId, taskId, { 
          task, 
          reason: 'timeout' 
        });

        if (this.config.loggingLevel === 'warn' || this.config.loggingLevel === 'error') {
          console.warn(`Task ${taskId} timed out after ${elapsed}ms`);
        }
      }
    }
  }

  private handleTaskCompleted(event: any): void {
    const { task } = event;
    
    this.activeTasks.delete(task.id);
    this.completedTasks.set(task.id, task);
    
    this.emitSwarmEvent(SwarmEventType.TASK_COMPLETED, task.assignedAgentId, task.id, { 
      task, 
      result: task.result 
    });

    if (this.config.loggingLevel === 'debug' || this.config.loggingLevel === 'info') {
      console.log(`Task completed: ${task.id}`);
    }
  }

  private handleTaskFailed(event: any): void {
    const { task } = event;
    
    this.activeTasks.delete(task.id);
    
    // Retry logic if enabled
    if (this.config.retryAttempts > 0 && !task.context?.retryCount) {
      task.context = { ...task.context, retryCount: 1 };
      task.status = TaskStatus.PENDING;
      task.updatedAt = new Date();
      this.taskQueue.push(task);
      
      if (this.config.loggingLevel === 'debug' || this.config.loggingLevel === 'info') {
        console.log(`Retrying failed task: ${task.id} (attempt 1/${this.config.retryAttempts})`);
      }
    } else if (task.context?.retryCount && task.context.retryCount < this.config.retryAttempts) {
      task.context.retryCount++;
      task.status = TaskStatus.PENDING;
      task.updatedAt = new Date();
      this.taskQueue.push(task);
      
      if (this.config.loggingLevel === 'debug' || this.config.loggingLevel === 'info') {
        console.log(`Retrying failed task: ${task.id} (attempt ${task.context.retryCount}/${this.config.retryAttempts})`);
      }
    } else {
      // Max retries reached or retries disabled
      this.completedTasks.set(task.id, task);
      
      this.emitSwarmEvent(SwarmEventType.TASK_FAILED, task.assignedAgentId, task.id, { 
        task, 
        result: task.result 
      });

      if (this.config.loggingLevel === 'warn' || this.config.loggingLevel === 'error') {
        console.error(`Task failed permanently: ${task.id} - ${task.result?.error}`);
      }
    }
  }

  private handleTaskAssigned(event: any): void {
    // Task assignment logging is handled in processPendingTasks
  }

  private handleAgentMessage(event: any): void {
    // Handle inter-agent communication
    if (this.config.loggingLevel === 'debug') {
      console.log(`Agent message: ${event.agentId} -> ${event.message.type}`);
    }
  }

  private emitSwarmEvent(
    type: SwarmEventType, 
    agentId?: string, 
    taskId?: string, 
    data?: any
  ): void {
    const event: SwarmEvent = {
      type,
      agentId,
      taskId,
      data,
      timestamp: new Date()
    };
    
    this.emit('swarm_event', event);
  }

  // Public API methods
  getTask(taskId: string): Task | undefined {
    return this.activeTasks.get(taskId) || this.completedTasks.get(taskId);
  }

  getActiveTasks(): Task[] {
    return Array.from(this.activeTasks.values());
  }

  getCompletedTasks(): Task[] {
    return Array.from(this.completedTasks.values());
  }

  getPendingTasks(): Task[] {
    return [...this.taskQueue];
  }

  getAgentStates(): AgentState[] {
    return Array.from(this.agents.values()).map(agent => agent.getState());
  }

  getSwarmStatus(): {
    isRunning: boolean;
    activeTasks: number;
    pendingTasks: number;
    completedTasks: number;
    registeredAgents: number;
  } {
    return {
      isRunning: this.isRunning,
      activeTasks: this.activeTasks.size,
      pendingTasks: this.taskQueue.length,
      completedTasks: this.completedTasks.size,
      registeredAgents: this.agents.size
    };
  }

  async shutdown(): Promise<void> {
    this.isRunning = false;
    
    // Wait for active tasks to complete or timeout
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.activeTasks.size > 0 && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Force stop any remaining tasks
    for (const [taskId, task] of this.activeTasks) {
      task.status = TaskStatus.CANCELLED;
      this.completedTasks.set(taskId, task);
    }
    
    this.activeTasks.clear();
    this.taskQueue.length = 0;
    
    // Remove all agents
    for (const agentId of this.agents.keys()) {
      this.unregisterAgent(agentId);
    }
    
    this.removeAllListeners();
    
    if (this.config.loggingLevel === 'info') {
      console.log('Agent swarm shut down successfully');
    }
  }
}