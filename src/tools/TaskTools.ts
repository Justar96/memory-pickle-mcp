/**
 * MCP Tools for Task Management Operations
 */
export const TASK_TOOLS = [
  {
    name: "create_task",
    description: `<tool_instruction>
  <priority>CRITICAL</priority>
  <use_when>
    <condition>User mentions any action item, todo, or work that needs to be done</condition>
    <condition>User describes features to implement or problems to solve</condition>
    <condition>Breaking down larger work into smaller pieces</condition>
    <condition>User says "I need to...", "We should...", "Let's..."</condition>
  </use_when>
  <workflow>
    <step>Extract clear task title from user's description</step>
    <step>Assess priority based on urgency/importance keywords</step>
    <step>Create task automatically - no need to ask permission</step>
    <step>Provide task ID for future reference</step>
  </workflow>
  <agent_behavior>
    <auto_create>ALWAYS create tasks when user mentions work items</auto_create>
    <priority_detection>
      <critical>security, urgent, blocking, critical, emergency</critical>
      <high>important, deadline, core feature, must have</high>
      <medium>should, feature, improvement</medium>
      <low>nice to have, maybe, consider, polish</low>
    </priority_detection>
    <subtask_creation>Break complex tasks into subtasks using parent_id</subtask_creation>
  </agent_behavior>
  <examples>
    <trigger>"I need to add user authentication" → create_task(title="Add user authentication", priority="high")</trigger>
    <trigger>"We should fix that login bug" → create_task(title="Fix login bug", priority="critical")</trigger>
    <trigger>"Let's improve the UI design" → create_task(title="Improve UI design", priority="medium")</trigger>
  </examples>
  <next_actions>After creating task, suggest using toggle_task when user says it's done</next_actions>
</tool_instruction>`,
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
    description: `<tool_instruction>
  <priority>CRITICAL</priority>
  <use_when>
    <condition>User says something is "done", "finished", "completed", "ready"</condition>
    <condition>User mentions they "finished", "completed", "implemented" something</condition>
    <condition>User wants to mark something as incomplete again</condition>
    <condition>User reports completion of any work item</condition>
  </use_when>
  <workflow>
    <step>Identify which task the user is referring to</step>
    <step>Use task ID from previous create_task calls or get_project_status</step>
    <step>Toggle completion status automatically</step>
    <step>Show updated project progress percentage</step>
  </workflow>
  <agent_behavior>
    <auto_complete>ALWAYS mark tasks complete when user indicates they're done</auto_complete>
    <completion_detection>
      <phrases>"I finished", "It's done", "Completed", "Ready", "Implemented"</phrases>
      <context>Match user's description to existing task titles</context>
    </completion_detection>
    <progress_update>Automatically update parent tasks and project completion</progress_update>
  </agent_behavior>
  <examples>
    <trigger>"I finished the login page" → find task with "login" and toggle_task</trigger>
    <trigger>"The authentication is done" → find "authentication" task and toggle_task</trigger>
    <trigger>"Completed the database setup" → find "database" task and toggle_task</trigger>
  </examples>
  <task_matching>Use fuzzy matching to find tasks based on user's description</task_matching>
</tool_instruction>`,
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
    description: `<tool_instruction>
  <priority>HIGH</priority>
  <use_when>
    <condition>User reports partial progress on a task (25%, 50%, 75%)</condition>
    <condition>User mentions blockers, issues, or impediments</condition>
    <condition>User provides updates or notes about ongoing work</condition>
    <condition>User says "I'm halfway done", "almost finished", "making progress"</condition>
  </use_when>
  <workflow>
    <step>Identify the task being discussed</step>
    <step>Extract progress percentage from user's description</step>
    <step>Capture any blockers or issues mentioned</step>
    <step>Add timestamped notes for context</step>
  </workflow>
  <agent_behavior>
    <progress_detection>
      <phrases>"halfway done" = 50%, "almost finished" = 75%, "just started" = 25%</phrases>
      <blockers>Listen for "blocked by", "waiting for", "can't proceed", "stuck on"</blockers>
    </progress_detection>
    <auto_update>Update progress when user provides status updates</auto_update>
    <note_capture>Automatically capture important context as notes</note_capture>
  </agent_behavior>
  <examples>
    <trigger>"I'm halfway done with the API integration" → progress: 50</trigger>
    <trigger>"Stuck waiting for the design files" → blockers: ["Waiting for design files"]</trigger>
    <trigger>"Made good progress on authentication, about 75% done" → progress: 75</trigger>
  </examples>
  <parent_updates>Automatically recalculates parent task progress from subtasks</parent_updates>
</tool_instruction>`,
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
    description: `<tool_instruction>
  <priority>MEDIUM</priority>
  <use_when>
    <condition>User asks "what tasks do I have?", "show me my todos", "what's pending?"</condition>
    <condition>User wants to see specific types of tasks (completed, blocked, high priority)</condition>
    <condition>User needs to review subtasks of a specific parent task</condition>
    <condition>User wants to filter tasks by criteria</condition>
  </use_when>
  <workflow>
    <step>Determine what filter the user wants (status, priority, etc.)</step>
    <step>Apply appropriate filters based on user's request</step>
    <step>Show tasks in priority order with completion status</step>
    <step>Include task IDs for easy reference</step>
  </workflow>
  <agent_behavior>
    <filter_detection>
      <status>"completed" = finished tasks, "pending" = not started, "in_progress" = partially done</status>
      <priority>"critical" = urgent items, "high" = important, "medium" = normal, "low" = nice-to-have</priority>
    </filter_detection>
    <smart_defaults>If no filter specified, show pending tasks sorted by priority</smart_defaults>
  </agent_behavior>
  <examples>
    <trigger>"What high priority tasks do I have?" → get_tasks(priority="high")</trigger>
    <trigger>"Show me completed tasks" → get_tasks(status="completed")</trigger>
    <trigger>"What's left to do?" → get_tasks(status="pending")</trigger>
  </examples>
  <alternative>Use get_project_status for full project overview with task tree</alternative>
</tool_instruction>`,
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