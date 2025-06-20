import type { ProjectDatabase } from '../types/index.js';
import { ValidationUtils } from '../utils/ValidationUtils.js';
import { getVersion } from '../utils/version.js';

/**
 * High-performance in-memory data store with transaction safety and caching.
 * Maintains data integrity through snapshot-based transactions while optimizing
 * for single-client MCP usage with performance monitoring and smart caching.
 */
export class InMemoryStore {
  private database: ProjectDatabase;
  private operationLock: Promise<void> = Promise.resolve();
  private operationQueue: Array<{
    operation: (db: ProjectDatabase) => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timestamp: number;
    operationType: string;
  }> = [];

  // Performance monitoring
  private metrics = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    averageOperationTime: 0,
    lastOperationTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  // Simple caching for frequently accessed data
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private static readonly CACHE_TTL = 30000; // 30 seconds
  private static readonly MAX_CACHE_SIZE = 100;

  // Data size limits to prevent unbounded memory growth
  private static readonly MAX_PROJECTS = 1000;
  private static readonly MAX_TASKS = 10000;
  private static readonly MAX_MEMORIES = 5000;
  private static readonly MAX_QUEUE_SIZE = 100;
  private static readonly MAX_DATABASE_SIZE_MB = 50;

  constructor() {
    this.database = this.createDefaultDatabase();
    this.startMaintenanceTasks();
  }

  /**
   * Starts background maintenance tasks for cache cleanup and metrics
   */
  private startMaintenanceTasks(): void {
    // Cache cleanup every 60 seconds
    setInterval(() => {
      this.cleanupCache();
    }, 60000);
  }

  /**
   * Executes an operation with proper mutex-based transaction safety and performance monitoring.
   * Uses Promise chaining to ensure true serialization without recursion.
   *
   * @param operation - Function that receives the database and returns result with optional commit
   * @param operationType - Type of operation for monitoring (optional)
   * @returns The result from the operation
   */
  async runExclusive<T>(
    operation: (db: ProjectDatabase) => Promise<{
      result: T;
      commit?: boolean;
      changedParts?: Set<'projects' | 'tasks' | 'memories' | 'meta'>;
    }>,
    operationType: string = 'unknown'
  ): Promise<T> {
    const startTime = Date.now();
    
    return new Promise<T>((resolve, reject) => {
      // Queue the operation with its resolve/reject handlers and metadata
      this.operationQueue.push({ 
        operation, 
        resolve, 
        reject, 
        timestamp: startTime,
        operationType 
      });
      
      // Process the queue (this will handle the current operation if it's the only one)
      this.processQueue();
    }).finally(() => {
      // Update performance metrics
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, true);
    });
  }

  /**
   * Processes the operation queue with proper mutex-style locking and enhanced monitoring
   */
  private processQueue(): void {
    if (this.operationQueue.length === 0) return;

    // Chain the next operation to the current lock
    this.operationLock = this.operationLock
      .then(async () => {
        const queueItem = this.operationQueue.shift();
        if (!queueItem) return;

        const { operation, resolve, reject, timestamp, operationType } = queueItem;

        try {
          this.metrics.totalOperations++;

          // Create deep snapshot for true transaction safety
          const databaseSnapshot = this.createDeepSnapshot();

          // Execute operation on isolated snapshot
          const { result, commit = false, changedParts } = await operation(databaseSnapshot);

          // Validate and commit atomically if requested
          if (commit) {
            this.validateDatabaseIntegrity(databaseSnapshot, changedParts);
            this.commitChanges(databaseSnapshot);
            
            // Invalidate cache on data changes
            if (changedParts && changedParts.size > 0) {
              this.invalidateCache(changedParts);
            }
          }

          this.metrics.successfulOperations++;
          resolve(result);
        } catch (error) {
          this.metrics.failedOperations++;
          // Rollback is automatic - snapshot is discarded
          reject(error);
        }
      })
      .catch((error) => {
        // Handle any unexpected errors in the chain
        console.error('Unexpected error in operation queue:', error);
        this.metrics.failedOperations++;
      })
      .finally(() => {
        // Continue processing if there are more operations
        if (this.operationQueue.length > 0) {
          this.processQueue();
        }
      });
  }

  /**
   * Gets cached data or computes and caches the result
   */
  private getCached<T>(key: string, computeFn: () => T, ttl: number = InMemoryStore.CACHE_TTL): T {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < cached.ttl) {
      this.metrics.cacheHits++;
      return cached.data;
    }

    this.metrics.cacheMisses++;
    const data = computeFn();
    
    // Prevent cache from growing too large
    if (this.cache.size >= InMemoryStore.MAX_CACHE_SIZE) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      for (let i = 0; i < Math.floor(InMemoryStore.MAX_CACHE_SIZE * 0.2); i++) {
        this.cache.delete(entries[i][0]);
      }
    }

    this.cache.set(key, { data, timestamp: now, ttl });
    return data;
  }

  /**
   * Invalidates cache entries based on changed data parts
   */
  private invalidateCache(changedParts: Set<'projects' | 'tasks' | 'memories' | 'meta'>): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.cache) {
      if (changedParts.has('projects') && key.includes('project')) {
        keysToDelete.push(key);
      }
      if (changedParts.has('tasks') && key.includes('task')) {
        keysToDelete.push(key);
      }
      if (changedParts.has('memories') && key.includes('memory')) {
        keysToDelete.push(key);
      }
      if (changedParts.has('meta') && key.includes('meta')) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Cleans up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, value] of this.cache) {
      if ((now - value.timestamp) > value.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Updates performance metrics
   */
  private updateMetrics(duration: number, success: boolean): void {
    this.metrics.lastOperationTime = duration;
    
    // Update rolling average (simple exponential smoothing)
    const alpha = 0.1; // Smoothing factor
    this.metrics.averageOperationTime = 
      (this.metrics.averageOperationTime * (1 - alpha)) + (duration * alpha);
  }

  /**
   * Public method to load the project database with caching.
   * Returns a snapshot copy of the in-memory database.
   */
  async loadDatabase(): Promise<ProjectDatabase> {
    return this.getCached('database_snapshot', () => this.createSnapshot(), 5000); // 5-second TTL for database snapshots
  }

  /**
   * Public method to save the project database.
   * Updates the in-memory database with validation.
   */
  async saveDatabase(database: ProjectDatabase): Promise<void> {
    this.validateDatabaseIntegrity(database);
    database.meta.last_updated = new Date().toISOString();
    this.commitChanges(database);
    
    // Clear database cache
    this.cache.delete('database_snapshot');
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
   * Optimized with performance monitoring
   */
  private createDeepSnapshot(): ProjectDatabase {
    const startTime = Date.now();
    
    try {
      // Use JSON serialization for true deep cloning
      // This ensures complete isolation between snapshot and original
      const serialized = JSON.stringify(this.database);
      const snapshot = JSON.parse(serialized) as ProjectDatabase;
      
      const duration = Date.now() - startTime;
      if (duration > 100) { // Log slow snapshot operations
        console.warn(`Slow snapshot creation: ${duration}ms for ${serialized.length} bytes`);
      }
      
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
   * Commits changes atomically to the main database with optimized operations
   */
  private commitChanges(snapshot: ProjectDatabase): void {
    snapshot.meta.last_updated = new Date().toISOString();
    this.database = snapshot;
    
    // Clear any database-related cache entries
    this.cache.delete('database_snapshot');
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

    // Check total database size (cached estimate)
    const estimatedSizeMB = this.getCached(
      'database_size_estimate',
      () => this.estimateDatabaseSize(database),
      10000 // 10-second cache for size estimates
    );
    
    if (estimatedSizeMB > InMemoryStore.MAX_DATABASE_SIZE_MB) {
      throw new Error(`Database too large: ~${estimatedSizeMB}MB. Maximum allowed: ${InMemoryStore.MAX_DATABASE_SIZE_MB}MB`);
    }
  }

  /**
   * Estimates database size in MB using JSON serialization length with caching
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

      // Full database validation (cached)
      const validation = this.getCached(
        `db_validation_${JSON.stringify(changedParts)}`,
        () => ValidationUtils.validateDatabase(database),
        1000 // 1-second cache for validation results
      );
      
      if (!validation.isValid) {
        throw new Error(`Database validation failed: ${validation.errors.join('; ')}`);
      }

      // Additional specific validations based on changed parts
      if (changedParts?.has('projects')) {
        database.projects.forEach((project: any) => {
          const projectValidation = ValidationUtils.validateProject(project);
          if (!projectValidation.isValid) {
            throw new Error(`Project validation failed: ${projectValidation.errors.join('; ')}`);
          }
        });
      }

      if (changedParts?.has('tasks')) {
        database.tasks.forEach((task: any) => {
          const taskValidation = ValidationUtils.validateTask(task);
          if (!taskValidation.isValid) {
            throw new Error(`Task validation failed: ${taskValidation.errors.join('; ')}`);
          }
        });
      }

      if (changedParts?.has('memories')) {
        database.memories.forEach((memory: any) => {
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
   * Validates and sanitizes input data before operations with enhanced error context
   */
  validateAndSanitizeInput(type: 'project', data: any): any;
  validateAndSanitizeInput(type: 'task', data: any): any;
  validateAndSanitizeInput(type: 'memory', data: any): any;
  validateAndSanitizeInput(type: 'project' | 'task' | 'memory', data: any): any {
    try {
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
    } catch (error) {
      throw new Error(`Input validation failed for ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleanup method for graceful shutdown with enhanced cleanup
   */
  cleanup(): void {
    // Reject any pending operations
    this.operationQueue.forEach(({ reject }) => {
      reject(new Error('Database shutting down'));
    });
    this.operationQueue.length = 0;
    
    // Clear cache
    this.cache.clear();
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
    
    // Clear cache
    this.cache.clear();
    
    // Wait for current operations to complete
    try {
      await this.operationLock;
    } catch {
      // Ignore errors during shutdown
    }
  }

  /**
   * Get comprehensive database statistics for monitoring and optimization
   */
  getStats(): {
    projects: number;
    tasks: number;
    memories: number;
    queuedOperations: number;
    lastUpdated: string;
    estimatedSizeMB: number;
    performance: {
      totalOperations: number;
      successfulOperations: number;
      failedOperations: number;
      successRate: number;
      averageOperationTime: number;
      lastOperationTime: number;
    };
    cache: {
      size: number;
      hitRate: number;
      totalHits: number;
      totalMisses: number;
    };
  } {
    const cacheTotal = this.metrics.cacheHits + this.metrics.cacheMisses;
    
    return {
      projects: this.database.projects.length,
      tasks: this.database.tasks.length,
      memories: this.database.memories.length,
      queuedOperations: this.operationQueue.length,
      lastUpdated: this.database.meta.last_updated,
      estimatedSizeMB: this.estimateDatabaseSize(this.database),
      performance: {
        totalOperations: this.metrics.totalOperations,
        successfulOperations: this.metrics.successfulOperations,
        failedOperations: this.metrics.failedOperations,
        successRate: this.metrics.totalOperations > 0 
          ? Math.round((this.metrics.successfulOperations / this.metrics.totalOperations) * 100) 
          : 100,
        averageOperationTime: Math.round(this.metrics.averageOperationTime * 100) / 100,
        lastOperationTime: this.metrics.lastOperationTime
      },
      cache: {
        size: this.cache.size,
        hitRate: cacheTotal > 0 ? Math.round((this.metrics.cacheHits / cacheTotal) * 100) : 0,
        totalHits: this.metrics.cacheHits,
        totalMisses: this.metrics.cacheMisses
      }
    };
  }
}