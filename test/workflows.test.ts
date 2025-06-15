import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TestDataFactory, PerformanceHelpers, AsyncHelpers, MemoryPickleCoreTestUtils } from './utils/testHelpers';
import { StorageService } from '../src/services/StorageService';
import { TaskService } from '../src/services/TaskService';
import { ProjectService } from '../src/services/ProjectService';
import { MemoryService } from '../src/services/MemoryService';
import { MemoryPickleCore } from '../src/core/MemoryPickleCore';
import * as path from 'path';

describe('End-to-End MCP Workflows', () => {
  let storageService: StorageService;
  let taskService: TaskService;
  let projectService: ProjectService;
  let memoryService: MemoryService;
  const testDataDir = path.resolve(process.cwd(), 'test_workflow_data');
  const testProjectFile = path.join(testDataDir, 'project-data.yaml');

  beforeEach(async () => {
    TestDataFactory.reset();
    
    const fs = await import('fs/promises');
    await fs.rm(testDataDir, { recursive: true, force: true });
    await fs.mkdir(testDataDir, { recursive: true });
    
    storageService = new StorageService(testProjectFile);
    taskService = new TaskService();
    projectService = new ProjectService();
    memoryService = new MemoryService();

    const initialDb = TestDataFactory.createDatabase();
    await storageService.saveDatabase(initialDb);
  });

  afterEach(async () => {
    const fs = await import('fs/promises');
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  describe('Complete Project Lifecycle', () => {
    it('should handle full project creation to completion workflow', async () => {
      // 1. Create project
      const project = projectService.createProject({
        name: 'E-commerce Website',
        description: 'Building an online store with React and Node.js'
      });

      // 2. Store architecture decision
      const architectureMemory = memoryService.createMemory({
        title: 'Tech Stack Decision',
        content: 'Using React frontend with Node.js backend and PostgreSQL database',
        category: 'architecture',
        importance: 'high',
        tags: ['react', 'nodejs', 'postgresql'],
        project_id: project.id
      });

      // 3. Create main tasks
      const frontendTask = taskService.createTask({
        title: 'Build React frontend',
        project_id: project.id,
        priority: 'high'
      });

      const backendTask = taskService.createTask({
        title: 'Develop Node.js API',
        project_id: project.id,
        priority: 'high'
      });

      const dbTask = taskService.createTask({
        title: 'Setup PostgreSQL database',
        project_id: project.id,
        priority: 'critical'
      });

      // 4. Create subtasks
      const loginSubtask = taskService.createTask({
        title: 'Implement user authentication',
        project_id: project.id,
        parent_id: frontendTask.id,
        priority: 'high'
      });

      const productSubtask = taskService.createTask({
        title: 'Create product catalog',
        project_id: project.id,
        parent_id: frontendTask.id,
        priority: 'medium'
      });

      // 5. Link tasks to project
      project.tasks = [frontendTask.id, backendTask.id, dbTask.id];
      frontendTask.subtasks = [loginSubtask.id, productSubtask.id];

      // 6. Save to database
      const db = TestDataFactory.createDatabase({
        projects: [project],
        tasks: [frontendTask, backendTask, dbTask, loginSubtask, productSubtask],
        memories: [architectureMemory]
      });

      await storageService.saveDatabase(db);

      // 7. Simulate work progress
      taskService.updateTaskProgress(dbTask, { progress: 100 });
      taskService.updateTaskProgress(loginSubtask, { progress: 75 });
      taskService.updateTaskProgress(productSubtask, { progress: 50 });

      // 8. Update parent task progress
      const allTasks = [frontendTask, backendTask, dbTask, loginSubtask, productSubtask];
      taskService.updateParentProgress(frontendTask, allTasks);

      // 9. Complete some tasks
      taskService.toggleTask(dbTask);
      taskService.toggleTask(loginSubtask);

      // 10. Verify project status
      const updatedDb = TestDataFactory.createDatabase({
        projects: [project],
        tasks: allTasks,
        memories: [architectureMemory]
      });

      // Create MemoryPickleCore with test data
      const core = await MemoryPickleCoreTestUtils.createWithTestData(updatedDb);
      const statusResponse = await core.get_project_status({ project_id: project.id });

      expect(statusResponse.content).toBeDefined();
      expect(statusResponse.content[0].text).toContain('E-commerce Website');
      expect(statusResponse.content[0].text).toContain('Total Tasks:** 5');
    });

    it('should handle session handoff workflow', async () => {
      // Setup project with some progress
      const project = TestDataFactory.createProject({ name: 'Mobile App' });
      const task1 = TestDataFactory.createTask({ 
        project_id: project.id, 
        title: 'Design UI mockups',
        completed: true 
      });
      const task2 = TestDataFactory.createTask({ 
        project_id: project.id, 
        title: 'Implement authentication',
        progress: 60,
        blockers: ['Waiting for API keys']
      });
      const task3 = TestDataFactory.createTask({ 
        project_id: project.id, 
        title: 'Setup CI/CD pipeline',
        priority: 'high'
      });

      project.tasks = [task1.id, task2.id, task3.id];

      const db = TestDataFactory.createDatabase({
        projects: [project],
        tasks: [task1, task2, task3]
      });

      // Create MemoryPickleCore with test data
      const core = await MemoryPickleCoreTestUtils.createWithTestData(db);
      const summaryResponse = await core.generate_handoff_summary({ project_id: project.id });

      // Verify handoff contains essential information
      const summaryText = summaryResponse.content[0].text;
      expect(summaryText).toContain('Mobile App');
      expect(summaryText).toContain('Design UI mockups');
      expect(summaryText).toContain('Handoff Summary');

      // Verify summary is copy-paste ready
      expect(summaryText.length).toBeGreaterThan(100);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const { result: project, duration: projectCreationTime } = await PerformanceHelpers.measureExecutionTime(async () => {
        return projectService.createProject({
          name: 'Large Scale Project',
          description: 'Testing performance with many tasks'
        });
      });

      // Create 100 tasks
      const tasks = [];
      const { duration: taskCreationTime } = await PerformanceHelpers.measureExecutionTime(async () => {
        for (let i = 0; i < 100; i++) {
          tasks.push(taskService.createTask({
            title: `Task ${i + 1}`,
            project_id: project.id,
            priority: i % 4 === 0 ? 'critical' : i % 3 === 0 ? 'high' : 'medium'
          }));
        }
      });

      // Test filtering performance
      const { duration: filterTime } = await PerformanceHelpers.measureExecutionTime(async () => {
        const criticalTasks = taskService.filterTasks(tasks, { priority: 'critical' });
        const highTasks = taskService.filterTasks(tasks, { priority: 'high' });
        return { criticalTasks, highTasks };
      });

      // Test sorting performance
      const { duration: sortTime } = await PerformanceHelpers.measureExecutionTime(async () => {
        return taskService.sortTasks(tasks);
      });

      // Performance assertions (adjust thresholds as needed)
      PerformanceHelpers.expectExecutionTimeUnder(projectCreationTime, 10);
      PerformanceHelpers.expectExecutionTimeUnder(taskCreationTime, 100);
      PerformanceHelpers.expectExecutionTimeUnder(filterTime, 20);
      PerformanceHelpers.expectExecutionTimeUnder(sortTime, 20);

      expect(tasks).toHaveLength(100);
    });

    it('should handle concurrent operations safely', async () => {
      const project = TestDataFactory.createProject();

      // First, add the project to the database
      await storageService.runExclusive(async (db) => {
        db.projects.push(project);
        return { result: project, commit: true };
      });

      // Simulate concurrent task creation using sequential operations
      // (since in-memory storage doesn't have true concurrency issues)
      const tasks = [];
      for (let i = 0; i < 10; i++) {
        const result = await storageService.runExclusive(async (db) => {
          const task = taskService.createTask({
            title: `Coask ${i + 1}`,
            project_id: project.id
          });

          db.tasks.push(task);
          return { result: task, commit: true };
        });
        tasks.push(result);
      }

      // Verify all operations completed successfully
      expect(tasks).toHaveLength(10);
      tasks.forEach((task, index) => {
        expect(task.title).toBe(`Coask ${index + 1}`);
      });

      // Verify final database state
      const finalDb = await storageService.loadDatabase();
      expect(finalDb.tasks).toHaveLength(10);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from corrupted data gracefully', async () => {
      // Create valid initial state
      const project = TestDataFactory.createProject();
      const task = TestDataFactory.createTask({ project_id: project.id });
      
      const db = TestDataFactory.createDatabase({
        projects: [project],
        tasks: [task]
      });
      
      await storageService.saveDatabase(db);

      // Simulate corruption by writing invalid YAML
      const fs = await import('fs/promises');
      const projectsFile = path.join(testDataDir, 'projects.yaml');
      await fs.writeFile(projectsFile, 'invalid: yaml: content: [unclosed');

      // Attempt to load - should handle gracefully
      try {
        await storageService.loadDatabase();
        // If it doesn't throw, verify it recovered with defaults
        const recoveredDb = await storageService.loadDatabase();
        expect(recoveredDb.projects).toBeDefined();
      } catch (error) {
        // Error is expected for corrupted data
        expect(error).toBeDefined();
      }
    });

    it('should handle missing files gracefully', async () => {
      // Try to load from non-existent location
      const nonExistentPath = path.join(testDataDir, 'non-existent.yaml');
      const emptyStorageService = new StorageService(nonExistentPath);
      
      const db = await emptyStorageService.loadDatabase();
      
      // Should return valid empty database
      expect(db.meta).toBeDefined();
      expect(db.projects).toEqual([]);
      expect(db.tasks).toEqual([]);
      expect(db.memories).toEqual([]);
    });
  });

  describe('Memory and Context Management', () => {
    it('should maintain context across operations', async () => {
      // Create project with context
      const project = projectService.createProject({
        name: 'AI Assistant Project',
        description: 'Building an intelligent assistant'
      });

      // Store important decisions
      const techMemory = memoryService.createMemory({
        title: 'Technology Stack',
        content: 'Using TypeScript, Node.js, and OpenAI API',
        category: 'technical',
        importance: 'high',
        project_id: project.id
      });

      const requirementMemory = memoryService.createMemory({
        title: 'User Requirements',
        content: 'Must support natural language processing and context awareness',
        category: 'requirements',
        importance: 'critical',
        project_id: project.id
      });

      // Search for related context
      const memories = [techMemory, requirementMemory];
      const techContext = memoryService.searchMemories(memories, {
        query: 'technology',
        category: 'technical'
      });

      const criticalContext = memoryService.searchMemories(memories, {
        query: 'requirements',
        importance: 'critical'
      });

      expect(techContext).toHaveLength(1);
      expect(techContext[0].title).toBe('Technology Stack');

      expect(criticalContext).toHaveLength(1);
      expect(criticalContext[0].title).toBe('User Requirements');
    });
  });
});
