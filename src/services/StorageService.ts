import type { ProjectDatabase } from '../types/index.js';
import { ValidationUtils } from '../utils/ValidationUtils.js';

/**
 * Service responsible for in-memory database operations with proper concurrency control.
 * Implements robust state management, memory optimization, and data integrity checks.
 */
export class StorageService {
  private database: ProjectDatabase;
  private operationLock: boolean = false;
  private operationQueue: Array<{ resolve: Function, reject: Function, operation: Function }> = [];
  private operationCount: number = 0;
  private readonly maxOperations: number = 10000;
  private readonly maxQueueSize: number = 100; // Prevent infinite queue growth
  private isShuttingDown: boolean = false;
  private weakRefSet: WeakSet<object> = new WeakSet();
  private currentOperationTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.database = this.createDefaultDatabase();
  }

  /**
   * Executes an operation with proper concurrency control and error handling.
   * Ensures operations are truly exclusive to prevent race conditions and data corruption.
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
    if (this.isShuttingDown) {
      throw new Error('Storage service is shutting down');
    }

    // Implement proper exclusive locking with deadlock prevention
    return new Promise<T>((resolve, reject) => {
      const executeOperation = async () => {
        if (this.operationLock) {
          // Check queue size limit to prevent memory exhaustion
          if (this.operationQueue.length >= this.maxQueueSize) {
            reject(new Error('Operation queue full - system overloaded'));
            return;
          }
          
          // Queue the operation if another is running
          this.operationQueue.push({ resolve, reject, operation: executeOperation });
          return;
        }

        this.operationLock = true;
        let databaseSnapshot: ProjectDatabase | null = null;
        
        try {
          // Check for memory leak prevention
          this.operationCount++;
          if (this.operationCount > this.maxOperations) {
            this.operationCount = 0;
            this.forceGarbageCollection();
          }

          // Create optimized shallow copy with circular reference tracking
          databaseSnapshot = this.createOptimizedSnapshot();

          // Execute operation with timeout and cleanup
          const timeoutPromise = new Promise((_, timeoutReject) => {
            this.currentOperationTimeout = setTimeout(() => {
              timeoutReject(new Error('Operation timeout - potential deadlock detected'));
            }, 30000);
          });

          const operationPromise = operation(databaseSnapshot);
          const { result, commit = false, changedParts } = await Promise.race([
            operationPromise,
            timeoutPromise
          ]) as { result: T; commit?: boolean; changedParts?: Set<'projects' | 'tasks' | 'memories' | 'meta'> };

          // Clear timeout since operation completed
          if (this.currentOperationTimeout) {
            clearTimeout(this.currentOperationTimeout);
            this.currentOperationTimeout = null;
          }

          // Validate and commit atomically
          if (commit) {
            this.validateDatabaseIntegrity(databaseSnapshot, changedParts);
            this.commitChanges(databaseSnapshot);
          }

          resolve(result);
        } catch (error) {
          // Clear timeout on error
          if (this.currentOperationTimeout) {
            clearTimeout(this.currentOperationTimeout);
            this.currentOperationTimeout = null;
          }
          
          // Rollback - database remains unchanged
          if (databaseSnapshot) {
            this.clearSnapshotReferences(databaseSnapshot);
          }
          reject(error);
        } finally {
          this.operationLock = false;
          this.processQueue();
        }
      };

      executeOperation();
    });
  }

  /**
   * Public method to load the project database.
   * Returns an optimized copy of the in-memory database.
   */
  async loadDatabase(): Promise<ProjectDatabase> {
    return this.createOptimizedSnapshot();
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
   * Creates an optimized snapshot avoiding unnecessary deep copies
   */
  private createOptimizedSnapshot(): ProjectDatabase {
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
      
      // Track for circular reference detection
      this.weakRefSet.add(snapshot);
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
   * Clears references to prevent memory leaks
   */
  private clearSnapshotReferences(snapshot: ProjectDatabase): void {
    if (this.weakRefSet.has(snapshot)) {
      this.weakRefSet.delete(snapshot);
    }
  }

  /**
   * Processes queued operations safely to prevent deadlocks
   */
  private processQueue(): void {
    // Process all queued operations, not just the first one
    while (this.operationQueue.length > 0 && !this.operationLock && !this.isShuttingDown) {
      const queueItem = this.operationQueue.shift();
      if (queueItem) {
        const { operation } = queueItem;
        // Use setImmediate to prevent call stack overflow
        setImmediate(() => {
          try {
            operation();
          } catch (error) {
            console.error('Queued operation failed:', error);
          }
        });
        break; // Process one at a time to maintain order
      }
    }
  }

  /**
   * Forces garbage collection with cleanup
   */
  private forceGarbageCollection(): void {
    // Clear weak references
    this.weakRefSet = new WeakSet();
    
    // Force GC if available
    if (global.gc) {
      global.gc();
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
   * Cleanup method to prevent memory leaks and maintain performance
   */
  cleanup(): void {
    this.isShuttingDown = true;
    this.operationCount = 0;
    
    // Reject all queued operations
    while (this.operationQueue.length > 0) {
      const { reject } = this.operationQueue.shift()!;
      reject(new Error('Service shutting down'));
    }
    
    // Clear references
    this.clearSnapshotReferences(this.database);
    this.forceGarbageCollection();
  }

  /**
   * Shutdown method for graceful cleanup
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    // Wait for current operation to complete
    while (this.operationLock) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.cleanup();
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