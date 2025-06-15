import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MemoryPickleCoreTestUtils, TestDataFactory } from './utils/testHelpers';
import { MemoryPickleCore } from '../src/core/MemoryPickleCore';

/**
 * Edge Cases and Error Handling Tests
 * 
 * This file tests error scenarios, edge cases, and boundary conditions
 * that are often missed in basic testing but critical for production reliability.
 */
describe('Edge Cases and Error Handling', () => {
  let core: MemoryPickleCore;

  beforeEach(async () => {
    TestDataFactory.reset();
    const scenario = await MemoryPickleCoreTestUtils.createWithScenario('basic');
    core = scenario.core;
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle empty and whitespace-only inputs', async () => {
      // Empty project name
      await expect(core.create_project({ name: '' })).rejects.toThrow('Project name is required');
      await expect(core.create_project({ name: '   ' })).rejects.toThrow('Project name is required');
      
      // Empty task title
      await expect(core.create_task({ title: '' })).rejects.toThrow('Task title is required');
      await expect(core.create_task({ title: '   ' })).rejects.toThrow('Task title is required');
      
      // Empty memory content
      await expect(core.remember_this({ content: '' })).rejects.toThrow('Memory content is required');
      await expect(core.remember_this({ content: '   ' })).rejects.toThrow('Memory content is required');
    });

    it('should handle null and undefined inputs gracefully', async () => {
      // Null inputs
      await expect(core.create_project({ name: null })).rejects.toThrow('Project name is required');
      await expect(core.create_task({ title: null })).rejects.toThrow('Task title is required');
      await expect(core.remember_this({ content: null })).rejects.toThrow('Memory content is required');
      
      // Undefined inputs
      await expect(core.create_project({ name: undefined })).rejects.toThrow('Project name is required');
      await expect(core.create_task({ title: undefined })).rejects.toThrow('Task title is required');
      await expect(core.remember_this({ content: undefined })).rejects.toThrow('Memory content is required');
    });

    it('should handle very long inputs', async () => {
      const longString = 'a'.repeat(10000);
      
      // Should handle long project names (trimmed)
      const projectResponse = await core.create_project({ 
        name: longString,
        description: longString 
      });
      expect(projectResponse.content[0].text).toContain('Project Created Successfully');
      
      // Should handle long task titles
      const taskResponse = await core.create_task({ 
        title: longString,
        description: longString 
      });
      expect(taskResponse.content[0].text).toContain('Task Created Successfully');
      
      // Should handle long memory content
      const memoryResponse = await core.remember_this({ 
        content: longString,
        title: longString 
      });
      expect(memoryResponse.content[0].text).toContain('Memory Saved');
    });

    it('should handle special characters and unicode', async () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const unicode = '🚀 测试 العربية русский 日本語';
      
      // Project with special characters
      const projectResponse = await core.create_project({ 
        name: `Test ${specialChars} ${unicode}`,
        description: `Description with ${unicode}` 
      });
      expect(projectResponse.content[0].text).toContain('Project Created Successfully');
      
      // Task with unicode
      const taskResponse = await core.create_task({ 
        title: `Task ${unicode}`,
        description: `Description ${specialChars}` 
      });
      expect(taskResponse.content[0].text).toContain('Task Created Successfully');
      
      // Memory with mixed content
      const memoryResponse = await core.remember_this({ 
        content: `Memory content ${specialChars} ${unicode}`,
        title: `Memory ${unicode}` 
      });
      expect(memoryResponse.content[0].text).toContain('Memory Saved');
    });
  });

  describe('Resource Not Found Edge Cases', () => {
    it('should handle non-existent project IDs gracefully', async () => {
      const fakeProjectId = 'proj_nonexistent_12345';
      
      await expect(core.get_project_status({ project_id: fakeProjectId }))
        .rejects.toThrow(`Project not found: ${fakeProjectId}`);
      
      await expect(core.update_project({ 
        project_id: fakeProjectId, 
        name: 'Updated Name' 
      })).rejects.toThrow(`Project not found: ${fakeProjectId}`);
      
      await expect(core.create_task({ 
        title: 'Test Task',
        project_id: fakeProjectId 
      })).rejects.toThrow(`Project not found: ${fakeProjectId}`);
    });

    it('should handle non-existent task IDs gracefully', async () => {
      const fakeTaskId = 'task_nonexistent_12345';
      
      await expect(core.update_task({ 
        task_id: fakeTaskId, 
        title: 'Updated Title' 
      })).rejects.toThrow(`Task not found: ${fakeTaskId}`);
    });

    it('should handle missing current project gracefully', async () => {
      // Create a core with no current project set
      const emptyScenario = await MemoryPickleCoreTestUtils.createWithScenario('empty');
      const emptyCore = emptyScenario.core;
      
      // Should show "no projects" message when no projects exist
      const statusResponse = await emptyCore.get_project_status({});
      expect(statusResponse.content[0].text).toContain('No Projects Found');
      
      // Should require project_id when no current project
      await expect(emptyCore.create_task({ 
        title: 'Test Task' 
      })).rejects.toThrow('Project ID is required');
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle zero and negative progress values', async () => {
      // Create a task first
      const taskResponse = await core.create_task({ 
        title: 'Progress Test Task' 
      });
      
      // Extract task ID from response (this is a bit hacky but works for testing)
      const taskIdMatch = taskResponse.content[0].text.match(/\*\*ID:\*\* (task_[a-zA-Z0-9_]+)/);
      expect(taskIdMatch).toBeTruthy();
      const taskId = taskIdMatch[1];
      
      // Test zero progress
      const zeroProgressResponse = await core.update_task({ 
        task_id: taskId, 
        progress: 0 
      });
      expect(zeroProgressResponse.content[0].text).toContain('Progress: 0%');
      
      // Test 100% progress
      const fullProgressResponse = await core.update_task({ 
        task_id: taskId, 
        progress: 100 
      });
      expect(fullProgressResponse.content[0].text).toContain('Progress: 100%');
      
      // Test negative progress (should be handled gracefully)
      const negativeProgressResponse = await core.update_task({ 
        task_id: taskId, 
        progress: -10 
      });
      expect(negativeProgressResponse.content[0].text).toContain('Task Updated Successfully');
      
      // Test over 100% progress
      const overProgressResponse = await core.update_task({ 
        task_id: taskId, 
        progress: 150 
      });
      expect(overProgressResponse.content[0].text).toContain('Task Updated Successfully');
    });

    it('should handle empty search queries', async () => {
      // Empty query should return recent memories
      const emptyQueryResponse = await core.recall_context({ query: '' });
      expect(emptyQueryResponse.content[0].text).toContain('Recalled Memories');
      
      // Whitespace query
      const whitespaceQueryResponse = await core.recall_context({ query: '   ' });
      expect(whitespaceQueryResponse.content[0].text).toContain('Recalled Memories');
      
      // No query at all
      const noQueryResponse = await core.recall_context({});
      expect(noQueryResponse.content[0].text).toContain('Recalled Memories');
    });

    it('should handle extreme limit values for recall', async () => {
      // Zero limit
      const zeroLimitResponse = await core.recall_context({ limit: 0 });
      expect(zeroLimitResponse.content[0].text).toContain('No Memories Found');
      
      // Negative limit (should be handled gracefully)
      const negativeLimitResponse = await core.recall_context({ limit: -5 });
      expect(negativeLimitResponse.content[0].text).toContain('No Memories Found');
      
      // Very large limit
      const largeLimitResponse = await core.recall_context({ limit: 10000 });
      expect(largeLimitResponse.content[0].text).toContain('Recalled Memories');
    });
  });

  describe('Data Consistency Edge Cases', () => {
    it('should handle rapid successive operations', async () => {
      // Create multiple projects rapidly
      const projectPromises = Array.from({ length: 5 }, (_, i) => 
        core.create_project({ 
          name: `Rapid Project ${i}`,
          description: `Created rapidly ${i}` 
        })
      );
      
      const projectResponses = await Promise.all(projectPromises);
      projectResponses.forEach((response, i) => {
        expect(response.content[0].text).toContain(`Rapid Project ${i}`);
      });
      
      // Create multiple tasks rapidly
      const taskPromises = Array.from({ length: 5 }, (_, i) => 
        core.create_task({ 
          title: `Rapid Task ${i}`,
          description: `Created rapidly ${i}` 
        })
      );
      
      const taskResponses = await Promise.all(taskPromises);
      taskResponses.forEach((response, i) => {
        expect(response.content[0].text).toContain(`Rapid Task ${i}`);
      });
    });

    it('should handle operations with missing optional fields', async () => {
      // Project with minimal data
      const minimalProjectResponse = await core.create_project({ name: 'Minimal Project' });
      expect(minimalProjectResponse.content[0].text).toContain('Minimal Project');
      
      // Task with minimal data
      const minimalTaskResponse = await core.create_task({ title: 'Minimal Task' });
      expect(minimalTaskResponse.content[0].text).toContain('Minimal Task');
      
      // Memory with minimal data
      const minimalMemoryResponse = await core.remember_this({ content: 'Minimal memory content' });
      expect(minimalMemoryResponse.content[0].text).toContain('Memory Saved');
    });
  });

  describe('Complex Workflow Edge Cases', () => {
    it('should handle project completion workflow edge cases', async () => {
      // Create project
      const projectResponse = await core.create_project({ 
        name: 'Completion Test Project' 
      });
      
      // Create multiple tasks
      const task1Response = await core.create_task({ 
        title: 'Task 1',
        description: 'First task' 
      });
      const task2Response = await core.create_task({ 
        title: 'Task 2',
        description: 'Second task' 
      });
      
      // Extract task IDs
      const task1Id = task1Response.content[0].text.match(/\*\*ID:\*\* (task_[a-zA-Z0-9_]+)/)[1];
      const task2Id = task2Response.content[0].text.match(/\*\*ID:\*\* (task_[a-zA-Z0-9_]+)/)[1];
      
      // Complete one task
      await core.update_task({ task_id: task1Id, completed: true });
      
      // Check project status (should show 50% completion)
      const statusResponse = await core.get_project_status({});
      expect(statusResponse.content[0].text).toContain('Completion:** 50%');
      
      // Complete second task
      await core.update_task({ task_id: task2Id, completed: true });
      
      // Check project status (should show 100% completion)
      const finalStatusResponse = await core.get_project_status({});
      expect(finalStatusResponse.content[0].text).toContain('Completion:** 100%');
    });
  });
});
