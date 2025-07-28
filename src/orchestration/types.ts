export interface AgentCapability {
  name: string;
  description: string;
  priority: number; // Higher number = higher priority for this capability
  tools: string[]; // Tools this agent specializes in
}

export interface AgentProfile {
  id: string;
  name: string;
  description: string;
  capabilities: AgentCapability[];
  systemPrompt: string;
  maxConcurrentTasks: number;
  specialization: AgentSpecialization;
}

export enum AgentSpecialization {
  COORDINATOR = 'coordinator',
  CODING = 'coding',
  RESEARCH = 'research',
  FILESYSTEM = 'filesystem',
  TESTING = 'testing',
  SECURITY = 'security',
  GENERAL = 'general'
}

export interface Task {
  id: string;
  description: string;
  priority: TaskPriority;
  requiredCapabilities: string[];
  context?: any;
  parentTaskId?: string;
  subtasks?: Task[];
  status: TaskStatus;
  assignedAgentId?: string;
  result?: TaskResult;
  createdAt: Date;
  updatedAt: Date;
  deadline?: Date;
}

export enum TaskPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface TaskResult {
  success: boolean;
  output?: any;
  error?: string;
  metadata?: any;
  executionTime?: number;
}

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId?: string; // undefined for broadcast
  type: MessageType;
  content: any;
  timestamp: Date;
  taskId?: string;
}

export enum MessageType {
  TASK_REQUEST = 'task_request',
  TASK_RESPONSE = 'task_response',
  COLLABORATION_REQUEST = 'collaboration_request',
  COLLABORATION_RESPONSE = 'collaboration_response',
  STATUS_UPDATE = 'status_update',
  ERROR_REPORT = 'error_report',
  RESOURCE_REQUEST = 'resource_request',
  RESOURCE_RESPONSE = 'resource_response'
}

export interface AgentState {
  id: string;
  status: AgentStatus;
  currentTasks: Task[];
  completedTasks: number;
  failedTasks: number;
  lastActivity: Date;
  performance: AgentPerformance;
}

export enum AgentStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  OVERLOADED = 'overloaded',
  ERROR = 'error',
  OFFLINE = 'offline'
}

export interface AgentPerformance {
  averageExecutionTime: number;
  successRate: number;
  taskCompletionRate: number;
  qualityScore: number;
}

export interface OrchestrationConfig {
  maxConcurrentTasks: number;
  taskTimeout: number;
  retryAttempts: number;
  loadBalancing: boolean;
  failoverEnabled: boolean;
  loggingLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface SwarmEvent {
  type: SwarmEventType;
  agentId?: string;
  taskId?: string;
  data?: any;
  timestamp: Date;
}

export enum SwarmEventType {
  AGENT_REGISTERED = 'agent_registered',
  AGENT_DEREGISTERED = 'agent_deregistered',
  TASK_CREATED = 'task_created',
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',
  COLLABORATION_STARTED = 'collaboration_started',
  COLLABORATION_ENDED = 'collaboration_ended',
  SWARM_OVERLOADED = 'swarm_overloaded',
  SWARM_IDLE = 'swarm_idle'
}