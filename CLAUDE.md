# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run build` - Compile TypeScript to JavaScript (required before running)
- `npm run watch` - Watch TypeScript files and recompile on changes
- `npm test` - Run Jest tests with ESM support
- `npm run inspector` - Test server with MCP inspector tool
- `node build/index.js` - Run the MCP server directly
- `MEMORY_PICKLE_NO_EMOJIS=true node build/index.js` - Run in clean text mode

## Project Architecture

**Memory Pickle MCP** is a Model Context Protocol server that provides persistent memory for AI agents through project and task management.

### Core Architecture Layers

1. **MCP Server Layer** (`src/index.ts`) - Main server entry point handling tool calls and protocol communication
2. **Service Layer** (`src/services/`) - Business logic organized by domain:
   - `StorageService` - Database persistence with atomic operations and file locking
   - `ProjectService` - Project lifecycle and completion tracking
   - `TaskService` - Task CRUD, hierarchy, and progress calculation
   - `MemoryService` - Memory storage and handoff generation
3. **Tool Layer** (`src/tools/`) - MCP tool definitions organized by category (13 tools total)
4. **Data Layer** - Split-file YAML database stored in `.memory-pickle/` directory

### Key Design Patterns

- **Atomic Operations**: All database modifications use `storageService.runExclusive()` for data consistency
- **Split Database**: Separate YAML files for projects, tasks, memories, and metadata
- **Task Indexing**: In-memory Map for O(1) task lookups by ID
- **Service Pattern**: Each service has single responsibility with clear interfaces

### Database Schema

The system uses a split-file approach with these files in `.memory-pickle/`:
- `projects.yaml` - Project data and metadata
- `tasks.yaml` - Task hierarchy and progress tracking
- `memories.yaml` - Persistent memory storage
- `meta.yaml` - Session counters and current project state

### Important Implementation Details

- All database operations must be wrapped in `storageService.runExclusive()` for thread safety
- Task hierarchy is managed through `parent_id` and `subtasks` arrays
- Project completion percentages are calculated automatically when tasks change
- The server maintains an in-memory task index that must be rebuilt after database commits
- Tool method names must match exactly with the tool name for dynamic dispatch to work
- Emoji output is configurable via `MEMORY_PICKLE_NO_EMOJIS` environment variable

### MCP Integration

The server exposes 13 tools across 4 categories and automatically loads project status at session start. Tools are dynamically dispatched to methods on the main server class, so method names must match tool names exactly.

### Multi-Platform Support

Memory Pickle MCP works with any MCP-compatible client:
- **Claude Desktop**: Use `claude-desktop-config.json`
- **Cursor IDE**: Use `cursor-mcp-config.json` 
- **Windsurf IDE**: Use `windsurf-mcp-config.json`
- **VS Code Extensions**: Configure in extension settings
- **Continue.dev**: Add to `~/.continue/config.json`

All configurations use the same basic format:
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

See `INTEGRATION-GUIDE.md` for complete setup instructions for each platform.