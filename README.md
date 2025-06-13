# Memory Pickle MCP

A Model Context Protocol server that gives AI agents persistent memory for project management. Your agent remembers what you're working on between chat sessions.

## Quick Start

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

That's it. Your agent will now remember your projects and tasks across sessions.

## What It Does

- **Remembers your work** - Agent loads your current project when you start chatting
- **Tracks tasks automatically** - Creates tasks when you mention things to do
- **Shows progress** - See what's done and what's left
- **Handles handoffs** - Get summaries to continue work in new chats

## How It Works

The agent automatically:
1. Loads your project status at the start of each session
2. Creates tasks when you mention work items
3. Marks tasks complete when you say they're done
4. Tracks progress and shows completion percentages

No special commands needed - just talk naturally about your work.

## Example Usage

**Starting a project:**
```
You: "I'm building a todo app with React"
Agent: I'll track this project for you.
[Creates project and initial tasks]
```

**Continuing work:**
```
You: "Hi, let's continue"
Agent: [Automatically loads project status]
📊 Todo App Project - 40% complete
✅ Set up React project
⬜ Create task component
⬜ Add database
```

**Making progress:**
```
You: "I finished the task component"
Agent: Great! Marking that as complete.
✅ Task component - Done!
Project is now 67% complete.
```

## Available Tools

The agent has access to these tools (you don't need to call them directly):

- `get_project_status` - Shows current tasks and progress
- `create_task` - Adds new tasks to track
- `toggle_task` - Marks tasks complete/incomplete
- `update_task_progress` - Updates progress and notes
- `generate_handoff_summary` - Creates session summaries
- `create_project` - Starts new projects
- `remember_this` - Stores important information
- `recall_context` - Retrieves stored memories

## Data Storage

Your data is stored locally in a `.memory-pickle/` folder:
- `projects.yaml` - Your projects
- `tasks.yaml` - All tasks and progress
- `memories.yaml` - Important notes and decisions
- `meta.yaml` - Session tracking and settings

## Features

**Task Management:**
- Hierarchical tasks (subtasks)
- Priority levels (critical, high, medium, low)
- Progress tracking (0-100%)
- Blocker documentation

**Project Organization:**
- Multiple concurrent projects
- Automatic task assignment
- Completion percentage calculation
- Status tracking

**Session Continuity:**
- Auto-loads project status
- Generates handoff summaries
- Preserves context between chats
- Session counter tracking

## Requirements

- Node.js 16+
- An MCP-compatible AI client (Claude Desktop, Cursor, etc.)

## Installation Methods

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
git clone https://github.com/cabbages/memory-pickle-mcp.git
cd memory-pickle-mcp
npm install
npm run build
```

## Configuration Examples

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

## Why Use This?

AI agents forget everything between sessions. This tool fixes that by giving them persistent memory for project work. No more re-explaining what you're building or losing track of progress.

It's designed to work invisibly - the agent just becomes better at remembering and tracking your work.

## License

[text](README.md)

## Version

Current: 1.0.0 (MEM-Pickle MCP - agent planing tools :))

---

*Built for developers who want their AI agents to actually remember what they're working on.*
