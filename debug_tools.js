import { MemoryPickleCore } from './build/core/MemoryPickleCore.js';

async function debugTools() {
  try {
    console.log('Creating MemoryPickleCore instance...');
    const core = await MemoryPickleCore.create();
    
    console.log('Testing with hardcoded IDs (like the failing tests)...');
    
    // Test set_current_project with non-existent ID (simulating test failure)
    console.log('\nTesting set_current_project with non-existent project_id...');
    try {
      const result = await core.set_current_project({ project_id: 'proj_test_123' });
      console.log('Unexpected success:', result.content[0].text);
    } catch (error) {
      console.log('Expected error:', error.message);
    }
    
    // Test update_task with non-existent ID (simulating test failure)
    console.log('\nTesting update_task with non-existent task_id...');
    try {
      const result = await core.update_task({ task_id: 'task_test_123', progress: 50 });
      console.log('Unexpected success:', result.content[0].text);
    } catch (error) {
      console.log('Expected error:', error.message);
    }
    
    console.log('\nNow testing with realistic scenario...');
    // Create a project first
    await core.create_project({ name: 'Test Project' });
    const db1 = core.getDatabase();
    const project = db1.projects[0];
    console.log('Created project ID:', project.id);
    
    // Create a task
    await core.create_task({ title: 'Test Task' });
    const db2 = core.getDatabase();
    const task = db2.tasks[0];
    console.log('Created task ID:', task.id);
    
    // Test set_current_project with real ID
    console.log('\nTesting set_current_project with real project_id...');
    const result1 = await core.set_current_project({ project_id: project.id });
    console.log('Success:', result1.content[0].text.substring(0, 50) + '...');
    
    // Test update_task with real ID
    console.log('\nTesting update_task with real task_id...');
    const result2 = await core.update_task({ task_id: task.id, progress: 50 });
    console.log('Success:', result2.content[0].text.substring(0, 50) + '...');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugTools();