import type { ProjectDatabase } from '../types/index.js';

/**
 * Service responsible for in-memory database operations.
 * Simplified to use only in-memory storage - no file persistence.
 * For persistent storage, users should create markdown files manually.
 */
export class StorageService {
  private database: ProjectDatabase;

  constructor() {
    this.database = this.createDefaultDatabase();
  }

  /**
   * Executes an operation with the in-memory database.
   * Simplified to work only with in-memory data.
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
    // Create a deep copy for the operation
    const databaseCopy = JSON.parse(JSON.stringify(this.database));

    // Execute operation with the database copy
    const { result, commit = false } = await operation(databaseCopy);

    // Update in-memory database if commit is requested
    if (commit) {
      databaseCopy.meta.last_updated = new Date().toISOString();
      this.database = databaseCopy;
    }

    return result;
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
   */
  async saveExport(filename: string, content: string): Promise<void> {
    console.log(`Memory Pickle: In-memory mode - Consider creating a markdown file: ${filename}`);
    console.log('Suggested content for your markdown file:');
    console.log('---');
    console.log(content);
    console.log('---');
  }
}