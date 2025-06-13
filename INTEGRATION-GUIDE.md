# Memory Pickle MCP Integration Guide

This guide explains how to integrate Memory Pickle MCP with different AI agent IDEs and platforms.

## 🎯 Universal MCP Configuration

Memory Pickle MCP works with any MCP-compatible client. The server provides 13 tools for persistent project management and memory.

### Core Configuration Template
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
- `MEMORY_PICKLE_DATA_DIR`: Custom data directory (default: `.memory-pickle/`)

### Advanced Configuration
```json
{
  "mcpServers": {
    "memory-pickle": {
      "command": "node",
      "args": ["/path/to/build/index.js"],
      "env": {
        "NODE_ENV": "production",
        "MEMORY_PICKLE_DATA_DIR": "/custom/path/.memory-pickle"
      },
      "cwd": "/path/to/working/directory"
    }
  }
}
```

## 🛠️ Available Tools (13 Total)

### Project Management (4 tools)
- `create_project` - Initialize new projects
- `get_project_status` - View project overview and tasks
- `set_current_project` - Switch between projects
- `generate_handoff_summary` - Create session summaries

### Task Management (4 tools)
- `create_task` - Add new tasks with auto-priority detection
- `toggle_task` - Mark tasks complete/incomplete
- `update_task_progress` - Update progress, notes, blockers
- `get_tasks` - Filter and display tasks

### Memory Management (2 tools)
- `remember_this` - Store important decisions and context
- `recall_context` - Search and retrieve memories

### Utilities (3 tools)
- `export_to_markdown` - Generate project documentation
- `apply_template` - Use planning templates (project_checklist, sprint_planning, daily_standup)
- `list_categories` - Show overview and statistics

## 📁 Data Storage

Memory Pickle stores data in `.memory-pickle/` directory:
- `projects.yaml` - Project data and metadata
- `tasks.yaml` - Task hierarchy and progress
- `memories.yaml` - Persistent memories
- `meta.yaml` - Session tracking and settings

## 🔍 Testing Your Integration

1. **Verify Server**: `node build/index.js` should output "Memory Pickle MCP server v2.0 running"
2. **Test with Inspector**: `npm run inspector` opens web interface at http://localhost:6274
3. **Check Tools**: All 13 tools should be listed and callable
4. **Test Basic Flow**:
   ```
   create_project → create_task → get_project_status → toggle_task
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