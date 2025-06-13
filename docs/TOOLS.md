# Available Tools

Memory Pickle MCP provides 13 tools for project management and memory storage. The agent uses these automatically - you don't need to call them directly.

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
Creates a new project container.

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
parent_id: "task_123"  # Optional for subtasks
due_date: "2024-12-31"  # Optional
```

### `toggle_task`
Marks task as complete/incomplete.

```yaml
task_id: "task_123"
```

### `update_task_progress`
Updates task progress and notes.

```yaml
task_id: "task_123"
progress: 75  # 0-100
notes: "Almost done"
blockers: ["Waiting for approval"]  # Optional
```

### `get_tasks`
Retrieves filtered task list.

```yaml
status: "incomplete"  # complete, incomplete
priority: "high"  # critical, high, medium, low
project_id: "proj_123"  # Optional
parent_id: "task_456"  # Optional for subtasks
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

## Utilities

### `export_to_markdown`
Exports project data to markdown file.

```yaml
output_file: "project-export.md"  # Default name
include_tasks: true  # Include task data
include_memories: true  # Include memory data
```

### `apply_template`
Shows project planning template.

```yaml
template_name: "web_app"  # Available templates
context: {}  # Optional context data
```

### `list_categories`
Shows project overview and available templates.

No parameters required.

## Tool Priority Levels

**Critical (Auto-triggered):**
- `get_project_status` - Session start
- `recall_context` - Context searches
- `create_task` - Task mentions
- `toggle_task` - Completion mentions

**High (Frequently used):**
- `update_task_progress` - Progress updates
- `remember_this` - Important notes
- `create_project` - New projects
- `generate_handoff_summary` - Session ends

**Medium (As needed):**
- `get_tasks` - Task filtering
- `set_current_project` - Project switching
- `export_to_markdown` - Documentation

**Low (Utility):**
- `apply_template` - Planning help
- `list_categories` - Overview