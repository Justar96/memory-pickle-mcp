import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// Data directory configuration with environment detection and fallbacks
function getDataDirectory(): string {
  // If workspace is explicitly set, use only that location
  if (process.env.MEMORY_PICKLE_WORKSPACE) {
    const workspaceDir = path.join(process.env.MEMORY_PICKLE_WORKSPACE, '.memory-pickle');
    console.error(`Memory Pickle: Using explicit workspace: ${process.env.MEMORY_PICKLE_WORKSPACE}`);
    
    if (fs.existsSync(workspaceDir)) {
      try {
        // Test write permissions
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const testFile = path.join(workspaceDir, `.write-test-${timestamp}-${randomSuffix}`);
        
        const fd = fs.openSync(testFile, 'wx', 0o600);
        fs.writeSync(fd, 'test');
        fs.closeSync(fd);
        fs.unlinkSync(testFile);
        
        console.error(`Memory Pickle: Using existing workspace directory: ${workspaceDir}`);
        return workspaceDir;
      } catch (error) {
        console.error(`Memory Pickle: Workspace directory exists but not writable, will use when created: ${workspaceDir}`);
        return workspaceDir;
      }
    } else {
      console.error(`Memory Pickle: Will use workspace ${workspaceDir} when created (currently in memory-only mode)`);
      return workspaceDir;
    }
  }

  // No workspace override - use normal priority order
  const possibleDirs = [
    // Current working directory (for normal CLI usage)
    path.join(process.cwd(), '.memory-pickle'),

    // Project root detection (for IDE environments)
    findProjectRoot(),

    // User home directory (universal fallback)
    path.join(os.homedir(), '.memory-pickle'),

    // Last resort: Temp directory
    path.join(os.tmpdir(), 'memory-pickle-' + (process.env.USER || process.env.USERNAME || 'default'))
  ].filter(Boolean);

  // Return the first valid directory path without creating it
  // Directory creation is now handled by user choice (manual creation)
  for (const dir of possibleDirs) {
    if (!dir) continue; // Skip null values
    
    // Check if directory already exists and is writable
    if (fs.existsSync(dir)) {
      try {
        // Test write permissions with a more secure approach
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const testFile = path.join(dir, `.write-test-${timestamp}-${randomSuffix}`);
        
        // Use exclusive flag to ensure we create a new file
        const fd = fs.openSync(testFile, 'wx', 0o600); // Exclusive create with secure permissions
        fs.writeSync(fd, 'test');
        fs.closeSync(fd);
        
        // Clean up test file
        fs.unlinkSync(testFile);
        
        console.error(`Memory Pickle: Using existing data directory: ${dir}`);
        return dir;
      } catch (error) {
        // Directory exists but not writable, try next
        continue;
      }
    }
  }
  
  // No existing directory found - return the preferred path without creating it
  // User will need to create .memory-pickle folder manually to enable persistence
  const preferredDir = possibleDirs[0] || path.join(process.cwd(), '.memory-pickle');
  console.error(`Memory Pickle: Will use ${preferredDir} when created (currently in memory-only mode)`);
  return preferredDir;
}

function findProjectRoot(): string | null {
  let currentDir = process.cwd();
  const maxDepth = 10;
  let depth = 0;
  
  while (depth < maxDepth) {
    // Check for common project indicators
    const indicators = [
      'package.json',
      '.git',
      'tsconfig.json',
      'pyproject.toml',
      'Cargo.toml',
      '.project-root'
    ];
    
    for (const indicator of indicators) {
      if (fs.existsSync(path.join(currentDir, indicator))) {
        return path.join(currentDir, '.memory-pickle');
      }
    }
    
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
    depth++;
  }
  
  return null;
}

// Dynamic data directory - computed each time to support testing and environment changes
let _cachedDataDir: string | null = null;

export function getDataDir(): string {
  if (!_cachedDataDir) {
    _cachedDataDir = getDataDirectory();
  }
  return _cachedDataDir;
}

// For testing: clear the cache to force re-computation
export function clearDataDirCache(): void {
  _cachedDataDir = null;
}

export const DATA_DIR = getDataDir();

// Dynamic file paths that update when data directory changes
export function getProjectFile(): string {
  return path.join(getDataDir(), 'project-data.yaml');
}

export function getProjectsFile(): string {
  return path.join(getDataDir(), 'projects.yaml');
}

export function getTasksFile(): string {
  return path.join(getDataDir(), 'tasks.yaml');
}

export function getMemoriesFile(): string {
  return path.join(getDataDir(), 'memories.yaml');
}

export function getConfigFile(): string {
  return path.join(getDataDir(), 'memory-config.yaml');
}

// Legacy constants for backward compatibility
export const PROJECT_FILE = getProjectFile();
export const PROJECTS_FILE = getProjectsFile();
export const TASKS_FILE = getTasksFile();
export const MEMORIES_FILE = getMemoriesFile();
export const STUB_FILE = PROJECT_FILE;
export const CONFIG_FILE = getConfigFile();

// Server configuration
export const SERVER_CONFIG = {
  name: "memory-pickle",
  version: "1.1.1",
} as const;

// UI configuration
export const USE_EMOJIS = process.env.MEMORY_PICKLE_NO_EMOJIS !== 'true';

// YAML serialization options
export const YAML_OPTIONS = {
  indent: 2,
  lineWidth: 120,
  noRefs: true,
} as const;