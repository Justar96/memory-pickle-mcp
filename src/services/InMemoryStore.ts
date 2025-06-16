import type { ProjectDatabase } from '../types/index.js';
import { ValidationUtils } from '../utils/ValidationUtils.js';

/**
 * Simplified in-memory data store with transaction safety.
 * Maintains data integrity through snapshot-based transactions while removing
 * unnecessary concurrency complexity for single-client MCP usage.
 */
export class InMemoryStore {
  private database: ProjectDatabase;
  private operationInProgress: boolean = false;
  private operationQueue: Array<() => void> = [];

  constructor() {
    this.database = this.createDefaultDatabase();
  }

  /**
   * Executes an operation with transaction safety through snapshot-based commits.
   * Provides data integrity and rollback capabilities with simple serialization.
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
    // Simple serialization for concurrent operations
    if (this.operationInProgress) {
      return new Promise<T>((resolve, reject) => {
        this.operationQueue.push(async () => {
          try {
            const result = await this.runExclusive(operation);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    this.operationInProgress = true;

    try {
      // Create snapshot for transaction safety
      const databaseSnapshot = this.createSnapshot();

      // Execute operation on snapshot
      const { result, commit = false, changedParts } = await operation(databaseSnapshot);

      // Validate and commit atomically if requested
      if (commit) {
        this.validateDatabaseIntegrity(databaseSnapshot, changedParts);
        this.commitChanges(databaseSnapshot);
      }

      return result;
    } catch (error) {
      // Rollback is automatic - snapshot is discarded
      throw error;
    } finally {
      this.operationInProgress = false;
      this.processNextOperation();
    }
  }

  /**
   * Process the next queued operation
   */
  private processNextOperation(): void {
    if (this.operationQueue.length > 0) {
      const nextOperation = this.operationQueue.shift();
      if (nextOperation) {
        // Use setImmediate to prevent stack overflow
        setImmediate(nextOperation);
      }
    }
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
   * Returns markdown suggestion for persistent storage instead of file export
   * Note: Removed console.log to prevent MCP stdio interference
   */
  async saveExport(_filename: string, _content: string): Promise<void> {
    // In-memory mode: Consider creating a markdown file manually
    // Note: Console output removed to prevent MCP protocol interference
    // Parameters prefixed with _ to indicate intentionally unused
  }

  /**
   * Creates a snapshot copy of the database for transaction safety
   */
  private createSnapshot(): ProjectDatabase {
    try {
      // Create shallow copy of database structure
      const snapshot: ProjectDatabase = {
        meta: { ...this.database.meta },
        projects: this.database.projects.map(p => ({ ...p })),
        tasks: this.database.tasks.map(t => ({
          ...t,
          notes: t.notes ? [...t.notes] : [],
          blockers: t.blockers ? [...t.blockers] : []
        })),
        memories: this.database.memories.map(m => ({ ...m })),
        templates: { ...this.database.templates }
      };

      return snapshot;
    } catch (error) {
      throw new Error(`Failed to create database snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Commits changes atomically to the main database
   */
  private commitChanges(snapshot: ProjectDatabase): void {
    snapshot.meta.last_updated = new Date().toISOString();
    this.database = snapshot;
  }

  /**
   * Validates database integrity after operations using comprehensive validation
   */
  private validateDatabaseIntegrity(
    database: ProjectDatabase,
    changedParts?: Set<'projects' | 'tasks' | 'memories' | 'meta'>
  ): void {
    try {
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
    // Clear any pending operations
    this.operationQueue.length = 0;
    this.operationInProgress = false;
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
  } {
    return {
      projects: this.database.projects.length,
      tasks: this.database.tasks.length,
      memories: this.database.memories.length,
      queuedOperations: this.operationQueue.length,
      lastUpdated: this.database.meta.last_updated
    };
  }
}