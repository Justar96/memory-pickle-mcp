# Memory Pickle MCP - Agent Instructions

This file provides essential guidance for AI agents using Memory Pickle MCP for project management and session continuity.

## Core Workflow Pattern

### Session Initialization
1. **ALWAYS start with `get_project_status`** to load context and understand current state
2. If no projects exist, guide user to create one with `create_project`
3. If multiple projects exist, help user set current project with `set_current_project`

### Active Session Management
1. **Auto-detect work items** from user conversation and create tasks with `create_task`
2. **Track progress updates** when users report completions or progress with `update_task`
3. **Store important decisions** and context with `remember_this`
4. **Search previous context** when users reference past work with `recall_context`

### Session Conclusion
1. **Generate handoff summary** with `generate_handoff_summary` when session ends
2. **Suggest saving summary** as markdown file for future reference
3. **Provide clear next steps** for continuing work

## Tool Usage Priorities

### CRITICAL (Always Use First)
- **`get_project_status`**: Load context at session start and when users ask about current state
- **`recall_context`**: Search memories when users reference past decisions or work

### HIGH (Core Workflow)
- **`create_task`**: When users mention work items, goals, or things to accomplish
- **`update_task`**: When users report progress, completions, or blockers
- **`remember_this`**: For important decisions, requirements, or context that should persist

### MEDIUM (Support Functions)
- **`create_project`**: When users start new projects or initiatives
- **`generate_handoff_summary`**: For session transitions and continuity
- **`set_current_project`**: When switching between multiple projects

## Natural Language Triggers

### Task Creation Triggers
Listen for: "need to", "should", "must", "have to", "let's", "implement", "fix", "add", "create", "build", "write", "design"

### Progress Update Triggers
Listen for: "finished", "completed", "done with", "made progress", "working on", "stuck on", "blocked by", percentage mentions ("50% done")

### Memory Storage Triggers
Listen for: "remember", "important", "note that", "for reference", "don't forget", "key point", "decision"

### Status Check Triggers
Listen for: "what am I working on", "show status", "where are we", "current progress", "what's next"

## Priority Detection

### Automatic Priority Mapping
- **Critical**: "urgent", "critical", "blocking", "emergency", "asap", "immediately"
- **High**: "important", "key", "core", "priority", "soon", "today"
- **Medium**: Default priority when no urgency indicators present
- **Low**: "nice to have", "maybe", "consider", "eventually", "someday"

## Storage Model

### Memory-Only Architecture
- All data exists only during the current session
- No files are created automatically
- Data is lost when session ends

### Persistence Recommendations
- For critical information, suggest creating markdown files manually
- Use `generate_handoff_summary` to create session continuity documents
- Recommend users save important decisions in their own documentation

## Error Handling Guidelines

### Common Scenarios
1. **No current project set**: Guide user to create or select project first
2. **Task not found**: Use fuzzy matching on task titles, suggest alternatives
3. **Invalid project reference**: List available projects for user selection
4. **Empty search results**: Suggest broader search terms or check spelling

### Error Response Pattern
Always use format: `[ERROR] {specific_issue}: {user_friendly_explanation}. SUGGESTION: {corrective_action}`

## Context Management

### State Awareness
- Always maintain awareness of current project context
- Reference previous session information when available
- Use `recall_context` to find relevant background information

### Multi-Project Handling
- Clearly identify which project tasks belong to
- Help users switch context when working on different projects
- Maintain separation between project data

## Best Practices

### Proactive Behavior
- Automatically suggest creating tasks when users describe work
- Offer to remember important information shared during conversations
- Suggest handoff summaries when sessions seem to be concluding

### Clear Communication
- Use consistent formatting: [OK], [ERROR], [INFO], [SUGGESTION] prefixes
- Provide specific, actionable feedback
- Confirm actions taken and their results

### Workflow Optimization
- Group related tasks under parent tasks when appropriate
- Suggest breaking down large tasks into smaller subtasks
- Recommend priority adjustments based on user urgency

## Output Formatting

### Standard Prefixes
- `[OK]` - Successful operations
- `[ERROR]` - Failed operations with specific error details
- `[INFO]` - Neutral information or status updates
- `[SUGGESTION]` - Recommendations for user actions
- `[CURRENT]` - Current/active project indicators
- `[BLOCKED]` - Blocked tasks or issues
- `[DONE]` - Completed items
- `[ACTIVE]` - In-progress items

### Clean Text Only
- No emojis or special characters
- Universal compatibility across all environments
- Professional appearance suitable for any context
- Screen reader and accessibility friendly

This simplified instruction set ensures consistent, effective agent behavior while maintaining the clean, professional standards expected by users.