import { MemoryPickleCore } from '../src/core/MemoryPickleCore.js';
import { MemoryPickleCoreTestUtils, TestDataFactory } from './utils/testHelpers.js';

describe('Enhanced Handoff Functionality', () => {
  let core: MemoryPickleCore;
  let testData: any;

  beforeEach(async () => {
    // Reset test data factory counters to ensure consistent IDs
    TestDataFactory.reset();

    // Create MemoryPickleCore with realistic test scenario
    const scenario = await MemoryPickleCoreTestUtils.createWithScenario('basic');
    core = scenario.core;
    testData = scenario.testData;

    // Reset session activity to start fresh for each test
    core.resetSessionActivity();
  });

  describe('Session Activity Tracking', () => {
    it('should track tool usage and session activity', async () => {
      // Perform various activities
      await core.create_task({
        title: 'Test task 1',
        project_id: testData.projects[0].id
      });

      await core.create_task({
        title: 'Test task 2',
        project_id: testData.projects[0].id
      });

      await core.remember_this({
        title: 'Important note',
        content: 'This is a test memory'
      });

      // Get session activity
      const sessionActivity = core.getSessionActivity();

      expect(sessionActivity.tasksCreated).toHaveLength(2);
      expect(sessionActivity.memoriesCreated).toHaveLength(1);
      expect(sessionActivity.toolUsageCount.create_task).toBeGreaterThanOrEqual(2);
      expect(sessionActivity.toolUsageCount.remember_this).toBeGreaterThanOrEqual(1);
      expect(sessionActivity.sessionDuration).toBeGreaterThanOrEqual(0);
    });

    it('should track task completion', async () => {
      // Create a task
      await core.create_task({
        title: 'Task to complete',
        project_id: testData.projects[0].id
      });

      // Get the created task ID from session activity
      const sessionActivity1 = core.getSessionActivity();
      expect(sessionActivity1.tasksCreated).toHaveLength(1);
      const taskId = sessionActivity1.tasksCreated[0];

      // Complete the task
      await core.update_task({
        task_id: taskId,
        completed: true
      });

      // Check final session activity
      const sessionActivity = core.getSessionActivity();

      expect(sessionActivity.tasksCreated).toContain(taskId);
      expect(sessionActivity.tasksUpdated).toContain(taskId);
      expect(sessionActivity.tasksCompleted).toContain(taskId);
    });

    it('should track project creation and switching', async () => {
      // Create a new project
      await core.create_project({
        name: 'New Test Project',
        description: 'A project created during testing'
      });

      // Get the created project ID from session activity
      const sessionActivity1 = core.getSessionActivity();
      expect(sessionActivity1.projectsCreated).toHaveLength(1);
      const projectId = sessionActivity1.projectsCreated[0];

      // Switch to the new project
      await core.set_current_project({
        project_id: projectId
      });

      // Check final session activity
      const sessionActivity = core.getSessionActivity();

      expect(sessionActivity.projectsCreated).toContain(projectId);
      expect(sessionActivity.projectSwitches).toContain(projectId);
      expect(sessionActivity.lastActiveProject).toBe(projectId);
    });
  });

  describe('Enhanced Handoff Summary', () => {
    it('should generate enhanced handoff summary with session activity', async () => {
      // Perform various activities to create session data
      await core.create_task({
        title: 'Feature implementation',
        description: 'Implement new user authentication',
        project_id: testData.projects[0].id
      });

      await core.create_task({
        title: 'Bug fix',
        description: 'Fix login validation issue',
        project_id: testData.projects[0].id
      });

      await core.remember_this({
        title: 'Architecture decision',
        content: 'Decided to use JWT tokens for authentication',
        importance: 'high'
      });

      // Complete one task - get the task ID from session activity
      const sessionActivity1 = core.getSessionActivity();
      const bugFixTaskId = sessionActivity1.tasksCreated.find(id => {
        const task = core.getDatabase().tasks.find(t => t.id === id);
        return task?.title === 'Bug fix';
      });
      expect(bugFixTaskId).toBeDefined();

      await core.update_task({
        task_id: bugFixTaskId,
        completed: true
      });

      // Generate handoff summary
      const handoffResponse = await core.generate_handoff_summary({
        project_id: testData.projects[0].id
      });

      const summaryText = handoffResponse.content[0].text;

      // Verify enhanced session information is included
      expect(summaryText).toContain('[HANDOFF] Enhanced Session Summary');
      expect(summaryText).toContain('Session Duration:');
      expect(summaryText).toContain('Session Activity:');
      expect(summaryText).toContain('[SESSION] What Happened This Session');
      
      // Verify session activity details
      expect(summaryText).toContain('**Tasks Created:** 2');
      expect(summaryText).toContain('**Tasks Completed:** 1');
      expect(summaryText).toContain('**Notes/Memories Created:** 1');
      expect(summaryText).toContain('**Tool Usage:**');
      
      // Verify specific items are mentioned
      expect(summaryText).toContain('Feature implementation');
      expect(summaryText).toContain('✅ Bug fix');
      expect(summaryText).toContain('Architecture decision');
    });

    it('should handle empty session activity gracefully', async () => {
      // Generate handoff summary without any session activity
      const handoffResponse = await core.generate_handoff_summary();

      const summaryText = handoffResponse.content[0].text;

      // Should still contain basic session info
      expect(summaryText).toContain('[HANDOFF] Enhanced Session Summary');
      expect(summaryText).toContain('Session Duration:');
      expect(summaryText).toContain('Session Activity:** 1 tool calls'); // Just the handoff call itself
      
      // Should not contain session activity section since nothing happened
      expect(summaryText).not.toContain('[SESSION] What Happened This Session');
    });

    it('should show tool usage statistics', async () => {
      // Use various tools multiple times
      await core.create_task({ title: 'Task 1', project_id: testData.projects[0].id });
      await core.create_task({ title: 'Task 2', project_id: testData.projects[0].id });
      await core.remember_this({ title: 'Note 1', content: 'Content 1' });
      await core.remember_this({ title: 'Note 2', content: 'Content 2' });
      await core.remember_this({ title: 'Note 3', content: 'Content 3' });

      // Generate handoff summary
      const handoffResponse = await core.generate_handoff_summary();
      const summaryText = handoffResponse.content[0].text;

      // Verify tool usage is tracked (note: actual counts may be higher due to test setup)
      expect(summaryText).toContain('create_task:');
      expect(summaryText).toContain('remember_this:');
      expect(summaryText).toContain('generate_handoff_summary: 1x');
    });

    it('should limit displayed items to prevent overwhelming output', async () => {
      // Create many tasks to test limiting
      for (let i = 1; i <= 5; i++) {
        await core.create_task({
          title: `Task ${i}`,
          project_id: testData.projects[0].id
        });
      }

      // Generate handoff summary
      const handoffResponse = await core.generate_handoff_summary();
      const summaryText = handoffResponse.content[0].text;

      // Should show first 3 tasks and indicate there are more
      expect(summaryText).toContain('**Tasks Created:** 5');
      expect(summaryText).toContain('Task 1');
      expect(summaryText).toContain('Task 2');
      expect(summaryText).toContain('Task 3');
      expect(summaryText).toContain('... and 2 more');
    });
  });

  describe('Session State Management', () => {
    it('should maintain session state across multiple operations', async () => {
      // Perform a series of operations
      await core.create_project({ name: 'Session Test Project' });

      // Get project ID from session activity
      const sessionActivity1 = core.getSessionActivity();
      const projectId = sessionActivity1.projectsCreated[0];

      await core.set_current_project({ project_id: projectId });
      await core.create_task({ title: 'Session Task 1' });
      await core.create_task({ title: 'Session Task 2' });

      // Get task ID from session activity
      const sessionActivity2 = core.getSessionActivity();
      const taskId = sessionActivity2.tasksCreated[0]; // First task created
      await core.update_task({ task_id: taskId, completed: true });
      
      await core.remember_this({ title: 'Session Note', content: 'Important session information' });

      // Verify all activities are tracked
      const sessionActivity = core.getSessionActivity();
      
      expect(sessionActivity.projectsCreated).toHaveLength(1);
      expect(sessionActivity.projectSwitches).toHaveLength(1);
      expect(sessionActivity.tasksCreated).toHaveLength(2);
      expect(sessionActivity.tasksCompleted).toHaveLength(1);
      expect(sessionActivity.memoriesCreated).toHaveLength(1);
      
      // Verify tool usage counts (note: test setup creates a project, so counts may be higher)
      expect(sessionActivity.toolUsageCount.create_project).toBeGreaterThanOrEqual(1);
      expect(sessionActivity.toolUsageCount.set_current_project).toBeGreaterThanOrEqual(1);
      expect(sessionActivity.toolUsageCount.create_task).toBeGreaterThanOrEqual(2);
      expect(sessionActivity.toolUsageCount.update_task).toBeGreaterThanOrEqual(1);
      expect(sessionActivity.toolUsageCount.remember_this).toBeGreaterThanOrEqual(1);
    });
  });
});
