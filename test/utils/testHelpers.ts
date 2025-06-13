import { jest } from '@jest/globals';
import type { Task, Project, Memory, ProjectDatabase } from '../../src/types';
import { projectDatabaseSchema } from '../../src/types/schemas';

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
 * Mock MCP tool call helpers
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
    expect(['active', 'in_progress', 'completed', 'on_hold']).toContain(project.status);
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
