# Memory Pickle MCP Integration Guide

This guide explains how to integrate Memory Pickle MCP with different AI agent IDEs and platforms.

## 🎯 Universal MCP Configuration

Memory Pickle MCP works with any MCP-compatible client. The server provides 8 essential tools for streamlined project management and memory.

### Core Configuration Template
```json
{
  "mcpServers": {
    "memory-pickle": {
      "command": "npx",
      "args": ["-y", "@cabbages/memory-pickle-mcp"],
      "env": {
        "NODE_ENV": "production",
        "MEMORY_PICKLE_WORKSPACE": "/path/to/your/project"
      }
    }
  }
}
```

## 🖥️ Platform-Specific Integration

### Claude Desktop
**Location**: `~/.claude_desktop_config.json` (Mac) or `%APPDATA%\Claude\config.json` (Windows)

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

### Cursor IDE
**Location**: Cursor settings → MCP Servers → Add Server

```json
{
  "mcpServers": {
    "memory-pickle": {
      "command": "npx",
      "args": ["-y", "@cabbages/memory-pickle-mcp"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Windsurf IDE
**Location**: Windsurf settings → Extensions → MCP Configuration

```json
{
  "mcpServers": {
    "memory-pickle": {
      "command": "npx",
      "args": ["-y", "@cabbages/memory-pickle-mcp"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### VS Code with Claude Extensions
**Location**: Extension settings or workspace `.vscode/settings.json`

```json
{
  "claude.mcpServers": {
    "memory-pickle": {
      "command": "npx",
      "args": ["-y", "@cabbages/memory-pickle-mcp"]
    }
  }
}
```

### Continue.dev (VS Code Extension)
**Location**: `~/.continue/config.json`

```json
{
  "mcpServers": [
    {
      "name": "memory-pickle",
      "command": "npx",
      "args": ["-y", "@cabbages/memory-pickle-mcp"]
    }
  ]
}
```

## 📦 Alternative: NPM Package Installation

For easier deployment across different environments:

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

## 🔧 Configuration Options

### Environment Variables
- `NODE_ENV`: Set to "production" for optimized performance
- `MEMORY_PICKLE_WORKSPACE`: Explicit project directory (agent will create `.memory-pickle/` here)
- `MEMORY_PICKLE_NO_EMOJIS`: Set to "true" to disable emojis for clean text output

### Advanced Configuration
```json
{
  "mcpServers": {
    "memory-pickle": {
      "command": "npx",
      "args": ["-y", "@cabbages/memory-pickle-mcp"],
      "env": {
        "NODE_ENV": "production",
        "MEMORY_PICKLE_WORKSPACE": "/path/to/your/project",
        "MEMORY_PICKLE_NO_EMOJIS": "true"
      }
    }
  }
}
```

### Clean Text Mode (No Emojis)
For corporate environments or personal preference, disable emojis:
```json
{
  "mcpServers": {
    "memory-pickle": {
      "command": "npx",
      "args": ["-y", "@cabbages/memory-pickle-mcp"],
      "env": {
        "MEMORY_PICKLE_NO_EMOJIS": "true"
      }
    }
  }
}
```

**With Emojis (Default):**
```
✅ Project created successfully!
📊 Project Status: My Project
⬜ Task 1 [high]
✅ Task 2 [medium]
```

**Without Emojis:**
```
[OK] Project created successfully!
## Project Status: My Project
[ ] Task 1 [high]
[DONE] Task 2 [medium]
```

## 🛠️ Available Tools (8 Essential Tools)

### Core Tools
1. **`get_project_status`** - Show current project status and tasks (auto-loads at session start)
2. **`create_project`** - Create new projects (automatically becomes current project)
3. **`create_task`** - Add tasks with auto-priority detection
4. **`update_task`** - Handle all task updates: completion, progress, notes, blockers
5. **`remember_this`** - Store important decisions and context
6. **`recall_context`** - Search and retrieve stored memories
7. **`generate_handoff_summary`** - Create session handoff summaries
8. **`set_current_project`** - Switch between multiple projects

### Simplified Design
- **One tool per function** - No redundancy or overlap
- **Smart defaults** - Tools work together automatically
- **Agent-friendly** - Clear, focused functionality
- **Essential only** - Removed rarely-used utilities and diagnostics

## 📁 Data Storage

Memory Pickle stores data in `.memory-pickle/` directory:
- `projects.yaml` - Project data and metadata
- `tasks.yaml` - Task hierarchy and progress
- `memories.yaml` - Persistent memories
- `meta.yaml` - Session tracking and settings

## 🔍 Testing Your Integration

1. **Verify Server**: `node build/index.js` should output "Memory Pickle MCP server v1.3.0 running"
2. **Test with Inspector**: `npm run inspector` opens web interface at http://localhost:6274
3. **Check Tools**: All 8 essential tools should be listed and callable
4. **Test Basic Flow**:
   ```
   create_project → create_task → get_project_status → update_task
   ```

## 🚨 Troubleshooting

### Common Issues
- **"Unknown tool" errors**: Ensure you're using snake_case tool names (e.g., `create_project` not `createProject`)
- **Path issues**: Use absolute paths in configuration
- **Permissions**: Ensure Node.js can read/write to data directory
- **Node version**: Requires Node.js 16+

### Debug Mode
```bash
NODE_ENV=development node build/index.js
```

### Verify Configuration
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node build/index.js
```

## 📱 Cross-Platform Notes

- **Windows**: Use backslashes in paths or forward slashes in JSON
- **macOS**: Standard Unix paths work
- **Linux**: Standard Unix paths work
- **WSL**: Use Linux paths, server runs in WSL environment

## 🔄 Updates and Maintenance

To update the server:
1. Pull latest changes: `git pull`
2. Rebuild: `npm run build`
3. Restart your IDE/client to reload the MCP server

The server automatically handles database migrations and maintains backward compatibility.