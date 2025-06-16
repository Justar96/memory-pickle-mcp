# Memory Pickle MCP

Project management and session memory for AI agents. Provides 8 essential MCP tools for tracking projects, tasks, and context during chat sessions.

### suggestion
*for kilo , cline , roo perform best with code mode your agent will not lose track. there are some struggle with HITL*

## Quick Start

### Pre-release Version (Latest Development)
```json
{
  "mcpServers": {
    "memory-pickle-pre": {
      "command": "npx",
      "args": ["-y", "@cabbages-pre/memory-pickle-mcp-pre"]
    }
  }
}
```

### Stable Version
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

### Local Development
```json
{
  "mcpServers": {
    "memory-pickle-dev": {
      "command": "node",
      "args": ["build/index.js"],
      "cwd": "/path/to/your/memory-pickle-mcp"
    }
  }
}
```

## Links

- **Website:** [pickle.cabbages.work](https://pickle.cabbages.work)
- **GitHub:** [Justar96/memory-pickle-mcp](https://github.com/Justar96/memory-pickle-mcp)
- **NPM:** [@cabbages/memory-pickle-mcp](https://www.npmjs.com/package/@cabbages/memory-pickle-mcp)
- **Pre-release version**[@cabbages-pre/memory-pickle-mcp-pre](https://www.npmjs.com/package/@cabbages-pre/memory-pickle-mcp-pre)

## How Memory Works

**Memory-Only Storage**
- All data exists only during the current chat session
- Nothing saved to disk - no files created
- Data is lost when the session ends
- Fast performance with no file system dependencies

**Session Continuity**
- During a session: All tools share the same data and current project context
- Between sessions: Use `generate_handoff_summary` before ending, save as markdown, reference in new sessions
- For permanent storage: Create your own markdown files for important information

## Tools

**Project Management**
- `create_project` - Create new project (becomes current)
- `set_current_project` - Switch between projects
- `get_project_status` - View project and task summary

**Task Management**
- `create_task` - Add task to current project
- `update_task` - Update progress, completion, notes

**Memory System**
- `remember_this` - Store important information
- `recall_context` - Search stored memories

**Session Management**
- `generate_handoff_summary` - Create transition summary (responds to 'handoff' trigger)

## Storage Details

**Memory-Only Storage**
- All data stored in memory during the session
- No files or directories created
- Data automatically cleared when session ends
- No setup or cleanup required

**For Permanent Storage**
- Create your own markdown files for important information
- Use `generate_handoff_summary` to create session summaries
- Save summaries as markdown files for future reference

## Configuration

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

## Requirements

- Node.js 16+
- MCP-compatible client (Claude Desktop, Cursor, etc.)

## Installation

**NPX (recommended):**
```bash
npx -y @cabbages/memory-pickle-mcp
```

**Global install:**
```bash
npm install -g @cabbages/memory-pickle-mcp
```

## Documentation

- [Installation Guide](docs/INSTALLATION.md) - Setup and troubleshooting
- [Tools Reference](docs/TOOLS.md) - Complete tool documentation
- [Usage Guide](docs/USAGE.md) - Workflows and best practices
- [Version Management](docs/VERSION-MANAGEMENT.md) - Centralized version control
- [Changelog](docs/CHANGELOG.md) - Version history

## Features

**Task Management**
- Hierarchical tasks with subtasks
- Priority levels (critical/high/medium/low)
- Progress tracking (0-100%)
- Blocker documentation

**Project Organization**
- Multiple concurrent projects
- Automatic task assignment to current project
- Project-level progress calculation

**Memory System**
- Categorized memory storage
- Importance levels (low/medium/high/critical)
- Search and retrieval functionality

**Session Continuity**
- Generates handoff summaries for session transitions
- Recommend saving summaries as markdown files
- Clean text output for universal compatibility

## Troubleshooting

**Data issues or agent confusion:**
- Restart the MCP server for complete reset (data is memory-only)
- See [Installation Guide](docs/INSTALLATION.md) for setup help

**Tools not working:**
- Update to latest version: `npx -y @cabbages/memory-pickle-mcp`
- Verify MCP client configuration
- Ensure Node.js 16+ is installed

## License

Apache 2.0

## Version

Current: 1.3.8

Recent changes:
- Simplified to memory-only storage (no file persistence)
- Clean text output only for universal compatibility
- Added `handoff` alias for easier session transitions
- Streamlined to 8 essential MCP tools + 1 alias
