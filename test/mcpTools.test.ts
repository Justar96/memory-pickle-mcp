import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ALL_TOOLS, TOOL_NAMES } from '../src/tools';
import { TestDataFactory, MockMCPHelpers, TestAssertions, MemoryPickleCoreTestUtils } from './utils/testHelpers';
import { StorageService } from '../src/services/StorageService';
import { TaskService } from '../src/services/TaskService';
import { ProjectService } from '../src/services/ProjectService';
import { MemoryService } from '../src/services/MemoryService';
import { MemoryPickleCore } from '../src/core/MemoryPickleCore';
import * as path from 'path';

describe('MCP Tools Integration', () => {
  let storageService: StorageService;
  let taskService: TaskService;
  let projectService: ProjectService;
  let memoryService: MemoryService;
  const testDataDir = path.resolve(process.cwd(), 'test_mcp_data');
  const testProjectFile = path.join(testDataDir, 'project-data.yaml');

  beforeEach(async () => {
    TestDataFactory.reset();
    
    // Clean up and create test directory
    const fs = await import('fs/promises');
    await fs.rm(testDataDir, { recursive: true, force: true });
    await fs.mkdir(testDataDir, { recursive: true });
    
    // Initialize services
    storageService = new StorageService(testProjectFile);
    taskService = new TaskService();
    projectService = new ProjectService();
    memoryService = new MemoryService();

    // Initialize with empty database
    const initialDb = TestDataFactory.createDatabase();
    await storageService.saveDatabase(initialDb);
  });

  afterEach(async () => {
    const fs = await import('fs/promises');
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  describe('Tool Schema Validation', () => {
    it('should have valid schema for all tools', () => {
      ALL_TOOLS.forEach(tool => {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });

    it('should have simplified descriptions without XML', () => {
      ALL_TOOLS.forEach(tool => {
        // Ensure descriptions don't contain XML tags
        expect(tool.description).not.toMatch(/<[^>]+>/);

        // Ensure descriptions are concise (under 500 characters)
        expect(tool.description.length).toBeLessThan(500);

        // Ensure descriptions are clear and action-oriented
        expect(tool.description.trim().length).toBeGreaterThan(10);
      });
    });

    it('should have consistent tool naming convention', () => {
      ALL_TOOLS.forEach(tool => {
        expect(tool.name).toMatch(/^[a-z_]+$/);
        expect(Object.values(TOOL_NAMES)).toContain(tool.name);
      });
    });
  });

  describe('Project Management Tools', () => {
    it('should create project with create_project tool', async () => {
      const mockCall = MockMCPHelpers.createMockToolCall('create_project', {
        name: 'Test E-commerce Website',
        description: 'Building an online store'
      });

      // Simulate tool execution
      const project = projectService.createProject({
        name: mockCall.arguments.name,
        description: mockCall.arguments.description
      });

      TestAssertions.expectProjectToBeValid(project);
      expect(project.name).toBe('Test E-commerce Website');
      expect(project.description).toBe('Building an online store');
    });

    it('should get project status with get_project_status tool', async () => {
      // Setup test data using new test utilities
      const project = TestDataFactory.createProject({ name: 'Test Project' });
      const task1 = TestDataFactory.createTask({ project_id: project.id, completed: true });
      const task2 = TestDataFactory.createTask({ project_id: project.id, progress: 50 });

      project.tasks = [task1.id, task2.id];

      const db = TestDataFactory.createDatabase({
        projects: [project],
        tasks: [task1, task2]
      });

      // Create MemoryPickleCore with test data
      const core = await MemoryPickleCoreTestUtils.createWithTestData(db);
      const projectStatusResponse = await core.get_project_status({ project_id: project.id });

      expect(projectStatusResponse.content).toBeDefined();
      expect(projectStatusResponse.content[0].text).toContain(project.name);
      expect(projectStatusResponse.content[0].text).toContain('Total Tasks:** 2');
    });

    it('should generate handoff summary', async () => {
      const project = TestDataFactory.createProject();
      const task = TestDataFactory.createTask({ project_id: project.id });

      const db = TestDataFactory.createDatabase({
        projects: [project],
        tasks: [task]
      });

      // Create MemoryPickleCore with test data
      const core = await MemoryPickleCoreTestUtils.createWithTestData(db);
      const summaryResponse = await core.generate_handoff_summary({ project_id: project.id });

      expect(summaryResponse.content).toBeDefined();
      expect(summaryResponse.content[0].text).toContain('Handoff Summary');
      expect(summaryResponse.content[0].text).toContain(project.name);
    });
  });

  describe('Task Management Tools', () => {
    it('should create task with priority detection', () => {
      const urgentTask = taskService.createTask({
        title: 'URGENT: Fix security vulnerability',
        project_id: 'proj_1'
      });

      const normalTask = taskService.createTask({
        title: 'Add new feature',
        project_id: 'proj_1'
      });

      const niceToHaveTask = taskService.createTask({
        title: 'Polish UI - nice to have',
        project_id: 'proj_1'
      });

      expect(urgentTask.priority).toBe('critical');
      expect(normalTask.priority).toBe('medium');
      expect(niceToHaveTask.priority).toBe('low');
    });

    it('should toggle task completion correctly', () => {
      const task = TestDataFactory.createTask();
      
      // Mark as complete
      taskService.toggleTask(task);
      expect(task.completed).toBe(true);
      expect(task.progress).toBe(100);
      expect(task.completed_date).toBeDefined();

      // Mark as incomplete
      taskService.toggleTask(task);
      expect(task.completed).toBe(false);
      expect(task.progress).toBe(0); // Should reset to 0
      expect(task.completed_date).toBeUndefined();
    });

    it('should update task progress and handle blockers', () => {
      const task = TestDataFactory.createTask();
      
      taskService.updateTaskProgress(task, {
        progress: 75,
        notes: 'Almost done',
        blockers: ['Waiting for review']
      });

      expect(task.progress).toBe(75);
      expect(task.notes).toHaveLength(1);
      expect(task.notes[0]).toContain('Almost done');
      expect(task.blockers).toEqual(['Waiting for review']);
    });

    it('should filter and sort tasks correctly', () => {
      const tasks = [
        TestDataFactory.createTask({ priority: 'low', completed: true }),
        TestDataFactory.createTask({ priority: 'critical', completed: false }),
        TestDataFactory.createTask({ priority: 'medium', progress: 50 })
      ];

      const criticalTasks = taskService.filterTasks(tasks, { priority: 'critical' });
      expect(criticalTasks).toHaveLength(1);

      const inProgressTasks = taskService.filterTasks(tasks, { status: 'in_progress' });
      expect(inProgressTasks).toHaveLength(1);

      const sortedTasks = taskService.sortTasks(tasks);
      expect(sortedTasks[0].priority).toBe('critical'); // Critical first
      expect(sortedTasks[2].completed).toBe(true); // Completed last
    });
  });

  describe('Memory Management Tools', () => {
    it('should store and retrieve memories', () => {
      const memory = memoryService.createMemory({
        title: 'Architecture Decision',
        content: 'We decided to use PostgreSQL for better performance',
        category: 'technical',
        importance: 'high',
        tags: ['database', 'architecture']
      });

      TestAssertions.expectMemoryToBeValid(memory);
      expect(memory.category).toBe('technical');
      expect(memory.importance).toBe('high');
      expect(memory.tags).toContain('database');
    });

    it('should search memories with AND logic for tags', () => {
      const memories = [
        TestDataFactory.createMemory({ tags: ['react', 'typescript'] }),
        TestDataFactory.createMemory({ tags: ['react'] }),
        TestDataFactory.createMemory({ tags: ['typescript'] })
      ];

      const results = memoryService.searchMemories(memories, {
        tags: ['react', 'typescript']
      });

      expect(results).toHaveLength(1);
      expect(results[0].tags).toEqual(['react', 'typescript']);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing required fields gracefully', () => {
      expect(() => {
        taskService.createTask({ project_id: 'proj_1' } as any);
      }).toThrow();

      expect(() => {
        taskService.createTask({ title: 'Test' } as any);
      }).toThrow();
    });

    it('should handle invalid tool arguments', () => {
      expect(() => {
        taskService.createTask({
          title: 'Test Task',
          project_id: 'proj_1',
          priority: 'invalid_priority' as any
        });
      }).toThrow();
    });

    it('should handle empty database gracefully', async () => {
      const emptyDb = TestDataFactory.createDatabase();

      // Create MemoryPickleCore with empty test data
      const core = await MemoryPickleCoreTestUtils.createWithTestData(emptyDb);

      // Test that core handles empty database gracefully
      expect(core).toBeDefined();

      // Test that we can call methods on empty database without errors
      // The method should throw an error for non-existent project
      await expect(core.get_project_status({ project_id: 'non-existent' }))
        .rejects.toThrow('Project not found: non-existent');
    });
  });
});
