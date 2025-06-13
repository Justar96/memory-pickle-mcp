/**
 * MCP Tools for Utility Operations
 */
export const UTILITY_TOOLS = [
  {
    name: "export_to_markdown",
    description: "MEDIUM PRIORITY: Create comprehensive markdown documentation from project data. Triggers: 'export', 'save', 'document the project', 'create summary for team'. Generates well-structured markdown with headers, checkboxes, progress indicators, task hierarchy, and project metadata for sharing or archival.",
    inputSchema: {
      type: "object",
      properties: {
        output_file: { type: "string", default: "project-export.md" },
        include_tasks: { type: "boolean", default: true },
        include_memories: { type: "boolean", default: true }
      }
    }
  },
  {
    name: "apply_template",
    description: "HIGH PRIORITY: Guide structured planning with templates. Triggers: 'sprint', 'planning', 'checklist', 'standup', 'starting a new project', 'organize work'. Templates: project_checklist (new projects, goal setting), sprint_planning (iteration planning, task breakdown), daily_standup (progress updates, blockers). Follow up by creating tasks from template responses.",
    inputSchema: {
      type: "object",
      properties: {
        template_name: { type: "string", description: "Template: project_checklist, sprint_planning, daily_standup" },
        context: { type: "object", description: "Optional context data" }
      },
      required: ["template_name"]
    }
  },
  {
    name: "list_categories",
    description: "LOW PRIORITY: Show high-level overview and system orientation. Triggers: 'what can I do?', 'what tools are available?', 'show me an overview', 'what templates are available?'. Provides project statistics, available templates, and guidance on next steps. Use get_project_status for detailed project view.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];