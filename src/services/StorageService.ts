import type { ProjectDatabase } from '../types/index.js';

/**
 * Service responsible for in-memory database operations with proper concurrency control.
 * Implements robust state management, memory optimization, and data integrity checks.
 */
export class StorageService {
  private database: ProjectDatabase;
  private operationQueue: Promise<any> = Promise.resolve();
  private operationCount: number = 0;
  private readonly maxOperations: number = 10000; // Prevent memory leaks from excessive operations

  constructor() {
    this.database = this.createDefaultDatabase();
  }

  /**
   * Executes an operation with proper concurrency control and error handling.
   * Ensures operations are serialized to prevent race conditions and data corruption.
   *
   * @param operation - Async function that receives the database and returns result with optional commit
   * @returns The result from the operation
   */
  async runExclusive<T>(
    operation: (db: ProjectDatabase) => Promise<{
      result: T;
      commit?: boolean;
      changedParts?: Set<'projects' | 'tasks' | 'memories' | 'meta'>;
    }>
  ): Promise<T> {
    // Serialize operations to prevent race conditions
    return this.operationQueue = this.operationQueue.then(async () => {
      // Check for memory leak prevention
      this.operationCount++;
      if (this.operationCount > this.maxOperations) {
        this.operationCount = 0; // Reset counter
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Create a deep copy for operation isolation
      const databaseSnapshot = this.createDatabaseSnapshot();

      try {
        // Execute operation on the snapshot
        const { result, commit = false, changedParts } = await operation(databaseSnapshot);

        // Validate the result before committing
        if (commit) {
          this.validateDatabaseIntegrity(databaseSnapshot, changedParts);

          // Atomic commit: replace the database reference
          this.database = databaseSnapshot;
          this.database.meta.last_updated = new Date().toISOString();
        }

        return result;
      } catch (error) {
        // Operation failed - database remains unchanged
        throw error;
      }
    });
  }

  /**
   * Public method to load the project database.
   * Returns a copy of the in-memory database.
   */
  async loadDatabase(): Promise<ProjectDatabase> {
    return JSON.parse(JSON.stringify(this.database));
  }

  /**
   * Public method to save the project database.
   * Updates the in-memory database only.
   */
  async saveDatabase(database: ProjectDatabase): Promise<void> {
    database.meta.last_updated = new Date().toISOString();
    this.database = JSON.parse(JSON.stringify(database));
  }

  /**
   * Get direct reference to the database for shared state
   */
  getDatabase(): ProjectDatabase {
    return this.database;
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
      templates: {}
    };
  }

  /**
   * Loads memories from the in-memory database (backward compatibility)
   */
  async loadMemories(): Promise<any[]> {
    return this.database.memories;
  }

  /**
   * Saves memories to the in-memory database (backward compatibility)
   */
  async saveMemories(memories: any[]): Promise<void> {
    if (!memories || memories.length === 0) return;
    this.database.memories = memories;
    this.database.meta.last_updated = new Date().toISOString();
  }

  /**
   * Returns markdown suggestion for persistent storage instead of file export
   * Note: Removed console.log to prevent MCP stdio interference
   */
  async saveExport(_filename: string, _content: string): Promise<void> {
    // In-memory mode: Consider creating a markdown file manually
    // Note: Console output removed to prevent MCP protocol interference
    // Parameters prefixed with _ to indicate intentionally unused
  }

  /**
   * Creates a deep copy of the database for operation isolation
   */
  private createDatabaseSnapshot(): ProjectDatabase {
    try {
      return JSON.parse(JSON.stringify(this.database));
    } catch (error) {
      throw new Error(`Failed to create database snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates database integrity after operations
   */
  private validateDatabaseIntegrity(
    database: ProjectDatabase,
    changedParts?: Set<'projects' | 'tasks' | 'memories' | 'meta'>
  ): void {
    try {
      // Basic structure validation
      if (!database.meta || !database.projects || !database.tasks || !database.memories) {
        throw new Error('Database structure is invalid - missing required sections');
      }

      // Validate meta information
      if (!database.meta.version || !database.meta.last_updated) {
        throw new Error('Database meta information is incomplete');
      }

      // Validate referential integrity if tasks or memories were changed
      if (changedParts?.has('tasks') || changedParts?.has('memories')) {
        this.validateReferentialIntegrity(database);
      }

      // Validate data limits to prevent memory issues
      if (database.projects.length > 1000) {
        throw new Error('Too many projects - maximum 1000 allowed');
      }
      if (database.tasks.length > 10000) {
        throw new Error('Too many tasks - maximum 10000 allowed');
      }
      if (database.memories.length > 5000) {
        throw new Error('Too many memories - maximum 5000 allowed');
      }

    } catch (error) {
      throw new Error(`Database integrity validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates referential integrity between projects, tasks, and memories
   */
  private validateReferentialIntegrity(database: ProjectDatabase): void {
    const projectIds = new Set(database.projects.map(p => p.id));
    const taskIds = new Set(database.tasks.map(t => t.id));

    // Check that all tasks reference valid projects
    for (const task of database.tasks) {
      if (!projectIds.has(task.project_id)) {
        throw new Error(`Task ${task.id} references non-existent project ${task.project_id}`);
      }

      // Check parent task references
      if (task.parent_id && !taskIds.has(task.parent_id)) {
        throw new Error(`Task ${task.id} references non-existent parent task ${task.parent_id}`);
      }
    }

    // Check that memories reference valid projects/tasks
    for (const memory of database.memories) {
      if (memory.project_id && !projectIds.has(memory.project_id)) {
        throw new Error(`Memory ${memory.id} references non-existent project ${memory.project_id}`);
      }
      if (memory.task_id && !taskIds.has(memory.task_id)) {
        throw new Error(`Memory ${memory.id} references non-existent task ${memory.task_id}`);
      }
    }

    // Check current project reference
    if (database.meta.current_project_id && !projectIds.has(database.meta.current_project_id)) {
      // Auto-fix: clear invalid current project
      database.meta.current_project_id = undefined;
    }
  }

  /**
   * Cleanup method to prevent memory leaks and maintain performance
   */
  cleanup(): void {
    this.operationCount = 0;

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Get database statistics for monitoring
   */
  getStats(): {
    projects: number;
    tasks: number;
    memories: number;
    operationCount: number;
    lastUpdated: string;
  } {
    return {
      projects: this.database.projects.length,
      tasks: this.database.tasks.length,
      memories: this.database.memories.length,
      operationCount: this.operationCount,
      lastUpdated: this.database.meta.last_updated
    };
  }
}