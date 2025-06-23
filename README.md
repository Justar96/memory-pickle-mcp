# Memory Pickle MCP

**Project management and session memory for AI agents.** Provides 13 comprehensive MCP tools for tracking projects, tasks, and context during AI coding sessions.

### suggestion
*for kilo , cline , roo perform best with code mode your agent will not lose track. there are some struggle with HITL*

## Quick Start

### Stable Version
```json
{
  "mcpServers": {
    "memory-pickle": {
      "command": "npx",
      "args": ["-y", "@cabbages/memory-pickle-mcp@latest"]
    }
  }
}
```
## Compatibility

**Extensively Tested & Optimized For:**
- **Cursor** , **Windsurf** , **Cline, Roo, Kilo Mode Code**

**Additional Support:**
- Claude Desktop (direct MCP integration)
- VS Code with MCP extensions

## Architecture Overview

**Memory-Only Storage Architecture:**
- All data exists only during the current chat session
- No files created on disk - zero filesystem dependencies
- Data automatically cleared when session ends
- Blazing fast performance with in-memory operations
- Complete session isolation for security

**13-Tool Comprehensive System:**
- **4 Read Tools:** State recall, task listing, project overview, detailed task info
- **5 Write Tools:** Project/task creation and updates, context switching
- **2 Memory Tools:** Information storage and contextual search
- **2 Session Tools:** Data export and handoff summary generation

## Features

### **Hierarchical Task Organization**
```yaml
# Create parent task
create_task:
  title: "Build Authentication System"
  priority: "high"

# Create subtasks
create_task:
  title: "Implement login API"
  parent_id: "task_123"  # Links to parent
  
create_task:
  title: "Add password reset flow"
  parent_id: "task_123"
```

### **Progress Tracking & Blockers**
```yaml
# Comprehensive task updates
update_task:
  task_id: "task_123"
  progress: 75
  notes: ["API endpoints complete", "Working on validation"]
  blockers: ["Waiting for security review", "Database schema pending"]
  completed: false
```

### **Memory System with Importance**
```yaml
# Store critical decisions
remember_this:
  content: "Switched from JWT to session cookies for security"
  importance: "critical"
  project_id: "proj_auth"

# Search by importance level
recall_context:
  query: "security decision"
  importance: "critical"
  limit: 5
```

## Workflow

### **Session Handoff**
```yaml
# Generate clean transition summary
generate_handoff_summary:
  format: "detailed"
  project_id: "current"

# Export for permanent storage
export_session:
  format: "markdown"
  include_handoff: true
  raw_markdown: true  # Clean output for processing
```

### **Integration Notes**
- **Context switching:** Agents may lose context between tool calls (in some case)
- **State synchronization:** Use `recall_state` to refresh context
- **Error handling:** Tools provide detailed error information
  *send me issues <3*

## Requirements
- **Node.js:** 16.0.0 or higher

## Links & Resources

- **Official Website:** [pickle.cabbages.work](https://pickle.cabbages.work)
- **GitHub Repository:** [Justar96/memory-pickle-mcp](https://github.com/Justar96/memory-pickle-mcp)
- **NPM Package:** [@cabbages/memory-pickle-mcp](https://www.npmjs.com/package/@cabbages/memory-pickle-mcp)
- **Pre-release:** [@cabbages-pre/memory-pickle-mcp-pre](https://www.npmjs.com/package/@cabbages-pre/memory-pickle-mcp-pre)

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
### Pre-release Version (Latest Development)
```json
{
  "mcpServers": {
    "memory-pickle-pre": {
      "command": "npx",
      "args": ["-y", "@cabbages-pre/memory-pickle-mcp-pre@latest"]
    }
  }
}
```

## Documentation

- [Complete Tools Reference](docs/TOOLS.md) - All 13 tools with examples
- [Usage Guide](docs/USAGE.md) - Workflows and best practices
- [Changelog](docs/CHANGELOG.md) - Version history and updates

## Troubleshooting

### **Tools Not Working**
1. Update to latest version: `npx -y @cabbages/memory-pickle-mcp` Use `@latest` flag
2. Verify MCP client configuration in settings
3. Check Node.js version: `node --version`
4. Restart MCP server for complete reset

### **Data Loss Prevention**
1. Tell Agent to use `generate_handoff_summary` before ending sessions
2. Export critical data with `export_session`
3. Save important decisions as markdown files
4. Document project state in external files

## Version Information

**Current Version:** 1.3.9

**Recent Changes:**
- **13 comprehensive tools** for complete project management
- Advanced hierarchical task organization with parent-child relationships
- Code location linking for development context
- Importance-based memory classification system
- Comprehensive session export and handoff capabilities
- Optimized for modern AI coding assistants (Cursor, Cline, Roo, etc.)

## License

Apache 2.0 - See [LICENSE](LICENSE) for details
