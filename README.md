# Memory Pickle MCP 🥒

A Model Context Protocol server that gives AI agents persistent memory for project management. Your agent remembers what you're working on between chat sessions.

## 🚀 Quick Start

Add this to your MCP configuration:

```json
{
  "mcpServers": {
    "memory-pickle": {
      "command": "npx",
      "args": ["-y", "@cabbages/memory-pickle-mcp"],
      "env": {
        "MEMORY_PICKLE_WORKSPACE": "/path/to/your/project"
      }
    }
  }
}
```

That's it! Your agent will now:
- Check your project root directory
- Create `.memory-pickle/` folder in your project (not IDE root)
- Remember your projects and tasks across sessions

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
3. **Updates tasks** when you report progress or completion with `update_task`
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
Agent: Great! Updating that task as complete.
✅ Task component - Done!
📈 Project is now 67% complete.
```

## 🛠️ Available Tools

The agent has access to **8 essential tools** for streamlined project management:

### 📊 **Core Tools**
1. **`get_project_status`** - Show current project status and tasks ⭐ *Auto-loads at session start*
2. **`create_project`** - Create new projects (automatically becomes current project)
3. **`create_task`** - Add tasks with auto-priority detection
4. **`update_task`** - Handle all task updates: completion, progress, notes, blockers
5. **`remember_this`** - Store important decisions and context
6. **`recall_context`** - Search and retrieve stored memories
7. **`generate_handoff_summary`** - Create session handoff summaries
8. **`set_current_project`** - Switch between multiple projects

### 🎯 **Simplified Design**
- **One tool per function** - No redundancy or overlap
- **Smart defaults** - Tools work together automatically
- **Agent-friendly** - Clear, focused functionality
- **Essential only** - Removed rarely-used utilities and diagnostics

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

**⚠️ Warning**: This permanently deletes all your project data. Create a handoff summary first using `generate_handoff_summary` if needed.

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

**With workspace configuration (recommended):**
```json
{
  "mcpServers": {
    "memory-pickle": {
      "command": "npx",
      "args": ["-y", "@cabbages/memory-pickle-mcp"],
      "env": {
        "MEMORY_PICKLE_WORKSPACE": "/path/to/your/project",
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
- Automatic validation on startup
- Clean YAML-based storage format
- Referential integrity between projects and tasks
- Simple file-based architecture for reliability

## 🤔 Why Use This?

AI agents forget everything between sessions. This tool fixes that by giving them persistent memory for project work. No more re-explaining what you're building or losing track of progress.

It's designed to work invisibly - the agent just becomes better at remembering and tracking your work.

## � Troubleshooting

**Agent seems confused or data looks wrong?**
1. For a complete fresh start: delete the `.memory-pickle` folder
2. Check the [Installation Guide](docs/INSTALLATION.md) for setup issues
3. Verify the `MEMORY_PICKLE_WORKSPACE` environment variable points to your project

**Tools not working?**
- Ensure you're using the latest version: `npx -y @cabbages/memory-pickle-mcp`
- Verify your MCP client configuration matches the examples above
- Check that Node.js 16+ is installed

**Performance issues?**
- Large projects (1000+ tasks) may be slower
- Consider creating handoff summaries to archive completed work
- Reset sessions periodically by deleting `.memory-pickle`

## �📄 License

Apache 2.0 License - Use freely in your projects!

## 📊 Version

**Current:** 1.3.0 (Simplified & Streamlined)

**Package:** [@cabbages/memory-pickle-mcp](https://www.npmjs.com/package/@cabbages/memory-pickle-mcp)

### Recent Updates (v1.3.0)
- 🎯 **Simplified Tools**: Reduced from 17 to 8 essential tools
- 🔄 **Consolidated Functions**: `update_task` handles completion, progress, and blockers
- 🚀 **Auto-Current Project**: New projects automatically become current
- 🧹 **Removed Redundancy**: Eliminated duplicate and rarely-used tools
- 📝 **Streamlined Agent Instructions**: Clearer, simpler workflow rules

---

*Built for developers who want their AI agents to actually remember what they're working on.* 🚀✨
