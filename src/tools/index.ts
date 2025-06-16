import { PROJECT_TOOLS } from './ProjectTools.js';
import { TASK_TOOLS } from './TaskTools.js';
import { MEMORY_TOOLS } from './MemoryTools.js';
import { UTILITY_TOOLS } from './UtilityTools.js';
import { DATA_INTEGRITY_TOOLS } from './dataIntegrityTools.js';

/**
 * Complete MCP Tools Registry
 * All 16 tools organized by category with preserved functionality
 */
export const ALL_TOOLS = [
  ...PROJECT_TOOLS,
  ...TASK_TOOLS,
  ...MEMORY_TOOLS,
  ...UTILITY_TOOLS,
  ...DATA_INTEGRITY_TOOLS
];

// Export individual tool categories for selective use
export { PROJECT_TOOLS, TASK_TOOLS, MEMORY_TOOLS, UTILITY_TOOLS, DATA_INTEGRITY_TOOLS };

// Tool name constants for type safety
export const TOOL_NAMES = {
  // Project Management
  CREATE_PROJECT: 'create_project',
  GET_PROJECT_STATUS: 'get_project_status',
  SET_CURRENT_PROJECT: 'set_current_project',
  GENERATE_HANDOFF_SUMMARY: 'generate_handoff_summary',
  
  // Task Management
  CREATE_TASK: 'create_task',
  TOGGLE_TASK: 'toggle_task',
  UPDATE_TASK_PROGRESS: 'update_task_progress',
  GET_TASKS: 'get_tasks',
  
  // Memory Management
  REMEMBER_THIS: 'remember_this',
  RECALL_CONTEXT: 'recall_context',
  
  // Utilities
  EXPORT_TO_MARKDOWN: 'export_to_markdown',
  APPLY_TEMPLATE: 'apply_template',
  LIST_CATEGORIES: 'list_categories',

  // Data Integrity
  VALIDATE_DATABASE: 'validate_database',
  CHECK_WORKFLOW_STATE: 'check_workflow_state',
  REPAIR_ORPHANED_DATA: 'repair_orphaned_data'
} as const;

// Type for tool names
export type ToolName = typeof TOOL_NAMES[keyof typeof TOOL_NAMES];