/**
 * Project Status Tool - Shows current project overview
 * 
 * 2025 Best Practices:
 * - Action-oriented description
 * - Semantic triggers for auto-activation
 * - Context-aware behavior
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const ProjectStatusTool: Tool = {
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
};

// Tool metadata for better organization
export const ProjectStatusMetadata = {
  category: 'PROJECT_MANAGEMENT',
  priority: 'CRITICAL',
  triggers: ['session start', 'what am I working on', 'show status', 'where are we'],
  examples: [
    { input: "What's the current status?", expectedAction: "get_project_status()" },
    { input: "Show me project progress", expectedAction: "get_project_status()" }
  ]
};