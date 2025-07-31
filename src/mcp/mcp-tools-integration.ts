import { MCPTool, MCPToolCall, MCPToolResult } from './types';
import { jurikoMCPClient } from './client';
import { JurikoTool } from '../juriko/client';
import { logger } from '../utils/logger';
import { validateArgumentTypes } from '../utils/argument-parser';

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
    const sanitizedServerName = this.sanitizeToolName(mcpTool.serverName);
    const sanitizedToolName = this.sanitizeToolName(mcpTool.name);
    const fullToolName = `mcp_${sanitizedServerName}_${sanitizedToolName}`;
    
    return {
      type: 'function',
      function: {
        name: fullToolName,
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
   * Sanitize tool name to match pattern ^[a-zA-Z0-9_-]{1,128}$
   */
  private sanitizeToolName(name: string): string {
    // Replace any character that's not alphanumeric, underscore, or hyphen with underscore
    let sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // Remove consecutive underscores
    sanitized = sanitized.replace(/_+/g, '_');
    
    // Remove leading/trailing underscores
    sanitized = sanitized.replace(/^_+|_+$/g, '');
    
    // Ensure it's not empty and not too long
    if (!sanitized) {
      sanitized = 'tool';
    }
    
    // Truncate to 64 characters to leave room for prefixes
    if (sanitized.length > 64) {
      sanitized = sanitized.substring(0, 64);
    }
    
    return sanitized;
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
    return validateArgumentTypes(args, schema);
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
    
    const sanitizedServerName = withoutPrefix.substring(0, firstUnderscoreIndex);
    const sanitizedToolName = withoutPrefix.substring(firstUnderscoreIndex + 1);
    
    // Find the original tool by matching sanitized names
    const matchingTool = this.mcpTools.find(tool => {
      const expectedSanitizedServerName = this.sanitizeToolName(tool.serverName);
      const expectedSanitizedToolName = this.sanitizeToolName(tool.name);
      return expectedSanitizedServerName === sanitizedServerName &&
             expectedSanitizedToolName === sanitizedToolName;
    });
    
    if (matchingTool) {
      return { serverName: matchingTool.serverName, toolName: matchingTool.name };
    }
    
    // Fallback to sanitized names if no match found
    return { serverName: sanitizedServerName, toolName: sanitizedToolName };
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