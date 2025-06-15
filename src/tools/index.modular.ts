/**
 * MCP Tools Registry - Modular Architecture Example
 * 
 * This shows how to organize tools when you have many of them
 * For 8 tools, the single file approach is fine
 * For 20+ tools, this modular approach is better
 */

// Import tool categories
import { PROJECT_TOOLS } from './project/index.js';
import { TASK_TOOLS } from './task/index.js';
import { MEMORY_TOOLS } from './memory/index.js';
import { SESSION_TOOLS } from './session/index.js';

// Aggregate all tools
export const ALL_TOOLS = [
  ...PROJECT_TOOLS,
  ...TASK_TOOLS,
  ...MEMORY_TOOLS,
  ...SESSION_TOOLS
];

// Tool categories for better organization
export const TOOL_CATEGORIES = {
  PROJECT_MANAGEMENT: PROJECT_TOOLS.map(t => t.name),
  TASK_MANAGEMENT: TASK_TOOLS.map(t => t.name),
  MEMORY_CONTEXT: MEMORY_TOOLS.map(t => t.name),
  SESSION_MANAGEMENT: SESSION_TOOLS.map(t => t.name)
} as const;

// Priority levels for agent guidance
export const TOOL_PRIORITIES = {
  CRITICAL: ['get_project_status', 'recall_context'],
  HIGH: ['create_task', 'update_task', 'remember_this'],
  MEDIUM: ['create_project', 'generate_handoff_summary'],
  LOW: ['set_current_project']
} as const;

// Re-export all tool names
export { PROJECT_TOOL_NAMES } from './project/index.js';
export { TASK_TOOL_NAMES } from './task/index.js';
export { MEMORY_TOOL_NAMES } from './memory/index.js';
export { SESSION_TOOL_NAMES } from './session/index.js';