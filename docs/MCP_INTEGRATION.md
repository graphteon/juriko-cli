# MCP (Model Context Protocol) Integration

JURIKO CLI now supports MCP (Model Context Protocol) integration, allowing you to connect to local and remote MCP servers to extend the AI's capabilities with additional tools and resources.

## Overview

The MCP integration provides:
- Support for local (stdio), HTTP stream, and SSE MCP servers
- Automatic tool discovery and integration
- Resource access from MCP servers
- Configuration management through `~/.juriko/mcp-settings.json`
- Connection status monitoring and error handling

## Configuration

MCP servers are configured through the `~/.juriko/mcp-settings.json` file. This file is automatically created with example configurations when you first run JURIKO CLI.

### Configuration File Location

```
~/.juriko/mcp-settings.json
```

### Configuration Structure

```json
{
  "mcpServers": {
    "server-name": {
      "type": "stdio|httpStream|sse",
      "description": "Server description",
      "enabled": true|false,
      
      // For stdio servers
      "command": "command-to-run",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR": "value"
      },
      
      // For httpStream and sse servers
      "url": "http://localhost:8080/endpoint",
      "headers": {
        "Authorization": "Bearer token"
      },
      
      // Connection settings
      "timeout": 30000,
      "retryAttempts": 3,
      "retryDelay": 1000
    }
  },
  "globalTimeout": 30000,
  "enableLogging": true,
  "logLevel": "info"
}
```

## Server Types

### Local Servers (stdio)

Local servers run as child processes and communicate via standard input/output.

```json
{
  "filesystem": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path"],
    "env": {
      "NODE_ENV": "production"
    },
    "enabled": true,
    "description": "Local filesystem operations"
  }
}
```

### HTTP Stream Servers

HTTP stream servers communicate via HTTP streaming.

```json
{
  "http-server": {
    "type": "httpStream",
    "url": "http://localhost:8080/mcp",
    "headers": {
      "Authorization": "Bearer your-api-key",
      "Content-Type": "application/json"
    },
    "enabled": true,
    "description": "HTTP stream MCP server"
  }
}
```

### SSE Servers

SSE servers communicate via Server-Sent Events over HTTP.

```json
{
  "sse-server": {
    "type": "sse",
    "url": "http://localhost:8080/sse",
    "headers": {
      "Authorization": "Bearer your-api-key"
    },
    "enabled": true,
    "description": "SSE-based MCP server"
  }
}
```

## Popular MCP Servers

### Official MCP Servers

1. **Filesystem Server**
   ```json
   {
     "filesystem": {
       "type": "stdio",
       "command": "npx",
       "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"],
       "enabled": true,
       "description": "Access local filesystem"
     }
   }
   ```

2. **Brave Search Server**
   ```json
   {
     "brave-search": {
       "type": "stdio",
       "command": "npx",
       "args": ["-y", "@modelcontextprotocol/server-brave-search"],
       "env": {
         "BRAVE_API_KEY": "your_api_key_here"
       },
       "enabled": true,
       "description": "Web search via Brave API"
     }
   }
   ```

3. **Git Server**
   ```json
   {
     "git": {
       "type": "stdio",
       "command": "npx",
       "args": ["-y", "@modelcontextprotocol/server-git", "--repository", "."],
       "enabled": true,
       "description": "Git operations"
     }
   }
   ```

4. **SQLite Server**
   ```json
   {
     "sqlite": {
       "type": "stdio",
       "command": "npx",
       "args": ["-y", "@modelcontextprotocol/server-sqlite", "--db-path", "./database.sqlite"],
       "enabled": true,
       "description": "SQLite database access"
     }
   }
   ```

## Tool Usage

Once MCP servers are configured and connected, their tools become available in JURIKO with the naming pattern `mcp_{server}_{tool}`.

### Examples

- `mcp_filesystem_read_file` - Read files through filesystem server
- `mcp_brave_search_web_search` - Search the web using Brave Search
- `mcp_git_commit` - Make git commits through git server
- `mcp_sqlite_query` - Execute SQL queries through SQLite server

## Resource Access

MCP servers can also provide resources (data sources) that JURIKO can access for context:

- File contents from filesystem servers
- API responses from web services
- Database query results
- System information

## Configuration Management

### Enable/Disable Servers

Set `"enabled": true` or `"enabled": false` in the server configuration.

### Connection Settings

- `timeout`: Connection timeout in milliseconds (default: 30000)
- `retryAttempts`: Number of retry attempts on failure (default: 3)
- `retryDelay`: Delay between retries in milliseconds (default: 1000)

### Global Settings

- `globalTimeout`: Default timeout for all servers
- `enableLogging`: Enable MCP logging
- `logLevel`: Log level (debug, info, warn, error)

## Troubleshooting

### Common Issues

1. **Server Not Starting**
   - Check that the command and arguments are correct
   - Verify required dependencies are installed
   - Check environment variables are set

2. **Connection Failures**
   - Verify URLs are accessible
   - Check authentication headers
   - Review firewall settings

3. **Tool Not Available**
   - Ensure server is enabled and connected
   - Check server supports the expected tools
   - Verify tool naming matches expected pattern

### Debugging

Enable debug logging by setting:
```json
{
  "enableLogging": true,
  "logLevel": "debug"
}
```

### Log Files

MCP logs are integrated with JURIKO's logging system. Check the console output for connection status and error messages.

## Security Considerations

- Only enable servers you trust
- Use authentication headers for remote servers
- Limit filesystem server access to specific directories
- Review server permissions and capabilities
- Keep MCP server packages updated

## Example Complete Configuration

```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"],
      "enabled": true,
      "description": "Local filesystem access",
      "timeout": 30000,
      "retryAttempts": 3,
      "retryDelay": 1000
    },
    "brave-search": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "BSA_API_KEY_HERE"
      },
      "enabled": true,
      "description": "Web search capabilities",
      "timeout": 30000,
      "retryAttempts": 3,
      "retryDelay": 1000
    },
    "remote-api": {
      "type": "sse",
      "url": "https://api.example.com/mcp/sse",
      "headers": {
        "Authorization": "Bearer your-jwt-token",
        "X-API-Version": "v1"
      },
      "enabled": true,
      "description": "Remote API server",
      "timeout": 45000,
      "retryAttempts": 5,
      "retryDelay": 2000
    }
  },
  "globalTimeout": 30000,
  "enableLogging": true,
  "logLevel": "info"
}
```

This configuration provides filesystem access, web search capabilities, and connection to a remote API server, giving JURIKO a comprehensive set of tools to work with.