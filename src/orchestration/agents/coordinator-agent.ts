import { BaseAgent } from '../base-agent';
import { Task, TaskResult, AgentProfile, AgentSpecialization, AgentCapability, TaskStatus } from '../types';
import { LLMClient } from '../../llm/client';

export class CoordinatorAgent extends BaseAgent {
  private subAgents: Map<string, BaseAgent> = new Map();
  private taskDecompositionHistory: Map<string, string[]> = new Map();

  constructor(llmClient: LLMClient) {
    const profile: AgentProfile = {
      id: 'coordinator-001',
      name: 'Coordinator Agent',
      description: 'Orchestrates and coordinates tasks between specialized agents',
      capabilities: [
        {
          name: 'task_decomposition',
          description: 'Break down complex tasks into smaller subtasks',
          priority: 10,
          tools: ['create_todo_list', 'update_todo_list']
        },
        {
          name: 'agent_coordination',
          description: 'Coordinate work between multiple agents',
          priority: 10,
          tools: []
        },
        {
          name: 'workflow_management',
          description: 'Manage complex workflows and dependencies',
          priority: 9,
          tools: []
        }
      ],
      systemPrompt: '',
      maxConcurrentTasks: 5,
      specialization: AgentSpecialization.COORDINATOR
    };

    super(profile, llmClient);
  }

  canHandleTask(task: Task): boolean {
    // Coordinator can handle any task by delegating to appropriate agents
    return true;
  }

  async executeTask(task: Task): Promise<TaskResult> {
    try {
      // For complex tasks, decompose them into subtasks
      if (this.isComplexTask(task)) {
        return await this.handleComplexTask(task);
      } else {
        return await this.handleSimpleTask(task);
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Coordination failed: ${error.message}`
      };
    }
  }

  private isComplexTask(task: Task): boolean {
    // Determine if a task is complex based on:
    // - Multiple required capabilities
    // - Keywords indicating complexity
    // - Task description length/complexity
    
    const complexityKeywords = [
      'analyze and implement', 'create and test', 'research and develop',
      'multiple files', 'full project', 'end-to-end', 'comprehensive'
    ];

    const hasMultipleCapabilities = task.requiredCapabilities.length > 2;
    const hasComplexityKeywords = complexityKeywords.some(keyword => 
      task.description.toLowerCase().includes(keyword)
    );
    const isLongDescription = task.description.length > 200;

    return hasMultipleCapabilities || hasComplexityKeywords || isLongDescription;
  }

  private async handleComplexTask(task: Task): Promise<TaskResult> {
    // Step 1: Decompose the task using AI
    const subtasks = await this.decomposeTask(task);
    
    // Step 2: Assign subtasks to appropriate agents
    const assignments = await this.assignSubtasks(subtasks);
    
    // Step 3: Monitor and coordinate execution
    const results = await this.coordinateExecution(assignments);
    
    // Step 4: Aggregate results
    return this.aggregateResults(task, results);
  }

  private async handleSimpleTask(task: Task): Promise<TaskResult> {
    // Find the best agent for this task
    const bestAgent = this.findBestAgent(task);
    
    if (!bestAgent) {
      return {
        success: false,
        error: 'No suitable agent found for this task'
      };
    }

    // Delegate to the best agent
    const success = await bestAgent.assignTask(task);
    
    if (!success) {
      return {
        success: false,
        error: 'Failed to assign task to agent'
      };
    }

    // Wait for task completion
    return await this.waitForTaskCompletion(task);
  }

  private async decomposeTask(task: Task): Promise<Task[]> {
    // Use AI to decompose the task into subtasks
    const decompositionPrompt = `
You are a task decomposition expert. Break down this complex task into smaller, manageable subtasks:

Task: ${task.description}
Required Capabilities: ${task.requiredCapabilities.join(', ')}

Please decompose this into 3-7 subtasks that can be executed by specialized agents. For each subtask, specify:
1. Description
2. Required capabilities
3. Priority (1-4)
4. Dependencies (which other subtasks must complete first)

Format your response as JSON:
{
  "subtasks": [
    {
      "description": "...",
      "requiredCapabilities": ["..."],
      "priority": 3,
      "dependencies": []
    }
  ]
}`;

    try {
      const response = await this.llmClient.chat([
        { role: 'system', content: this.getSpecializedSystemPrompt() },
        { role: 'user', content: decompositionPrompt }
      ]);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const parsed = JSON.parse(content);
      const subtasks: Task[] = parsed.subtasks.map((st: any, index: number) => ({
        id: `${task.id}-sub-${index + 1}`,
        description: st.description,
        priority: st.priority,
        requiredCapabilities: st.requiredCapabilities,
        context: { ...task.context, dependencies: st.dependencies },
        parentTaskId: task.id,
        status: TaskStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Store decomposition history
      this.taskDecompositionHistory.set(task.id, subtasks.map(st => st.id));
      
      return subtasks;
    } catch (error) {
      // Fallback: create basic subtasks
      return this.createFallbackSubtasks(task);
    }
  }

  private createFallbackSubtasks(task: Task): Task[] {
    // Create basic subtasks when AI decomposition fails
    return [
      {
        id: `${task.id}-sub-1`,
        description: `Analyze requirements for: ${task.description}`,
        priority: task.priority,
        requiredCapabilities: ['analysis'],
        parentTaskId: task.id,
        status: TaskStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: `${task.id}-sub-2`,
        description: `Execute main work for: ${task.description}`,
        priority: task.priority,
        requiredCapabilities: task.requiredCapabilities,
        parentTaskId: task.id,
        status: TaskStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  private async assignSubtasks(subtasks: Task[]): Promise<Map<string, BaseAgent>> {
    const assignments = new Map<string, BaseAgent>();

    for (const subtask of subtasks) {
      const bestAgent = this.findBestAgent(subtask);
      if (bestAgent) {
        assignments.set(subtask.id, bestAgent);
      }
    }

    return assignments;
  }

  private findBestAgent(task: Task): BaseAgent | null {
    let bestAgent: BaseAgent | null = null;
    let bestScore = 0;

    for (const agent of this.subAgents.values()) {
      if (!agent.isAvailable()) continue;

      const score = agent.getCapabilityScore(task.requiredCapabilities);
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    return bestAgent;
  }

  private async coordinateExecution(assignments: Map<string, BaseAgent>): Promise<Map<string, TaskResult>> {
    const results = new Map<string, TaskResult>();
    const promises: Promise<void>[] = [];

    for (const [taskId, agent] of assignments) {
      const promise = this.executeAssignment(taskId, agent, results);
      promises.push(promise);
    }

    await Promise.all(promises);
    return results;
  }

  private async executeAssignment(
    taskId: string, 
    agent: BaseAgent, 
    results: Map<string, TaskResult>
  ): Promise<void> {
    return new Promise((resolve) => {
      const onTaskCompleted = (event: any) => {
        if (event.task.id === taskId) {
          results.set(taskId, event.result);
          agent.off('task_completed', onTaskCompleted);
          agent.off('task_failed', onTaskFailed);
          resolve();
        }
      };

      const onTaskFailed = (event: any) => {
        if (event.task.id === taskId) {
          results.set(taskId, event.result);
          agent.off('task_completed', onTaskCompleted);
          agent.off('task_failed', onTaskFailed);
          resolve();
        }
      };

      agent.on('task_completed', onTaskCompleted);
      agent.on('task_failed', onTaskFailed);
    });
  }

  private async waitForTaskCompletion(task: Task): Promise<TaskResult> {
    return new Promise((resolve) => {
      const checkCompletion = () => {
        if (task.result) {
          resolve(task.result);
        } else {
          setTimeout(checkCompletion, 100);
        }
      };
      checkCompletion();
    });
  }

  private aggregateResults(task: Task, results: Map<string, TaskResult>): TaskResult {
    const allResults = Array.from(results.values());
    const successfulResults = allResults.filter(r => r.success);
    const failedResults = allResults.filter(r => !r.success);

    if (failedResults.length === 0) {
      return {
        success: true,
        output: `Task completed successfully. ${successfulResults.length} subtasks completed.`,
        metadata: {
          subtaskResults: Object.fromEntries(results),
          totalSubtasks: allResults.length,
          successfulSubtasks: successfulResults.length
        }
      };
    } else if (successfulResults.length > failedResults.length) {
      return {
        success: true,
        output: `Task partially completed. ${successfulResults.length}/${allResults.length} subtasks successful.`,
        error: `Some subtasks failed: ${failedResults.map(r => r.error).join(', ')}`,
        metadata: {
          subtaskResults: Object.fromEntries(results),
          totalSubtasks: allResults.length,
          successfulSubtasks: successfulResults.length,
          failedSubtasks: failedResults.length
        }
      };
    } else {
      return {
        success: false,
        error: `Task failed. ${failedResults.length}/${allResults.length} subtasks failed.`,
        metadata: {
          subtaskResults: Object.fromEntries(results),
          totalSubtasks: allResults.length,
          successfulSubtasks: successfulResults.length,
          failedSubtasks: failedResults.length
        }
      };
    }
  }

  getSpecializedSystemPrompt(): string {
    return `You are a Coordinator Agent responsible for orchestrating complex tasks by breaking them down into manageable subtasks and coordinating their execution across specialized agents.

Your capabilities include:
- Task decomposition and analysis
- Agent coordination and workflow management
- Resource allocation and optimization
- Progress monitoring and quality assurance

When decomposing tasks, consider:
- Logical dependencies between subtasks
- Appropriate specialization for each subtask
- Parallel execution opportunities
- Resource requirements and constraints

Always provide clear, actionable subtasks with specific requirements and success criteria.`;
  }

  // Agent management methods
  registerAgent(agent: BaseAgent): void {
    this.subAgents.set(agent.getProfile().id, agent);
  }

  unregisterAgent(agentId: string): void {
    this.subAgents.delete(agentId);
  }

  getRegisteredAgents(): BaseAgent[] {
    return Array.from(this.subAgents.values());
  }
}