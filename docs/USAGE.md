# Usage Guide

## Getting Started

Once installed, Memory Pickle works automatically. The agent will:
1. Load your project status when you start chatting
2. Create tasks when you mention work items
3. Track progress as you update
4. Generate summaries for handoffs

## Basic Workflow

### Starting a New Project

Just mention what you're building:

```
You: "I'm creating a blog website with Next.js"
Agent: I'll track this project for you.
```

The agent automatically:
- Creates a project
- Sets it as current
- May suggest initial tasks

### Working on Tasks

Mention what you need to do:

```
You: "I need to set up the database and create the post model"
Agent: I've added those tasks:
✅ Set up database
✅ Create post model
```

### Updating Progress

Just say what you've completed:

```
You: "I finished setting up the database"
Agent: Great! Marking that as complete.
✅ Set up database - Done!
Project is now 33% complete.
```

### Continuing Work

Start any new session normally:

```
You: "Let's continue working"
Agent: [Automatically loads project]
📊 Blog Website - 33% complete
✅ Set up database
⬜ Create post model
⬜ Add authentication
```

## Advanced Features

### Subtasks

Break down complex work:

```
You: "The authentication needs login, signup, and password reset"
Agent: I'll create subtasks for authentication:
- ⬜ Authentication
  - ⬜ Login functionality
  - ⬜ Signup functionality  
  - ⬜ Password reset
```

### Priority Management

Mention urgency:

```
You: "The login is critical - users can't access anything without it"
Agent: Setting login as critical priority.
🔴 Login functionality [critical]
```

### Progress Tracking

Update progress naturally:

```
You: "Login is about 80% done, just need to add error handling"
Agent: Updated login progress to 80%.
📊 Login functionality - 80% complete
Note: Need to add error handling
```

### Blockers

Mention what's blocking you:

```
You: "Can't deploy until we get the SSL certificate"
Agent: I'll mark deployment as blocked.
🚨 Deploy to production
Blocked: Waiting for SSL certificate
```

*Note: In v1.3.0, progress updates and blocker tracking are handled by the consolidated `update_task` tool.*

### Session Handoffs

End sessions with summaries:

```
You: "I need to stop for today, can you summarize?"
Agent: Here's your handoff summary:

🤝 Session Summary
Completed: Database setup, user model
In Progress: Login functionality (80%)
Next: Finish login error handling, start signup
Blockers: SSL certificate for deployment

Copy this to continue in your next session.
```

## Multiple Projects

### Switching Projects

```
You: "Let's work on my mobile app instead"
Agent: Switching to mobile app project.
📱 Mobile App - 45% complete
```

### Creating New Projects

```
You: "I want to start a new API project"
Agent: Created new project: API Project
All new tasks will be added here.
```

## Memory System

### Storing Important Information

The agent automatically remembers important decisions:

```
You: "We decided to use PostgreSQL instead of MongoDB for better consistency"
Agent: I'll remember that decision.
💾 Stored: Database choice - PostgreSQL for consistency
```

### Recalling Information

```
You: "What did we decide about the database?"
Agent: Found this memory:
📝 Database choice - PostgreSQL for consistency
Stored: 2 days ago
```

## Data Organization

Your data is stored in `.memory-pickle/`:
- `projects.yaml` - All projects
- `tasks.yaml` - All tasks and progress  
- `memories.yaml` - Important notes
- `meta.yaml` - Settings and session tracking

## Tips for Best Results

1. **Be natural** - Just talk about your work normally
2. **Mention priorities** - Say if something is urgent or critical
3. **Update progress** - Tell the agent what you've completed
4. **Use handoffs** - Get summaries before ending sessions
5. **Break down work** - Mention subtasks for complex features
6. **Note blockers** - Say what's preventing progress

## Common Patterns

### Daily Standup Style
```
You: "Yesterday I finished the user auth, today I'm working on the dashboard"
Agent: ✅ User auth - Completed!
📋 Added: Dashboard implementation
```

### Planning Session
```
You: "For the dashboard, I need charts, user stats, and settings"
Agent: Breaking down dashboard:
- ⬜ Dashboard
  - ⬜ Charts component
  - ⬜ User statistics
  - ⬜ Settings panel
```

### Problem Solving
```
You: "The API is returning 500 errors, I think it's the database connection"
Agent: 🚨 API issues - 500 errors
Blocker: Database connection problems
```

The key is to work naturally - Memory Pickle adapts to how you already talk about your projects.

## Configuration Options

### Emoji vs Clean Text

Memory Pickle supports two output modes:

**Default (Emojis):**
```
✅ Task completed successfully!
📊 Project Status: My App (75% complete)
⬜ Build authentication system [high]
✅ Set up database [medium]
🚨 Blocked: SSL certificate needed
```

**Clean Text Mode:**
```
[OK] Task completed successfully!
## Project Status: My App (75% complete)
[ ] Build authentication system [high]
[DONE] Set up database [medium]
## Blocked: SSL certificate needed
```

### Enabling Clean Text Mode

Add to your MCP configuration:
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

**When to Use Clean Text:**
- Corporate/enterprise environments
- Terminal-only access (SSH, etc.)
- Personal preference for minimal output
- Accessibility considerations
- Logging/automation systems