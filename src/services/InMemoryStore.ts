import type { ProjectDatabase } from '../types/index.js';
import { ValidationUtils } from '../utils/ValidationUtils.js';
import { getVersion } from '../utils/version.js';

/**
 * Simplified in-memory data store with transaction safety.
 * Maintains data integrity through snapshot-based transactions while removing
 * unnecessary concurrency complexity for single-client MCP usage.
 */
export class InMemoryStore {
  private database: ProjectDatabase;
  private operationLock: Promise<void> = Promise.resolve();
  private operationQueue: Array<{
    operation: (db: ProjectDatabase) => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  // Data size limits to prevent unbounded memory growth
  private static readonly MAX_PROJECTS = 1000;
  private static readonly MAX_TASKS = 10000;
  private static readonly MAX_MEMORIES = 5000;
  private static readonly MAX_QUEUE_SIZE = 100;
  private static readonly MAX_DATABASE_SIZE_MB = 50;

  constructor() {
    this.database = this.createDefaultDatabase();
  }

  /**
   * Executes an operation with proper mutex-based transaction safety.
   * Uses Promise chaining to ensure true serialization without recursion.
   *
   * @param operation - Function that receives the database and returns result with optional commit
   * @returns The result from the operation
   */
  async runExclusive<T>(
    operation: (db: ProjectDatabase) => Promise<{
      result: T;
      commit?: boolean;
      changedParts?: Set<'projects' | 'tasks' | 'memories' | 'meta'>;
    }>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Queue the operation with its resolve/reject handlers
      this.operationQueue.push({ operation, resolve, reject });
      
      // Process the queue (this will handle the current operation if it's the only one)
      this.processQueue();
    });
  }

  /**
   * Processes the operation queue with proper mutex-style locking
   */
  private processQueue(): void {
    if (this.operationQueue.length === 0) return;

    // Chain the next operation to the current lock
    this.operationLock = this.operationLock
      .then(async () => {
        const queueItem = this.operationQueue.shift();
        if (!queueItem) return;

        const { operation, resolve, reject } = queueItem;

        try {
          // Create deep snapshot for true transaction safety
          const databaseSnapshot = this.createDeepSnapshot();

          // Execute operation on isolated snapshot
          const { result, commit = false, changedParts } = await operation(databaseSnapshot);

          // Validate and commit atomically if requested
          if (commit) {
            this.validateDatabaseIntegrity(databaseSnapshot, changedParts);
            this.commitChanges(databaseSnapshot);
          }

          resolve(result);
        } catch (error) {
          // Rollback is automatic - snapshot is discarded
          reject(error);
        }
      })
      .catch((error) => {
        // Handle any unexpected errors in the chain
        console.error('Unexpected error in operation queue:', error);
      })
      .finally(() => {
        // Continue processing if there are more operations
        if (this.operationQueue.length > 0) {
          this.processQueue();
        }
      });
  }

  /**
   * Public method to load the project database.
   * Returns a snapshot copy of the in-memory database.
   */
  async loadDatabase(): Promise<ProjectDatabase> {
    return this.createSnapshot();
  }

  /**
   * Public method to save the project database.
   * Updates the in-memory database with validation.
   */
  async saveDatabase(database: ProjectDatabase): Promise<void> {
    this.validateDatabaseIntegrity(database);
    database.meta.last_updated = new Date().toISOString();
    this.commitChanges(database);
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
        version: getVersion(),
        session_count: 0
      },
      projects: [],
      tasks: [],
      memories: [],
      templates: {}
    };
  }

  /**
   * Creates a deep snapshot copy of the database for true transaction safety
   */
  private createDeepSnapshot(): ProjectDatabase {
    try {
      // Use JSON serialization for true deep cloning
      // This ensures complete isolation between snapshot and original
      const serialized = JSON.stringify(this.database);
      const snapshot = JSON.parse(serialized) as ProjectDatabase;
      
      return snapshot;
    } catch (error) {
      throw new Error(`Failed to create database snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates a shallow snapshot copy (kept for backward compatibility)
   * @deprecated Use createDeepSnapshot for true isolation
   */
  private createSnapshot(): ProjectDatabase {
    return this.createDeepSnapshot();
  }

  /**
   * Commits changes atomically to the main database
   */
  private commitChanges(snapshot: ProjectDatabase): void {
    snapshot.meta.last_updated = new Date().toISOString();
    this.database = snapshot;
  }

  /**
   * Validates database size limits to prevent unbounded memory growth
   */
  private validateDatabaseSizeLimits(database: ProjectDatabase): void {
    // Check queue size first
    if (this.operationQueue.length > InMemoryStore.MAX_QUEUE_SIZE) {
      throw new Error(`Operation queue too large: ${this.operationQueue.length} operations. Maximum allowed: ${InMemoryStore.MAX_QUEUE_SIZE}`);
    }

    // Check individual collection sizes
    if (database.projects.length > InMemoryStore.MAX_PROJECTS) {
      throw new Error(`Too many projects: ${database.projects.length}. Maximum allowed: ${InMemoryStore.MAX_PROJECTS}`);
    }

    if (database.tasks.length > InMemoryStore.MAX_TASKS) {
      throw new Error(`Too many tasks: ${database.tasks.length}. Maximum allowed: ${InMemoryStore.MAX_TASKS}`);
    }

    if (database.memories.length > InMemoryStore.MAX_MEMORIES) {
      throw new Error(`Too many memories: ${database.memories.length}. Maximum allowed: ${InMemoryStore.MAX_MEMORIES}`);
    }

    // Check total database size (rough estimate)
    const estimatedSizeMB = this.estimateDatabaseSize(database);
    if (estimatedSizeMB > InMemoryStore.MAX_DATABASE_SIZE_MB) {
      throw new Error(`Database too large: ~${estimatedSizeMB}MB. Maximum allowed: ${InMemoryStore.MAX_DATABASE_SIZE_MB}MB`);
    }
  }

  /**
   * Estimates database size in MB using JSON serialization length
   */
  private estimateDatabaseSize(database: ProjectDatabase): number {
    try {
      const jsonString = JSON.stringify(database);
      const sizeBytes = new Blob([jsonString]).size;
      return Math.round((sizeBytes / 1024 / 1024) * 100) / 100; // Round to 2 decimal places
    } catch {
      // Fallback rough estimate
      const itemCount = database.projects.length + database.tasks.length + database.memories.length;
      return Math.round((itemCount * 0.001) * 100) / 100; // Assume ~1KB per item average
    }
  }

  /**
   * Validates database integrity after operations using comprehensive validation
   */
  private validateDatabaseIntegrity(
    database: ProjectDatabase,
    changedParts?: Set<'projects' | 'tasks' | 'memories' | 'meta'>
  ): void {
    try {
      // Check size limits first to prevent unbounded growth
      this.validateDatabaseSizeLimits(database);

      // Full database validation
      const validation = ValidationUtils.validateDatabase(database);
      if (!validation.isValid) {
        throw new Error(`Database validation failed: ${validation.errors.join('; ')}`);
      }

      // Additional specific validations based on changed parts
      if (changedParts?.has('projects')) {
        database.projects.forEach(project => {
          const projectValidation = ValidationUtils.validateProject(project);
          if (!projectValidation.isValid) {
            throw new Error(`Project validation failed: ${projectValidation.errors.join('; ')}`);
          }
        });
      }

      if (changedParts?.has('tasks')) {
        database.tasks.forEach(task => {
          const taskValidation = ValidationUtils.validateTask(task);
          if (!taskValidation.isValid) {
            throw new Error(`Task validation failed: ${taskValidation.errors.join('; ')}`);
          }
        });
      }

      if (changedParts?.has('memories')) {
        database.memories.forEach(memory => {
          const memoryValidation = ValidationUtils.validateMemory(memory);
          if (!memoryValidation.isValid) {
            throw new Error(`Memory validation failed: ${memoryValidation.errors.join('; ')}`);
          }
        });
      }

    } catch (error) {
      throw new Error(`Database integrity validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates and sanitizes input data before operations
   */
  validateAndSanitizeInput(type: 'project', data: any): any;
  validateAndSanitizeInput(type: 'task', data: any): any;
  validateAndSanitizeInput(type: 'memory', data: any): any;
  validateAndSanitizeInput(type: 'project' | 'task' | 'memory', data: any): any {
    switch (type) {
      case 'project':
        const sanitizedProject = ValidationUtils.sanitizeProject(data);
        const projectValidation = ValidationUtils.validateProject(sanitizedProject);
        if (!projectValidation.isValid) {
          throw new Error(`Project validation failed: ${projectValidation.errors.join('; ')}`);
        }
        return sanitizedProject;
      
      case 'task':
        const sanitizedTask = ValidationUtils.sanitizeTask(data);
        const taskValidation = ValidationUtils.validateTask(sanitizedTask);
        if (!taskValidation.isValid) {
          throw new Error(`Task validation failed: ${taskValidation.errors.join('; ')}`);
        }
        return sanitizedTask;
      
      case 'memory':
        const sanitizedMemory = ValidationUtils.sanitizeMemory(data);
        const memoryValidation = ValidationUtils.validateMemory(sanitizedMemory);
        if (!memoryValidation.isValid) {
          throw new Error(`Memory validation failed: ${memoryValidation.errors.join('; ')}`);
        }
        return sanitizedMemory;
      
      default:
        throw new Error(`Unknown validation type: ${type}`);
    }
  }

  /**
   * Cleanup method for graceful shutdown
   */
  cleanup(): void {
    // Reject any pending operations
    this.operationQueue.forEach(({ reject }) => {
      reject(new Error('Database shutting down'));
    });
    this.operationQueue.length = 0;
  }

  /**
   * Async cleanup method for graceful shutdown with operation completion
   */
  async shutdownAsync(): Promise<void> {
    // Reject any pending operations
    this.operationQueue.forEach(({ reject }) => {
      reject(new Error('Database shutting down'));
    });
    this.operationQueue.length = 0;
    
    // Wait for current operations to complete
    try {
      await this.operationLock;
    } catch {
      // Ignore errors during shutdown
    }
  }

  /**
   * Get database statistics for monitoring
   */
  getStats(): {
    projects: number;
    tasks: number;
    memories: number;
    queuedOperations: number;
    lastUpdated: string;
    estimatedSizeMB: number;
  } {
    return {
      projects: this.database.projects.length,
      tasks: this.database.tasks.length,
      memories: this.database.memories.length,
      queuedOperations: this.operationQueue.length,
      lastUpdated: this.database.meta.last_updated,
      estimatedSizeMB: this.estimateDatabaseSize(this.database)
    };
  }
}