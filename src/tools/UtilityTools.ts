/**
 * MCP Tools for Utility Operations
 */
export const UTILITY_TOOLS = [
  {
    name: "export_to_markdown",
    description: `<tool_instruction>
  <priority>MEDIUM</priority>
  <use_when>
    <condition>User wants to create documentation from project data</condition>
    <condition>User needs to share project status with team members</condition>
    <condition>User wants to archive completed project information</condition>
    <condition>User asks to "export", "save", or "document" the project</condition>
  </use_when>
  <workflow>
    <step>Generate comprehensive markdown document</step>
    <step>Include project overview, task lists, and completion status</step>
    <step>Add memories and important decisions if requested</step>
    <step>Save to specified file for sharing or archival</step>
  </workflow>
  <agent_behavior>
    <format_output>Create well-structured markdown with headers, checkboxes, and progress</format_output>
    <include_metadata>Add generation date, session count, and project statistics</include_metadata>
    <task_hierarchy>Preserve parent-child task relationships in export</task_hierarchy>
  </agent_behavior>
  <examples>
    <trigger>"Can you export the project documentation?" → export_to_markdown()</trigger>
    <trigger>"Save the current project status to a file" → export_to_markdown()</trigger>
    <trigger>"Create a summary document for the team" → export_to_markdown()</trigger>
  </examples>
  <output_format>Markdown file with checkboxes, progress indicators, and project metadata</output_format>
</tool_instruction>`,
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
    description: `<tool_instruction>
  <priority>HIGH</priority>
  <use_when>
    <condition>User starts a new project and needs structured planning</condition>
    <condition>User mentions "sprint", "planning", "checklist", "standup"</condition>
    <condition>User needs guidance on how to organize their work</condition>
    <condition>User wants to follow best practices for project management</condition>
  </use_when>
  <workflow>
    <step>Select appropriate template based on user's context</step>
    <step>Present structured questions and prompts</step>
    <step>Guide user through each step of the template</step>
    <step>Suggest creating tasks based on template responses</step>
  </workflow>
  <agent_behavior>
    <template_selection>
      <project_checklist>New projects, initial planning, goal setting</project_checklist>
      <sprint_planning>Iteration planning, task breakdown, priority setting</sprint_planning>
      <daily_standup>Progress updates, blocker identification, next steps</daily_standup>
    </template_selection>
    <auto_suggest>Suggest relevant templates based on user's language and context</auto_suggest>
    <follow_through>After template, help create actual tasks from the planning</follow_through>
  </agent_behavior>
  <examples>
    <trigger>"I'm starting a new project" → apply_template("project_checklist")</trigger>
    <trigger>"Let's plan this sprint" → apply_template("sprint_planning")</trigger>
    <trigger>"What did I accomplish today?" → apply_template("daily_standup")</trigger>
  </examples>
  <next_steps>Use create_task to convert template responses into actionable tasks</next_steps>
</tool_instruction>`,
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
    description: `<tool_instruction>
  <priority>LOW</priority>
  <use_when>
    <condition>User asks "what can I do?", "what tools are available?", "show me an overview"</condition>
    <condition>User is new to the system and needs orientation</condition>
    <condition>User wants to see project statistics and available templates</condition>
    <condition>User needs to understand the current state of all projects</condition>
  </use_when>
  <workflow>
    <step>Show high-level project management statistics</step>
    <step>Display available templates for planning</step>
    <step>Provide guidance on next steps</step>
    <step>Suggest using get_project_status for detailed view</step>
  </workflow>
  <agent_behavior>
    <overview_focus>Provide high-level summary rather than detailed task lists</overview_focus>
    <guidance>Include helpful suggestions for what to do next</guidance>
    <template_awareness>Show available templates to guide user planning</template_awareness>
  </agent_behavior>
  <examples>
    <trigger>"What's the current state of everything?" → list_categories()</trigger>
    <trigger>"Show me an overview" → list_categories()</trigger>
    <trigger>"What templates are available?" → list_categories()</trigger>
  </examples>
  <alternative>Use get_project_status for detailed project view with task trees</alternative>
</tool_instruction>`,
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];