import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// Data directory configuration with environment detection and fallbacks
function getDataDirectory(): string {
  const possibleDirs = [
    // First priority: Current working directory (for normal CLI usage)
    path.join(process.cwd(), '.memory-pickle'),
    
    // Second priority: Project root detection (for IDE environments)
    findProjectRoot(),
    
    // Third priority: User home directory (universal fallback)
    path.join(os.homedir(), '.memory-pickle'),
    
    // Last resort: Temp directory
    path.join(os.tmpdir(), 'memory-pickle-' + process.env.USER || 'default')
  ].filter(Boolean);

  for (const dir of possibleDirs) {
    if (!dir) continue; // Skip null values
    
    try {
      // Test if we can create and write to this directory
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); // Secure permissions: owner only
      
      // Test write permissions with a more secure approach
      // Use exclusive flag to prevent race conditions
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 15);
      const testFile = path.join(dir, `.write-test-${timestamp}-${randomSuffix}`);
      
      // Use exclusive flag to ensure we create a new file
      const fd = fs.openSync(testFile, 'wx', 0o600); // Exclusive create with secure permissions
      fs.writeSync(fd, 'test');
      fs.closeSync(fd);
      
      // Clean up test file
      fs.unlinkSync(testFile);
      
      console.error(`Memory Pickle: Using data directory: ${dir}`);
      return dir;
    } catch (error) {
      // Try next directory if this one fails
      continue;
    }
  }
  
  // If all fail, throw with helpful error
  throw new Error(`Memory Pickle: Unable to find writable directory. Tried: ${possibleDirs.join(', ')}`);
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

export const DATA_DIR = getDataDirectory();

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