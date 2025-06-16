# Memory Pickle MCP 🥒

A Model Context Protocol server that gives AI agents persistent memory for project management. Your agent remembers what you're working on between chat sessions.

## 🚀 Quick Start

Add this to your MCP configuration:

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

for pre-release version:
```json
{
  "mcpServers": {
    "memory-pickle": {
      "command": "npx",
      "args": ["-y", "@cabbages-pre/memory-pickle-mcp-pre"]
    }
  }
}
```

That's it! Your agent will now remember your projects and tasks across sessions.

## 🔗 Links

- **🌐 Website:** [pickle.cabbages.work](https://pickle.cabbages.work)
- **📦 GitHub:** [Justar96/memory-pickle-mcp](https://github.com/Justar96/memory-pickle-mcp)
- **📋 NPM Package:** [@cabbages/memory-pickle-mcp](https://www.npmjs.com/package/@cabbages/memory-pickle-mcp)

## 🎯 What It Does

- **🧠 Remembers your work** - Agent loads your current project when you start chatting
- **📋 Tracks tasks automatically** - Creates tasks when you mention things to do
- **📊 Shows progress** - See what's done and what's left with completion percentages
- **🤝 Handles handoffs** - Get summaries to continue work in new chats
- **🏗️ Hierarchical tasks** - Support for subtasks and nested organization
- **⚡ Priority levels** - Critical, High, Medium, Low task prioritization
- **🚨 Blocker tracking** - Document and track what's preventing progress

## 💡 How It Works

The agent automatically:
1. **Loads project status** at the start of each session via `get_project_status`
2. **Creates tasks** when you mention work items using `create_task`
3. **Marks tasks complete** when you say they're done with `toggle_task`
4. **Tracks progress** and shows completion percentages
5. **Generates handoff summaries** for seamless session transitions

No special commands needed - just talk naturally about your work.

## 📖 Example Usage

**Starting a project:**
```
You: "I'm building a todo app with React"
Agent: I'll track this project for you.
✅ Created project: Todo App
📋 Added initial tasks based on your description
```

**Continuing work:**
```
You: "Hi, let's continue"
Agent: [Automatically loads via get_project_status]
📊 Todo App Project - 40% complete
✅ Set up React project
⬜ Create task component  
⬜ Add database integration
```

**Making progress:**
```
You: "I finished the task component"
Agent: Great! Marking that as complete.
✅ Task component - Done!
📈 Project is now 67% complete.
```

## 🛠️ Available Tools

The agent has access to **17 tools** organized in 5 categories:

### 📁 Project Management (4 tools)
- `create_project` - Initialize new project containers
- `get_project_status` - Show hierarchical task tree ⭐ *Auto-loads at session start*
- `update_project` - Modify project details and status
- `list_projects` - View all projects with completion status
- `set_current_project` - Switch between multiple projects
- `generate_handoff_summary` - Create session transitions

### ✅ Task Management (4 tools)
- `create_task` - Add tasks with automatic priority detection
- `update_task` - Modify task details and properties
- `toggle_task` - Complete/uncomplete with progress updates
- `update_task_progress` - Track progress, notes, and blockers
- `get_tasks` - Filter and display tasks by criteria

### 🧠 Memory Management (4 tools)
- `remember_this` - Store important decisions and context
- `add_memory` - Alternative memory storage method
- `recall_context` - Search and retrieve memories
- `search_memories` - Advanced memory search with filters

### 🔧 Utilities (3 tools)
- `export_to_markdown` - Generate documentation from project data
- `apply_template` - Guide users through structured planning
- `list_templates` - Show available planning templates
- `list_categories` - Show overview and available templates

### 🛡️ Data Integrity (3 tools)
- `validate_database` - Check and repair data integrity issues
- `check_workflow_state` - Verify workflow consistency
- `repair_orphaned_data` - Fix orphaned tasks and memories

## 💾 Data Storage

Your data is stored locally in a `.memory-pickle/` folder with split-file architecture:
- `projects.yaml` - Your projects and metadata
- `tasks.yaml` - All tasks with hierarchy and progress
- `memories.yaml` - Important notes and decisions
- `meta.yaml` - Session tracking, settings, and templates

### 🔄 Session Reset

**Need a fresh start?** Simply delete the `.memory-pickle` folder:

```bash
# Complete reset - removes all projects, tasks, and memories
rm -rf .memory-pickle

# On Windows
rmdir /s .memory-pickle
```

This gives you a completely clean slate. The folder will be recreated automatically when you start a new session. This is the recommended approach when:
- You want to start over completely
- Data seems corrupted or inconsistent
- You're switching to a different project context
- Testing or development purposes

**⚠️ Warning**: This permanently deletes all your project data. Export important projects first using `export_to_markdown` if needed.

## 📚 Documentation

- **[📥 Installation Guide](docs/INSTALLATION.md)** - Setup instructions and troubleshooting
- **[🛠️ Tools Reference](docs/TOOLS.md)** - Complete tool documentation with examples
- **[📖 Usage Guide](docs/USAGE.md)** - Workflows, patterns, and best practices
- **[⚙️ Development Guide](docs/DEVELOPMENT.md)** - Contributing and architecture details
- **[📝 Changelog](docs/CHANGELOG.md)** - Version history and release notes

## 🔧 Requirements

- **Node.js 16+** - Runtime environment
- **MCP-compatible client** - Claude Desktop, Cursor, Windsurf, etc.

## 📦 Installation Methods

**NPX (recommended):**
```bash
npx -y @cabbages/memory-pickle-mcp
```

**Global install:**
```bash
npm install -g @cabbages/memory-pickle-mcp
```

**Local development:**
```bash
git clone https://github.com/Justar96/memory-pickle-mcp.git
cd memory-pickle-mcp
npm install
npm run build
```

## ⚙️ Configuration Examples

**Basic setup:**
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

**With environment variables:**
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

**Clean text mode (no emojis):**
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

**Global installation:**
```json
{
  "mcpServers": {
    "memory-pickle": {
      "command": "memory-pickle"
    }
  }
}
```

## 🎨 Features

**Task Management:**
- Hierarchical tasks with subtasks
- Priority levels (critical/high/medium/low)  
- Progress tracking (0-100%)
- Blocker documentation
- Automatic completion detection

**Project Organization:**
- Multiple concurrent projects
- Automatic task assignment to current project
- Project-level progress calculation
- Status tracking (planning/in_progress/completed)

**User Experience:**
- 🎭 **Configurable Output**: Choose between emoji-rich or clean text mode
- 🏢 **Corporate Friendly**: Professional text output for enterprise environments
- 🖥️ **Universal Compatibility**: Works in any terminal, SSH, or restricted environment
- 🎨 **Visual or Minimal**: `✅ Task completed!` vs `[OK] Task completed!`

**Session Continuity:**
- Auto-loads project status at session start
- Generates handoff summaries for new chats
- Preserves context between sessions
- Session counter tracking
- Easy reset via `.memory-pickle` folder deletion

**Memory System:**
- Categorized memory storage (general/technical/business)
- Importance levels (low/medium/high/critical)
- Tag-based organization
- Search and retrieval functionality

**Data Integrity:**
- Automatic validation and repair on startup
- Orphaned data detection and cleanup
- Referential integrity checks
- Workflow state validation

## 🤔 Why Use This?

AI agents forget everything between sessions. This tool fixes that by giving them persistent memory for project work. No more re-explaining what you're building or losing track of progress.

It's designed to work invisibly - the agent just becomes better at remembering and tracking your work.

## � Troubleshooting

**Agent seems confused or data looks wrong?**
1. Try the data integrity tools: `validate_database` or `repair_orphaned_data`
2. For a complete fresh start: delete the `.memory-pickle` folder
3. Check the [Installation Guide](docs/INSTALLATION.md) for setup issues

**Tools not working?**
- Ensure you're using the latest version: `npx -y @cabbages/memory-pickle-mcp`
- Verify your MCP client configuration matches the examples above
- Check that Node.js 16+ is installed

**Performance issues?**
- Large projects (1000+ tasks) may be slower
- Consider using `export_to_markdown` to archive completed projects
- Reset sessions periodically by deleting `.memory-pickle`

## �📄 License

Apache 2.0 License - Use freely in your projects!

## 📊 Version

**Current:** 1.2.1
**Pre-release:** 1.3.8 
**Package:** [@cabbages/memory-pickle-mcp](https://www.npmjs.com/package/@cabbages/memory-pickle-mcp)


### Recent Updates (v1.2.0)
- ✅ Fixed MemoryPickleCore compilation issues after refactoring
- 🛡️ Added comprehensive data integrity tools (3 new tools)
- 🔧 Enhanced service layer with missing methods
- 📝 Updated documentation to match current system
- 🎯 Improved TypeScript type safety and error handling

---

*Built for developers who want their AI agents to actually remember what they're working on.* 🚀✨
