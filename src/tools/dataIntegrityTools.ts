import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Data integrity and validation tools
 */
export const DATA_INTEGRITY_TOOLS: Tool[] = [
  {
    name: "validate_database",
    description: "CRITICAL: Validates database integrity and repairs common issues like orphaned tasks, invalid references, and workflow inconsistencies. Use when data seems corrupted or after manual YAML edits.",
    inputSchema: {
      type: "object",
      properties: {
        auto_repair: {
          type: "boolean",
          description: "Whether to automatically repair found issues",
          default: true
        },
        generate_report: {
          type: "boolean", 
          description: "Whether to generate a detailed health report",
          default: true
        }
      },
      required: []
    }
  },
  {
    name: "check_workflow_state",
    description: "HIGH: Checks if the current workflow state is valid (e.g., tasks have projects, completion percentages are accurate). Use before important operations.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "Optional: Check specific project only"
        }
      },
      required: []
    }
  },
  {
    name: "repair_orphaned_data",
    description: "HIGH: Finds and repairs orphaned data (tasks without projects, memories without valid references). Use when agent workflow was interrupted.",
    inputSchema: {
      type: "object",
      properties: {
        create_default_project: {
          type: "boolean",
          description: "Create a default project for orphaned tasks",
          default: true
        }
      },
      required: []
    }
  }
];
