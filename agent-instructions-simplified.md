# Memory Pickle MCP Agent Instructions

## Overview
Memory Pickle provides 13 project management tools for AI agents. The system maintains session-based data for project organization, task tracking, and information storage.

## Core Workflow Patterns

### 📊 **Session Context Understanding**
The `recall_state` tool provides comprehensive project context including:
- Current project status and active tasks
- Recent memories and session activity
- Progress summaries and statistics
- Project completion percentages

### 📝 **Task Management**
- `create_task`: Creates new tasks with hierarchical organization support
- `update_task`: Modifies task properties, progress, and completion status
- `list_tasks`: Returns filtered task lists with pagination
- `get_task`: Provides detailed task information including subtasks and notes

### 📁 **Project Organization**
- `create_project`: Establishes new projects and sets them as current context
- `update_project`: Modifies project properties and status
- `list_projects`: Returns project overviews with completion statistics
- `set_current_project`: Changes active project context for task operations

### 🧠 **Information Storage**
- `remember_this`: Stores important information with importance classification
- `recall_context`: Searches stored memories with filtering capabilities

### 📄 **Session Management**
- `export_session`: Generates complete session data in markdown or JSON format
- `generate_handoff_summary`: Creates session summaries for continuity

## Tool Usage Guidelines

### **Data Relationship Structure**
```
Projects (top-level containers)
├── Tasks (can have parent-child relationships)
├── Memories (linked to projects/tasks)
└── Session Activity (tracks operations)
```

### **Common Parameter Patterns**
- **dry_run**: Available on modification tools for preview without changes
- **project_id**: Links items to specific projects (defaults to current project)
- **line_range**: Associates tasks/memories with code locations
- **importance**: Classifies memory relevance (critical, high, medium, low)

### **Data Validation**
- String inputs are sanitized for security
- Required fields are validated before processing
- Array parameters support both single values and lists
- Pagination limits prevent excessive data retrieval

### **Status Management**
- **Projects**: planning → in_progress → completed/blocked/archived
- **Tasks**: active (completed: false) → completed (completed: true)
- **Progress**: 0-100 percentage tracking with timestamped notes

## Response Format Guidelines

### **Successful Operations**
Tools return structured responses with:
- Success indicators ([OK], [INFO])
- Relevant data summaries
- Next-step suggestions when appropriate

### **Error Handling**
- Validation errors with specific field information
- Not-found errors with available alternatives
- Permission/context errors with resolution guidance

### **Dry Run Results**
Preview responses indicate:
- What changes would be made
- No actual data modification
- Safe testing of operations

## Security Considerations

### **Input Validation**
- All user inputs are sanitized and validated
- String length limits prevent data overflow
- Enum values are strictly validated
- Required fields are enforced

### **Data Integrity**
- Orphaned data cleanup available through internal methods
- Referential integrity maintained between projects, tasks, and memories
- Transaction-safe operations with rollback capability

### **Session Isolation**
- Data exists only during session lifetime
- No persistent storage or external data access
- Memory-only operations with controlled resource usage

## Integration Notes

### **Current Project Context**
Most operations default to current project when project_id is not specified. The system tracks:
- Active project for new task creation
- Project switching history
- Session activity within project contexts

### **Hierarchical Organization**
- Tasks can have parent-child relationships via parent_id
- Memories can link to both projects and specific tasks
- Code locations can be referenced through line_range objects

### **Search and Filtering**
- Text search across memory content and titles
- Multi-criteria task and project filtering
- Pagination for large result sets
- Importance-based memory organization

This instruction set provides clear operational guidance without behavioral conditioning or system prompt interference, maintaining security best practices for MCP tool integration. 