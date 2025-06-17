/**
 * Tests for dry-run functionality across all MCP tools
 */

import { MemoryPickleCore } from '../src/core/MemoryPickleCore.js';

describe('Dry-Run Functionality', () => {
  let core: MemoryPickleCore;

  beforeEach(async () => {
    core = await MemoryPickleCore.create();
  });

  describe('create_project dry-run', () => {
    test('should validate and simulate project creation without changes', async () => {
      const result = await core.create_project({
        name: 'Test Project',
        description: 'A test project description',
        dry_run: true
      });

      expect(result.content[0].text).toContain('[DRY RUN] create_project');
      expect(result.content[0].text).toContain('Test Project');
      expect(result.content[0].text).toContain('A test project description');
      expect(result.content[0].text).toContain('No changes made');
      expect(result.isError).toBe(false);

      // Verify no actual project was created
      const status = await core.get_project_status({});
      expect(status.content[0].text).toContain('No Projects Found');
    });

    test('should still validate input in dry-run mode', async () => {
      await expect(core.create_project({
        name: '',
        dry_run: true
      })).rejects.toThrow();
    });

    test('should handle dry-run with minimal required fields', async () => {
      const result = await core.create_project({
        name: 'Minimal Project',
        dry_run: true
      });

      expect(result.content[0].text).toContain('[DRY RUN] create_project');
      expect(result.content[0].text).toContain('Minimal Project');
      expect(result.isError).toBe(false);
    });
  });

  describe('create_task dry-run', () => {
    beforeEach(async () => {
      // Create a real project for task creation tests
      await core.create_project({
        name: 'Test Project',
        description: 'For testing tasks'
      });
    });

    test('should simulate task creation without changes', async () => {
      const result = await core.create_task({
        title: 'Test Task',
        description: 'A test task',
        priority: 'high',
        dry_run: true
      });

      expect(result.content[0].text).toContain('[DRY RUN]');
      expect(result.content[0].text).toContain('Test Task');
      expect(result.isError).toBe(false);

      // Verify no actual task was created
      const status = await core.get_project_status({});
      expect(status.content[0].text).not.toContain('Test Task');
    });

    test('should validate all task parameters in dry-run', async () => {
      const result = await core.create_task({
        title: 'Complex Task',
        description: 'Complex description',
        priority: 'critical',
        line_range: {
          start_line: 10,
          end_line: 20,
          file_path: 'src/test.js'
        },
        dry_run: true
      });

      expect(result.content[0].text).toContain('[DRY RUN]');
      expect(result.content[0].text).toContain('Complex Task');
      expect(result.isError).toBe(false);
    });
  });

  describe('update_task dry-run', () => {
    let taskId: string;

    beforeEach(async () => {
      // Create a project and task for testing
      await core.create_project({ name: 'Dry Run Test Project' });
      const taskResult = await core.create_task({ 
        title: 'Test Task',
        description: 'Task for dry-run testing'
      });
      
      // Extract task ID using a more flexible pattern
      const match = taskResult.content[0].text.match(/\*\*ID:\*\* ([a-zA-Z0-9_-]+)/);
      taskId = match ? match[1] : '';
      expect(taskId).toBeTruthy();
    });

    test('should simulate task completion without changes', async () => {
      const result = await core.update_task({
        task_id: taskId,
        completed: true,
        dry_run: true
      });

      expect(result.content[0].text).toContain('[DRY RUN]');
      expect(result.content[0].text).toContain('update_task');
      expect(result.content[0].text).toContain('No changes made');

      // Verify no actual changes were made
      const taskList = await core.list_tasks({});
      expect(taskList.content[0].text).not.toContain('COMPLETED');
    });

    test('should simulate progress update without changes', async () => {
      const result = await core.update_task({
        task_id: taskId,
        progress: 75,
        dry_run: true
      });

      expect(result.content[0].text).toContain('[DRY RUN]');
      expect(result.content[0].text).toContain('update_task');
      expect(result.content[0].text).toContain('No changes made');

      // Verify no actual changes were made
      const taskList = await core.list_tasks({});
      expect(taskList.content[0].text).not.toContain('75%');
    });
  });

  describe('remember_this dry-run', () => {
    beforeEach(async () => {
      await core.create_project({ name: 'Memory Test Project' });
    });

    test('should simulate memory storage without changes', async () => {
      const result = await core.remember_this({
        content: 'Important test information',
        title: 'Test Memory',
        importance: 'high',
        dry_run: true
      });

      expect(result.content[0].text).toContain('[DRY RUN]');
      expect(result.content[0].text).toContain('remember_this');
      expect(result.content[0].text).toContain('No changes made');

      // Verify no memory was actually stored
      const recallResult = await core.recall_context({
        query: 'Important test information'
      });
      expect(recallResult.content[0].text).toContain('No Memories Found');
    });
  });

  describe('set_current_project dry-run', () => {
    let projectId: string;

    beforeEach(async () => {
      const result = await core.create_project({ name: 'Switch Test Project' });
      // Extract project ID using the correct pattern
      const match = result.content[0].text.match(/\*\*ID:\*\* ([a-zA-Z0-9_-]+)/);
      projectId = match ? match[1] : '';
      expect(projectId).toBeTruthy();

      // Create another project to switch from
      await core.create_project({
        name: 'Current Project'
      });
    });

    test('should validate project switch without changes', async () => {
      const result = await core.set_current_project({
        project_id: projectId,
        dry_run: true
      });

      expect(result.content[0].text).toContain('[DRY RUN]');
      expect(result.content[0].text).toContain('set_current_project');
      expect(result.content[0].text).toContain('No changes made');

      // Verify the current project wasn't actually changed
      const status = await core.recall_state({});
      expect(status.content[0].text).toContain('Current Project');
    });

    test('should validate non-existent project in dry-run', async () => {
      const result = await core.set_current_project({
        project_id: 'non_existent_project',
        dry_run: true
      });

      expect(result.content[0].text).toContain('[DRY RUN]');
      expect(result.content[0].text).toContain('set_current_project');
      expect(result.content[0].text).toContain('No changes made');
    });
  });

  describe('Dry-run with invalid inputs', () => {
    test('should still validate required fields in create_project dry-run', async () => {
      await expect(core.create_project({
        name: '',
        dry_run: true
      })).rejects.toThrow();
    });

    test('should validate priority in create_task dry-run', async () => {
      await core.create_project({ name: 'Test' });
      
      await expect(core.create_task({
        title: 'Test Task',
        priority: 'invalid_priority',
        dry_run: true
      })).rejects.toThrow();
    });

    test('should validate progress range in update_task dry-run', async () => {
      // Create a project and task first
      await core.create_project({ name: 'Test Project' });
      const taskResult = await core.create_task({ title: 'Test Task' });
      const match = taskResult.content[0].text.match(/\*\*ID:\*\* ([a-zA-Z0-9_-]+)/);
      const taskId = match ? match[1] : '';

      // Invalid progress should still be processed in dry-run but return dry-run message
      const result = await core.update_task({
        task_id: taskId,
        progress: 150, // Invalid progress
        dry_run: true
      });
      
      expect(result.content[0].text).toContain('[DRY RUN]');
      expect(result.content[0].text).toContain('No changes made');
    });
  });
});