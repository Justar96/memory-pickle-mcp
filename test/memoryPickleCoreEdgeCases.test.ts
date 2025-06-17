/**
 * Edge case tests for MemoryPickleCore to achieve complete coverage
 */

import { MemoryPickleCore } from '../src/core/MemoryPickleCore.js';

describe('MemoryPickleCore - Edge Cases and Error Paths', () => {
  let core: MemoryPickleCore;

  beforeEach(async () => {
    core = await MemoryPickleCore.create();
  });

  describe('Error handling and validation', () => {
    test('should handle null arguments in create_project', async () => {
      await expect(core.create_project(null)).rejects.toThrow('Invalid arguments - expected object');
    });

    test('should handle undefined arguments in create_project', async () => {
      await expect(core.create_project(undefined)).rejects.toThrow('Invalid arguments - expected object');
    });

    test('should handle missing name in create_project', async () => {
      await expect(core.create_project({})).rejects.toThrow("Missing required field 'name'");
      await expect(core.create_project({ name: null })).rejects.toThrow("Missing required field 'name'");
      await expect(core.create_project({ name: undefined })).rejects.toThrow("Missing required field 'name'");
    });

    test('should handle empty name in create_project', async () => {
      await expect(core.create_project({ name: '' })).rejects.toThrow("Field 'name' cannot be empty");
      await expect(core.create_project({ name: '   ' })).rejects.toThrow("Field 'name' cannot be empty");
    });

    test('should handle name too long in create_project', async () => {
      const longName = 'a'.repeat(201);
      await expect(core.create_project({ name: longName })).rejects.toThrow('Project name cannot exceed 200 characters');
    });

    test('should handle description too long in create_project', async () => {
      const longDescription = 'a'.repeat(20001);
      await expect(core.create_project({ 
        name: 'Test', 
        description: longDescription 
      })).rejects.toThrow('Project description cannot exceed 20000 characters');
    });

    test('should handle invalid status in create_project', async () => {
      await expect(core.create_project({ 
        name: 'Test', 
        status: 'invalid_status' 
      })).rejects.toThrow('Invalid project status');
    });
  });

  describe('Project management edge cases', () => {
    test('should handle duplicate project names', async () => {
      await core.create_project({ name: 'Duplicate Project' });
      
      // Should allow duplicate names (they get unique IDs)
      const result = await core.create_project({ name: 'Duplicate Project' });
      expect(result.content[0].text).toContain('Duplicate Project');
    });

    test('should handle setting current project to non-existent project', async () => {
      await expect(core.set_current_project({ 
        project_id: 'non_existent_project' 
      })).rejects.toThrow();
    });

    test('should handle get_project_status with non-existent project ID', async () => {
      await expect(core.get_project_status({ project_id: 'non_existent' }))
        .rejects.toThrow('Project not found: non_existent');
    });

    test('should handle project creation with special characters', async () => {
      const result = await core.create_project({ 
        name: 'Project with @#$%^&*() characters!',
        description: 'Description with\nnewlines\tand\ttabs'
      });
      expect(result.content[0].text).toContain('Project with');
    });
  });

  describe('Task management edge cases', () => {
    beforeEach(async () => {
      await core.create_project({ name: 'Test Project' });
    });

    test('should handle create_task with no current project', async () => {
      const coreWithoutProject = await MemoryPickleCore.create();
      await expect(coreWithoutProject.create_task({ 
        title: 'Test Task' 
      })).rejects.toThrow();
    });

    test('should handle task creation with invalid priority', async () => {
      await expect(core.create_task({ 
        title: 'Test Task',
        priority: 'invalid_priority'
      })).rejects.toThrow();
    });

    test('should handle task update with non-existent task', async () => {
      await expect(core.update_task({ 
        task_id: 'non_existent_task',
        completed: true
      })).rejects.toThrow();
    });

    test('should handle task update with invalid progress', async () => {
      const taskResult = await core.create_task({ title: 'Test Task' });
      const taskId = taskResult.content[0].text.match(/ID: ([a-zA-Z0-9_-]+)/)?.[1];
      
      await expect(core.update_task({ 
        task_id: taskId!,
        progress: -10
      })).rejects.toThrow();

      await expect(core.update_task({ 
        task_id: taskId!,
        progress: 150
      })).rejects.toThrow();
    });

    test('should handle empty task title', async () => {
      await expect(core.create_task({ title: '' })).rejects.toThrow();
      await expect(core.create_task({ title: '   ' })).rejects.toThrow();
    });

    test('should handle very long task title', async () => {
      const longTitle = 'a'.repeat(1001);
      await expect(core.create_task({ title: longTitle })).rejects.toThrow();
    });

    test('should handle circular parent-child relationships', async () => {
      const parentResult = await core.create_task({ title: 'Parent Task' });
      const parentId = parentResult.content[0].text.match(/ID: ([a-zA-Z0-9_-]+)/)?.[1];
      
      const childResult = await core.create_task({ 
        title: 'Child Task',
        parent_id: parentId
      });
      const childId = childResult.content[0].text.match(/ID: ([a-zA-Z0-9_-]+)/)?.[1];
      
      // Try to make parent a child of child (circular dependency)
      await expect(core.update_task({
        task_id: parentId!,
        parent_id: childId
      })).rejects.toThrow();
    });
  });

  describe('Memory management edge cases', () => {
    test('should handle remember_this with empty content', async () => {
      await expect(core.remember_this({ content: '' })).rejects.toThrow();
      await expect(core.remember_this({ content: '   ' })).rejects.toThrow();
    });

    test('should handle remember_this with very long content', async () => {
      const longContent = 'a'.repeat(50001);
      await expect(core.remember_this({ 
        content: longContent 
      })).rejects.toThrow();
    });

    test('should handle remember_this with invalid importance', async () => {
      await expect(core.remember_this({ 
        content: 'Test memory',
        importance: 'invalid_importance'
      })).rejects.toThrow();
    });

    test('should handle recall_context with no memories', async () => {
      const result = await core.recall_context({ query: 'nonexistent' });
      expect(result.content[0].text).toContain('No Memories Found');
    });

    test('should handle recall_context with empty query', async () => {
      const result = await core.recall_context({ query: '' });
      expect(result.content).toBeDefined();
    });
  });

  describe('Session and handoff edge cases', () => {
    test('should handle generate_handoff_summary with no data', async () => {
      const result = await core.generate_handoff_summary({});
      expect(result.content[0].text).toContain('Session Summary');
    });

    test('should handle generate_handoff_summary with compact format', async () => {
      await core.create_project({ name: 'Test Project' });
      const result = await core.generate_handoff_summary({ format: 'compact' });
      expect(result.content[0].text).toContain('Session Summary');
    });

    test('should handle generate_handoff_summary for specific project', async () => {
      const projectResult = await core.create_project({ name: 'Specific Project' });
      const projectId = projectResult.content[0].text.match(/\*\*ID:\*\* ([a-zA-Z0-9_-]+)/)?.[1];
      
      const result = await core.generate_handoff_summary({ project_id: projectId });
      expect(result.content[0].text).toContain('Specific Project');
    });

    test('should handle generate_handoff_summary for non-existent project', async () => {
      await expect(core.generate_handoff_summary({ project_id: 'non_existent_project' }))
        .rejects.toThrow('Project not found: non_existent_project');
    });
  });

  describe('Data integrity and concurrency', () => {
    test('should handle rapid concurrent operations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        core.create_project({ name: `Concurrent Project ${i}` })
      );
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.content[0].text).toContain('Project Created Successfully');
      });
    });

    test('should maintain data consistency across operations', async () => {
      await core.create_project({ name: 'Consistency Test' });
      await core.create_task({ title: 'Task 1' });
      await core.create_task({ title: 'Task 2' });
      await core.remember_this({ content: 'Important info' });
      
      const status = await core.get_project_status({});
      expect(status.content[0].text).toContain('Consistency Test');
      expect(status.content[0].text).toContain('Task 1');
      expect(status.content[0].text).toContain('Task 2');
    });
  });

  describe('Resource cleanup and shutdown', () => {
    test('should handle operations during shutdown', async () => {
      // Force shutdown state
      (core as any).isShuttingDown = true;
      
      await expect(core.create_project({ name: 'Test' })).rejects.toThrow('System is shutting down');
    });

    test('should handle corrupted data gracefully', async () => {
      // Simulate corrupted task index
      (core as any).taskIndex = null;
      
      // Should still work without crashing
      const result = await core.get_project_status({});
      expect(result.content).toBeDefined();
    });
  });

  describe('Line range validation', () => {
    beforeEach(async () => {
      await core.create_project({ name: 'Line Range Test' });
    });

    test('should handle invalid line ranges in create_task', async () => {
      await expect(core.create_task({
        title: 'Test Task',
        line_range: {
          start_line: 10,
          end_line: 5  // end before start
        }
      })).rejects.toThrow();
    });

    test('should handle negative line numbers', async () => {
      await expect(core.create_task({
        title: 'Test Task',
        line_range: {
          start_line: -1,
          end_line: 5
        }
      })).rejects.toThrow();
    });

    test('should handle zero line numbers', async () => {
      await expect(core.create_task({
        title: 'Test Task',
        line_range: {
          start_line: 0,
          end_line: 5
        }
      })).rejects.toThrow();
    });

    test('should handle missing line range fields', async () => {
      await expect(core.create_task({
        title: 'Test Task',
        line_range: {
          start_line: 5
          // missing end_line
        }
      })).rejects.toThrow();
    });
  });

  describe('Complex workflow edge cases', () => {
    test('should handle complete project lifecycle', async () => {
      // Create project
      const project = await core.create_project({ 
        name: 'Lifecycle Test', 
        description: 'Full lifecycle test' 
      });
      
      // Extract project ID from response
      const projectMatch = project.content[0].text.match(/\*\*ID:\*\* ([a-zA-Z0-9_-]+)/);
      const projectId = projectMatch ? projectMatch[1] : '';
      expect(projectId).toBeTruthy();
      
      // Create task
      const task = await core.create_task({ 
        title: 'Test Task',
        description: 'Test task description'
      });
      
      // Extract task ID from response
      const taskMatch = task.content[0].text.match(/\*\*ID:\*\* ([a-zA-Z0-9_-]+)/);
      const taskId = taskMatch ? taskMatch[1] : '';
      expect(taskId).toBeTruthy();
      
      // Update task with proper task_id
      const update = await core.update_task({ 
        task_id: taskId,
        progress: 50,
        title: 'Updated Test Task'
      });
      expect(update.content[0].text).toContain('Updated');
      
      // Complete workflow
      const summary = await core.generate_handoff_summary({});
      expect(summary.content[0].text).toContain('Session Summary');
    });

    test('should handle project switching and context maintenance', async () => {
      // Create first project
      const project1 = await core.create_project({ name: 'Project 1' });
      const project1Match = project1.content[0].text.match(/\*\*ID:\*\* ([a-zA-Z0-9_-]+)/);
      const project1Id = project1Match ? project1Match[1] : '';
      expect(project1Id).toBeTruthy();
      
      // Create second project
      const project2 = await core.create_project({ name: 'Project 2' });
      const project2Match = project2.content[0].text.match(/\*\*ID:\*\* ([a-zA-Z0-9_-]+)/);
      const project2Id = project2Match ? project2Match[1] : '';
      expect(project2Id).toBeTruthy();
      
      // Switch to first project with proper project_id
      const switch1 = await core.set_current_project({ project_id: project1Id });
      expect(switch1.content[0].text).toContain('Project 1');
      
      // Switch to second project
      const switch2 = await core.set_current_project({ project_id: project2Id });
      expect(switch2.content[0].text).toContain('Project 2');
    });
  });
});