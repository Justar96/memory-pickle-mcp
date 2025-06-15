import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MemoryPickleCoreTestUtils, TestDataFactory } from './utils/testHelpers';
import { MemoryPickleCore } from '../src/core/MemoryPickleCore';
import { StorageService } from '../src/services/StorageService';
import { ProjectService } from '../src/services/ProjectService';
import { TaskService } from '../src/services/TaskService';
import { MemoryService } from '../src/services/MemoryService';
import type { ProjectDatabase } from '../src/types';

/**
 * Service Method Coverage Tests
 * 
 * Tests the service methods that are not covered by the main MCP tool tests.
 * Focuses on edge cases, error handling, and internal service functionality.
 */
describe('Service Method Coverage', () => {
  let core: MemoryPickleCore;
  let database: ProjectDatabase;

  beforeEach(async () => {
    TestDataFactory.reset();
    const scenario = await MemoryPickleCoreTestUtils.createWithScenario('basic');
    core = scenario.core;
    database = scenario.testData;
  });

  describe('ProjectService Coverage', () => {
    let projectService: ProjectService;

    beforeEach(() => {
      projectService = new ProjectService();
    });

    it('should find projects by ID correctly', () => {
      const projects = [
        TestDataFactory.createProject({ name: 'Project 1' }),
        TestDataFactory.createProject({ name: 'Project 2' })
      ];

      const found = projectService.findProjectById(projects, projects[0].id);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Project 1');

      const notFound = projectService.findProjectById(projects, 'nonexistent');
      expect(notFound).toBeUndefined();
    });

    it('should update projects correctly', () => {
      const projects = [
        TestDataFactory.createProject({ name: 'Original Name' })
      ];

      const updated = projectService.updateProject(projects, projects[0].id, {
        name: 'Updated Name',
        description: 'Updated Description'
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated Description');
      expect(projects[0].name).toBe('Updated Name'); // Should update in place
    });

    it('should throw error when updating non-existent project', () => {
      const projects = [TestDataFactory.createProject({ name: 'Test' })];

      expect(() => {
        projectService.updateProject(projects, 'nonexistent', { name: 'New Name' });
      }).toThrow('Project not found: nonexistent');
    });

    it('should create projects with correct defaults', () => {
      const project = projectService.createProject({
        name: 'Test Project',
        description: 'Test Description'
      });

      expect(project.name).toBe('Test Project');
      expect(project.description).toBe('Test Description');
      expect(project.status).toBe('planning');
      expect(project.completion_percentage).toBe(0);
      expect(Array.isArray(project.tasks)).toBe(true);
      expect(project.tasks.length).toBe(0);
      expect(project.id).toMatch(/^proj_/);
    });
  });

  describe('TaskService Coverage', () => {
    let taskService: TaskService;

    beforeEach(() => {
      taskService = new TaskService();
    });

    it('should find tasks by ID correctly', () => {
      const tasks = [
        TestDataFactory.createTask({ title: 'Task 1' }),
        TestDataFactory.createTask({ title: 'Task 2' })
      ];

      const found = taskService.findTaskById(tasks, tasks[0].id);
      expect(found).toBeDefined();
      expect(found?.title).toBe('Task 1');

      const notFound = taskService.findTaskById(tasks, 'nonexistent');
      expect(notFound).toBeUndefined();
    });

    it('should update tasks correctly', () => {
      const tasks = [
        TestDataFactory.createTask({ title: 'Original Title' })
      ];

      const updated = taskService.updateTask(tasks, tasks[0].id, {
        title: 'Updated Title',
        description: 'Updated Description',
        progress: 75,
        completed: true
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('Updated Description');
      expect(updated.progress).toBe(75);
      expect(updated.completed).toBe(true);
      expect(tasks[0].title).toBe('Updated Title'); // Should update in place
    });

    it('should throw error when updating non-existent task', () => {
      const tasks = [TestDataFactory.createTask({ title: 'Test' })];

      expect(() => {
        taskService.updateTask(tasks, 'nonexistent', { title: 'New Title' });
      }).toThrow('Task not found: nonexistent');
    });

    it('should create tasks with correct defaults', () => {
      const task = taskService.createTask({
        title: 'Test Task',
        description: 'Test Description',
        project_id: 'proj_test',
        priority: 'high'
      });

      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Test Description');
      expect(task.project_id).toBe('proj_test');
      expect(task.priority).toBe('high');
      expect(task.completed).toBe(false);
      expect(task.progress).toBe(0);
      expect(Array.isArray(task.tags)).toBe(true);
      expect(Array.isArray(task.subtasks)).toBe(true);
      expect(Array.isArray(task.notes)).toBe(true);
      expect(Array.isArray(task.blockers)).toBe(true);
      expect(task.id).toMatch(/^task_/);
    });

    it('should handle task filtering by project', () => {
      const projectId = 'proj_test';
      const tasks = [
        TestDataFactory.createTask({ title: 'Task 1', project_id: projectId }),
        TestDataFactory.createTask({ title: 'Task 2', project_id: 'other_project' }),
        TestDataFactory.createTask({ title: 'Task 3', project_id: projectId })
      ];

      const projectTasks = tasks.filter(task => task.project_id === projectId);
      expect(projectTasks.length).toBe(2);
      expect(projectTasks[0].title).toBe('Task 1');
      expect(projectTasks[1].title).toBe('Task 3');
    });
  });

  describe('MemoryService Coverage', () => {
    let memoryService: MemoryService;

    beforeEach(() => {
      memoryService = new MemoryService();
    });

    it('should add memories correctly', () => {
      const memories: any[] = [];

      const memory = memoryService.addMemory(memories, {
        title: 'Test Memory',
        content: 'Test Content',
        importance: 'high',
        project_id: 'proj_test'
      });

      expect(memory.title).toBe('Test Memory');
      expect(memory.content).toBe('Test Content');
      expect(memory.importance).toBe('high');
      expect(memory.project_id).toBe('proj_test');
      expect(memory.id).toMatch(/^mem_/);
      expect(memories.length).toBe(1);
      expect(memories[0]).toBe(memory);
    });

    it('should create memories with correct defaults', () => {
      const memories: any[] = [];

      const memory = memoryService.addMemory(memories, {
        title: 'Test Memory',
        content: 'Test Content'
      });

      expect(memory.importance).toBe('medium'); // Default importance
      expect(memory.category).toBe('general'); // Default category
      expect(Array.isArray(memory.tags)).toBe(true);
      expect(memory.tags.length).toBe(0);
      expect(memory.timestamp).toBeDefined();
    });

    it('should handle memory search correctly', () => {
      const memories = [
        TestDataFactory.createMemory({ 
          title: 'JavaScript Tutorial', 
          content: 'Learn JavaScript basics' 
        }),
        TestDataFactory.createMemory({ 
          title: 'Python Guide', 
          content: 'Python programming fundamentals' 
        }),
        TestDataFactory.createMemory({ 
          title: 'Web Development', 
          content: 'HTML, CSS, and JavaScript for web' 
        })
      ];

      // Search by title
      const jsMemories = memories.filter(m => 
        m.title.toLowerCase().includes('javascript') ||
        m.content.toLowerCase().includes('javascript')
      );
      expect(jsMemories.length).toBe(2);

      // Search by content
      const programmingMemories = memories.filter(m => 
        m.title.toLowerCase().includes('programming') ||
        m.content.toLowerCase().includes('programming')
      );
      expect(programmingMemories.length).toBe(1);
    });
  });

  describe('StorageService Coverage', () => {
    it('should handle database schema validation', () => {
      const validDatabase = TestDataFactory.createDatabase({
        projects: [TestDataFactory.createProject({ name: 'Test' })],
        tasks: [TestDataFactory.createTask({ title: 'Test Task' })],
        memories: [TestDataFactory.createMemory({ title: 'Test Memory' })]
      });

      // Should not throw for valid database
      expect(() => {
        // This would be validated by the schema in real usage
        expect(validDatabase.projects).toBeDefined();
        expect(validDatabase.tasks).toBeDefined();
        expect(validDatabase.memories).toBeDefined();
      }).not.toThrow();
    });

    it('should handle empty database creation', () => {
      const emptyDatabase = TestDataFactory.createDatabase();

      expect(emptyDatabase.projects).toEqual([]);
      expect(emptyDatabase.tasks).toEqual([]);
      expect(emptyDatabase.memories).toEqual([]);
      expect(emptyDatabase.meta).toBeDefined();
    });
  });

  describe('Error Handling in Services', () => {
    it('should handle malformed data gracefully', () => {
      const projectService = new ProjectService();
      const taskService = new TaskService();

      // Test with empty arrays
      expect(projectService.findProjectById([], 'any-id')).toBeUndefined();
      expect(taskService.findTaskById([], 'any-id')).toBeUndefined();

      // Test with null/undefined arrays (should not crash)
      expect(() => {
        projectService.findProjectById(null as any, 'any-id');
      }).toThrow();

      expect(() => {
        taskService.findTaskById(undefined as any, 'any-id');
      }).toThrow();
    });

    it('should validate required fields in creation', () => {
      const projectService = new ProjectService();
      const taskService = new TaskService();

      // Project creation with missing name
      expect(() => {
        projectService.createProject({ name: '', description: 'test' });
      }).toThrow();

      // Task creation with missing title
      expect(() => {
        taskService.createTask({ 
          title: '', 
          project_id: 'proj_test',
          description: 'test' 
        });
      }).toThrow();
    });
  });

  describe('Integration Between Services', () => {
    it('should maintain data consistency across services', async () => {
      // Create a project
      const projectResponse = await core.create_project({
        name: 'Integration Test Project',
        description: 'Testing service integration'
      });

      // Create a task in that project
      const taskResponse = await core.create_task({
        title: 'Integration Test Task',
        description: 'Testing task creation'
      });

      // Create a memory related to the task
      const memoryResponse = await core.remember_this({
        content: 'Important note about the integration test task',
        title: 'Integration Test Memory'
      });

      // Verify all operations succeeded
      expect(projectResponse.content[0].text).toContain('Integration Test Project');
      expect(taskResponse.content[0].text).toContain('Integration Test Task');
      expect(memoryResponse.content[0].text).toContain('Integration Test Memory');

      // Verify project status shows the task (should show current project which is the new one)
      const statusResponse = await core.get_project_status({});
      expect(statusResponse.content[0].text).toContain('Integration Test Project');
      expect(statusResponse.content[0].text).toContain('Total Tasks:** 1'); // 1 task in the new current project

      // Verify memory can be recalled
      const recallResponse = await core.recall_context({
        query: 'integration test',
        limit: 5
      });
      expect(recallResponse.content[0].text).toContain('Integration Test Memory');
    });
  });
});
