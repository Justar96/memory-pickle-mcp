import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import type { ProjectDatabase } from '../types/index.js';
import { DATA_DIR, PROJECT_FILE, PROJECTS_FILE, TASKS_FILE, MEMORIES_FILE } from '../config/constants.js';
import { DEFAULT_TEMPLATES } from '../config/templates.js';
import { ensureDirectoryExists, fileExists, withFileLock } from '../utils/fileUtils.js';
import { serializeToYaml, deserializeFromYaml, serializeDataToYaml, deserializeDataFromYaml } from '../utils/yamlUtils.js';

/**
 * Service responsible for database persistence and loading operations.
 * All file operations are asynchronous and protected by a file lock.
 */
export class StorageService {
  private readonly maxBackups = 3;

  private projectFile: string;
  private dataDir: string;

  constructor(projectFile: string = PROJECT_FILE) {
    this.projectFile = projectFile;
    this.dataDir = path.dirname(projectFile);

    // Create directory synchronously to avoid race conditions
    try {
      if (!fsSync.existsSync(this.dataDir)) {
        fsSync.mkdirSync(this.dataDir, { recursive: true, mode: 0o755 }); // More permissive for tests
      }
    } catch (error: any) {
      // Only throw if it's not a permission issue (for tests)
      if (error.code !== 'EACCES' && error.code !== 'EPERM') {
        console.error("Failed to create data directory:", error);
        throw new Error(`Cannot create data directory: ${this.dataDir}`);
      }
      console.warn("Directory creation failed, will retry on first operation:", error.message);
    }
  }

  /**
   * Executes an operation with an exclusive lock on the database file.
   * Loads a fresh database copy, passes it to the operation, and commits changes
   * only if the operation returns { commit: true }.
   *
   * @param operation - Async function that receives the database and returns result with optional commit and changed parts
   * @returns The result from the operation
   */
  async runExclusive<T>(
    operation: (db: ProjectDatabase) => Promise<{
      result: T;
      commit?: boolean;
      changedParts?: Set<'projects' | 'tasks' | 'memories' | 'meta'>;
    }>
  ): Promise<T> {
    return withFileLock(this.projectFile, async () => {
      // Load fresh database copy
      const database = await this.loadDatabaseInternal();
      
      // Execute operation with the database
      const { result, commit = false, changedParts } = await operation(database);
      
      // Save only if commit is requested
      if (commit) {
        await this.saveDatabaseInternal(database, { changedParts });
      }
      
      return result;
    });
  }

  /**
   * Internal method to load database without lock (used within runExclusive)
   */
  private async loadDatabaseInternal(): Promise<ProjectDatabase> {
    // Check for split-mode files first
    const projectDir = path.dirname(this.projectFile);
    const projectsFile = path.join(projectDir, 'projects.yaml');
    const tasksFile = path.join(projectDir, 'tasks.yaml');
    const memoriesFile = path.join(projectDir, 'memories.yaml');
    const metaFile = path.join(projectDir, 'meta.yaml');
    
    const hasSplit =
      (await fileExists(projectsFile)) ||
      (await fileExists(tasksFile)) ||
      (await fileExists(memoriesFile)) ||
      (await fileExists(metaFile));

    if (hasSplit) {
      return this.loadSplitDatabase(projectsFile, tasksFile, memoriesFile);
    }

    // Legacy monolithic path
    if (await fileExists(this.projectFile)) {
      try {
        const content = await fs.readFile(this.projectFile, 'utf8');
        return deserializeFromYaml(content);
      } catch (error) {
        console.error('Error loading project database, trying backup:', error);
        return this.loadFromBackup();
      }
    }
    return this.createDefaultDatabase();
  }

  /**
   * Internal method to save database without lock (used within runExclusive)
   * Implements incremental saves - only writes files that have changed
   */
  private async saveDatabaseInternal(
    database: ProjectDatabase,
    options?: {
      changedParts?: Set<'projects' | 'tasks' | 'memories' | 'meta'>
    }
  ): Promise<void> {
    database.meta.last_updated = new Date().toISOString();
    
    // Define split file paths
    const projectDir = path.dirname(this.projectFile);
    const projectsFile = path.join(projectDir, 'projects.yaml');
    const tasksFile = path.join(projectDir, 'tasks.yaml');
    const memoriesFile = path.join(projectDir, 'memories.yaml');
    const metaFile = path.join(projectDir, 'meta.yaml');
    
    // If no specific parts are marked as changed, save everything (backward compatibility)
    const changedParts = options?.changedParts || new Set(['projects', 'tasks', 'memories', 'meta']);
    
    // Helper function for atomic writes with safe backup handling
    const atomicWrite = async (filePath: string, content: string) => {
      try {
        // Try to rotate backup, but don't fail the write if backup fails
        await this.rotateBackups(filePath);
      } catch (backupError) {
        console.warn(`Backup rotation failed for ${filePath}, proceeding with write:`, backupError);
        // Continue with the write - better to have new data than no data
      }

      const tempFile = filePath + '.tmp';
      await fs.writeFile(tempFile, content, 'utf8');
      await fs.rename(tempFile, filePath);
    };
    
    // Write only changed components
    const writePromises: Promise<void>[] = [];
    
    if (changedParts.has('projects')) {
      writePromises.push(atomicWrite(projectsFile, serializeDataToYaml(database.projects)));
    }
    
    if (changedParts.has('tasks')) {
      writePromises.push(atomicWrite(tasksFile, serializeDataToYaml(database.tasks)));
    }
    
    if (changedParts.has('memories')) {
      writePromises.push(atomicWrite(memoriesFile, serializeDataToYaml(database.memories)));
    }
    
    if (changedParts.has('meta') || changedParts.size > 1) {
      // Always update meta if any other part changed (for last_updated)
      writePromises.push(atomicWrite(metaFile, serializeDataToYaml({
        meta: database.meta,
        templates: database.templates
      })));
    }
    
    await Promise.all(writePromises);

    // Remove old monolithic file if it exists
    if (await fileExists(this.projectFile)) {
      await fs.unlink(this.projectFile);
    }
  }

  /**
   * Public method to load the project database (for backward compatibility)
   */
  async loadDatabase(): Promise<ProjectDatabase> {
    return this.runExclusive(async (db) => ({ result: db, commit: false }));
  }

  /**
   * Public method to save the project database (for backward compatibility)
   */
  async saveDatabase(database: ProjectDatabase): Promise<void> {
    await this.runExclusive(async () => {
      await this.saveDatabaseInternal(database);
      return { result: undefined, commit: false }; // Already committed internally
    });
  }

  private async loadFromBackup(): Promise<ProjectDatabase> {
    for (let i = 1; i <= this.maxBackups; i++) {
      const backupFile = `${this.projectFile}.backup.${i}`;
      if (await fileExists(backupFile)) {
        try {
          console.error(`Attempting to load from backup: ${backupFile}`);
          const content = await fs.readFile(backupFile, 'utf8');
          return deserializeFromYaml(content);
        } catch (backupError) {
          console.error(`Failed to load backup ${backupFile}:`, backupError);
        }
      }
    }
    console.error('All backups failed to load. Creating a new default database.');
    return this.createDefaultDatabase();
  }

  /**
   * Rotates backups for the specified file path and keeps up to `maxBackups`.
   * Creates a fresh `.backup.1` copy of the current file (if it exists) before overwrite.
   */
  private async rotateBackups(filePath: string): Promise<void> {
    // Nothing to rotate if the target file hasn't been created yet
    if (!(await fileExists(filePath))) return;

    // Delete the oldest backup
    const oldestBackup = `${filePath}.backup.${this.maxBackups}`;
    if (await fileExists(oldestBackup)) {
      await fs.unlink(oldestBackup);
    }

    // Shift existing backups n -> n+1
    for (let i = this.maxBackups - 1; i >= 1; i--) {
      const source = `${filePath}.backup.${i}`;
      const dest = `${filePath}.backup.${i + 1}`;
      if (await fileExists(source)) {
        await fs.rename(source, dest);
      }
    }

    // Create new backup.1 of current file
    const firstBackup = `${filePath}.backup.1`;
    await fs.copyFile(filePath, firstBackup);
  }

  /**
   * Creates a default empty database structure.
   */
  private createDefaultDatabase(): ProjectDatabase {
    return {
      meta: {
        last_updated: new Date().toISOString(),
        version: "2.0.0",
        session_count: 0
      },
      projects: [],
      tasks: [],
      memories: [],
      templates: DEFAULT_TEMPLATES
    };
  }

  /**
   * Compose a ProjectDatabase from split files (read-only for step 1).
   */
  private async loadSplitDatabase(
    projectsFile: string,
    tasksFile: string,
    memoriesFile: string
  ): Promise<ProjectDatabase> {
    // helper to safely read YAML arrays
    const safeRead = async <T = any[]>(file: string): Promise<T> => {
      if (await fileExists(file)) {
        const content = await fs.readFile(file, 'utf8');
        return deserializeDataFromYaml<T>(content);
      }
      // @ts-ignore – we know caller expects array
      return [];
    };

    // Read meta file from same directory
    const projectDir = path.dirname(projectsFile);
    const metaFile = path.join(projectDir, 'meta.yaml');
    
    let meta = {
      last_updated: new Date().toISOString(),
      version: '2.0.0',
      session_count: 0,
    };
    let templates = DEFAULT_TEMPLATES;

    if (await fileExists(metaFile)) {
      try {
        const metaContent = await fs.readFile(metaFile, 'utf8');
        const metaData = deserializeDataFromYaml(metaContent);
        if (metaData.meta) meta = metaData.meta;
        if (metaData.templates) templates = metaData.templates;
      } catch (error) {
        console.error('Error loading meta file, using defaults:', error);
      }
    }

    const projects = await safeRead(projectsFile);
    const tasks = await safeRead(tasksFile);
    const memories = await safeRead(memoriesFile);

    return {
      meta,
      projects,
      tasks,
      memories,
      templates,
    };
  }

  /**
   * Checks if the database file exists
   */
  async databaseExists(): Promise<boolean> {
    return fileExists(this.projectFile);
  }

  /**
   * Gets the database file path
   */
  getDatabasePath(): string {
    return this.projectFile;
  }

  /**
   * Loads memories from separate file if exists (backward compatibility)
   */
  async loadMemories(): Promise<any[]> {
    return this.runExclusive(async () => {
      const MEMORIES_FILE = path.join(this.dataDir, 'memories.yaml');
      if (await fileExists(MEMORIES_FILE)) {
        try {
          const content = await fs.readFile(MEMORIES_FILE, 'utf8');
          const memories = deserializeDataFromYaml(content);
          return { result: Array.isArray(memories) ? memories : [], commit: false };
        } catch (error) {
          console.error('Error loading legacy memories file:', error);
        }
      }
      return { result: [], commit: false };
    });
  }

  /**
   * Saves memories to separate file (backward compatibility)
   */
  async saveMemories(memories: any[]): Promise<void> {
    if (!memories || memories.length === 0) return;

    await this.runExclusive(async () => {
      const MEMORIES_FILE = path.join(this.dataDir, 'memories.yaml');
      const tempFile = MEMORIES_FILE + '.tmp';
      const yamlContent = serializeDataToYaml(memories);
      
      await fs.writeFile(tempFile, yamlContent, 'utf8');
      await fs.rename(tempFile, MEMORIES_FILE);
      
      return { result: undefined, commit: false };
    });
  }
}