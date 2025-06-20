# Complete Tools Reference (v1.3.9)

Memory Pickle MCP provides **13 comprehensive tools** for advanced project management and session memory. This reference covers all tools with technical specifications, examples, and integration patterns.

## Tool Categories Overview

### **📊 Read Tools (4)**
- `recall_state` - Universal session context and project overview
- `list_tasks` - Filtered task listing with pagination  
- `list_projects` - Project overview with completion statistics
- `get_task` - Detailed single task information

### **📝 Write Tools (5)**
- `create_project` - Project creation and initialization
- `update_project` - Project modification and status updates
- `set_current_project` - Active project context switching
- `create_task` - Task creation with hierarchical support
- `update_task` - Comprehensive task modification tool

### **🧠 Memory Tools (2)**
- `remember_this` - Information storage with classification
- `recall_context` - Memory search and retrieval

### **📄 Session Tools (2)**
- `export_session` - Complete session data export
- `generate_handoff_summary` - Session transition summaries

---

## Read Tools

### `recall_state`
**Universal session context and project overview.** Auto-called at session start.

**Purpose:** Provides comprehensive session state including current project, active tasks, recent memories, and progress statistics.

```yaml
# Parameters (all optional)
limit: 20  # Maximum items per category
project_id: "proj_123"  # Focus on specific project
include_completed: false  # Include completed tasks
focus: "all"  # "tasks", "projects", "memories", or "all"
```

**Returns:**
- Current project information and progress
- Active task hierarchy with completion status
- Recent memories and decisions
- Session activity summary
- Progress statistics and recommendations

**Example Response:**
```
## Current Session Context

**Active Project:** Authentication System (75% complete)
- [DONE] Database schema design
- [ ] API endpoint implementation (60% progress)
  - [DONE] Login endpoint
  - [ ] Registration endpoint
- [BLOCKED] Security audit (waiting for external review)

**Recent Memories:** 3 critical decisions stored
**Session Activity:** 8 tasks created, 5 completed, 12 tool calls

**Next Steps:**
1. Complete registration endpoint
2. Address security audit blockers
3. Begin integration testing
```

### `list_tasks`
**Filtered task listing with pagination and status filtering.**

**Purpose:** Retrieve tasks with precise filtering, sorting, and pagination for efficient task management.

```yaml
# Filtering options
status: "active"  # "active" or "completed"
priority: "high"  # "critical", "high", "medium", "low"
project_id: "proj_123"  # Filter by project
completed: false  # Boolean completion filter

# Pagination
limit: 50  # Maximum tasks (1-200)
offset: 0  # Skip tasks for pagination
```

**Returns:**
- Filtered task list with metadata
- Task hierarchy (parent-child relationships)
- Progress indicators and completion status
- Priority levels and blocker information
- Pagination information (total count, has_more)

### `list_projects`
**Project overview with completion statistics and filtering.**

**Purpose:** Get comprehensive project list with progress metrics and status information.

```yaml
# Filtering
status: "in_progress"  # "planning", "in_progress", "blocked", "completed", "archived"

# Pagination
limit: 50  # Maximum projects (1-200)
offset: 0  # Skip projects for pagination
```

**Returns:**
- Project list with completion percentages
- Task counts (total, completed, active)
- Status information and timestamps
- Current project indicator

### `get_task`
**Detailed single task information with full context.**

**Purpose:** Retrieve comprehensive task details including subtasks, notes, blockers, and linked memories.

```yaml
# Required parameter
task_id: "task_123"  # Task identifier
```

**Returns:**
- Complete task information (title, description, priority)
- Subtask hierarchy and relationships
- Progress notes with timestamps
- Blocker list and resolution status
- Linked memories and code locations
- Parent task relationship information

---

## Write Tools

### `create_project`
**Project creation and initialization. Automatically becomes current project.**

**Purpose:** Create new project containers for organizing tasks and context. Sets as active project automatically.

```yaml
# Required
name: "Authentication System"  # Project name (1-200 chars)

# Optional
description: "Complete user authentication with JWT tokens"  # Detailed description
status: "planning"  # "planning", "in_progress", "blocked", "completed", "archived"
dry_run: false  # Preview without creating
```

**Returns:**
- Created project information with unique ID
- Automatic current project assignment confirmation
- Initial project structure setup

### `update_project`
**Project modification and status updates.**

**Purpose:** Modify existing project properties, status, and metadata.

```yaml
# Required
project_id: "proj_123"  # Project to update

# Optional updates
name: "Updated Project Name"
description: "New description"
status: "in_progress"  # Status transition
dry_run: false  # Preview changes
```

**Returns:**
- Updated project information
- Change summary and validation results
- Status transition confirmation

### `set_current_project`
**Active project context switching.**

**Purpose:** Change the active project context. New tasks will default to this project.

```yaml
# Required
project_id: "proj_123"  # Project to activate

# Optional
dry_run: false  # Preview switch without changing
```

**Returns:**
- Current project change confirmation
- Project context information
- Impact on future task creation

### `create_task`
**Task creation with hierarchical support and code linking.**

**Purpose:** Create tasks with full organizational features including subtasks, priority, and code location linking.

```yaml
# Required
title: "Implement login API endpoint"  # Task title (1-200 chars)

# Optional
description: "Create POST /login with JWT response"  # Detailed description
priority: "high"  # "critical", "high", "medium", "low"
project_id: "proj_123"  # Use specific project (defaults to current)
parent_id: "task_456"  # Create as subtask
dry_run: false  # Preview creation

# Code location linking
line_range:
  start_line: 45
  end_line: 62
  file_path: "src/auth/login.ts"
```

**Returns:**
- Created task information with unique ID
- Hierarchical placement confirmation
- Project assignment details
- Code location link validation

### `update_task`
**Comprehensive task modification tool.**

**Purpose:** Unified tool for all task updates including completion, progress, notes, and blockers.

```yaml
# Required
task_id: "task_123"  # Task to update

# Optional updates
title: "Updated task title"
description: "New description"
priority: "critical"  # Priority change
completed: true  # Mark complete/incomplete
progress: 75  # Progress percentage (0-100)
dry_run: false  # Preview changes

# Progress tracking
notes: "API implementation complete, testing in progress"
# OR multiple notes
notes: 
  - "Completed endpoint logic"
  - "Added input validation"
  - "Started unit tests"

# Blocker management
blockers:
  - "Waiting for security review"
  - "Database migration pending"
```

**Returns:**
- Updated task information
- Progress change summary
- Blocker status and resolution tracking
- Timestamped note additions

---

## Memory Tools

### `remember_this`
**Information storage with importance classification and linking.**

**Purpose:** Store important decisions, context, and information with proper categorization and project/task linking.

```yaml
# Required
content: "Switched authentication from JWT to session cookies for enhanced security"

# Optional
title: "Authentication Method Decision"  # Auto-generated if not provided
importance: "critical"  # "critical", "high", "medium", "low"
project_id: "proj_123"  # Link to project (uses current if not specified)
task_id: "task_456"  # Link to specific task
dry_run: false  # Preview storage

# Code location linking
line_range:
  start_line: 12
  end_line: 25
  file_path: "src/config/auth.ts"
```

**Returns:**
- Stored memory confirmation with unique ID
- Importance classification and linking details
- Search indexing confirmation

### `recall_context`
**Memory search and retrieval with filtering.**

**Purpose:** Search stored memories with importance filtering and project context.

```yaml
# Optional parameters
query: "authentication security decision"  # Search term (title + content)
project_id: "proj_123"  # Filter by project
importance: "critical"  # Filter by importance level
limit: 10  # Maximum memories (1-100)
```

**Returns:**
- Relevant memories with content and metadata
- Importance levels and timestamps
- Project and task links
- Search relevance scoring

---

## Session Tools

### `export_session`
**Complete session data export in multiple formats.**

**Purpose:** Generate comprehensive session exports for permanent storage and analysis.

```yaml
# Optional parameters
format: "markdown"  # "markdown" or "json"
include_handoff: true  # Include handoff summary
raw_markdown: false  # Clean markdown without MCP wrapper
```

**Formats:**
- **Markdown:** Human-readable session summary with project structure
- **JSON:** Machine-readable complete data dump
- **Raw Markdown:** Clean text without MCP response formatting

**Returns:**
- Complete session data in requested format
- Project hierarchies and task relationships
- Memory collections with importance levels
- Session activity logs and statistics

### `generate_handoff_summary`
**Session transition summaries for continuity.**

**Purpose:** Create clean, focused summaries for transitioning between sessions or agents.

```yaml
# Optional parameters
project_id: "proj_123"  # Focus on specific project
format: "detailed"  # "detailed" or "brief"
```

**Summary Levels:**
- **Detailed:** Comprehensive project state, active tasks, blockers, progress
- **Brief:** Key accomplishments, next steps, critical blockers

**Returns:**
- Clean markdown summary without MCP wrapper
- Current progress and completion status
- Active blockers and resolution requirements
- Recommended next steps and priorities

---

## Advanced Integration Patterns

### **Tool Chaining Examples**

**Project Setup Workflow:**
```yaml
1. create_project: name="New Feature"
2. create_task: title="Design database schema", priority="high"
3. create_task: title="Implement API", parent_id=<schema_task_id>
4. remember_this: content="Using PostgreSQL for ACID compliance"
```

**Progress Tracking Workflow:**
```yaml
1. update_task: task_id="123", progress=50, notes="Half complete"
2. remember_this: content="Performance optimization needed", task_id="123"
3. update_task: task_id="123", blockers=["Waiting for performance review"]
```

**Session Handoff Workflow:**
```yaml
1. export_session: format="markdown", include_handoff=true
2. generate_handoff_summary: format="detailed"
3. # Save outputs as markdown files for next session
```

### **Error Handling Patterns**

All tools support comprehensive error handling:

- **Validation Errors:** Field-specific error messages with resolution guidance
- **Not Found Errors:** Clear identification of missing resources with suggestions
- **Permission Errors:** Context-aware error messages with resolution steps
- **Dry Run Results:** Safe preview functionality without data modification

### **Performance Optimization**

**Efficient Data Access:**
- Use pagination on list operations for large datasets
- Filter results with specific criteria to reduce payload
- Leverage `recall_state` for comprehensive context instead of multiple tool calls

**Memory Management:**
- Set appropriate importance levels for memory prioritization
- Use project-specific queries to reduce search scope
- Regular session exports prevent data loss and enable performance resets

---

## Tool Integration Best Practices

### **For AI Agents**
1. **Start with `recall_state`** to understand current context
2. **Use dry_run** to preview changes before execution
3. **Leverage hierarchical tasks** for complex project organization
4. **Store important decisions** with appropriate importance levels
5. **Generate handoffs** before ending sessions

### **For Development Workflows**
1. **Link tasks to code locations** using line_range
2. **Track progress with timestamped notes** for accountability
3. **Document blockers explicitly** for team coordination
4. **Use importance levels** to prioritize critical information
5. **Export data regularly** for permanent project records

### **For Team Collaboration**
1. **Maintain project status** with regular updates
2. **Share handoff summaries** between team members
3. **Document decision rationale** in memories
4. **Track dependencies** through task hierarchies
5. **Export session data** for meeting preparation

This comprehensive tool reference enables full utilization of Memory Pickle MCP's capabilities for advanced project management and session continuity in AI-powered development workflows.