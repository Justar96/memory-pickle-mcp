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
    }
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
        }
      },
      required: ["name"]
    }
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
        }
      },
      required: ["title"]
    }
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
        }
      },
      required: ["task_id"]
    }
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
        }
      },
      required: ["content"]
    }
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
    }
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
    }
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
        }
      },
      required: ["project_id"]
    }
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