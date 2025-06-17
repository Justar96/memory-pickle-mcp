/**
 * MCP Tools Registry - Essential 12 tools for project management
 */

const CORE_TOOLS = [
  // READ TOOLS
  {
    name: "recall_state",
    description: "Get current project context with tasks, memories, and stats in one call. Use this first in sessions.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 20 },
        project_id: { type: "string" },
        include_completed: { type: "boolean", default: false },
        focus: { type: "string", enum: ["tasks", "projects", "memories", "all"], default: "all" }
      }
    }
  },
  {
    name: "list_tasks",
    description: "List and filter tasks with pagination.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["active", "completed"] },
        priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
        project_id: { type: "string" },
        limit: { type: "number", default: 50 }
      }
    }
  },
  {
    name: "list_projects",
    description: "List projects with completion stats.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["planning", "in_progress", "blocked", "completed", "archived"] },
        limit: { type: "number", default: 50 }
      }
    }
  },
  {
    name: "get_task",
    description: "Get detailed info for a single task including subtasks and notes.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string" }
      },
      required: ["task_id"]
    }
  },

  // WRITE TOOLS  
  {
    name: "create_project",
    description: "Create new project and set as current.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        dry_run: { type: "boolean", default: false }
      },
      required: ["name"]
    }
  },
  {
    name: "update_project",
    description: "Update project name, description, or status.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: ["planning", "in_progress", "blocked", "completed", "archived"] },
        dry_run: { type: "boolean", default: false }
      },
      required: ["project_id"]
    }
  },
  {
    name: "set_current_project",
    description: "Switch active project context.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        dry_run: { type: "boolean", default: false }
      },
      required: ["project_id"]
    }
  },
  {
    name: "create_task",
    description: "Create task in current or specified project.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        priority: { type: "string", enum: ["critical", "high", "medium", "low"], default: "medium" },
        project_id: { type: "string" },
        parent_id: { type: "string" },
        dry_run: { type: "boolean", default: false }
      },
      required: ["title"]
    }
  },
  {
    name: "update_task",
    description: "Update task progress, completion, notes, or blockers. Can toggle completion with completed=true/false.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
        completed: { type: "boolean" },
        progress: { type: "number", minimum: 0, maximum: 100 },
        notes: { 
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } }
          ]
        },
        blockers: { type: "array", items: { type: "string" } },
        dry_run: { type: "boolean", default: false }
      },
      required: ["task_id"]
    }
  },

  // MEMORY TOOLS
  {
    name: "remember_this",
    description: "Store important information linked to current project/task.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string" },
        title: { type: "string" },
        importance: { type: "string", enum: ["critical", "high", "medium", "low"], default: "medium" },
        project_id: { type: "string" },
        task_id: { type: "string" },
        dry_run: { type: "boolean", default: false }
      },
      required: ["content"]
    }
  },

  // SESSION MANAGEMENT
  {
    name: "export_session",
    description: "Export session data as markdown or JSON for permanent storage.",
    inputSchema: {
      type: "object",
      properties: {
        format: { type: "string", enum: ["markdown", "json"], default: "markdown" },
        include_handoff: { type: "boolean", default: true },
        raw_markdown: { type: "boolean", default: false, description: "If true, returns clean markdown without MCP response wrapper. Useful for agents that want to process the markdown directly." }
      }
    }
  },
  {
    name: "generate_handoff_summary",
    description: "Generate session summary for handoff between sessions.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        format: { type: "string", enum: ["detailed", "brief"], default: "detailed" }
      }
    }
  }
];

export const ALL_TOOLS = CORE_TOOLS;