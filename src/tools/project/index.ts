/**
 * Project Management Tools
 * 
 * Exports all project-related tools with metadata
 */

export { ProjectStatusTool, ProjectStatusMetadata } from './ProjectStatusTool.js';
export { CreateProjectTool, CreateProjectMetadata } from './CreateProjectTool.js';

// You would add:
// export { SetCurrentProjectTool, SetCurrentProjectMetadata } from './SetCurrentProjectTool.js';

// Aggregate all project tools
import { ProjectStatusTool } from './ProjectStatusTool.js';
import { CreateProjectTool } from './CreateProjectTool.js';

export const PROJECT_TOOLS = [
  ProjectStatusTool,
  CreateProjectTool,
  // SetCurrentProjectTool
];

export const PROJECT_TOOL_NAMES = {
  GET_PROJECT_STATUS: 'get_project_status',
  CREATE_PROJECT: 'create_project',
  SET_CURRENT_PROJECT: 'set_current_project'
} as const;