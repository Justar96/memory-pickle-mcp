/**
 * MCP Tools for Task Management Operations
 */
export const TASK_TOOLS = [
  {
    name: "create_task",
    description: "CRITICAL: ALWAYS create tasks when user mentions any work item, todo, or action. Triggers: 'I need to...', 'We should...', 'Let's...', feature descriptions, problems to solve. Auto-assess priority: critical (security, urgent, blocking), high (important, deadline, core feature), medium (should, feature, improvement), low (nice to have, maybe, polish). Break complex tasks into subtasks using parent_id.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Task description (optional)" },
        parent_id: { type: "string", description: "Parent task ID for subtasks (optional)" },
        priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
        due_date: { type: "string", description: "Due date (optional)" },
        tags: { type: "array", items: { type: "string" }, description: "Tags for categorization" },
        project_id: { type: "string", description: "Project ID (uses current project if not specified)" }
      },
      required: ["title"]
    }
  },
  {
    name: "toggle_task",
    description: "CRITICAL: ALWAYS mark tasks complete when user says something is 'done', 'finished', 'completed', 'ready', 'implemented'. Use fuzzy matching to find tasks based on user's description. Examples: 'I finished the login page' → find login task, 'Authentication is done' → find auth task. Updates project progress automatically.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Task ID to toggle" }
      },
      required: ["task_id"]
    }
  },
  {
    name: "update_task_progress",
    description: "HIGH PRIORITY: Update task progress when user reports partial completion or blockers. Progress phrases: 'halfway done' = 50%, 'almost finished' = 75%, 'just started' = 25%. Blocker phrases: 'blocked by', 'waiting for', 'can't proceed', 'stuck on'. Automatically captures notes and recalculates parent task progress.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Task ID to update" },
        progress: { type: "number", description: "Progress percentage (0-100)" },
        notes: { type: "string", description: "Add notes about the task" },
        blockers: { type: "array", items: { type: "string" }, description: "List of blockers" }
      },
      required: ["task_id"]
    }
  },
  {
    name: "get_tasks",
    description: "MEDIUM PRIORITY: Show filtered task lists. Triggers: 'what tasks do I have?', 'show me my todos', 'what's pending?', 'what high priority tasks?'. Filters by status (completed, pending, in_progress) or priority (critical, high, medium, low). Default shows pending tasks by priority. Use get_project_status for full overview.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["completed", "pending", "in_progress"], description: "Filter by status" },
        project_id: { type: "string", description: "Filter by project" },
        parent_id: { type: "string", description: "Filter by parent task" },
        priority: { type: "string", enum: ["critical", "high", "medium", "low"], description: "Filter by priority" }
      }
    }
  }
];