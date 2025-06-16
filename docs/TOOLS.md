# Available Tools (v1.3.8)

Memory Pickle MCP provides 8 essential tools for streamlined project management and memory storage. The agent uses these automatically - you don't need to call them directly.

## Simplified Design
- **One tool per function** - No redundancy or overlap
- **Smart defaults** - Tools work together automatically
- **Agent-friendly** - Clear, focused functionality
- **Essential only** - Removed rarely-used utilities and diagnostics

## Project Management

### `get_project_status`
**Auto-called at session start**

Shows current project state, task tree, and progress.

```yaml
# Optional parameters:
project_id: "proj_123"  # Defaults to current project
```

Returns:
- Task hierarchy with completion status
- Progress percentages
- Blocked items
- Recent completions
- Critical priority items

### `create_project`
Creates a new project container. **Automatically becomes the current project.**

```yaml
name: "My New Project"
description: "Project description"
```

### `set_current_project`
Switches to a different project.

```yaml
project_id: "proj_123"
```

### `generate_handoff_summary`
Creates session transition summary.

```yaml
format: "detailed"  # or "compact"
```

## Task Management

### `create_task`
Adds a new task to the current project.

```yaml
title: "Implement feature X"
description: "Detailed description"
priority: "high"  # critical, high, medium, low
project_id: "proj_123"  # Optional - uses current project if not specified
```

### `update_task`
**Consolidated tool** - handles completion, progress, notes, and blockers.

```yaml
task_id: "task_123"
completed: true  # Optional - mark complete/incomplete
progress: 75  # Optional - 0-100 percentage
notes: "Almost done"  # Optional - progress notes
blockers: ["Waiting for approval"]  # Optional - list of blockers
```

## Memory Management

### `remember_this`
Stores important information.

```yaml
title: "Important Decision"
content: "We decided to use React instead of Vue"
category: "technical"  # general, technical, business
importance: "high"  # low, medium, high, critical
tags: ["react", "frontend"]
task_id: "task_123"  # Optional link to task
```

### `recall_context`
Searches stored memories.

```yaml
query: "react decision"  # Optional search term
category: "technical"  # Optional filter
tags: ["frontend"]  # Optional filter
limit: 10  # Default 10
```

## Session Management

### `generate_handoff_summary`
Creates session transition summary for continuing work in new chats.

```yaml
format: "detailed"  # or "compact"
```

### `set_current_project`
Switches to a different project when working on multiple things.

```yaml
project_id: "proj_123"
```

## Tool Usage Patterns

**Critical (Auto-triggered):**
- `get_project_status` - Always called at session start
- `create_task` - When user mentions work items
- `update_task` - When user reports progress or completion

**High (Frequently used):**
- `remember_this` - Store important decisions and context
- `recall_context` - Search previous memories and decisions
- `generate_handoff_summary` - Create session transitions

**Medium (As needed):**
- `create_project` - Start new projects (auto-becomes current)
- `set_current_project` - Switch between multiple projects

## Summary of Changes in v1.3.8

**Removed Tools:**
- `toggle_task` → Consolidated into `update_task`
- `update_task_progress` → Consolidated into `update_task`
- `get_tasks` → Functionality covered by `get_project_status`
- `export_to_markdown` → Replaced with `generate_handoff_summary`
- `apply_template` → Removed (rarely used)
- `list_categories` → Removed (redundant with `get_project_status`)

**Enhanced Tools:**
- `update_task` now handles completion, progress, notes, and blockers
- `create_project` automatically sets as current project
- `get_project_status` provides comprehensive project overview