import { MemoryPickleCore } from '../src/core/MemoryPickleCore.js';
import { MemoryPickleCoreTestUtils, TestDataFactory } from './utils/testHelpers.js';

describe('Simple Enhanced Handoff Test', () => {
  let core: MemoryPickleCore;
  let testData: any;

  beforeEach(async () => {
    TestDataFactory.reset();
    const scenario = await MemoryPickleCoreTestUtils.createWithScenario('basic');
    core = scenario.core;
    testData = scenario.testData;
    core.resetSessionActivity();
  });

  it('should track basic session activity', async () => {
    // Create a task
    await core.create_task({
      title: 'Simple test task',
      project_id: testData.projects[0].id
    });

    // Create a memory
    await core.remember_this({
      title: 'Test memory',
      content: 'This is test content'
    });

    // Check session activity
    const sessionActivity = core.getSessionActivity();
    
    expect(sessionActivity.tasksCreated.length).toBeGreaterThan(0);
    expect(sessionActivity.memoriesCreated.length).toBeGreaterThan(0);
    expect(sessionActivity.toolUsageCount.create_task).toBeGreaterThan(0);
    expect(sessionActivity.toolUsageCount.remember_this).toBeGreaterThan(0);
  });

  it('should generate enhanced handoff summary', async () => {
    // Create some activity
    await core.create_task({
      title: 'Handoff test task',
      project_id: testData.projects[0].id
    });

    await core.remember_this({
      title: 'Handoff test memory',
      content: 'Important information for handoff'
    });

    // Generate handoff summary
    const handoffResponse = await core.generate_handoff_summary();
    const summaryText = handoffResponse.content[0].text;

    // Verify enhanced features are present
    expect(summaryText).toContain('[HANDOFF] Enhanced Session Summary');
    expect(summaryText).toContain('Session Duration:');
    expect(summaryText).toContain('Session Activity:');
    
    // Should contain session activity section since we did things
    expect(summaryText).toContain('[SESSION] What Happened This Session');
    expect(summaryText).toContain('Tasks Created:');
    expect(summaryText).toContain('Notes/Memories Created:');
    expect(summaryText).toContain('Tool Usage:');
  });

  it('should handle empty session gracefully', async () => {
    // Generate handoff without any activity
    const handoffResponse = await core.generate_handoff_summary();
    const summaryText = handoffResponse.content[0].text;

    // Should contain basic info
    expect(summaryText).toContain('[HANDOFF] Enhanced Session Summary');
    expect(summaryText).toContain('Session Duration:');
    
    // Should not contain session activity section since nothing happened
    expect(summaryText).not.toContain('[SESSION] What Happened This Session');
  });

  it('should reset session activity correctly', async () => {
    // Create some activity
    await core.create_task({
      title: 'Task before reset',
      project_id: testData.projects[0].id
    });

    // Verify activity is tracked
    let sessionActivity = core.getSessionActivity();
    expect(sessionActivity.tasksCreated.length).toBeGreaterThan(0);

    // Reset session activity
    core.resetSessionActivity();

    // Verify activity is cleared
    sessionActivity = core.getSessionActivity();
    expect(sessionActivity.tasksCreated).toHaveLength(0);
    expect(sessionActivity.memoriesCreated).toHaveLength(0);
    expect(Object.keys(sessionActivity.toolUsageCount)).toHaveLength(0);
  });

  it('should track task completion', async () => {
    // Create a task
    await core.create_task({
      title: 'Task to complete',
      project_id: testData.projects[0].id
    });

    // Get the task ID from session activity
    const sessionActivity1 = core.getSessionActivity();
    const taskId = sessionActivity1.tasksCreated[0];

    // Complete the task
    await core.update_task({
      task_id: taskId,
      completed: true
    });

    // Check that completion is tracked
    const sessionActivity2 = core.getSessionActivity();
    expect(sessionActivity2.tasksCompleted).toContain(taskId);
    expect(sessionActivity2.tasksUpdated).toContain(taskId);
  });
});
