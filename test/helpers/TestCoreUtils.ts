/**
 * Test Utilities for MemoryPickleCore
 * 
 * Helper functions for creating and managing MemoryPickleCore instances in tests
 */

import { MemoryPickleCore } from '../../src/core/MemoryPickleCore.js';

export class TestCoreUtils {
  /**
   * Create a MemoryPickleCore instance with automatic cleanup tracking
   */
  static async createCore(): Promise<MemoryPickleCore> {
    const core = await MemoryPickleCore.create();
    
    // Register for automatic cleanup
    if ((global as any).trackCoreInstance) {
      (global as any).trackCoreInstance(core);
    }
    
    return core;
  }

  /**
   * Create a project and return both the response and extracted ID
   */
  static async createProjectWithId(
    core: MemoryPickleCore, 
    name: string, 
    description?: string
  ): Promise<{ response: any; projectId: string }> {
    const response = await core.create_project({
      name,
      description: description || `Project: ${name}`
    });

    const projectId = response.content[0].text.match(/\*\*ID:\*\* ([^\n]+)/)?.[1];
    if (!projectId) {
      throw new Error('Failed to extract project ID from response');
    }

    return { response, projectId };
  }

  /**
   * Create a task and return both the response and extracted ID
   */
  static async createTaskWithId(
    core: MemoryPickleCore,
    title: string,
    options: { description?: string; priority?: string; projectId?: string } = {}
  ): Promise<{ response: any; taskId: string }> {
    const response = await core.create_task({
      title,
      description: options.description || `Task: ${title}`,
      priority: options.priority || 'medium',
      project_id: options.projectId
    });

    const taskId = response.content[0].text.match(/\*\*ID:\*\* ([^\n]+)/)?.[1];
    if (!taskId) {
      throw new Error('Failed to extract task ID from response');
    }

    return { response, taskId };
  }

  /**
   * Create a memory and return the response
   */
  static async createMemory(
    core: MemoryPickleCore,
    title: string,
    content: string,
    options: { importance?: string; projectId?: string; taskId?: string } = {}
  ): Promise<any> {
    return await core.remember_this({
      title,
      content,
      importance: options.importance || 'medium',
      project_id: options.projectId,
      task_id: options.taskId
    });
  }

  /**
   * Setup a complete test scenario with project, tasks, and memories
   */
  static async setupTestScenario(core: MemoryPickleCore): Promise<{
    projectId: string;
    taskIds: string[];
    memoryResponses: any[];
  }> {
    // Create project
    const { projectId } = await this.createProjectWithId(
      core,
      'Test Scenario Project',
      'A comprehensive test scenario'
    );

    // Create tasks
    const task1 = await this.createTaskWithId(core, 'Implementation Task', {
      priority: 'high'
    });
    const task2 = await this.createTaskWithId(core, 'Testing Task', {
      priority: 'medium'
    });
    const task3 = await this.createTaskWithId(core, 'Documentation Task', {
      priority: 'low'
    });

    const taskIds = [task1.taskId, task2.taskId, task3.taskId];

    // Create memories
    const memory1 = await this.createMemory(
      core,
      'Technical Decision',
      'Decided to use TypeScript for better type safety',
      { importance: 'high' }
    );

    const memory2 = await this.createMemory(
      core,
      'Implementation Note',
      'Remember to handle edge cases in the validation logic',
      { importance: 'medium' }
    );

    const memoryResponses = [memory1, memory2];

    return { projectId, taskIds, memoryResponses };
  }

  /**
   * Extract ID from MCP response text
   */
  static extractId(responseText: string, type: 'task' | 'project' | 'memory' = 'task'): string {
    const match = responseText.match(/\*\*ID:\*\* ([^\n]+)/);
    if (!match) {
      throw new Error(`Failed to extract ${type} ID from response`);
    }
    return match[1];
  }

  /**
   * Wait for a specific amount of time (useful for timing tests)
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Measure execution time of an operation
   */
  static async measureTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await operation();
    const duration = Date.now() - start;
    return { result, duration };
  }
} 