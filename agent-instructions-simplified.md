# Memory Pickle Agent Instructions

## Core Behavior

**CRITICAL: Always call `get_project_status` first at session start** - This ensures continuity between sessions.

## Tool Usage Patterns

### Session Start
1. **ALWAYS** call `get_project_status` immediately
2. Show current project state and pending tasks
3. Continue from where the last session ended

### Task Management
- **Create tasks automatically** when user mentions any work item:
  - "I need to..." → `create_task`
  - "We should..." → `create_task` 
  - "Let's..." → `create_task`
  - Feature descriptions → `create_task`
  - Problems to solve → `create_task`

- **Mark tasks complete automatically** when user indicates completion:
  - "I finished..." → `toggle_task`
  - "It's done" → `toggle_task`
  - "Completed..." → `toggle_task`
  - "Ready" → `toggle_task`

- **Update progress** when user reports partial completion:
  - "Halfway done" → `update_task_progress` (50%)
  - "Almost finished" → `update_task_progress` (75%)
  - "Just started" → `update_task_progress` (25%)

### Priority Assessment
Auto-assess task priority based on keywords:
- **Critical**: security, urgent, blocking, critical, emergency
- **High**: important, deadline, core feature, must have
- **Medium**: should, feature, improvement
- **Low**: nice to have, maybe, consider, polish

### Project Management
- **New projects**: When user mentions "project", "build", "create" → `create_project`
- **Project switching**: "Let's work on [project]" → `set_current_project`
- **Session handoff**: End of conversation → `generate_handoff_summary`

### Memory Management
- **Remember important info**: Architecture decisions, requirements, constraints → `remember_this`
- **Recall context**: Need historical information → `recall_context`

### Planning & Organization
- **Structured planning**: "sprint", "planning", "checklist" → `apply_template`
- **Documentation**: "export", "save", "document" → `export_to_markdown`

## Key Principles

1. **Everything is a Task**: Convert all action items into trackable tasks
2. **Progress Visibility**: Always show completion percentage and what's left
3. **Seamless Continuity**: New sessions pick up exactly where last one ended
4. **Automatic Tracking**: Track progress without user having to ask
5. **Proactive Behavior**: Don't wait for permission - create tasks and track completion automatically

## Error Handling

- **No project exists**: Prompt to create a project first
- **Task not found**: Show available tasks with IDs
- **Ambiguous reference**: Ask for clarification with task list

## Session End Protocol

1. Generate comprehensive summary
2. Include completed items, in-progress work, and blockers
3. Highlight next priorities
4. Provide copy-paste ready summary for next session

## Examples

**User**: "I want to build an e-commerce website"
**Agent**: [calls `create_project`] → [suggests initial tasks]

**User**: "I finished the login page"
**Agent**: [calls `toggle_task` for login-related task] → [shows updated progress]

**User**: "I'm halfway done with the API integration"
**Agent**: [calls `update_task_progress` with 50%] → [updates parent task progress]

**User**: "We decided to use PostgreSQL for better performance"
**Agent**: [calls `remember_this` to store architecture decision]
