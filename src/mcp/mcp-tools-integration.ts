import { MCPTool, MCPToolCall, MCPToolResult } from './types';
import { jurikoMCPClient } from './client';
import { JurikoTool } from '../juriko/client';
import { logger } from '../utils/logger';

/**
 * Integration layer that converts MCP tools to Juriko tools format
 */
export class MCPToolsIntegration {
  private mcpTools: MCPTool[] = [];

  /**
   * Load all MCP tools from connected servers
   */
  async loadMCPTools(): Promise<void> {
    try {
      this.mcpTools = await jurikoMCPClient.getAllTools();
      logger.info(`Loaded ${this.mcpTools.length} MCP tools from connected servers`);
    } catch (error: any) {
      logger.error(`Error loading MCP tools: ${error.message}`);
      this.mcpTools = [];
    }
  }

  /**
   * Get all MCP tools in Juriko format
   */
  getJurikoTools(): JurikoTool[] {
    return this.mcpTools.map(mcpTool => this.convertMCPToolToJuriko(mcpTool));
  }

  /**
   * Convert MCP tool to Juriko tool format
   */
  private convertMCPToolToJuriko(mcpTool: MCPTool): JurikoTool {
    return {
      type: 'function',
      function: {
        name: `mcp_${mcpTool.serverName}_${mcpTool.name}`,
        description: `[MCP:${mcpTool.serverName}] ${mcpTool.description}`,
        parameters: {
          type: 'object',
          properties: mcpTool.inputSchema.properties || {},
          required: mcpTool.inputSchema.required || []
        }
      }
    };
  }

  /**
   * Execute MCP tool call
   */
  async executeMCPTool(toolName: string, args: any): Promise<MCPToolResult> {
    // Parse the tool name to extract server and tool info
    const parsed = this.parseToolName(toolName);
    if (!parsed) {
      return {
        success: false,
        error: `Invalid MCP tool name format: ${toolName}`
      };
    }

    const { serverName, toolName: originalToolName } = parsed;

    // Find the original MCP tool
    const mcpTool = this.mcpTools.find(
      tool => tool.serverName === serverName && tool.name === originalToolName
    );

    if (!mcpTool) {
      return {
        success: false,
        error: `MCP tool not found: ${originalToolName} on server ${serverName}`
      };
    }

    // Validate arguments against schema if available
    const validationError = this.validateArguments(args, mcpTool.inputSchema);
    if (validationError) {
      return {
        success: false,
        error: `Invalid arguments: ${validationError}`
      };
    }

    // Execute the tool call
    const toolCall: MCPToolCall = {
      serverName,
      toolName: originalToolName,
      arguments: args
    };

    try {
      const result = await jurikoMCPClient.callTool(toolCall);
      logger.info(`Executed MCP tool ${toolName} successfully`);
      return result;
    } catch (error: any) {
      logger.error(`Error executing MCP tool ${toolName}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate arguments against input schema
   */
  private validateArguments(args: any, schema: any): string | null {
    if (!schema || !schema.properties) {
      return null; // No validation if schema is not available
    }

    // Check required properties
    if (schema.required) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in args)) {
          return `Missing required property: ${requiredProp}`;
        }
      }
    }

    // Basic type validation for known properties
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (propName in args) {
        const value = args[propName];
        const propSchemaObj = propSchema as any;
        
        if (propSchemaObj.type) {
          const expectedType = propSchemaObj.type;
          const actualType = typeof value;
          
          // Simple type checking
          if (expectedType === 'string' && actualType !== 'string') {
            return `Property ${propName} should be a string, got ${actualType}`;
          }
          if (expectedType === 'number' && actualType !== 'number') {
            return `Property ${propName} should be a number, got ${actualType}`;
          }
          if (expectedType === 'boolean' && actualType !== 'boolean') {
            return `Property ${propName} should be a boolean, got ${actualType}`;
          }
          if (expectedType === 'array' && !Array.isArray(value)) {
            return `Property ${propName} should be an array`;
          }
          if (expectedType === 'object' && (actualType !== 'object' || Array.isArray(value))) {
            return `Property ${propName} should be an object`;
          }
        }
      }
    }

    return null;
  }

  /**
   * Get MCP tool by Juriko tool name
   */
  getMCPToolByJurikoName(jurikoToolName: string): MCPTool | null {
    const parsed = this.parseToolName(jurikoToolName);
    if (!parsed) {
      return null;
    }

    const { serverName, toolName: originalToolName } = parsed;
    return this.mcpTools.find(
      tool => tool.serverName === serverName && tool.name === originalToolName
    ) || null;
  }

  /**
   * Parse MCP tool name correctly handling underscores
   */
  private parseToolName(toolName: string): { serverName: string; toolName: string } | null {
    if (!toolName.startsWith('mcp_')) {
      return null;
    }
    
    const withoutPrefix = toolName.substring(4); // Remove 'mcp_'
    const firstUnderscoreIndex = withoutPrefix.indexOf('_');
    
    if (firstUnderscoreIndex === -1) {
      return null;
    }
    
    const serverName = withoutPrefix.substring(0, firstUnderscoreIndex);
    const originalToolName = withoutPrefix.substring(firstUnderscoreIndex + 1);
    
    return { serverName, toolName: originalToolName };
  }

  /**
   * Get all available MCP tools grouped by server
   */
  getToolsByServer(): Map<string, MCPTool[]> {
    const toolsByServer = new Map<string, MCPTool[]>();
    
    for (const tool of this.mcpTools) {
      if (!toolsByServer.has(tool.serverName)) {
        toolsByServer.set(tool.serverName, []);
      }
      toolsByServer.get(tool.serverName)!.push(tool);
    }
    
    return toolsByServer;
  }

  /**
   * Check if a tool name is an MCP tool
   */
  isMCPTool(toolName: string): boolean {
    return toolName.startsWith('mcp_');
  }

  /**
   * Get tool count by server
   */
  getToolCountByServer(): Map<string, number> {
    const countByServer = new Map<string, number>();
    
    for (const tool of this.mcpTools) {
      const currentCount = countByServer.get(tool.serverName) || 0;
      countByServer.set(tool.serverName, currentCount + 1);
    }
    
    return countByServer;
  }

  /**
   * Refresh tools from all connected servers
   */
  async refreshTools(): Promise<void> {
    await this.loadMCPTools();
  }

  /**
   * Get tools from a specific server
   */
  getToolsFromServer(serverName: string): MCPTool[] {
    return this.mcpTools.filter(tool => tool.serverName === serverName);
  }

  /**
   * Search tools by name or description
   */
  searchTools(query: string): MCPTool[] {
    const lowerQuery = query.toLowerCase();
    return this.mcpTools.filter(tool => 
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.description.toLowerCase().includes(lowerQuery)
    );
  }
}

// Export singleton instance
export const mcpToolsIntegration = new MCPToolsIntegration();