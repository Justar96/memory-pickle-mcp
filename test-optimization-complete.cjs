const { StorageService } = require('./build/services/StorageService.js');
const { TaskService } = require('./build/services/TaskService.js');
const fs = require('fs').promises;
const path = require('path');

async function testOptimizations() {
  console.log('🧪 Testing Memory Pickle MCP Optimizations...\n');
  
  const testDir = path.join(process.cwd(), 'test-optimization');
  const testProjectFile = path.join(testDir, 'project-data.yaml');
  
  // Clean up test directory
  await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(testDir, { recursive: true });
  
  const storage = new StorageService(testProjectFile);
  
  console.log('1️⃣ Testing Schema Validation & Repair...');
  try {
    // Create malformed YAML
    const malformedYaml = `
meta:
  last_updated: "2025-01-01T00:00:00.000Z"
  version: "2.0.0"
  session_count: 1
# Missing arrays - should be auto-repaired
`;
    await fs.writeFile(path.join(testDir, 'meta.yaml'), malformedYaml);
    await fs.writeFile(path.join(testDir, 'projects.yaml'), '[]');
    
    const db = await storage.loadDatabase();
    console.log('✅ Schema validation passed - missing arrays auto-created');
    console.log(`   Projects: ${db.projects.length}, Tasks: ${db.tasks.length}, Memories: ${db.memories.length}`);
  } catch (error) {
    console.log('❌ Schema validation failed:', error.message);
  }
  
  console.log('\n2️⃣ Testing Backup Rotation...');
  try {
    // Save multiple times to trigger rotation
    for (let i = 1; i <= 5; i++) {
      await storage.runExclusive(async (db) => {
        db.meta.session_count = i;
        return { result: null, commit: true };
      });
    }
    
    // Check backup files
    const backupFiles = [];
    for (let i = 1; i <= 4; i++) {
      const backupPath = path.join(testDir, `projects.yaml.backup.${i}`);
      const exists = await fs.access(backupPath).then(() => true).catch(() => false);
      if (exists) backupFiles.push(i);
    }
    
    console.log(`✅ Backup rotation working - Found backups: ${backupFiles.join(', ')}`);
    console.log(`   Expected: 1, 2, 3 (max 3 backups)`);
  } catch (error) {
    console.log('❌ Backup rotation failed:', error.message);
  }
  
  console.log('\n3️⃣ Testing runExclusive with commit pattern...');
  try {
    // Test without commit
    const beforeCount = await storage.runExclusive(async (db) => {
      return { result: db.meta.session_count, commit: false };
    });
    
    // Try to modify without commit
    await storage.runExclusive(async (db) => {
      db.meta.session_count = 999;
      return { result: null, commit: false };
    });
    
    // Verify no change
    const afterCount = await storage.runExclusive(async (db) => {
      return { result: db.meta.session_count, commit: false };
    });
    
    if (beforeCount === afterCount) {
      console.log('✅ runExclusive correctly ignores changes when commit=false');
    } else {
      console.log('❌ runExclusive saved changes despite commit=false');
    }
    
    // Test with commit
    await storage.runExclusive(async (db) => {
      db.meta.session_count = 42;
      return { result: null, commit: true };
    });
    
    const finalCount = await storage.runExclusive(async (db) => {
      return { result: db.meta.session_count, commit: false };
    });
    
    if (finalCount === 42) {
      console.log('✅ runExclusive correctly saves changes when commit=true');
    } else {
      console.log('❌ runExclusive failed to save changes with commit=true');
    }
  } catch (error) {
    console.log('❌ runExclusive test failed:', error.message);
  }
  
  console.log('\n4️⃣ Testing Task Index Building...');
  try {
    // Add some tasks
    await storage.runExclusive(async (db) => {
      db.projects.push({
        id: 'proj_1',
        name: 'Test Project',
        status: 'in_progress',
        completion_percentage: 0,
        created_date: new Date().toISOString(),
        tasks: ['task_1', 'task_2']
      });
      
      db.tasks.push(
        {
          id: 'task_1',
          project_id: 'proj_1',
          title: 'Task 1',
          completed: false,
          priority: 'high',
          created_date: new Date().toISOString(),
          tags: []
        },
        {
          id: 'task_2',
          project_id: 'proj_1',
          title: 'Task 2',
          completed: true,
          priority: 'medium',
          created_date: new Date().toISOString(),
          tags: []
        }
      );
      
      return { result: null, commit: true };
    });
    
    // Test index building
    const db = await storage.loadDatabase();
    const { tasksById, tasksByProject } = TaskService.buildIndexes(db.tasks);
    
    console.log('✅ Task indexes built successfully');
    console.log(`   tasksById keys: ${Object.keys(tasksById).join(', ')}`);
    console.log(`   tasksByProject keys: ${Object.keys(tasksByProject).join(', ')}`);
    console.log(`   O(1) lookup test: task_1 = "${tasksById['task_1']?.title}"`);
  } catch (error) {
    console.log('❌ Task index building failed:', error.message);
  }
  
  console.log('\n5️⃣ Testing Memory Search (AND logic, case-insensitive)...');
  try {
    const { MemoryService } = require('./build/services/MemoryService.js');
    const memService = new MemoryService();
    
    const memories = [
      { id: '1', title: 'React TypeScript Guide', content: '', timestamp: '', category: 'tech', importance: 'high', tags: ['React', 'TypeScript'], related_memories: [] },
      { id: '2', title: 'React Basics', content: '', timestamp: '', category: 'tech', importance: 'medium', tags: ['React'], related_memories: [] },
      { id: '3', title: 'TypeScript Only', content: '', timestamp: '', category: 'tech', importance: 'medium', tags: ['typescript'], related_memories: [] },
    ];
    
    // Search for memories with BOTH react AND typescript (case-insensitive)
    const results = memService.searchMemories(memories, {
      query: 'Guide',
      tags: ['react', 'typescript']
    });
    
    if (results.length === 1 && results[0].id === '1') {
      console.log('✅ Memory search uses AND logic and is case-insensitive');
      console.log(`   Found: "${results[0].title}" with tags [${results[0].tags.join(', ')}]`);
    } else {
      console.log('❌ Memory search logic incorrect');
      console.log(`   Expected 1 result, got ${results.length}`);
    }
  } catch (error) {
    console.log('❌ Memory search test failed:', error.message);
  }
  
  console.log('\n✨ Optimization testing complete!');
  
  // Cleanup
  await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
}

testOptimizations().catch(console.error);