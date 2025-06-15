import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MemoryPickleCoreTestUtils, TestDataFactory, PerformanceHelpers } from './utils/testHelpers';
import { MemoryPickleCore } from '../src/core/MemoryPickleCore';

/**
 * Performance Testing Suite
 * 
 * Tests performance characteristics, scalability, and resource usage
 * to ensure the system performs well under various load conditions.
 */
describe('Performance Testing', () => {
  let core: MemoryPickleCore;

  beforeEach(async () => {
    TestDataFactory.reset();
    const scenario = await MemoryPickleCoreTestUtils.createWithScenario('basic');
    core = scenario.core;
  });

  describe('Operation Performance Benchmarks', () => {
    it('should create projects within acceptable time limits', async () => {
      const { duration } = await PerformanceHelpers.measureExecutionTime(async () => {
        return await core.create_project({
          name: 'Performance Test Project',
          description: 'Testing project creation performance'
        });
      });

      // Project creation should complete within 100ms
      PerformanceHelpers.expectExecutionTimeUnder(duration, 100);
      expect(duration).toBeLessThan(100);
    });

    it('should create tasks within acceptable time limits', async () => {
      const { duration } = await PerformanceHelpers.measureExecutionTime(async () => {
        return await core.create_task({
          title: 'Performance Test Task',
          description: 'Testing task creation performance'
        });
      });

      // Task creation should complete within 100ms
      PerformanceHelpers.expectExecutionTimeUnder(duration, 100);
      expect(duration).toBeLessThan(100);
    });

    it('should store memories within acceptable time limits', async () => {
      const { duration } = await PerformanceHelpers.measureExecutionTime(async () => {
        return await core.remember_this({
          content: 'Performance test memory content',
          title: 'Performance Test Memory'
        });
      });

      // Memory storage should complete within 100ms
      PerformanceHelpers.expectExecutionTimeUnder(duration, 100);
      expect(duration).toBeLessThan(100);
    });

    it('should retrieve project status within acceptable time limits', async () => {
      const { duration } = await PerformanceHelpers.measureExecutionTime(async () => {
        return await core.get_project_status({});
      });

      // Status retrieval should complete within 50ms
      PerformanceHelpers.expectExecutionTimeUnder(duration, 50);
      expect(duration).toBeLessThan(50);
    });

    it('should search memories within acceptable time limits', async () => {
      // First add some memories to search through
      await core.remember_this({ content: 'Searchable content 1', title: 'Memory 1' });
      await core.remember_this({ content: 'Searchable content 2', title: 'Memory 2' });
      await core.remember_this({ content: 'Different content', title: 'Memory 3' });

      const { duration } = await PerformanceHelpers.measureExecutionTime(async () => {
        return await core.recall_context({
          query: 'searchable',
          limit: 10
        });
      });

      // Memory search should complete within 50ms
      PerformanceHelpers.expectExecutionTimeUnder(duration, 50);
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Scalability Testing', () => {
    it('should handle multiple projects efficiently', async () => {
      const projectCount = 50;
      
      const { duration } = await PerformanceHelpers.measureExecutionTime(async () => {
        const promises = Array.from({ length: projectCount }, (_, i) =>
          core.create_project({
            name: `Scale Test Project ${i}`,
            description: `Project ${i} for scalability testing`
          })
        );
        return await Promise.all(promises);
      });

      // Creating 50 projects should complete within 2 seconds
      PerformanceHelpers.expectExecutionTimeUnder(duration, 2000);
      expect(duration).toBeLessThan(2000);

      // Verify all projects were created by checking the database directly
      const database = core.getDatabase();
      expect(database.projects.length).toBeGreaterThanOrEqual(50);
    });

    it('should handle multiple tasks efficiently', async () => {
      const taskCount = 100;
      
      const { duration } = await PerformanceHelpers.measureExecutionTime(async () => {
        const promises = Array.from({ length: taskCount }, (_, i) =>
          core.create_task({
            title: `Scale Test Task ${i}`,
            description: `Task ${i} for scalability testing`
          })
        );
        return await Promise.all(promises);
      });

      // Creating 100 tasks should complete within 3 seconds
      PerformanceHelpers.expectExecutionTimeUnder(duration, 3000);
      expect(duration).toBeLessThan(3000);
    });

    it('should handle large memory datasets efficiently', async () => {
      const memoryCount = 100;
      
      // Create many memories
      const { duration: creationDuration } = await PerformanceHelpers.measureExecutionTime(async () => {
        const promises = Array.from({ length: memoryCount }, (_, i) =>
          core.remember_this({
            content: `Scale test memory content ${i}. This is a longer piece of content to test memory storage performance with more realistic data sizes.`,
            title: `Scale Test Memory ${i}`,
            importance: i % 2 === 0 ? 'high' : 'medium'
          })
        );
        return await Promise.all(promises);
      });

      // Creating 100 memories should complete within 3 seconds
      PerformanceHelpers.expectExecutionTimeUnder(creationDuration, 3000);

      // Test search performance with large dataset
      const { duration: searchDuration } = await PerformanceHelpers.measureExecutionTime(async () => {
        return await core.recall_context({
          query: 'scale test',
          limit: 20
        });
      });

      // Searching through 100 memories should complete within 100ms
      PerformanceHelpers.expectExecutionTimeUnder(searchDuration, 100);
    });
  });

  describe('Memory Usage Testing', () => {
    it('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform many operations
      for (let i = 0; i < 50; i++) {
        await core.create_project({ name: `Memory Test Project ${i}` });
        await core.create_task({ title: `Memory Test Task ${i}` });
        await core.remember_this({ 
          content: `Memory test content ${i}`,
          title: `Memory Test ${i}` 
        });
        await core.get_project_status({});
        await core.recall_context({ query: 'memory test', limit: 5 });
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Concurrent Operations Testing', () => {
    it('should handle concurrent project creation safely', async () => {
      const concurrentCount = 20;
      
      const { duration } = await PerformanceHelpers.measureExecutionTime(async () => {
        // Create projects concurrently
        const promises = Array.from({ length: concurrentCount }, (_, i) =>
          core.create_project({
            name: `Concurrent Project ${i}`,
            description: `Project ${i} created concurrently`
          })
        );
        return await Promise.all(promises);
      });

      // Concurrent creation should complete within 1 second
      PerformanceHelpers.expectExecutionTimeUnder(duration, 1000);
      
      // Verify all projects were created successfully by checking the database directly
      const database = core.getDatabase();
      expect(database.projects.length).toBeGreaterThanOrEqual(20);
    });

    it('should handle concurrent task operations safely', async () => {
      const concurrentCount = 30;
      
      const { duration } = await PerformanceHelpers.measureExecutionTime(async () => {
        // Mix of task creation and updates
        const promises = Array.from({ length: concurrentCount }, async (_, i) => {
          if (i % 2 === 0) {
            return await core.create_task({
              title: `Concurrent Task ${i}`,
              description: `Task ${i} created concurrently`
            });
          } else {
            // Create a task first, then update it
            const taskResponse = await core.create_task({
              title: `Concurrent Task ${i}`,
              description: `Task ${i} to be updated`
            });
            const taskId = taskResponse.content[0].text.match(/\*\*ID:\*\* (task_[a-zA-Z0-9_]+)/)?.[1];
            if (taskId) {
              return await core.update_task({
                task_id: taskId,
                progress: 50
              });
            }
            return taskResponse;
          }
        });
        return await Promise.all(promises);
      });

      // Concurrent operations should complete within 2 seconds
      PerformanceHelpers.expectExecutionTimeUnder(duration, 2000);
    });

    it('should handle concurrent memory operations safely', async () => {
      const concurrentCount = 25;
      
      const { duration } = await PerformanceHelpers.measureExecutionTime(async () => {
        // Mix of memory creation and retrieval
        const promises = Array.from({ length: concurrentCount }, async (_, i) => {
          if (i % 3 === 0) {
            return await core.remember_this({
              content: `Concurrent memory content ${i}`,
              title: `Concurrent Memory ${i}`
            });
          } else {
            return await core.recall_context({
              query: 'concurrent',
              limit: 5
            });
          }
        });
        return await Promise.all(promises);
      });

      // Concurrent memory operations should complete within 1.5 seconds
      PerformanceHelpers.expectExecutionTimeUnder(duration, 1500);
    });
  });

  describe('Large Data Handling', () => {
    it('should handle large project descriptions efficiently', async () => {
      const largeDescription = 'A'.repeat(10000); // 10KB description
      
      const { duration } = await PerformanceHelpers.measureExecutionTime(async () => {
        return await core.create_project({
          name: 'Large Description Project',
          description: largeDescription
        });
      });

      // Should handle large descriptions within 200ms
      PerformanceHelpers.expectExecutionTimeUnder(duration, 200);
    });

    it('should handle large memory content efficiently', async () => {
      const largeContent = 'Memory content line.\n'.repeat(1000); // ~20KB content
      
      const { duration } = await PerformanceHelpers.measureExecutionTime(async () => {
        return await core.remember_this({
          content: largeContent,
          title: 'Large Content Memory'
        });
      });

      // Should handle large content within 200ms
      PerformanceHelpers.expectExecutionTimeUnder(duration, 200);
    });

    it('should search through large content efficiently', async () => {
      // Create memories with large content
      const largeContent = 'Searchable keyword in large content. '.repeat(500);
      await core.remember_this({
        content: largeContent,
        title: 'Large Searchable Memory'
      });

      const { duration } = await PerformanceHelpers.measureExecutionTime(async () => {
        return await core.recall_context({
          query: 'searchable keyword',
          limit: 10
        });
      });

      // Should search large content within 100ms
      PerformanceHelpers.expectExecutionTimeUnder(duration, 100);
    });
  });
});
