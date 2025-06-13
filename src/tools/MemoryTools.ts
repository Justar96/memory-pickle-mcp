/**
 * MCP Tools for Memory Management Operations
 */
export const MEMORY_TOOLS = [
  {
    name: "remember_this",
    description: "HIGH PRIORITY: Store important decisions, architecture choices, requirements, and key context for future reference. Auto-categorize as project_planning (architecture, design, requirements), technical (implementation, constraints, solutions), or business (domain knowledge, user needs, rules). Link to current project/tasks. Examples: 'We decided to use PostgreSQL', 'API rate limit is 1000/hour', 'Users need CSV export'.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Clear, descriptive title" },
        content: { type: "string", description: "Detailed content to remember" },
        category: { type: "string", description: "Category", default: "general" },
        importance: { type: "string", enum: ["critical", "high", "medium", "low"], default: "medium" },
        tags: { type: "array", items: { type: "string" }, description: "Tags for categorization" },
        task_id: { type: "string", description: "Related task ID (optional)" },
        project_id: { type: "string", description: "Related project ID (optional)" }
      },
      required: ["title", "content"]
    }
  },
  {
    name: "recall_context",
    description: "CRITICAL: Retrieve stored memories and context from previous sessions. If no query provided, automatically shows project status. Use at session start or when needing historical context, decisions, or requirements.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (shows project status if empty)" },
        category: { type: "string", description: "Filter by category" },
        tags: { type: "array", items: { type: "string" }, description: "Filter by tags" },
        limit: { type: "number", default: 10, description: "Maximum results" }
      }
    }
  }
];