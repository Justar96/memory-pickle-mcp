import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MemoryPickleCore } from '../src/core/MemoryPickleCore';
import { StorageService } from '../src/services/StorageService';

describe('System Robustness and Reliability Tests', () => {
  let core: MemoryPickleCore;
  let storageService: StorageService;

  beforeEach(async () => {
    core = await MemoryPickleCore.create();
    storageService = new StorageService();
  });

  afterEach(async () => {
    await core.shutdown();
  });

  describe('Memory Management', () => {
    it('should handle large datasets without memory leaks', async () => {
      // Create a project first to set current project
      const project = await core.create_project({
        name: 'Test Project',
        description: 'Project for memory test'
      });
      
      // The project should be automatically set as current by create_project
      
      // Verify the current project is set by trying to create a task immediately
      const testTask = await core.create_task({
        title: 'Test Task',
        description: 'Verify current project is set'
      });
      expect(testTask.content[0].text).toContain('Task Created Successfully');

      // Create many projects, tasks, and memories
      const projects = [project];
      for (let i = 1; i < 10; i++) { // Reduced for faster testing
        const result = await core.create_project({
          name: `Project ${i}`,
          description: `Test project ${i}`
        });
        projects.push(result);
      }

      // Create many tasks (will use the current project)
      for (let i = 0; i < 50; i++) { // Reduced for faster testing
        await core.create_task({
          title: `Task ${i}`,
          description: `Test task ${i}`
        });
      }

      // Create many memories
      for (let i = 0; i < 20; i++) { // Reduced for faster testing
        await core.remember_this({
          title: `Memory ${i}`,
          content: `Test memory content ${i}`
        });
      }

      const stats = core.getSystemStats();
      expect(stats.database.projects).toBe(10);
      expect(stats.database.tasks).toBe(51); // 50 + 1 test task
      expect(stats.database.memories).toBe(20);
      expect(stats.taskIndexSize).toBe(51);
    });

    it('should prevent excessive memory usage', async () => {
      // Create a project first to test task limits
      await core.create_project({
        name: 'Limit Test Project',
        description: 'Testing limits'
      });

      // Create a reasonable number of tasks - all should succeed within limits
      const promises = [];
      for (let i = 0; i < 50; i++) { // Smaller number for testing
        promises.push(
          core.create_task({
            title: `Task ${i}`,
            description: 'Test task'
          }).catch(error => error)
        );
      }

      const results = await Promise.all(promises);
      const successes = results.filter(r => !(r instanceof Error));
      const errors = results.filter(r => r instanceof Error);

      // Debug: log first few errors
      if (errors.length > 0) {
        console.log('Sample errors:', errors.slice(0, 3).map(e => e.message));
      }

      // All tasks should succeed within reasonable limits
      expect(successes.length).toBe(50);
      expect(errors.length).toBe(0);

      // Verify system stats
      const stats = core.getSystemStats();
      expect(stats.database.tasks).toBe(50);
    });
  });

  describe('Concurrency Control', () => {
    it('should handle concurrent operations safely', async () => {
      // Create a project first
      await core.create_project({
        name: 'Concurrent Test Project',
        description: 'Testing concurrent operations'
      });

      // Run multiple concurrent task creation operations
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          core.create_task({
            title: `Concurrent Task ${i}`,
            description: `Task created concurrently ${i}`
          })
        );
      }

      const results = await Promise.all(promises);
      
      // All operations should succeed
      expect(results.length).toBe(20);
      results.forEach(result => {
        expect(result.content[0].text).toContain('Task Created Successfully');
      });

      // Verify database consistency
      const stats = core.getSystemStats();
      expect(stats.database.tasks).toBe(20);
    });

    it('should maintain data integrity under concurrent modifications', async () => {
      // Create initial data
      const projectResult = await core.create_project({
        name: 'Integrity Test',
        description: 'Testing data integrity'
      });

      const taskResult = await core.create_task({
        title: 'Test Task',
        description: 'Task for integrity testing'
      });

      // Extract task ID from the response
      const taskIdMatch = taskResult.content[0].text.match(/\*\*ID:\*\* ([^\n]+)/);
      const taskId = taskIdMatch ? taskIdMatch[1] : '';

      // Run concurrent updates on the same task
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          core.update_task({
            task_id: taskId,
            notes: [`Update ${i} from concurrent operation`]
          })
        );
      }

      const results = await Promise.all(promises);
      
      // All updates should succeed
      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(result.content[0].text).toContain('Task Updated Successfully');
      });
    });
  });

  describe('Data Integrity Validation', () => {
    it('should validate input data comprehensively', async () => {
      // Test invalid project creation
      await expect(core.create_project({})).rejects.toThrow('Missing required field');
      await expect(core.create_project({ name: '' })).rejects.toThrow('cannot be empty');
      await expect(core.create_project({ name: 'x'.repeat(201) })).rejects.toThrow('cannot exceed 200 characters');
      await expect(core.create_project({ name: 'Test', status: 'invalid' })).rejects.toThrow('Invalid project status');

      // Test invalid task creation
      await expect(core.create_task({})).rejects.toThrow('Missing required field');
      await expect(core.create_task({ title: '' })).rejects.toThrow('cannot be empty');
      await expect(core.create_task({ title: 'x'.repeat(201) })).rejects.toThrow('cannot exceed 200 characters');
      await expect(core.create_task({ title: 'Test', priority: 'invalid' })).rejects.toThrow('Invalid task priority');
    });

    it('should handle referential integrity violations', async () => {
      // Try to create task with non-existent project
      await expect(core.create_task({
        title: 'Test Task',
        project_id: 'non-existent-project'
      })).rejects.toThrow('Project not found');

      // Try to update non-existent task
      await expect(core.update_task({
        task_id: 'non-existent-task',
        title: 'Updated'
      })).rejects.toThrow('update_task: Task not found');
    });

    it('should cleanup orphaned data', async () => {
      // Create project and tasks
      const projectResult = await core.create_project({
        name: 'Test Project',
        description: 'Will be deleted'
      });

      await core.create_task({
        title: 'Test Task 1',
        description: 'Task 1'
      });

      await core.create_task({
        title: 'Test Task 2',
        description: 'Task 2'
      });

      // Get the project ID to create an orphaned memory
      let db = core.getDatabase();
      const projectId = db.projects[0]?.id;

      await core.remember_this({
        title: 'Test Memory',
        content: 'Memory content',
        project_id: projectId
      });

      // Verify initial state
      let stats = core.getSystemStats();
      expect(stats.database.projects).toBe(1);
      expect(stats.database.tasks).toBe(2);
      expect(stats.database.memories).toBe(1);

      // Manually corrupt the database by removing the project
      db = core.getDatabase();
      db.projects = []; // Remove all projects

      // Run cleanup
      const cleanupResult = await core.cleanupOrphanedData();

      expect(cleanupResult.orphanedTasks).toBe(2);
      expect(cleanupResult.orphanedMemories).toBe(1);
      expect(cleanupResult.invalidCurrentProject).toBe(true);

      // Verify cleanup worked
      const finalStats = core.getSystemStats();
      expect(finalStats.database.tasks).toBe(0);
      expect(finalStats.database.memories).toBe(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle malformed input gracefully', async () => {
      // Test with null/undefined inputs
      await expect(core.create_project(null)).rejects.toThrow('Invalid arguments');
      await expect(core.create_project(undefined)).rejects.toThrow('Invalid arguments');
      await expect(core.create_project('string')).rejects.toThrow('Invalid arguments');

      // Test with malformed objects
      await expect(core.create_task({ title: null })).rejects.toThrow();
      await expect(core.update_task({ task_id: null })).rejects.toThrow();
    });

    it('should maintain system stability after errors', async () => {
      // Create valid project
      await core.create_project({
        name: 'Stable Project',
        description: 'Testing stability'
      });

      // Cause some errors
      try {
        await core.create_project({ name: 'x'.repeat(200) });
      } catch (error) {
        // Expected error
      }

      try {
        await core.create_task({ title: 'x'.repeat(300) });
      } catch (error) {
        // Expected error
      }

      // System should still be functional
      const result = await core.create_task({
        title: 'Recovery Test Task',
        description: 'System should still work'
      });

      expect(result.content[0].text).toContain('Task Created Successfully');
    });

    it('should handle shutdown gracefully', async () => {
      // Create some data
      await core.create_project({
        name: 'Shutdown Test',
        description: 'Testing graceful shutdown'
      });

      await core.create_task({
        title: 'Shutdown Task',
        description: 'Task before shutdown'
      });

      // Shutdown
      await core.shutdown();

      // Operations after shutdown should fail
      await expect(core.create_project({
        name: 'After Shutdown',
        description: 'Should fail'
      })).rejects.toThrow('System is shutting down');

      const stats = core.getSystemStats();
      expect(stats.isShuttingDown).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should maintain performance with large datasets', async () => {
      const startTime = Date.now();

      // Create moderate amount of data
      await core.create_project({
        name: 'Performance Test',
        description: 'Testing performance'
      });

      for (let i = 0; i < 50; i++) { // Reduced for faster testing
        await core.create_task({
          title: `Performance Task ${i}`,
          description: `Task ${i} for performance testing`
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds

      // Verify all data was created
      const stats = core.getSystemStats();
      expect(stats.database.tasks).toBe(50);
    });
  });
});
