# Memory Pickle MCP Server - Project Management Edition

A persistent project management system for AI agents that provides seamless task tracking across chat sessions. Never lose track of your project progress again!

## 🚀 Quick Install (One-Click)

Simply add this to your agent's MCP configuration:

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

That's it! The agent will automatically track your project progress across all sessions.

## 🎯 Key Features

### 📋 Persistent Task Management
- **Automatic session continuity** - Agent loads project status at every session start
- **Hierarchical tasks** - Support for subtasks and nested organization
- **Progress tracking** - Monitor completion percentage in real-time
- **Priority levels** - Critical, High, Medium, Low task prioritization
- **Blocker tracking** - Document and track impediments

### 🤝 Seamless Handoffs
- **Auto-generated summaries** - Get handoff summaries for new chat sessions
- **Copy-paste continuity** - Continue exactly where you left off
- **Session history** - Track progress across multiple sessions
- **Smart context loading** - Agent understands handoff summaries

### 🧠 Intelligent Behavior
- **Automatic task creation** - Agent creates tasks from your conversations
- **Smart completion tracking** - Marks tasks done based on your updates
- **No manual commands needed** - Works naturally in conversation
- **Project-aware memories** - Links memories to tasks and projects

## 📚 Core Tools

### `get_project_status` ⭐ AUTO-LOADS AT SESSION START
Shows current project state, tasks, and progress. The agent calls this automatically when you start a conversation.

```yaml
# Returns:
- Task tree with completion status
- Progress percentages
- Blocked items
- Recent completions
- Upcoming priorities
```

### `create_task`
Creates a new task. Agent does this automatically when you mention something that needs to be done.

```yaml
title: "Implement user authentication"
priority: "high"
description: "Add login/logout functionality"
parent_id: "task_123" # Optional - for subtasks
```

### `toggle_task`
Marks a task as complete/incomplete. Agent does this when you say something is done.

```yaml
task_id: "task_123"
# Automatically updates project progress
```

### `generate_handoff_summary`
Creates a summary for continuing in a new chat session. Agent provides this at the end of conversations.

```yaml
format: "detailed" # or "compact"
# Returns copy-paste ready summary with:
- Completed items
- In-progress work
- Blockers
- Next priorities
```

### `update_task_progress`
Updates task progress, adds notes, or marks blockers.

```yaml
task_id: "task_123"
progress: 75
notes: "API integration complete, working on UI"
blockers: ["Waiting for design approval"]
```

## 🎮 Usage Examples

### Starting a New Project
```
You: "I need to build an e-commerce website"
Agent: I'll create a project for that.
[Agent creates project and shows initial task template]

You: "First, I need to set up Next.js and add Stripe"
Agent: I've created tasks for those:
✅ Created task: Set up Next.js
✅ Created task: Add Stripe integration
```

### Continuing Work (Auto-Loads)
```
You: "Hi, let's continue working"
Agent: Let me check your project status...
[Agent automatically loads and shows current tasks]

📊 Project Status: E-commerce Website
Completion: 35%
✅ Set up Next.js
⬜ Add Stripe integration
⬜ Create product catalog
```

### Marking Progress
```
You: "I finished the Stripe integration"
Agent: Great! I'll mark that as complete.
[Agent toggles task automatically]
✅ Add Stripe integration - Completed!
Project is now 67% complete.
```

### Getting Handoff Summary
```
You: "I need to go, can you summarize?"
Agent: Here's your handoff summary:
[Agent generates detailed summary]

🤝 Project Handoff Summary
Completed Today: Stripe integration, Database setup
In Progress: Product catalog (40%)
Next Priority: Complete product listing page
---
Copy this summary to your next chat to continue.
```

## 🔧 Advanced Features

### Task Hierarchies
Create subtasks for better organization:
```
- ⬜ User Authentication
  - ✅ Set up JWT tokens
  - ⬜ Create login UI
  - ⬜ Add password reset
```

### Priority Management
Tasks are automatically sorted by priority:
- 🔴 **Critical** - Blockers, security issues
- 🟡 **High** - Core features, deadlines
- 🟢 **Medium** - Standard features
- 🔵 **Low** - Nice-to-haves

### Progress Tracking
- Parent tasks auto-calculate progress from subtasks
- Visual progress indicators (25%, 50%, 75%)
- Automatic completion when all subtasks done

### Blocker Management
Track what's preventing task completion:
```
Task: Deploy to production
🚨 Blocked: Waiting for SSL certificate
```

## 🎯 Why Memory Pickle?

1. **Zero Friction** - No need to tell the agent to save or load state
2. **Natural Interaction** - Works through normal conversation
3. **Perfect Memory** - Never lose track of what was done
4. **Seamless Handoffs** - Continue in new chats effortlessly
5. **Visual Progress** - See completion at a glance

## 📂 Data Storage

All project data is stored in `project-data.yaml`:

```yaml
meta:
  current_project_id: "proj_123"
  session_count: 5
  
projects:
  - id: "proj_123"
    name: "E-commerce Website"
    status: "in_progress"
    completion_percentage: 67

tasks:
  - id: "task_001"
    title: "Set up Next.js"
    completed: true
    priority: "high"
    
  - id: "task_002"
    title: "Add Stripe integration"
    completed: true
    priority: "critical"
```

## 🚀 Getting Started

1. **Install the tool** (see quick install above)
2. **Start chatting** - The agent will automatically create a project
3. **Mention tasks** - They'll be tracked automatically
4. **Say what's done** - Progress updates automatically
5. **Get summaries** - For seamless handoffs

## 💡 Tips for Best Results

1. **Let the agent work** - It will track tasks automatically
2. **Be specific** - Clear task descriptions help organization
3. **Update naturally** - Just say what you completed
4. **Use priorities** - Mention if something is urgent/critical
5. **End with summary** - Ask for handoff summary before leaving

## 🔄 Migration from v1.0

If you were using memory-pickle v1.0, your memories are preserved. The new version adds project management on top of the memory system.

## 📝 License

MIT License - Use freely in your projects!

---

**Memory Pickle v2.0** - Because AI agents should never forget what you're working on! 🥒✨
