import { MCPClient } from 'mcp-client';
import { 
  MCPServerConfig, 
  MCPTool, 
  MCPResource, 
  MCPToolCall, 
  MCPToolResult, 
  MCPResourceContent,
  MCPConnectionStatus,
  MCPServerInfo
} from './types';
import { logger } from '../utils/logger';

export class KilocodeMCPClient {
  private clients: Map<string, MCPClient> = new Map();
  private connectionStatus: Map<string, MCPConnectionStatus> = new Map();

  /**
   * Connect to an MCP server
   */
  async connectServer(serverName: string, config: MCPServerConfig): Promise<boolean> {
    try {
      logger.info(`Connecting to MCP server: ${serverName} (${config.type})`);

      const client = new MCPClient({
        name: 'kilocode-cli',
        version: '1.0.0'
      });

      let connectionConfig: any;

      if (config.type === 'stdio') {
        // Local stdio connection
        connectionConfig = {
          type: 'stdio',
          command: config.command,
          args: config.args || [],
          env: config.env || {}
        };
      } else if (config.type === 'httpStream') {
        // HTTP stream connection
        connectionConfig = {
          type: 'httpStream',
          url: config.url,
          headers: config.headers || {}
        };
      } else if (config.type === 'sse') {
        // SSE connection
        connectionConfig = {
          type: 'sse',
          url: config.url,
          headers: config.headers || {}
        };
      }

      await client.connect(connectionConfig);

      // Test connection with ping
      await client.ping();

      // Get server info
      const serverInfo = await this.getServerInfo(client);

      this.clients.set(serverName, client);
      this.connectionStatus.set(serverName, {
        serverName,
        connected: true,
        lastConnected: new Date(),
        serverInfo
      });

      logger.info(`Successfully connected to MCP server: ${serverName}`);
      return true;

    } catch (error: any) {
      logger.error(`Failed to connect to MCP server ${serverName}: ${error.message}`);
      
      this.connectionStatus.set(serverName, {
        serverName,
        connected: false,
        error: error.message
      });

      return false;
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnectServer(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (client) {
      try {
        // Add timeout to prevent hanging
        await Promise.race([
          client.close(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Disconnect timeout')), 5000)
          )
        ]);
        
        this.clients.delete(serverName);
        
        const status = this.connectionStatus.get(serverName);
        if (status) {
          status.connected = false;
        }

        logger.info(`Disconnected from MCP server: ${serverName}`);
      } catch (error: any) {
        logger.error(`Error disconnecting from MCP server ${serverName}: ${error.message}`);
        // Force remove the client even if disconnect failed
        this.clients.delete(serverName);
        const status = this.connectionStatus.get(serverName);
        if (status) {
          status.connected = false;
        }
      }
    }
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    const serverNames = Array.from(this.clients.keys());
    
    if (serverNames.length === 0) {
      logger.info('No MCP servers to disconnect');
      return;
    }

    try {
      // Add overall timeout for all disconnections
      await Promise.race([
        Promise.all(serverNames.map(serverName => this.disconnectServer(serverName))),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Disconnect all timeout')), 10000)
        )
      ]);
      
      logger.info('Disconnected from all MCP servers');
    } catch (error: any) {
      logger.error(`Error during disconnect all: ${error.message}`);
      // Force clear all clients
      this.clients.clear();
      this.connectionStatus.forEach(status => {
        status.connected = false;
      });
      logger.info('Force cleared all MCP connections');
    }
  }

  /**
   * Get server info
   */
  private async getServerInfo(client: MCPClient): Promise<MCPServerInfo> {
    try {
      // Try to get server capabilities and info with individual error handling
      let hasTools = false;
      let hasResources = false;
      
      try {
        const tools = await client.getAllTools();
        hasTools = Array.isArray(tools) && tools.length > 0;
      } catch (toolsError) {
        // Some servers might not support getAllTools, that's okay
        logger.debug(`Server doesn't support getAllTools: ${toolsError}`);
        hasTools = false;
      }
      
      try {
        const resources = await client.getAllResources();
        hasResources = Array.isArray(resources) && resources.length > 0;
      } catch (resourcesError) {
        // Some servers might not support getAllResources, that's okay
        logger.debug(`Server doesn't support getAllResources: ${resourcesError}`);
        hasResources = false;
      }
      
      return {
        name: 'Unknown',
        version: '1.0.0',
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: hasTools,
          resources: hasResources,
          prompts: false // We'll check this separately if needed
        }
      };
    } catch (error) {
      logger.debug(`Error getting server info: ${error}`);
      return {
        name: 'Unknown',
        version: '1.0.0',
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: false,
          resources: false,
          prompts: false
        }
      };
    }
  }

  /**
   * Get all available tools from all connected servers
   */
  async getAllTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];

    for (const [serverName, client] of this.clients) {
      try {
        const tools = await client.getAllTools();
        
        for (const tool of tools) {
          allTools.push({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            serverName
          });
        }
      } catch (error: any) {
        logger.error(`Error getting tools from server ${serverName}: ${error.message}`);
      }
    }

    return allTools;
  }

  /**
   * Get all available resources from all connected servers
   */
  async getAllResources(): Promise<MCPResource[]> {
    const allResources: MCPResource[] = [];

    for (const [serverName, client] of this.clients) {
      try {
        const resources = await client.getAllResources();
        
        for (const resource of resources) {
          allResources.push({
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
            serverName
          });
        }
      } catch (error: any) {
        logger.error(`Error getting resources from server ${serverName}: ${error.message}`);
      }
    }

    return allResources;
  }

  /**
   * Call a tool on a specific server
   */
  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    const client = this.clients.get(toolCall.serverName);
    
    if (!client) {
      return {
        success: false,
        error: `Server ${toolCall.serverName} is not connected`
      };
    }

    try {
      const result = await client.callTool({
        name: toolCall.toolName,
        arguments: toolCall.arguments
      });

      return {
        success: true,
        content: result.content,
        isText: Boolean(result.isText)
      };

    } catch (error: any) {
      logger.error(`Error calling tool ${toolCall.toolName} on server ${toolCall.serverName}: ${error.message}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get resource content from a specific server
   */
  async getResource(serverName: string, uri: string): Promise<MCPResourceContent | null> {
    const client = this.clients.get(serverName);
    
    if (!client) {
      logger.error(`Server ${serverName} is not connected`);
      return null;
    }

    try {
      const resource = await client.getResource({ uri });
      
      return {
        uri: String(resource.uri || uri),
        mimeType: resource.mimeType ? String(resource.mimeType) : undefined,
        text: resource.text ? String(resource.text) : undefined,
        blob: resource.blob ? String(resource.blob) : undefined
      };

    } catch (error: any) {
      logger.error(`Error getting resource ${uri} from server ${serverName}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get connection status for all servers
   */
  getConnectionStatuses(): MCPConnectionStatus[] {
    return Array.from(this.connectionStatus.values());
  }

  /**
   * Get connection status for a specific server
   */
  getConnectionStatus(serverName: string): MCPConnectionStatus | undefined {
    return this.connectionStatus.get(serverName);
  }

  /**
   * Check if a server is connected
   */
  isServerConnected(serverName: string): boolean {
    const status = this.connectionStatus.get(serverName);
    return status?.connected || false;
  }

  /**
   * Get list of connected server names
   */
  getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Ping a specific server to check connectivity
   */
  async pingServer(serverName: string): Promise<boolean> {
    const client = this.clients.get(serverName);
    
    if (!client) {
      return false;
    }

    try {
      await client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Ping all connected servers
   */
  async pingAllServers(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    for (const serverName of this.clients.keys()) {
      const isAlive = await this.pingServer(serverName);
      results.set(serverName, isAlive);
      
      // Update connection status
      const status = this.connectionStatus.get(serverName);
      if (status) {
        status.connected = isAlive;
        if (!isAlive) {
          status.error = 'Server not responding to ping';
        }
      }
    }
    
    return results;
  }

  /**
   * Get tools from a specific server
   */
  async getServerTools(serverName: string): Promise<MCPTool[]> {
    const client = this.clients.get(serverName);
    
    if (!client) {
      return [];
    }

    try {
      const tools = await client.getAllTools();
      
      return tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        serverName
      }));

    } catch (error: any) {
      logger.error(`Error getting tools from server ${serverName}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get resources from a specific server
   */
  async getServerResources(serverName: string): Promise<MCPResource[]> {
    const client = this.clients.get(serverName);
    
    if (!client) {
      return [];
    }

    try {
      const resources = await client.getAllResources();
      
      return resources.map(resource => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
        serverName
      }));

    } catch (error: any) {
      logger.error(`Error getting resources from server ${serverName}: ${error.message}`);
      return [];
    }
  }
}

// Export singleton instance
export const kilocodeMCPClient = new KilocodeMCPClient();