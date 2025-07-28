# JURIKO Agent Orchestration System

This document provides comprehensive information about the JURIKO Agent Orchestration System, a powerful multi-agent framework inspired by OpenAI Swarm and Claude Swarm.

## Overview

The JURIKO Agent Orchestration System enables intelligent coordination of specialized AI agents to handle complex tasks through decomposition, delegation, and collaboration. The system is built on top of JURIKO's existing multi-LLM infrastructure and tool ecosystem.

## Architecture

### Core Components

1. **AgentSwarm**: Main orchestrator that manages agents and coordinates task execution
2. **BaseAgent**: Abstract base class for all agents with common functionality
3. **CoordinatorAgent**: Specialized agent for task decomposition and workflow management
4. **CodingAgent**: Specialized agent for software development tasks
5. **ResearchAgent**: Specialized agent for information gathering and analysis
6. **JurikoSwarm**: High-level API interface for easy integration

### Agent Specializations

#### CoordinatorAgent
- **Purpose**: Orchestrates complex tasks by breaking them down into subtasks
- **Capabilities**: Task decomposition, agent coordination, workflow management
- **Use Cases**: Complex multi-step projects, cross-functional tasks, project management

#### CodingAgent
- **Purpose**: Handles all software development and programming tasks
- **Capabilities**: Code generation, analysis, debugging, refactoring, documentation
- **Use Cases**: Feature implementation, bug fixes, code reviews, optimization

#### ResearchAgent
- **Purpose**: Gathers and analyzes information from various sources
- **Capabilities**: Web research, data analysis, competitive analysis, fact-checking
- **Use Cases**: Market research, technical documentation, information synthesis

## Key Features

### 1. Intelligent Task Routing
- Automatic capability matching between tasks and agents
- Load balancing across available agents
- Priority-based task scheduling

### 2. Task Decomposition
- Complex tasks automatically broken down into manageable subtasks
- Dependency management between subtasks
- Parallel execution where possible

### 3. Agent Collaboration
- Inter-agent communication and resource sharing
- Context preservation across agent handoffs
- Collaborative problem-solving

### 4. Fault Tolerance
- Automatic retry mechanisms for failed tasks
- Failover to alternative agents
- Graceful degradation under load

### 5. Real-time Monitoring
- Task status tracking and progress monitoring
- Agent performance metrics and health monitoring
- Event-driven architecture for real-time updates

## Usage Examples

### Basic Task Execution

```typescript
import { LLMClient } from './llm/client';
import { JurikoSwarm } from './juriko-swarm';

// Initialize the swarm
const llmClient = new LLMClient(/* config */);
const swarm = new JurikoSwarm(llmClient);

// Execute a simple task
const taskId = await swarm.executeTask(
  "Create a React component for user authentication",
  {
    priority: 'high',
    capabilities: ['code_generation'],
    context: { framework: 'React', typescript: true }
  }
);

// Wait for completion
const result = await swarm.executeTaskAndWait(
  "Research best practices for React performance optimization"
);

console.log(result.success ? result.result : result.error);
```

### Complex Multi-Agent Workflow

```typescript
// Complex task that will be automatically decomposed
const complexTaskId = await swarm.executeTask(
  "Build a complete user management system with authentication, CRUD operations, and comprehensive documentation",
  {
    priority: 'critical',
    context: {
      technologies: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
      requirements: ['JWT authentication', 'Role-based access', 'API documentation']
    }
  }
);

// Monitor progress
const status = swarm.getTaskStatus(complexTaskId);
console.log(`Task Status: ${status?.status}`);
console.log(`Assigned Agent: ${status?.assignedAgent}`);
```

### Monitoring and Management

```typescript
// Get overall swarm status
const swarmStatus = swarm.getSwarmStatus();
console.log(`Active Tasks: ${swarmStatus.activeTasks}`);
console.log(`Available Agents: ${swarmStatus.agents.length}`);

// List active tasks
const activeTasks = swarm.getActiveTasks();
activeTasks.forEach(task => {
  console.log(`${task.id}: ${task.description} (${task.status})`);
});

// Get completed tasks with results
const completedTasks = swarm.getCompletedTasks();
completedTasks.forEach(task => {
  console.log(`${task.id}: ${task.success ? '✅' : '❌'} ${task.description}`);
});
```

## Configuration

### Swarm Configuration

```typescript
const swarm = new AgentSwarm(llmClient, {
  maxConcurrentTasks: 10,      // Maximum concurrent tasks
  taskTimeout: 300000,         // Task timeout in milliseconds (5 minutes)
  retryAttempts: 3,           // Number of retry attempts for failed tasks
  loadBalancing: true,        // Enable load balancing across agents
  failoverEnabled: true,      // Enable failover to alternative agents
  loggingLevel: 'info'        // Logging level: 'debug', 'info', 'warn', 'error'
});
```

### Agent Capabilities

Each agent defines its capabilities with priority scores:

```typescript
capabilities: [
  {
    name: 'code_generation',
    description: 'Generate new code files and functions',
    priority: 10,              // Higher priority = better suited for this capability
    tools: ['create_file', 'str_replace_editor']
  },
  // ... more capabilities
]
```

## Task Types and Routing

### Automatic Task Classification

The system automatically classifies tasks based on:
- **Keywords**: Specific terms that indicate task type
- **Required Capabilities**: Explicitly specified capabilities
- **Task Complexity**: Length and complexity indicators
- **Context**: Additional context provided with the task

### Task Priority Levels

1. **CRITICAL (4)**: Urgent tasks that need immediate attention
2. **HIGH (3)**: Important tasks with high business value
3. **MEDIUM (2)**: Standard tasks (default priority)
4. **LOW (1)**: Background tasks that can wait

### Capability Matching

The system uses a scoring algorithm to match tasks with the most suitable agents:

```typescript
// Example capability scoring
const score = agent.getCapabilityScore(task.requiredCapabilities);
// Agents with higher scores for required capabilities are preferred
```

## Event System

The orchestration system provides comprehensive event monitoring:

### Swarm Events

- `AGENT_REGISTERED`: New agent joins the swarm
- `AGENT_DEREGISTERED`: Agent leaves the swarm
- `TASK_CREATED`: New task submitted to the swarm
- `TASK_ASSIGNED`: Task assigned to an agent
- `TASK_COMPLETED`: Task completed successfully
- `TASK_FAILED`: Task failed or was cancelled
- `SWARM_OVERLOADED`: Swarm is at capacity
- `SWARM_IDLE`: All tasks completed, swarm is idle

### Event Handling

```typescript
swarm.on('swarm_event', (event) => {
  switch (event.type) {
    case 'task_completed':
      console.log(`✅ Task ${event.taskId} completed by ${event.agentId}`);
      break;
    case 'task_failed':
      console.log(`❌ Task ${event.taskId} failed: ${event.data.result.error}`);
      break;
    // Handle other events...
  }
});
```

## Performance Monitoring

### Agent Performance Metrics

Each agent tracks performance metrics:

- **Average Execution Time**: Mean time to complete tasks
- **Success Rate**: Percentage of successfully completed tasks
- **Task Completion Rate**: Tasks completed vs. tasks assigned
- **Quality Score**: Composite score based on success rate and speed

### Swarm Performance

- **Throughput**: Tasks completed per unit time
- **Resource Utilization**: Agent capacity utilization
- **Queue Length**: Number of pending tasks
- **Response Time**: Time from task submission to completion

## Best Practices

### Task Design

1. **Clear Descriptions**: Provide detailed, unambiguous task descriptions
2. **Appropriate Granularity**: Break down very large tasks into smaller ones
3. **Context Provision**: Include relevant context and requirements
4. **Priority Setting**: Set appropriate priorities based on business needs

### Agent Utilization

1. **Capability Matching**: Ensure tasks are routed to appropriate specialists
2. **Load Distribution**: Monitor agent loads and adjust capacity as needed
3. **Performance Monitoring**: Track agent performance and optimize accordingly
4. **Resource Management**: Manage concurrent task limits effectively

### Error Handling

1. **Retry Logic**: Configure appropriate retry attempts for transient failures
2. **Timeout Management**: Set reasonable timeouts based on task complexity
3. **Graceful Degradation**: Handle overload situations gracefully
4. **Error Reporting**: Implement comprehensive error logging and reporting

## Integration with JURIKO CLI

The agent orchestration system integrates seamlessly with existing JURIKO CLI features:

### Tool Integration
- All existing JURIKO tools are available to agents
- MCP (Model Context Protocol) tools are automatically integrated
- Custom tools can be easily added to agent capabilities

### Multi-LLM Support
- Agents can use any supported LLM provider (Anthropic, OpenAI, Grok, Local)
- Provider selection can be optimized per agent type
- Cost optimization through intelligent provider routing

### User Confirmation System
- Maintains JURIKO's user confirmation system for sensitive operations
- Users can approve/reject agent actions
- Batch approval options for repetitive operations

## Extending the System

### Adding New Agent Types

1. **Extend BaseAgent**: Create a new class extending `BaseAgent`
2. **Define Capabilities**: Specify the agent's capabilities and tools
3. **Implement Logic**: Implement `canHandleTask()` and `executeTask()` methods
4. **Register Agent**: Add the agent to the swarm

```typescript
export class CustomAgent extends BaseAgent {
  canHandleTask(task: Task): boolean {
    // Implement task matching logic
  }

  async executeTask(task: Task): Promise<TaskResult> {
    // Implement task execution logic
  }

  getSpecializedSystemPrompt(): string {
    // Return agent-specific system prompt
  }
}
```

### Custom Capabilities

Add new capabilities to existing agents:

```typescript
capabilities: [
  {
    name: 'custom_capability',
    description: 'Description of the custom capability',
    priority: 8,
    tools: ['required_tools']
  }
]
```

## Troubleshooting

### Common Issues

1. **Tasks Not Being Assigned**
   - Check agent availability and capability matching
   - Verify task queue is not full
   - Review agent load balancing settings

2. **Poor Performance**
   - Monitor agent performance metrics
   - Adjust concurrent task limits
   - Optimize task decomposition strategies

3. **Task Failures**
   - Review error logs and failure patterns
   - Adjust retry settings
   - Verify tool availability and permissions

### Debugging

Enable debug logging for detailed information:

```typescript
const swarm = new AgentSwarm(llmClient, {
  loggingLevel: 'debug'
});
```

Monitor swarm events for real-time insights:

```typescript
swarm.on('swarm_event', (event) => {
  console.log('Swarm Event:', event);
});
```

## Future Enhancements

### Planned Features

1. **Dynamic Agent Scaling**: Automatically scale agent instances based on load
2. **Machine Learning Optimization**: ML-based task routing and performance optimization
3. **Advanced Collaboration**: Enhanced inter-agent communication and collaboration
4. **Custom Workflows**: User-defined workflow templates and automation
5. **Integration APIs**: REST/GraphQL APIs for external system integration

### Extensibility

The system is designed for extensibility:
- Plugin architecture for custom agents
- Event-driven integration points
- Configurable routing and scheduling algorithms
- Support for external agent implementations

## Conclusion

The JURIKO Agent Orchestration System provides a powerful, flexible framework for coordinating AI agents to handle complex tasks. By leveraging specialized agents, intelligent routing, and robust monitoring, it enables efficient execution of multi-faceted projects while maintaining the simplicity and power of the JURIKO CLI experience.