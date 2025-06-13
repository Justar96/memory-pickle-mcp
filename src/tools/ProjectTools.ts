/**
 * MCP Tools for Project Management Operations
 */
export const PROJECT_TOOLS = [
  {
    name: "create_project",
    description: "HIGH PRIORITY: Create a new project to organize tasks and work. Use when user mentions starting a project, building something, or organizing work. Triggers: 'I want to build...', 'Let's start a new...', 'We need to organize...'. Automatically becomes the active project and suggest creating initial tasks.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Project name" },
        description: { type: "string", description: "Project description (optional)" }
      },
      required: ["name"]
    }
  },
  {
    name: "get_project_status",
    description: "CRITICAL: ALWAYS call this first at session start to show current project status, tasks, and progress. Shows what's completed, what's pending, and overall project health. Essential for session continuity.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Project ID (uses current project if not specified)" }
      }
    }
  },
  {
    name: "set_current_project",
    description: "MEDIUM PRIORITY: Switch between multiple projects. Use when user says 'let's work on [project name]', 'switch to [project]', or mentions working on a different project. All new tasks will be added to the selected project. Get project list first with get_project_status.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Project ID to set as current" }
      },
      required: ["project_id"]
    }
  },
  {
    name: "generate_handoff_summary",
    description: "HIGH PRIORITY: Generate a comprehensive summary for session handoff. Use at end of conversation or when user needs to continue in a new chat. Creates copy-paste ready summary with completed items, in-progress work, blockers, and next priorities for seamless continuity.",
    inputSchema: {
      type: "object",
      properties: {
        format: { type: "string", enum: ["detailed", "compact"], default: "detailed", description: "Summary format" }
      }
    }
  }
];