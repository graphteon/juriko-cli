import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MCPSettings, MCPServerConfig } from './types';
import { logger } from '../utils/logger';

export class MCPSettingsManager {
  private settingsPath: string;
  private settings: MCPSettings | null = null;

  constructor() {
    const homeDir = os.homedir();
    const kilocodeDir = path.join(homeDir, '.kilocode');
    this.settingsPath = path.join(kilocodeDir, 'mcp-settings.json');

    // Ensure .kilocode directory exists
    if (!fs.existsSync(kilocodeDir)) {
      fs.mkdirSync(kilocodeDir, { recursive: true });
    }
  }

  /**
   * Load MCP settings from file
   */
  public loadSettings(): MCPSettings {
    if (this.settings) {
      return this.settings;
    }

    try {
      if (fs.existsSync(this.settingsPath)) {
        const settingsData = fs.readFileSync(this.settingsPath, 'utf8');
        this.settings = JSON.parse(settingsData);
        logger.info(`Loaded MCP settings from ${this.settingsPath}`);
      } else {
        // Create default settings if file doesn't exist
        this.settings = this.getDefaultSettings();
        this.saveSettings();
        logger.info(`Created default MCP settings at ${this.settingsPath}`);
      }
    } catch (error: any) {
      logger.error(`Error loading MCP settings: ${error.message}`);
      this.settings = this.getDefaultSettings();
    }

    return this.settings;
  }

  /**
   * Save MCP settings to file
   */
  public saveSettings(): void {
    if (!this.settings) {
      return;
    }

    try {
      const settingsData = JSON.stringify(this.settings, null, 2);
      fs.writeFileSync(this.settingsPath, settingsData, 'utf8');
      logger.info(`Saved MCP settings to ${this.settingsPath}`);
    } catch (error: any) {
      logger.error(`Error saving MCP settings: ${error.message}`);
    }
  }

  /**
   * Get default MCP settings
   */
  private getDefaultSettings(): MCPSettings {
    return {
      mcpServers: {
        'filesystem': {
          type: 'stdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed/files'],
          enabled: false,
          description: 'Local filesystem access server',
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000
        },
        'brave-search': {
          type: 'stdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-brave-search'],
          env: {
            'BRAVE_API_KEY': 'your_brave_api_key_here'
          },
          enabled: false,
          description: 'Brave Search API server',
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000
        },
        'example-sse': {
          type: 'sse',
          url: 'http://localhost:8080/sse',
          enabled: false,
          description: 'Example SSE-based MCP server',
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000
        },
        'example-http': {
          type: 'httpStream',
          url: 'http://localhost:8080/mcp',
          headers: {
            'Authorization': 'Bearer your_token_here'
          },
          enabled: false,
          description: 'Example HTTP stream MCP server',
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000
        }
      },
      globalTimeout: 30000,
      enableLogging: true,
      logLevel: 'info'
    };
  }

  /**
   * Get all enabled servers
   */
  public getEnabledServers(): Array<{ name: string; config: MCPServerConfig }> {
    const settings = this.loadSettings();
    return Object.entries(settings.mcpServers)
      .filter(([_, config]) => config.enabled !== false)
      .map(([name, config]) => ({ name, config }));
  }

  /**
   * Get server by name
   */
  public getServer(name: string): MCPServerConfig | undefined {
    const settings = this.loadSettings();
    return settings.mcpServers[name];
  }

  /**
   * Add or update a server configuration
   */
  public addOrUpdateServer(name: string, serverConfig: MCPServerConfig): void {
    const settings = this.loadSettings();
    const isUpdate = name in settings.mcpServers;
    
    settings.mcpServers[name] = serverConfig;
    
    logger.info(`${isUpdate ? 'Updated' : 'Added'} MCP server configuration: ${name}`);
    
    this.settings = settings;
    this.saveSettings();
  }

  /**
   * Remove a server configuration
   */
  public removeServer(name: string): boolean {
    const settings = this.loadSettings();
    
    if (name in settings.mcpServers) {
      delete settings.mcpServers[name];
      this.settings = settings;
      this.saveSettings();
      logger.info(`Removed MCP server configuration: ${name}`);
      return true;
    }
    
    return false;
  }

  /**
   * Enable or disable a server
   */
  public setServerEnabled(name: string, enabled: boolean): boolean {
    const settings = this.loadSettings();
    const server = settings.mcpServers[name];
    
    if (server) {
      server.enabled = enabled;
      this.settings = settings;
      this.saveSettings();
      logger.info(`${enabled ? 'Enabled' : 'Disabled'} MCP server: ${name}`);
      return true;
    }
    
    return false;
  }

  /**
   * Get all server names
   */
  public getServerNames(): string[] {
    const settings = this.loadSettings();
    return Object.keys(settings.mcpServers);
  }

  /**
   * Get settings file path
   */
  public getSettingsPath(): string {
    return this.settingsPath;
  }

  /**
   * Reload settings from file
   */
  public reloadSettings(): MCPSettings {
    this.settings = null;
    return this.loadSettings();
  }

  /**
   * Validate server configuration
   */
  public validateServerConfig(config: MCPServerConfig): string[] {
    const errors: string[] = [];

    if (!config.type || !['stdio', 'httpStream', 'sse'].includes(config.type)) {
      errors.push('Server type must be "stdio", "httpStream", or "sse"');
    }

    if (config.type === 'stdio') {
      if (!config.command || config.command.trim() === '') {
        errors.push('Command is required for stdio servers');
      }
    }

    if (config.type === 'httpStream' || config.type === 'sse') {
      if (!config.url || config.url.trim() === '') {
        errors.push('URL is required for httpStream and sse servers');
      } else {
        try {
          new URL(config.url);
        } catch {
          errors.push('Invalid URL format');
        }
      }
    }

    if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
      errors.push('Timeout must be between 1000ms and 300000ms');
    }

    if (config.retryAttempts && (config.retryAttempts < 0 || config.retryAttempts > 10)) {
      errors.push('Retry attempts must be between 0 and 10');
    }

    if (config.retryDelay && (config.retryDelay < 100 || config.retryDelay > 10000)) {
      errors.push('Retry delay must be between 100ms and 10000ms');
    }

    return errors;
  }
}

// Export singleton instance
export const mcpSettingsManager = new MCPSettingsManager();