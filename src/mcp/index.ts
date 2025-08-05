import { mcpSettingsManager } from './settings-manager';
import { kilocodeMCPClient } from './client';
import { mcpToolsIntegration } from './mcp-tools-integration';
import { MCPServerConfig, MCPConnectionStatus, MCPTool, MCPResource } from './types';
import { logger } from '../utils/logger';

/**
 * Main MCP Manager that coordinates all MCP functionality
 */
export class MCPManager {
  private initialized = false;

  /**
   * Initialize MCP system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initializing MCP system...');

      // Load settings
      const settings = mcpSettingsManager.loadSettings();
      const serverCount = Object.keys(settings.mcpServers).length;
      logger.info(`Loaded MCP settings with ${serverCount} configured servers`);

      // Connect to enabled servers
      const enabledServers = mcpSettingsManager.getEnabledServers();
      logger.info(`Found ${enabledServers.length} enabled MCP servers`);

      if (enabledServers.length > 0) {
        await this.connectToServers(enabledServers);
        
        // Load tools from connected servers
        await mcpToolsIntegration.loadMCPTools();
      }

      this.initialized = true;
      logger.info('MCP system initialized successfully');

    } catch (error: any) {
      logger.error(`Failed to initialize MCP system: ${error.message}`);
      throw error;
    }
  }

  /**
   * Connect to multiple servers
   */
  private async connectToServers(servers: Array<{ name: string; config: MCPServerConfig }>): Promise<void> {
    const connectionPromises = servers.map(async ({ name, config }) => {
      try {
        const connected = await kilocodeMCPClient.connectServer(name, config);
        if (connected) {
          logger.info(`✅ Connected to MCP server: ${name}`);
        } else {
          logger.warn(`❌ Failed to connect to MCP server: ${name}`);
        }
        return { server: name, connected };
      } catch (error: any) {
        logger.error(`❌ Error connecting to MCP server ${name}: ${error.message}`);
        return { server: name, connected: false };
      }
    });

    const results = await Promise.all(connectionPromises);
    const connectedCount = results.filter(r => r.connected).length;
    
    logger.info(`Connected to ${connectedCount}/${servers.length} MCP servers`);
  }

  /**
   * Shutdown MCP system
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      logger.info('Shutting down MCP system...');
      await kilocodeMCPClient.disconnectAll();
      this.initialized = false;
      logger.info('MCP system shutdown complete');
    } catch (error: any) {
      logger.error(`Error during MCP shutdown: ${error.message}`);
    }
  }

  /**
   * Get all available MCP tools in Juriko format
   */
  async getAvailableJurikoTools(): Promise<any[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return mcpToolsIntegration.getKilocodeTools();
  }

  /**
   * Get all available MCP tools in MCP format
   */
  async getAvailableMCPTools(): Promise<MCPTool[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return kilocodeMCPClient.getAllTools();
  }

  /**
   * Get all available MCP resources
   */
  async getAvailableResources(): Promise<MCPResource[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return kilocodeMCPClient.getAllResources();
  }

  /**
   * Execute an MCP tool
   */
  async executeTool(toolName: string, args: any): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!mcpToolsIntegration.isMCPTool(toolName)) {
      throw new Error(`${toolName} is not an MCP tool`);
    }

    return mcpToolsIntegration.executeMCPTool(toolName, args);
  }

  /**
   * Get resource content
   */
  async getResource(serverName: string, uri: string): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }
    return kilocodeMCPClient.getResource(serverName, uri);
  }

  /**
   * Get connection status for all servers
   */
  getConnectionStatuses(): MCPConnectionStatus[] {
    return kilocodeMCPClient.getConnectionStatuses();
  }

  /**
   * Refresh connections and tools
   */
  async refresh(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
      return;
    }

    try {
      logger.info('Refreshing MCP connections...');
      
      // Ping all servers to check connectivity
      await kilocodeMCPClient.pingAllServers();
      
      // Reload tools
      await mcpToolsIntegration.refreshTools();
      
      logger.info('MCP refresh complete');
    } catch (error: any) {
      logger.error(`Error during MCP refresh: ${error.message}`);
    }
  }

  /**
   * Add a new server configuration
   */
  async addServer(serverName: string, config: MCPServerConfig): Promise<boolean> {
    try {
      // Validate configuration
      const errors = mcpSettingsManager.validateServerConfig(config);
      if (errors.length > 0) {
        logger.error(`Invalid server configuration: ${errors.join(', ')}`);
        return false;
      }

      // Add to settings
      mcpSettingsManager.addOrUpdateServer(serverName, config);

      // If enabled, try to connect
      if (config.enabled !== false && this.initialized) {
        const connected = await kilocodeMCPClient.connectServer(serverName, config);
        if (connected) {
          await mcpToolsIntegration.refreshTools();
          logger.info(`Added and connected to MCP server: ${serverName}`);
        } else {
          logger.warn(`Added MCP server ${serverName} but failed to connect`);
        }
      }

      return true;
    } catch (error: any) {
      logger.error(`Error adding MCP server: ${error.message}`);
      return false;
    }
  }

  /**
   * Remove a server configuration
   */
  async removeServer(serverName: string): Promise<boolean> {
    try {
      // Disconnect if connected
      if (kilocodeMCPClient.isServerConnected(serverName)) {
        await kilocodeMCPClient.disconnectServer(serverName);
      }

      // Remove from settings
      const removed = mcpSettingsManager.removeServer(serverName);
      
      if (removed && this.initialized) {
        await mcpToolsIntegration.refreshTools();
        logger.info(`Removed MCP server: ${serverName}`);
      }

      return removed;
    } catch (error: any) {
      logger.error(`Error removing MCP server: ${error.message}`);
      return false;
    }
  }

  /**
   * Enable or disable a server
   */
  async setServerEnabled(serverName: string, enabled: boolean): Promise<boolean> {
    try {
      const success = mcpSettingsManager.setServerEnabled(serverName, enabled);
      
      if (success && this.initialized) {
        if (enabled) {
          // Connect to the server
          const config = mcpSettingsManager.getServer(serverName);
          if (config) {
            const connected = await kilocodeMCPClient.connectServer(serverName, config);
            if (connected) {
              await mcpToolsIntegration.refreshTools();
            }
          }
        } else {
          // Disconnect from the server
          await kilocodeMCPClient.disconnectServer(serverName);
          await mcpToolsIntegration.refreshTools();
        }
      }

      return success;
    } catch (error: any) {
      logger.error(`Error ${enabled ? 'enabling' : 'disabling'} MCP server: ${error.message}`);
      return false;
    }
  }

  /**
   * Get server configurations
   */
  getServerConfigs(): Array<{ name: string; config: MCPServerConfig }> {
    const settings = mcpSettingsManager.loadSettings();
    return Object.entries(settings.mcpServers).map(([name, config]) => ({ name, config }));
  }

  /**
   * Get tools grouped by server
   */
  getToolsByServer(): Map<string, MCPTool[]> {
    return mcpToolsIntegration.getToolsByServer();
  }

  /**
   * Search tools
   */
  searchTools(query: string): MCPTool[] {
    return mcpToolsIntegration.searchTools(query);
  }

  /**
   * Check if MCP system is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get MCP settings file path
   */
  getSettingsPath(): string {
    return mcpSettingsManager.getSettingsPath();
  }
}

// Export singleton instance
export const mcpManager = new MCPManager();

// Export all types and utilities
export * from './types';
export { mcpSettingsManager } from './settings-manager';
export { kilocodeMCPClient } from './client';
export { mcpToolsIntegration } from './mcp-tools-integration';