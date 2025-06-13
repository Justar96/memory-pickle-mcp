import * as path from 'path';

// Data directory configuration
export const DATA_DIR = path.join(process.cwd(), '.memory-pickle');

// Monolithic legacy file
export const PROJECT_FILE = path.join(DATA_DIR, 'project-data.yaml');

// Incremental-storage (step 7)
export const PROJECTS_FILE  = path.join(DATA_DIR, 'projects.yaml');
export const TASKS_FILE     = path.join(DATA_DIR, 'tasks.yaml');
export const MEMORIES_FILE  = path.join(DATA_DIR, 'memories.yaml');        // split file
export const STUB_FILE      = PROJECT_FILE;  // lightweight stub for backward-compat

// Misc config
export const CONFIG_FILE = path.join(DATA_DIR, 'memory-config.yaml');

// Server configuration
export const SERVER_CONFIG = {
  name: "memory-pickle",
  version: "2.0.0",
} as const;

// YAML serialization options
export const YAML_OPTIONS = {
  indent: 2,
  lineWidth: 120,
  noRefs: true,
} as const;