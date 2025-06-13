/**
 * MCP Tools for Memory Management Operations
 */
export const MEMORY_TOOLS = [
  {
    name: "remember_this",
    description: `<tool_instruction>
  <priority>HIGH</priority>
  <use_when>
    <condition>User makes important decisions about architecture, design, or approach</condition>
    <condition>User provides key information that should be preserved</condition>
    <condition>User explains complex requirements or constraints</condition>
    <condition>User shares important context about the project or domain</condition>
  </use_when>
  <workflow>
    <step>Extract the key information from user's message</step>
    <step>Create descriptive title summarizing the information</step>
    <step>Store detailed content for future reference</step>
    <step>Link to current task or project if relevant</step>
  </workflow>
  <agent_behavior>
    <auto_remember>Store important decisions and context automatically</auto_remember>
    <categorization>
      <project_planning>Architecture, design decisions, requirements</project_planning>
      <technical>Implementation details, constraints, solutions</technical>
      <business>Domain knowledge, user needs, business rules</business>
    </categorization>
    <linking>Automatically link memories to current project and related tasks</linking>
  </agent_behavior>
  <examples>
    <trigger>"We decided to use PostgreSQL for better performance" → remember architecture decision</trigger>
    <trigger>"The API rate limit is 1000 requests per hour" → remember technical constraint</trigger>
    <trigger>"Users need to be able to export data as CSV" → remember requirement</trigger>
  </examples>
  <integration>Memories can be retrieved later with recall_context for project continuity</integration>
</tool_instruction>`,
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
    description: `<tool_instruction>
  <priority>CRITICAL</priority>
  <use_when>
    <condition>Session start - shows project status if no query provided</condition>
    <condition>Need context from previous sessions</condition>
  </use_when>
  <auto_behavior>If no query is provided, automatically shows project status</auto_behavior>
</tool_instruction>`,
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