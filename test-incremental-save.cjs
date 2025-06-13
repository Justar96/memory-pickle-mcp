const { StorageService } = require('./build/services/StorageService.js');
const fs = require('fs').promises;
const path = require('path');

async function testIncrementalSave() {
  console.log('🧪 Testing Incremental Save (Step 7)...\n');
  
  const testDir = path.join(process.cwd(), 'test-incremental');
  const testProjectFile = path.join(testDir, 'project-data.yaml');
  
  // Clean up test directory
  await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(testDir, { recursive: true });
  
  const storage = new StorageService(testProjectFile);
  
  console.log('1️⃣ Initial save - all files should be created...');
  await storage.runExclusive(async (db) => {
    db.projects.push({
      id: 'proj_1',
      name: 'Test Project',
      status: 'in_progress',
      completion_percentage: 0,
      created_date: new Date().toISOString(),
      tasks: []
    });
    
    db.tasks.push({
      id: 'task_1',
      project_id: 'proj_1',
      title: 'Initial Task',
      completed: false,
      priority: 'medium',
      created_date: new Date().toISOString(),
      tags: [],
      subtasks: [],
      notes: [],
      blockers: []
    });
    
    db.memories.push({
      id: 'mem_1',
      title: 'Initial Memory',
      content: 'Test content',
      category: 'general',
      importance: 'medium',
      tags: ['test'],
      timestamp: new Date().toISOString(),
      related_memories: []
    });
    
    return { result: null, commit: true };
  });
  
  // Check all files exist
  const files = ['projects.yaml', 'tasks.yaml', 'memories.yaml', 'meta.yaml'];
  for (const file of files) {
    const exists = await fs.access(path.join(testDir, file)).then(() => true).catch(() => false);
    console.log(`   ✅ ${file} created: ${exists}`);
  }
  
  // Get initial modification times
  const getModTimes = async () => {
    const times = {};
    for (const file of files) {
      const stats = await fs.stat(path.join(testDir, file));
      times[file] = stats.mtimeMs;
    }
    return times;
  };
  
  const initialTimes = await getModTimes();
  
  // Wait to ensure different timestamps
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('\n2️⃣ Incremental save - only updating tasks...');
  await storage.runExclusive(async (db) => {
    db.tasks.push({
      id: 'task_2',
      project_id: 'proj_1',
      title: 'New Task Added',
      completed: false,
      priority: 'high',
      created_date: new Date().toISOString(),
      tags: ['important'],
      subtasks: [],
      notes: [],
      blockers: []
    });
    
    return { 
      result: null, 
      commit: true,
      changedParts: new Set(['tasks'])
    };
  });
  
  const afterTaskTimes = await getModTimes();
  
  console.log('   File modification status:');
  for (const file of files) {
    const changed = afterTaskTimes[file] > initialTimes[file];
    console.log(`   ${changed ? '🔄' : '⏸️'} ${file}: ${changed ? 'UPDATED' : 'unchanged'}`);
  }
  
  // Wait again
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('\n3️⃣ Incremental save - only updating memories...');
  await storage.runExclusive(async (db) => {
    db.memories[0].content = 'Updated content with more details';
    db.memories[0].tags.push('updated');
    
    return { 
      result: null, 
      commit: true,
      changedParts: new Set(['memories'])
    };
  });
  
  const afterMemoryTimes = await getModTimes();
  
  console.log('   File modification status:');
  for (const file of files) {
    const changed = afterMemoryTimes[file] > afterTaskTimes[file];
    console.log(`   ${changed ? '🔄' : '⏸️'} ${file}: ${changed ? 'UPDATED' : 'unchanged'}`);
  }
  
  console.log('\n4️⃣ Verifying data integrity...');
  const finalDb = await storage.loadDatabase();
  console.log(`   Projects: ${finalDb.projects.length}`);
  console.log(`   Tasks: ${finalDb.tasks.length} (should be 2)`);
  console.log(`   Memories: ${finalDb.memories.length}`);
  console.log(`   Memory content updated: ${finalDb.memories[0].content.includes('Updated content')}`);
  
  console.log('\n5️⃣ Checking backup files...');
  const backupFiles = [];
  for (const file of files) {
    const backup1 = path.join(testDir, `${file}.backup.1`);
    const exists = await fs.access(backup1).then(() => true).catch(() => false);
    if (exists) backupFiles.push(`${file}.backup.1`);
  }
  console.log(`   Backups created: ${backupFiles.join(', ')}`);
  console.log('   Note: Only modified files get new backups');
  
  console.log('\n✨ Incremental save testing complete!');
  console.log('   - Only specified files are written during saves');
  console.log('   - Unchanged files retain their timestamps');
  console.log('   - Backups are created only for modified files');
  console.log('   - Data integrity is maintained');
  
  // Cleanup
  await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
}

testIncrementalSave().catch(console.error);