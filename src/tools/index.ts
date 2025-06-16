/**
 * MCP Tools Registry - 2025 Best Practices Edition
 * 
 * Enhanced with research-backed prompt engineering from:
 * - FunReason (2025): Self-refinement and reasoning coherence
 * - AutoPDL (2025): Structured AutoML approach
 * - MCP-Zero (2025): Proactive tool request patterns
 * 
 * Design Principles:
 * - Action-oriented descriptions with clear triggers
 * - Semantic keywords for intent matching
 * - Context-driven usage guidance
 * - Proactive behavior patterns
 * - Chain-of-thought reasoning hints
 * - Single responsibility per tool
 */

// Core Project & Task Management Tools - Enhanced for 2025
const CORE_TOOLS = [
  {
    name: "get_project_status",
    description: "Show current project overview with hierarchical task tree, progress metrics, and active work items. ALWAYS use this FIRST in new sessions to load context and understand the current state. Automatically triggered when: session starts, user asks 'what am I working on', 'show status', 'where are we', or references previous work.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { 
          type: "string", 
          description: "Project ID to show status for. If not specified, shows current project or all projects if none set." 
        }
      }
    },
    examples: [
      {
        call: { project_id: "proj_123" },
        description: "Get status for specific project"
      },
      {
        call: {},
        description: "Get current project status (most common usage)"
      }
    ]
  },
  {
    name: "create_project",
    description: "Create a new project container to organize related work. Automatically becomes the active project for all future tasks. Triggered when: user mentions 'new project', 'start working on', 'let's build', 'create app/website/system', or describes a new initiative. The project will track all tasks, progress, and memories in session memory. For permanent storage, generate handoff summaries and save as markdown files.",
    inputSchema: {
      type: "object",
      properties: {
        name: { 
          type: "string", 
          description: "Clear, descriptive project name (e.g., 'E-commerce Website', 'Task Tracker App')" 
        },
        description: { 
          type: "string", 
          description: "Project goals, scope, and key objectives (optional but recommended)" 
        },
        dry_run: {
          type: "boolean",
          default: false,
          description: "If true, validates inputs and simulates creation without making changes"
        }
      },
      required: ["name"]
    },
    examples: [
      {
        call: { 
          name: "E-commerce Website", 
          description: "Build online store with user accounts, product catalog, and payment processing" 
        },
        description: "Creating a new web development project with detailed scope"
      },
      {
        call: { name: "Bug Fixes" },
        description: "Simple project for quick tasks without description"
      }
    ]
  },
  {
    name: "create_task",
    description: "Create actionable task from user work descriptions and requirements.\n\nTRIGGERS: Action phrases like 'need to', 'should', 'must', 'let's', 'implement', 'fix', 'add', 'create'\nPRIORITY DETECTION: Maps user urgency language to priority levels:\n- 'urgent/critical/blocking' → critical\n- 'important/key/core' → high\n- 'nice to have/maybe/consider' → low\nBEHAVIOR: Auto-links to current project, supports subtask hierarchy via parent_id",
    inputSchema: {
      type: "object",
      properties: {
        title: { 
          type: "string", 
          description: "Clear, actionable task title (e.g., 'Implement user authentication', 'Fix navigation bug')" 
        },
        description: { 
          type: "string", 
          description: "Detailed requirements, acceptance criteria, or implementation notes (optional)" 
        },
        priority: { 
          type: "string", 
          enum: ["critical", "high", "medium", "low"],
          description: "Task priority level. Auto-detected from user language if not specified."
        },
        project_id: { 
          type: "string", 
          description: "Project to add task to. Uses current project if not specified." 
        },
        parent_id: {
          type: "string",
          description: "Parent task ID for creating subtasks in hierarchical structure (optional)"
        },
        line_range: {
          type: "object",
          properties: {
            start_line: {
              type: "integer",
              minimum: 1,
              description: "Starting line number (1-based) for code/content reference"
            },
            end_line: {
              type: "integer",
              minimum: 1,
              description: "Ending line number (1-based, inclusive) for code/content reference"
            },
            file_path: {
              type: "string",
              description: "File path for context (optional)"
            }
          },
          required: ["start_line", "end_line"],
          description: "Optional line range reference for tasks related to specific code sections or content"
        },
        dry_run: {
          type: "boolean",
          default: false,
          description: "If true, validates inputs and simulates task creation without making changes"
        }
      },
      required: ["title"]
    },
    examples: [
      {
        call: { 
          title: "Implement user authentication", 
          priority: "high",
          description: "Add login/logout functionality with JWT tokens" 
        },
        description: "User says: 'We need to implement user authentication with JWT tokens - this is important'"
      },
      {
        call: { 
          title: "Fix navigation bug", 
          priority: "critical",
          line_range: { start_line: 45, end_line: 67, file_path: "src/nav.js" }
        },
        description: "User says: 'There's a critical bug in the navigation component around lines 45-67'"
      },
      {
        call: { 
          title: "Add search functionality",
          parent_id: "task_456" 
        },
        description: "Creating a subtask under an existing parent task"
      }
    ]
  },
  {
    name: "update_task",
    description: "Update task status, progress, and notes when users report work updates.\n\nTRIGGERS: Progress phrases like 'finished', 'completed', 'done with', 'made progress', 'working on', 'stuck on', 'blocked by', percentage mentions\nFUNCTIONS: Supports completion status, progress percentage (0-100), notes, and blocker tracking\nBEHAVIOR: Updates parent task progress automatically, stores progress notes as memories",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { 
          type: "string", 
          description: "ID of the task to update. If exact ID unknown, search by title keywords. If task not found, list available tasks for user selection." 
        },
        completed: { 
          type: "boolean", 
          description: "Mark task as complete (true) or reopen (false)" 
        },
        progress: { 
          type: "number", 
          description: "Progress percentage (0-100). Auto-detected from phrases like 'halfway', 'almost done'." 
        },
        notes: { 
          type: "string", 
          description: "Progress update, implementation details, or status notes" 
        },
        blockers: { 
          type: "array", 
          items: { type: "string" }, 
          description: "List of blocking issues or dependencies" 
        },
        dry_run: {
          type: "boolean",
          default: false,
          description: "If true, validates inputs and simulates task update without making changes"
        }
      },
      required: ["task_id"]
    },
    examples: [
      {
        call: { 
          task_id: "task_123", 
          completed: true,
          notes: "Successfully implemented with React Router v6" 
        },
        description: "User says: 'I finished the navigation component using React Router v6'"
      },
      {
        call: { 
          task_id: "task_456", 
          progress: 75,
          notes: "API integration working, just need to add error handling" 
        },
        description: "User says: 'I'm about 75% done with the API integration, just need error handling'"
      },
      {
        call: { 
          task_id: "task_789", 
          blockers: ["Database migration pending", "Waiting for API keys"] 
        },
        description: "User says: 'I'm blocked on this task - need database migration and API keys'"
      }
    ]
  },
  {
    name: "remember_this",
    description: "Store critical information, decisions, requirements, constraints, technical details, or important context for future reference. Automatically triggered when: user says 'remember', 'important', 'don't forget', 'key point', 'for reference', 'note that', or shares configuration/setup details. Creates searchable memory linked to current project/task. Uses session memory - for permanent storage, tool will suggest creating markdown files.",
    inputSchema: {
      type: "object",
      properties: {
        title: { 
          type: "string", 
          description: "Clear, searchable title for the memory (auto-generated if not provided)" 
        },
        content: { 
          type: "string", 
          description: "Detailed information to remember, including context and rationale" 
        },
        importance: { 
          type: "string", 
          enum: ["critical", "high", "medium", "low"], 
          default: "medium",
          description: "Importance level. 'critical' for blockers/requirements, 'high' for key decisions."
        },
        project_id: {
          type: "string",
          description: "Link memory to specific project (uses current project if not specified)"
        },
        task_id: {
          type: "string",
          description: "Link memory to specific task (optional)"
        },
        line_range: {
          type: "object",
          properties: {
            start_line: {
              type: "integer",
              minimum: 1,
              description: "Starting line number (1-based) for code/content reference"
            },
            end_line: {
              type: "integer",
              minimum: 1,
              description: "Ending line number (1-based, inclusive) for code/content reference"
            },
            file_path: {
              type: "string",
              description: "File path for context (optional)"
            }
          },
          required: ["start_line", "end_line"],
          description: "Optional line range reference for memories about specific code sections or content"
        },
        dry_run: {
          type: "boolean",
          default: false,
          description: "If true, validates inputs and simulates memory storage without making changes"
        }
      },
      required: ["content"]
    },
    examples: [
      {
        call: { 
          content: "Database will use PostgreSQL with connection pool of 20. Redis for caching user sessions.",
          importance: "critical",
          title: "Architecture decisions for data layer"
        },
        description: "User says: 'Remember that we decided on PostgreSQL with 20 connection pool and Redis for sessions'"
      },
      {
        call: { 
          content: "User reported bug only happens on mobile Safari, seems related to viewport height calculations",
          task_id: "task_456"
        },
        description: "User says: 'Note that this bug only appears on mobile Safari - viewport height issue'"
      },
      {
        call: { 
          content: "API key: DEMO_KEY_12345 (expires Dec 2024)",
          importance: "high",
          line_range: { start_line: 12, end_line: 15, file_path: "config/api.js" }
        },
        description: "User shares API configuration details that need to be remembered"
      }
    ]
  },
  {
    name: "recall_context",
    description: "Search and retrieve previously stored memories, decisions, and context from any past session. Use when: user asks 'what did we decide about', 'how did we implement', 'what was the approach for', or when you need historical context. Shows project status if no specific query provided.",
    inputSchema: {
      type: "object",
      properties: {
        query: { 
          type: "string", 
          description: "Search terms to find relevant memories (searches title and content)" 
        },
        project_id: {
          type: "string",
          description: "Filter memories by specific project (optional)"
        },
        importance: {
          type: "string",
          enum: ["critical", "high", "medium", "low"],
          description: "Filter by importance level (optional)"
        },
        limit: { 
          type: "number", 
          default: 10, 
          description: "Maximum number of memories to return" 
        }
      }
    },
    examples: [
      {
        call: { query: "database configuration" },
        description: "User asks: 'What did we decide about the database setup?'"
      },
      {
        call: { 
          query: "API key",
          importance: "critical" 
        },
        description: "User asks: 'What were those critical API configuration details?'"
      },
      {
        call: { project_id: "proj_123" },
        description: "User asks: 'What do we have stored for this project?'"
      },
      {
        call: {},
        description: "User asks: 'What context do we have?' (shows recent memories)"
      }
    ]
  },
  {
    name: "generate_handoff_summary",
    description: "Create comprehensive session summary for seamless handoff between chats. Automatically use when: session ending, user says 'handoff', 'goodbye', 'see you later', 'continue tomorrow', switching context, or after significant progress. Includes completed work, active tasks, blockers, and next steps in copy-paste ready format. Suggests saving as markdown file for persistence.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "Generate summary for specific project only (shows all projects if not specified)"
        },
        format: { 
          type: "string", 
          enum: ["detailed", "compact"], 
          default: "detailed",
          description: "Output format. 'detailed' includes all context, 'compact' for quick overview."
        }
      }
    },
    examples: [
      {
        call: { format: "detailed" },
        description: "User says: 'I need to hand this off to another developer' (comprehensive summary)"
      },
      {
        call: { 
          project_id: "proj_123",
          format: "compact" 
        },
        description: "User says: 'Quick summary of where we are on the website project'"
      },
      {
        call: {},
        description: "User says: 'handoff' or 'goodbye' (triggers automatic detailed summary)"
      }
    ]
  },
  {
    name: "set_current_project",
    description: "Switch the active project context when working with multiple projects. All new tasks will automatically be added to the selected project. Use when: user mentions different project name, says 'switch to', 'work on', 'focus on', or creates tasks for a different project.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "ID of the project to set as current active project. If project_id doesn't exist, list available projects. If no projects exist, suggest creating one first."
        },
        dry_run: {
          type: "boolean",
          default: false,
          description: "If true, validates project_id exists without switching current project"
        }
      },
      required: ["project_id"]
    },
    examples: [
      {
        call: { project_id: "proj_456" },
        description: "User says: 'Let's switch to working on the mobile app project'"
      },
      {
        call: { project_id: "ecommerce_site" },
        description: "User says: 'Focus on the ecommerce site now'"
      }
    ]
  }
];

export const ALL_TOOLS = CORE_TOOLS;

// Enhanced tool name constants with semantic grouping
export const TOOL_NAMES = {
  // Project Management
  GET_PROJECT_STATUS: 'get_project_status',
  CREATE_PROJECT: 'create_project',
  SET_CURRENT_PROJECT: 'set_current_project',
  
  // Task Management
  CREATE_TASK: 'create_task',
  UPDATE_TASK: 'update_task',
  
  // Memory & Context
  REMEMBER_THIS: 'remember_this',
  RECALL_CONTEXT: 'recall_context',
  
  // Session Management
  GENERATE_HANDOFF_SUMMARY: 'generate_handoff_summary'
} as const;

// Type for tool names
export type ToolName = typeof TOOL_NAMES[keyof typeof TOOL_NAMES];

// Tool categories for better organization
export const TOOL_CATEGORIES = {
  PROJECT_MANAGEMENT: ['get_project_status', 'create_project', 'set_current_project'],
  TASK_MANAGEMENT: ['create_task', 'update_task'],
  MEMORY_CONTEXT: ['remember_this', 'recall_context'],
  SESSION_MANAGEMENT: ['generate_handoff_summary']
} as const;

// Priority levels for agent guidance
export const TOOL_PRIORITIES = {
  CRITICAL: ['get_project_status', 'recall_context'],  // Always check context first
  HIGH: ['create_task', 'update_task', 'remember_this'],  // Core workflow tools
  MEDIUM: ['create_project', 'generate_handoff_summary'],  // Important but less frequent
  LOW: ['set_current_project']  // Utility tools
} as const;