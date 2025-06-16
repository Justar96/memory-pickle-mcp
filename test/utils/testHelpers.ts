import { jest } from '@jest/globals';
import type { Task, Project, Memory, ProjectDatabase } from '../../src/types';
import { projectDatabaseSchema } from '../../src/types/schemas';
import { MemoryPickleCore } from '../../src/core/MemoryPickleCore';
import { StorageService } from '../../src/services/StorageService';
import { ProjectService } from '../../src/services/ProjectService';
import { TaskService } from '../../src/services/TaskService';
import { MemoryService } from '../../src/services/MemoryService';

/**
 * Test-specific storage service that works with in-memory data
 * instead of reloading from the file system
 */
class TestStorageService extends StorageService {
  private testDatabase: ProjectDatabase;

  constructor(database: ProjectDatabase) {
    super();
    this.testDatabase = database;
  }

  async loadDatabase(): Promise<ProjectDatabase> {
    // Return the test database instead of loading from file system
    return this.testDatabase;
  }

  async runExclusive<T>(
    operation: (db: ProjectDatabase) => Promise<{ result: T; commit: boolean; changedParts: Set<string> }>
  ): Promise<T> {
    // Run operation on test database directly
    const result = await operation(this.testDatabase);

    // Update the test database if commit is true
    if (result.commit) {
      // The operation already modified this.testDatabase directly
      // No need to save to file system in tests
    }

    return result.result;
  }
}

/**
 * Test data factories for creating consistent test objects
 */
export class TestDataFactory {
  private static taskCounter = 1;
  private static projectCounter = 1;
  private static memoryCounter = 1;

  static createTask(overrides: Partial<Task> = {}): Task {
    const id = `task_${this.taskCounter++}`;
    return {
      id,
      project_id: overrides.project_id || 'proj_1',
      title: `Test Task ${id}`,
      completed: false,
      created_date: new Date().toISOString(),
      priority: 'medium',
      tags: [],
      subtasks: [],
      notes: [],
      blockers: [],
      ...overrides
    };
  }

  static createProject(overrides: Partial<Project> = {}): Project {
    const id = `proj_${this.projectCounter++}`;
    return {
      id,
      name: `Test Project ${id}`,
      status: 'in_progress',
      completion_percentage: 0,
      created_date: new Date().toISOString(),
      tasks: [],
      milestones: [],
      ...overrides
    };
  }

  static createMemory(overrides: Partial<Memory> = {}): Memory {
    const id = `mem_${this.memoryCounter++}`;
    return {
      id,
      title: `Test Memory ${id}`,
      content: 'Test memory content',
      category: 'test',
      importance: 'medium',
      tags: [],
      timestamp: new Date().toISOString(),
      related_memories: [],
      project_id: overrides.project_id || 'proj_1',
      task_id: overrides.task_id || 'task_1',
      ...overrides
    };
  }

  static createDatabase(overrides: Partial<ProjectDatabase> = {}): ProjectDatabase {
    return projectDatabaseSchema.parse({
      meta: {
        last_updated: new Date().toISOString(),
        version: '2.0.0',
        session_count: 1,
        ...overrides.meta
      },
      projects: [],
      tasks: [],
      memories: [],
      templates: {},
      ...overrides
    });
  }

  static reset(): void {
    this.taskCounter = 1;
    this.projectCounter = 1;
    this.memoryCounter = 1;
  }
}

/**
 * Test utilities for MemoryPickleCore integration testing
 */
export class MemoryPickleCoreTestUtils {
  /**
   * Creates a MemoryPickleCore instance with pre-populated test data
   */
  static async createWithTestData(
    database: ProjectDatabase,
    storageServicePath?: string
  ): Promise<MemoryPickleCore> {
    // Create test-specific storage service that doesn't reload from file system
    const storageService = new TestStorageService(database);
    const projectService = new ProjectService();
    const taskService = new TaskService();
    const memoryService = new MemoryService();

    // Create MemoryPickleCore instance with test data
    const core = new MemoryPickleCore(
      storageService,
      projectService,
      taskService,
      memoryService
    );

    return core;
  }

  /**
   * Creates a MemoryPickleCore instance using the standard create method with project setup
   */
  static async createWithScenario(scenario: 'basic' | 'withProject' = 'basic'): Promise<{
    core: MemoryPickleCore;
    testData: { projects: any[]; tasks: any[]; memories: any[] }
  }> {
    const core = await MemoryPickleCore.create();

    let testData = { projects: [], tasks: [], memories: [] };

    if (scenario === 'withProject' || scenario === 'basic') {
      // Create a default project for tests that need one
      const projectResponse = await core.create_project({
        name: 'Test Project',
        description: 'Default project for testing'
      });

      // Extract project ID from response
      const projectId = projectResponse.content[0].text.match(/\*\*ID:\*\* (proj_[a-zA-Z0-9_]+)/)?.[1];

      if (projectId) {
        // Get the actual project data from the database
        const database = core.getDatabase();
        const project = database.projects.find(p => p.id === projectId);
        if (project) {
          testData.projects.push(project);
        }
      }
    }

    return { core, testData };
  }


}

/**
 * Real MCP tool testing infrastructure
 */
export class MCPToolTestUtils {
  /**
   * Test all 8 MCP tools with a MemoryPickleCore instance
   */
  static async testAllMCPTools(core: MemoryPickleCore): Promise<{
    results: Record<string, any>;
    errors: Record<string, Error>;
    coverage: {
      tested: string[];
      missing: string[];
      percentage: number;
    };
  }> {
    const allTools = [
      'get_project_status',
      'create_project',
      'set_current_project',
      'create_task',
      'update_task',
      'remember_this',
      'recall_context',
      'generate_handoff_summary'
    ];

    const results: Record<string, any> = {};
    const errors: Record<string, Error> = {};

    // Test each tool
    for (const toolName of allTools) {
      try {
        const result = await this.callMCPTool(core, toolName);
        results[toolName] = result;
      } catch (error) {
        errors[toolName] = error as Error;
      }
    }

    const tested = Object.keys(results);
    const missing = Object.keys(errors);
    const percentage = (tested.length / allTools.length) * 100;

    return {
      results,
      errors,
      coverage: {
        tested,
        missing,
        percentage
      }
    };
  }

  /**
   * Call an MCP tool method on MemoryPickleCore with realistic arguments
   */
  static async callMCPTool(core: MemoryPickleCore, toolName: string, args?: any): Promise<any> {
    const defaultArgs = this.getDefaultArgsForTool(toolName);
    const finalArgs = { ...defaultArgs, ...args };

    // Call the actual MCP tool method
    switch (toolName) {
      case 'get_project_status':
        return await core.get_project_status(finalArgs);
      case 'create_project':
        return await core.create_project(finalArgs);
      case 'set_current_project':
        return await core.set_current_project(finalArgs);
      case 'create_task':
        return await core.create_task(finalArgs);
      case 'update_task':
        return await core.update_task(finalArgs);
      case 'remember_this':
        return await core.remember_this(finalArgs);
      case 'recall_context':
        return await core.recall_context(finalArgs);
      case 'generate_handoff_summary':
        return await core.generate_handoff_summary(finalArgs);
      default:
        throw new Error(`Unknown MCP tool: ${toolName}`);
    }
  }

  /**
   * Get realistic default arguments for each MCP tool
   */
  static getDefaultArgsForTool(toolName: string): any {
    switch (toolName) {
      case 'get_project_status':
        return {}; // Will use current project if no project_id provided
      case 'create_project':
        return {
          name: 'Test Project',
          description: 'A test project for MCP tool testing'
        };
      case 'set_current_project':
        return {
          project_id: 'proj_test_123'
        };
      case 'create_task':
        return {
          title: 'Test Task',
          description: 'A test task for MCP tool testing'
          // Don't provide project_id - let it use current project
        };
      case 'update_task':
        return {
          task_id: 'task_test_123',
          title: 'Updated Test Task',
          progress: 50
        };
      case 'remember_this':
        return {
          content: 'This is a test memory for MCP tool testing',
          title: 'Test Memory',
          importance: 'medium'
        };
      case 'recall_context':
        return {
          query: 'test',
          limit: 5
        };
      case 'generate_handoff_summary':
        return {}; // Can work without project_id
      default:
        return {};
    }
  }

  /**
   * Validate MCP tool response format
   */
  static validateMCPResponse(response: any, toolName: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // All MCP responses should have content array
    if (!response.content || !Array.isArray(response.content)) {
      errors.push('Response missing content array');
    }

    // Content should have at least one item
    if (response.content && response.content.length === 0) {
      errors.push('Response content array is empty');
    }

    // Each content item should have type and text
    if (response.content) {
      response.content.forEach((item: any, index: number) => {
        if (!item.type) {
          errors.push(`Content item ${index} missing type`);
        }
        if (item.type === 'text' && !item.text) {
          errors.push(`Content item ${index} missing text`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Legacy mock helpers (keeping for backward compatibility)
 */
export class MockMCPHelpers {
  static createMockToolCall(toolName: string, args: any = {}) {
    return {
      name: toolName,
      arguments: args,
      call_id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  static createMockToolResponse(result: any, isError = false) {
    return {
      content: [{
        type: 'text',
        text: isError ? `Error: ${result}` : JSON.stringify(result, null, 2)
      }],
      isError
    };
  }
}

/**
 * Test assertion helpers
 */
export class TestAssertions {
  static expectTaskToBeValid(task: Task): void {
    expect(task.id).toMatch(/^task_/);
    expect(task.title).toBeTruthy();
    expect(task.project_id).toBeTruthy();
    expect(typeof task.completed).toBe('boolean');
    expect(['critical', 'high', 'medium', 'low']).toContain(task.priority);
    expect(Array.isArray(task.tags)).toBe(true);
    expect(Array.isArray(task.subtasks)).toBe(true);
    expect(Array.isArray(task.notes)).toBe(true);
    expect(Array.isArray(task.blockers)).toBe(true);
  }

  static expectProjectToBeValid(project: Project): void {
    expect(project.id).toMatch(/^proj_/);
    expect(project.name).toBeTruthy();
    expect(['planning', 'in_progress', 'blocked', 'completed', 'archived']).toContain(project.status);
    expect(typeof project.completion_percentage).toBe('number');
    expect(project.completion_percentage).toBeGreaterThanOrEqual(0);
    expect(project.completion_percentage).toBeLessThanOrEqual(100);
    expect(Array.isArray(project.tasks)).toBe(true);
  }

  static expectMemoryToBeValid(memory: Memory): void {
    expect(memory.id).toMatch(/^mem_/);
    expect(memory.title).toBeTruthy();
    expect(memory.content).toBeTruthy();
    expect(memory.category).toBeTruthy();
    expect(['critical', 'high', 'medium', 'low']).toContain(memory.importance);
    expect(Array.isArray(memory.tags)).toBe(true);
    expect(memory.timestamp).toBeTruthy();
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceHelpers {
  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  }

  static expectExecutionTimeUnder(duration: number, maxMs: number): void {
    expect(duration).toBeLessThan(maxMs);
  }
}

/**
 * File system test utilities
 */
export class FileSystemHelpers {
  static async fileExists(path: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  static async getFileModificationTime(path: string): Promise<number> {
    const fs = await import('fs/promises');
    const stats = await fs.stat(path);
    return stats.mtimeMs;
  }

  static async cleanupTestFiles(paths: string[]): Promise<void> {
    const fs = await import('fs/promises');
    await Promise.all(
      paths.map(path => 
        fs.rm(path, { recursive: true, force: true }).catch(() => {})
      )
    );
  }
}

/**
 * Async testing utilities
 */
export class AsyncHelpers {
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeoutMs = 5000,
    intervalMs = 100
  ): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await condition()) {
        return;
      }
      await this.delay(intervalMs);
    }
    throw new Error(`Condition not met within ${timeoutMs}ms`);
  }
}
