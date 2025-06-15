/**
 * Create Project Tool - Creates new project containers
 * 
 * 2025 Best Practices:
 * - Clear action verb in name
 * - Comprehensive trigger patterns
 * - Automatic behavior documentation
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const CreateProjectTool: Tool = {
  name: "create_project",
  description: "Create a new project container to organize related work. Automatically becomes the active project for all future tasks. Triggered when: user mentions 'new project', 'start working on', 'let's build', 'create app/website/system', or describes a new initiative. The project will track all tasks, progress, and memories.",
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
};

export const CreateProjectMetadata = {
  category: 'PROJECT_MANAGEMENT',
  priority: 'MEDIUM',
  triggers: ['new project', 'start working on', "let's build", 'create app', 'create website'],
  examples: [
    { input: "Let's build an e-commerce site", expectedAction: "create_project(name='E-commerce Site')" },
    { input: "Start a new project for task tracking", expectedAction: "create_project(name='Task Tracking')" }
  ]
};