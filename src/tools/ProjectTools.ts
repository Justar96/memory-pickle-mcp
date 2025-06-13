/**
 * MCP Tools for Project Management Operations
 */
export const PROJECT_TOOLS = [
  {
    name: "create_project",
    description: `<tool_instruction>
  <priority>HIGH</priority>
  <use_when>
    <condition>User mentions starting a new project or initiative</condition>
    <condition>No current project exists and user wants to create tasks</condition>
    <condition>User wants to organize work into separate project containers</condition>
  </use_when>
  <workflow>
    <step>Create project with descriptive name and goals</step>
    <step>Project becomes current active project automatically</step>
    <step>Follow up with create_task to add initial tasks</step>
  </workflow>
  <agent_behavior>
    <auto_create>When user mentions "project", "build", "create", "start working on"</auto_create>
    <suggest_next>Immediately suggest creating initial tasks after project creation</suggest_next>
  </agent_behavior>
  <examples>
    <trigger>"I want to build an e-commerce website"</trigger>
    <trigger>"Let's start a new mobile app project"</trigger>
    <trigger>"We need to organize our marketing campaign"</trigger>
  </examples>
</tool_instruction>`,
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
    description: `<tool_instruction>
  <priority>CRITICAL</priority>
  <use_when>
    <condition>Session start - ALWAYS call this first</condition>
    <condition>Need to see current tasks and progress</condition>
    <condition>Checking project completion status</condition>
  </use_when>
  <auto_behavior>Should be called automatically at the start of every session</auto_behavior>
</tool_instruction>`,
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Project ID (uses current project if not specified)" }
      }
    }
  },
  {
    name: "set_current_project",
    description: `<tool_instruction>
  <priority>MEDIUM</priority>
  <use_when>
    <condition>User wants to switch between multiple projects</condition>
    <condition>User mentions working on a different project</condition>
    <condition>User says "let's work on [project name]" or "switch to [project]"</condition>
    <condition>Need to change context to a different project</condition>
  </use_when>
  <workflow>
    <step>Identify which project user wants to switch to</step>
    <step>Use project ID from previous project listings</step>
    <step>Set as current active project</step>
    <step>All new tasks will be added to this project</step>
  </workflow>
  <agent_behavior>
    <project_switching>When user mentions different project name, offer to switch</project_switching>
    <context_awareness>Remember which project is currently active</context_awareness>
    <auto_suggest>Suggest switching when user mentions work on different project</auto_suggest>
  </agent_behavior>
  <examples>
    <trigger>"Let's work on the mobile app now" → find mobile app project and set_current_project</trigger>
    <trigger>"Switch to the marketing campaign" → find marketing project and set_current_project</trigger>
    <trigger>"I want to add tasks to the website project" → switch to website project first</trigger>
  </examples>
  <prerequisite>Use get_project_status or list_categories to see available projects first</prerequisite>
</tool_instruction>`,
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
    description: `<tool_instruction>
  <priority>HIGH</priority>
  <use_when>
    <condition>End of session or conversation</condition>
    <condition>User needs to continue in a new chat</condition>
    <condition>Creating documentation for handoff</condition>
  </use_when>
  <purpose>Generate a summary that can be copied to a new chat session to continue seamlessly</purpose>
</tool_instruction>`,
    inputSchema: {
      type: "object",
      properties: {
        format: { type: "string", enum: ["detailed", "compact"], default: "detailed", description: "Summary format" }
      }
    }
  }
];