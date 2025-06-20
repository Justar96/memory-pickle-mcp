/**
 * MCP Tools Registry - 13 secure tools for AI-powered project management
 * 
 * Security-hardened descriptions following MCP best practices:
 * - Factual, descriptive language only
 * - No imperative commands or behavioral instructions
 * - No system prompt interference patterns
 * - Clean, minimal descriptions focused on functionality
 */

const CORE_TOOLS = [
  // READ TOOLS
  {
    name: "recall_state",
    description: "Returns comprehensive project context including tasks, memories, and statistics. Provides current session state and project overview data.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 20, description: "Maximum number of items to return per category" },
        project_id: { type: "string", description: "Specific project ID to focus on (optional, defaults to current project)" },
        include_completed: { type: "boolean", default: false, description: "Include completed tasks in the summary" },
        focus: { type: "string", enum: ["tasks", "projects", "memories", "all"], default: "all", description: "Focus the recall on specific data types" }
      }
    },
    annotations: {
      title: "Universal State Recall",
      readOnlyHint: true,
      openWorldHint: false,
      idempotentHint: true
    }
  },
  {
    name: "list_tasks",
    description: "Returns filtered list of tasks with pagination support. Supports filtering by status, priority, project, and completion state.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["active", "completed"], description: "Filter by completion status" },
        priority: { type: "string", enum: ["critical", "high", "medium", "low"], description: "Filter by priority level" },
        project_id: { type: "string", description: "Filter by specific project ID" },
        completed: { type: "boolean", description: "Boolean filter for completion status (alternative to status)" },
        limit: { type: "number", default: 50, minimum: 1, maximum: 200, description: "Maximum number of tasks to return" },
        offset: { type: "number", default: 0, minimum: 0, description: "Number of tasks to skip for pagination" }
      }
    },
    annotations: {
      title: "Task Listing & Filtering",
      readOnlyHint: true,
      openWorldHint: false,
      idempotentHint: true
    }
  },
  {
    name: "list_projects",
    description: "Returns list of projects with completion statistics and optional status filtering. Includes progress percentages and task counts.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["planning", "in_progress", "blocked", "completed", "archived"], description: "Filter projects by status" },
        limit: { type: "number", default: 50, minimum: 1, maximum: 200, description: "Maximum number of projects to return" },
        offset: { type: "number", default: 0, minimum: 0, description: "Number of projects to skip for pagination" }
      }
    },
    annotations: {
      title: "Project Listing & Overview",
      readOnlyHint: true,
      openWorldHint: false,
      idempotentHint: true
    }
  },
  {
    name: "get_task",
    description: "Returns detailed information for a single task including subtasks, notes, blockers, and related memories.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Unique identifier of the task to retrieve" }
      },
      required: ["task_id"]
    },
    annotations: {
      title: "Task Detail Retrieval",
      readOnlyHint: true,
      openWorldHint: false,
      idempotentHint: true
    }
  },

  // WRITE TOOLS  
  {
    name: "create_project",
    description: "Creates a new project with specified name, description, and status. Sets the new project as the current active project.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1, maxLength: 200, description: "Project name (required)" },
        description: { type: "string", maxLength: 20000, description: "Detailed project description" },
        status: { type: "string", enum: ["planning", "in_progress", "blocked", "completed", "archived"], default: "planning", description: "Initial project status" },
        dry_run: { type: "boolean", default: false, description: "Preview changes without creating the project" }
      },
      required: ["name"]
    },
    annotations: {
      title: "Project Creation",
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: false
    }
  },
  {
    name: "update_project",
    description: "Updates existing project properties including name, description, or status.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Project ID to update (required)" },
        name: { type: "string", minLength: 1, maxLength: 200, description: "New project name" },
        description: { type: "string", maxLength: 20000, description: "New project description" },
        status: { type: "string", enum: ["planning", "in_progress", "blocked", "completed", "archived"], description: "New project status" },
        dry_run: { type: "boolean", default: false, description: "Preview changes without updating" }
      },
      required: ["project_id"]
    },
    annotations: {
      title: "Project Update",
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: false
    }
  },
  {
    name: "set_current_project",
    description: "Changes the active project context. Subsequent task creation operations will default to this project.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Project ID to set as current (required)" },
        dry_run: { type: "boolean", default: false, description: "Preview the switch without changing context" }
      },
      required: ["project_id"]
    },
    annotations: {
      title: "Project Context Switch",
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true
    }
  },
  {
    name: "create_task",
    description: "Creates a new task in the current or specified project. Supports hierarchical task organization through parent_id and code location references through line_range.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 1, maxLength: 200, description: "Task title/summary (required)" },
        description: { type: "string", maxLength: 2000, description: "Detailed task description" },
        priority: { type: "string", enum: ["critical", "high", "medium", "low"], default: "medium", description: "Task priority level" },
        project_id: { type: "string", description: "Project ID (optional, uses current project if not specified)" },
        parent_id: { type: "string", description: "Parent task ID for creating subtasks" },
        line_range: {
          type: "object",
          properties: {
            start_line: { type: "number", minimum: 1, description: "Starting line number (1-based)" },
            end_line: { type: "number", minimum: 1, description: "Ending line number (1-based)" },
            file_path: { type: "string", description: "File path for code-related tasks" }
          },
          required: ["start_line", "end_line"],
          additionalProperties: false,
          description: "Code location reference for development tasks"
        },
        dry_run: { type: "boolean", default: false, description: "Preview task creation without saving" }
      },
      required: ["title"]
    },
    annotations: {
      title: "Task Creation",
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: false
    }
  },
  {
    name: "update_task",
    description: "Updates task properties including completion status, progress percentage, notes, and blockers. Progress notes are automatically timestamped.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Task ID to update (required)" },
        title: { type: "string", minLength: 1, maxLength: 200, description: "New task title" },
        description: { type: "string", maxLength: 2000, description: "New task description" },
        priority: { type: "string", enum: ["critical", "high", "medium", "low"], description: "New priority level" },
        completed: { type: "boolean", description: "Mark task as completed (true) or active (false)" },
        progress: { type: "number", minimum: 0, maximum: 100, description: "Progress percentage (0-100)" },
        notes: { 
          oneOf: [
            { type: "string", description: "Single progress note" },
            { type: "array", items: { type: "string" }, description: "Multiple progress notes" }
          ],
          description: "Progress notes (automatically timestamped)"
        },
        blockers: { type: "array", items: { type: "string" }, description: "List of blockers preventing task completion" },
        dry_run: { type: "boolean", default: false, description: "Preview changes without updating" }
      },
      required: ["task_id"]
    },
    annotations: {
      title: "Task Update & Progress",
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: false
    }
  },

  // MEMORY TOOLS
  {
    name: "remember_this",
    description: "Stores information, decisions, or context with importance classification and optional linking to projects, tasks, or code locations.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", minLength: 1, maxLength: 50000, description: "Information to remember (required)" },
        title: { type: "string", maxLength: 500, description: "Memory title (auto-generated if not provided)" },
        importance: { type: "string", enum: ["critical", "high", "medium", "low"], default: "medium", description: "Importance level classification" },
        project_id: { type: "string", description: "Link to specific project (uses current project if not specified)" },
        task_id: { type: "string", description: "Link to specific task" },
        line_range: {
          type: "object",
          properties: {
            start_line: { type: "number", minimum: 1, description: "Starting line number for code-related memories" },
            end_line: { type: "number", minimum: 1, description: "Ending line number for code-related memories" },
            file_path: { type: "string", description: "File path for code-related memories" }
          },
          required: ["start_line", "end_line"],
          additionalProperties: false,
          description: "Code location reference for development-related memories"
        },
        dry_run: { type: "boolean", default: false, description: "Preview memory storage without saving" }
      },
      required: ["content"]
    },
    annotations: {
      title: "Information Storage",
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: false
    }
  },
  {
    name: "recall_context",
    description: "Searches stored memories by query text with filtering options for project, importance level, and result limits. Searches both title and content fields.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (searches title and content)" },
        project_id: { type: "string", description: "Filter memories by project" },
        importance: { type: "string", enum: ["critical", "high", "medium", "low"], description: "Filter by importance level" },
        limit: { type: "number", default: 10, minimum: 1, maximum: 100, description: "Maximum number of memories to return" }
      }
    },
    annotations: {
      title: "Memory Search & Retrieval",
      readOnlyHint: true,
      openWorldHint: false,
      idempotentHint: true
    }
  },

  // SESSION MANAGEMENT
  {
    name: "export_session",
    description: "Exports complete session data in markdown or JSON format. Includes projects, tasks, memories, and session activity summary.",
    inputSchema: {
      type: "object",
      properties: {
        format: { type: "string", enum: ["markdown", "json"], default: "markdown", description: "Export format" },
        include_handoff: { type: "boolean", default: true, description: "Include handoff summary for session continuity" },
        raw_markdown: { type: "boolean", default: false, description: "Return clean markdown without MCP response wrapper" }
      }
    },
    annotations: {
      title: "Session Data Export",
      readOnlyHint: true,
      openWorldHint: false,
      idempotentHint: true
    }
  },
  {
    name: "generate_handoff_summary",
    description: "Generates comprehensive session summary with activity overview, progress updates, and current state for session continuity.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Focus summary on specific project (optional)" },
        format: { type: "string", enum: ["detailed", "brief"], default: "detailed", description: "Summary detail level" }
      }
    },
    annotations: {
      title: "Session Handoff Summary",
      readOnlyHint: true,
      openWorldHint: false,
      idempotentHint: true
    }
  }
];

export const ALL_TOOLS = CORE_TOOLS;