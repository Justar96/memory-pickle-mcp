/**
 * Integration Tests for Project Workflows
 * 
 * Tests complete project management workflows
 */

import { MemoryPickleCore } from '../../../src/core/MemoryPickleCore.js';

describe('Project Workflows Integration', () => {
  let core: MemoryPickleCore;

  beforeEach(async () => {
    core = await MemoryPickleCore.create();
    // Track instance for cleanup
    (global as any).trackCoreInstance(core);
  });

  describe('Complete Project Lifecycle', () => {
    it('should handle project creation to completion workflow', async () => {
      // Create project
      const projectResponse = await core.create_project({
        name: 'E-commerce Platform',
        description: 'Building a modern e-commerce platform with React and Node.js'
      });

      expect(projectResponse.content[0].text).toContain('Project Created Successfully');
      expect(projectResponse.content[0].text).toContain('E-commerce Platform');

      // Create tasks
      await core.create_task({
        title: 'Build React Frontend',
        description: 'Create responsive UI components',
        priority: 'high'
      });

      await core.create_task({
        title: 'Develop Node.js API',
        description: 'Build RESTful API',
        priority: 'critical'
      });

      await core.create_task({
        title: 'Write Integration Tests',
        description: 'Comprehensive testing suite',
        priority: 'medium'
      });

      // Check project status
      const finalStatus = await core.recall_state({});
      expect(finalStatus.content[0].text).toContain('E-commerce Platform');
      expect(finalStatus.content[0].text).toContain('3/3 active');
    });

    it('should track project completion percentage correctly', async () => {
      // Create project with tasks
      await core.create_project({
        name: 'Completion Tracking Project',
        description: 'Testing completion percentage calculations'
      });

      const task1 = await core.create_task({ title: 'Task 1' });
      const task2 = await core.create_task({ title: 'Task 2' });
      const task3 = await core.create_task({ title: 'Task 3' });

      // Complete first task
      const task1Id = task1.content[0].text.match(/\*\*ID:\*\* ([^\n]+)/)?.[1];
      await core.update_task({
        task_id: task1Id!,
        completed: true
      });

      let status = await core.recall_state({});
      expect(status.content[0].text).toContain('2/3 active'); // 2 active, 1 completed

      // Complete second task
      const task2Id = task2.content[0].text.match(/\*\*ID:\*\* ([^\n]+)/)?.[1];
      await core.update_task({
        task_id: task2Id!,
        completed: true
      });

      status = await core.recall_state({});
      expect(status.content[0].text).toContain('1/3 active'); // 1 active, 2 completed
    });
  });

  describe('Multi-Project Session Management', () => {
    it('should handle multiple projects with context switching', async () => {
      // Create first project
      const project1 = await core.create_project({
        name: 'Mobile App',
        description: 'iOS and Android mobile application'
      });

      const project1Id = project1.content[0].text.match(/\*\*ID:\*\* ([^\n]+)/)?.[1];

      // Create tasks for first project
      await core.create_task({
        title: 'Design UI Mockups',
        priority: 'high'
      });

      await core.create_task({
        title: 'Implement Authentication',
        priority: 'critical'
      });

      // Create second project
      const project2 = await core.create_project({
        name: 'Web Dashboard',
        description: 'Admin dashboard for data visualization'
      });

      const project2Id = project2.content[0].text.match(/\*\*ID:\*\* ([^\n]+)/)?.[1];

      // Create task for second project
      await core.create_task({
        title: 'Setup Analytics Dashboard',
        priority: 'medium'
      });

      // Switch back to first project
      await core.set_current_project({ project_id: project1Id! });

      // Verify context switch worked
      const switchedStatus = await core.recall_state({});
      expect(switchedStatus.content[0].text).toContain('Mobile App');
      expect(switchedStatus.content[0].text).toContain('3/3 active'); // All 3 tasks are active across both projects

      // Verify specific project status queries work
      const project2Status = await core.recall_state({ project_id: project2Id! });
      expect(project2Status.content[0].text).toContain('Web Dashboard');
      expect(project2Status.content[0].text).toContain('Tasks'); // Just check it contains task information
    });
  });
}); 