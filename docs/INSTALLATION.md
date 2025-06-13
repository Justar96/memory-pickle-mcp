# Installation Guide

## Quick Install (Recommended)

Add to your MCP configuration file:

```json
{
  "mcpServers": {
    "memory-pickle": {
      "command": "npx",
      "args": ["-y", "@cabbages/memory-pickle-mcp"]
    }
  }
}
```

## Configuration File Locations

### Claude Desktop
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### Other MCP Clients
Check your client's documentation for the configuration file location.

## Alternative Installation Methods

### Global Installation
```bash
npm install -g @cabbages/memory-pickle-mcp
```

Then use:
```json
{
  "mcpServers": {
    "memory-pickle": {
      "command": "memory-pickle"
    }
  }
}
```

### Local Development
```bash
git clone https://github.com/cabbages/memory-pickle-mcp.git
cd memory-pickle-mcp
npm install
npm run build
```

Use with:
```json
{
  "mcpServers": {
    "memory-pickle": {
      "command": "node",
      "args": ["/path/to/memory-pickle-mcp/build/index.js"]
    }
  }
}
```

## Verification

After installation, start your MCP client. The agent should automatically load project status when you begin a conversation.

## Troubleshooting

### NPX Issues
If npx fails, try global installation instead.

### Permission Errors
On Unix systems, you might need to make the binary executable:
```bash
chmod +x /path/to/build/index.js
```

### Path Issues
Use absolute paths if relative paths don't work in your configuration.