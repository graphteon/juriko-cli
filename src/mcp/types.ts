export interface MCPStdioServerConfig {
  type: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
  name?: string;
  description?: string;
  enabled?: boolean;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface MCPHttpStreamServerConfig {
  type: 'httpStream';
  url: string;
  headers?: Record<string, string>;
  name?: string;
  description?: string;
  enabled?: boolean;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface MCPSSEServerConfig {
  type: 'sse';
  url: string;
  headers?: Record<string, string>;
  name?: string;
  description?: string;
  enabled?: boolean;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export type MCPServerConfig = MCPStdioServerConfig | MCPHttpStreamServerConfig | MCPSSEServerConfig;

export interface MCPSettings {
  mcpServers: Record<string, MCPServerConfig>;
  globalTimeout?: number;
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type?: 'object';
    properties?: Record<string, any>;
    required?: string[];
    [key: string]: any;
  };
  serverName: string;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  serverName: string;
}

export interface MCPToolCall {
  serverName: string;
  toolName: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  success: boolean;
  content?: any;
  error?: string;
  isText?: boolean;
}

export interface MCPResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export interface MCPServerInfo {
  name: string;
  version: string;
  protocolVersion: string;
  capabilities: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
}

export interface MCPConnectionStatus {
  serverName: string;
  connected: boolean;
  error?: string;
  lastConnected?: Date;
  serverInfo?: MCPServerInfo;
}

export interface MCPClientInterface {
  connect(options: any): Promise<void>;
  ping(): Promise<null>;
  getAllTools(): Promise<any[]>;
  getAllResources(): Promise<any[]>;
  callTool(invocation: { name: string; arguments?: Record<string, unknown> }): Promise<any>;
  getResource(params: { uri: string }): Promise<any>;
  close(): Promise<void>;
}