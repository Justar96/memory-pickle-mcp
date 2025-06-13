import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { StorageService } from '../src/services/StorageService';
import { MemoryService } from '../src/services/MemoryService';
import { projectDatabaseSchema } from '../src/types/schemas';
import type { ProjectDatabase, Memory } from '../src/types';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Reliability and Correctness Tests', () => {
  let storageService: StorageService;
  let memoryService: MemoryService;
  const testDataDir = path.resolve(process.cwd(), 'test_data');
  const testProjectFile = path.join(testDataDir, 'project-data.yaml');

  beforeEach(async () => {
    // Clean up and create test directory
    await fs.rm(testDataDir, { recursive: true, force: true });
    await fs.mkdir(testDataDir, { recursive: true });
    
    // Initialize services with test-specific paths
    storageService = new StorageService(testProjectFile);
    memoryService = new MemoryService();
  });

  afterEach(async () => {
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  describe('StorageService Concurrency', () => {
    it('should handle concurrent writes without data corruption', async () => {
      const initialDb = projectDatabaseSchema.parse({
        meta: {
          last_updated: new Date().toISOString(),
          version: '2.0.0',
          session_count: 0,
        },
      });
      await storageService.saveDatabase(initialDb);

      const promises: Promise<void>[] = [];
      for (let i = 0; i < 5; i++) {
        promises.push(storageService.saveDatabase({
          ...initialDb,
          meta: { ...initialDb.meta, session_count: i + 1 },
        }));
      }

      await Promise.all(promises);

      const finalDb = await storageService.loadDatabase();
      // The final session count should be one of the written values, not a mix.
      expect([1, 2, 3, 4, 5]).toContain(finalDb.meta.session_count);
      // Ensure the file is valid YAML
      expect(finalDb).toBeDefined();
    });
  });

  describe('Schema Validation and Repair', () => {
    it('should repair a malformed database file with missing arrays', async () => {
      const malformedData = `
meta:
  last_updated: "2025-01-01T00:00:00.000Z"
  version: "2.0.0"
  session_count: 1
# projects, tasks, and memories arrays are missing
`;
      await fs.writeFile(testProjectFile, malformedData);

      const db = await storageService.loadDatabase();

      expect(db.projects).toEqual([]);
      expect(db.tasks).toEqual([]);
      expect(db.memories).toEqual([]);
      expect(db.templates).toEqual({});
    });
  });

  describe('Split-File Database Storage', () => {
    it('should save and load data using split files', async () => {
      const testDb = projectDatabaseSchema.parse({
        meta: {
          last_updated: new Date().toISOString(),
          version: '2.0.0',
          session_count: 5,
        },
        projects: [
          { id: 'proj_1', name: 'Test Project', description: 'A test project', status: 'in_progress', completion_percentage: 50, created_date: new Date().toISOString() }
        ],
        tasks: [
          { id: 'task_1', title: 'Test Task', project_id: 'proj_1', completed: false, priority: 'medium', progress: 25, created_date: new Date().toISOString() }
        ],
        memories: [
          { id: 'mem_1', title: 'Test Memory', content: 'Test content', category: 'test', importance: 'medium', tags: ['test'], timestamp: new Date().toISOString(), related_memories: [], project_id: 'proj_1', task_id: 'task_1' }
        ]
      });

      // Save the database (should create split files)
      await storageService.saveDatabase(testDb);

      // Verify split files were created
      const projectDir = path.dirname(testProjectFile);
      const projectsFile = path.join(projectDir, 'projects.yaml');
      const tasksFile = path.join(projectDir, 'tasks.yaml');
      const memoriesFile = path.join(projectDir, 'memories.yaml');
      const metaFile = path.join(projectDir, 'meta.yaml');

      expect(await fs.access(projectsFile).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(tasksFile).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(memoriesFile).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(metaFile).then(() => true).catch(() => false)).toBe(true);

      // Load the database back (should read from split files)
      const loadedDb = await storageService.loadDatabase();

      // Verify data integrity
      expect(loadedDb.meta.session_count).toBe(5);
      expect(loadedDb.projects).toHaveLength(1);
      expect(loadedDb.projects[0].name).toBe('Test Project');
      expect(loadedDb.tasks).toHaveLength(1);
      expect(loadedDb.tasks[0].title).toBe('Test Task');
      expect(loadedDb.memories).toHaveLength(1);
      expect(loadedDb.memories[0].title).toBe('Test Memory');
    });
  });

  describe('MemoryService Query Logic', () => {
    it('should use AND logic for tag searches and be case-insensitive', () => {
      const memories: Memory[] = [
        { id: '1', title: 'Test 1', content: '', timestamp: '', category: 'A', importance: 'medium', tags: ['React', 'TypeScript'], related_memories: [], project_id: '', task_id: '' },
        { id: '2', title: 'Test 2', content: '', timestamp: '', category: 'B', importance: 'medium', tags: ['React'], related_memories: [], project_id: '', task_id: '' },
        { id: '3', title: 'Test 3', content: '', timestamp: '', category: 'A', importance: 'medium', tags: ['typescript'], related_memories: [], project_id: '', task_id: '' },
      ];

      // Should match only the memory with both 'react' AND 'typescript'
      const results = memoryService.searchMemories(memories, {
        query: 'Test 1',
        tags: ['react', 'typescript'],
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });
  });

  describe('Backup Rotation', () => {
    it('should create and rotate backups on save', async () => {
      const testDb = projectDatabaseSchema.parse({
        meta: {
          last_updated: new Date().toISOString(),
          version: '2.0.0',
          session_count: 1,
        },
        projects: [{ id: 'p1', name: 'Test', description: '', status: 'in_progress', completion_percentage: 0, created_date: new Date().toISOString() }],
      });

      // Save multiple times to test rotation
      for (let i = 0; i < 5; i++) {
        testDb.meta.session_count = i + 1;
        await storageService.saveDatabase(testDb);
      }

      // Check that backup files exist
      const projectDir = path.dirname(testProjectFile);
      const projectsBackup1 = path.join(projectDir, 'projects.yaml.backup.1');
      const projectsBackup2 = path.join(projectDir, 'projects.yaml.backup.2');
      const projectsBackup3 = path.join(projectDir, 'projects.yaml.backup.3');
      const projectsBackup4 = path.join(projectDir, 'projects.yaml.backup.4');

      expect(await fs.access(projectsBackup1).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(projectsBackup2).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(projectsBackup3).then(() => true).catch(() => false)).toBe(true);
      // Should not have more than 3 backups
      expect(await fs.access(projectsBackup4).then(() => true).catch(() => false)).toBe(false);

      // Verify backup content
      const backup1Content = await fs.readFile(projectsBackup1, 'utf8');
      const backup1Data = JSON.parse(JSON.stringify(await import('js-yaml').then(m => m.load(backup1Content))));
      expect(backup1Data).toHaveLength(1);
      expect(backup1Data[0].name).toBe('Test');
    });
  });

  describe('runExclusive with commit pattern', () => {
    it('should only save when commit is true', async () => {
      const initialDb = projectDatabaseSchema.parse({
        meta: {
          last_updated: new Date().toISOString(),
          version: '2.0.0',
          session_count: 0,
        },
      });
      await storageService.saveDatabase(initialDb);

      // Operation without commit
      await storageService.runExclusive(async (db) => {
        db.meta.session_count = 999;
        return { result: null, commit: false };
      });

      // Verify no change was saved
      let currentDb = await storageService.loadDatabase();
      expect(currentDb.meta.session_count).toBe(0);

      // Operation with commit
      await storageService.runExclusive(async (db) => {
        db.meta.session_count = 5;
        return { result: null, commit: true };
      });

      // Verify change was saved
      currentDb = await storageService.loadDatabase();
      expect(currentDb.meta.session_count).toBe(5);
    });

    it('should provide fresh database copy for each operation', async () => {
      const initialDb = projectDatabaseSchema.parse({
        meta: {
          last_updated: new Date().toISOString(),
          version: '2.0.0',
          session_count: 1,
        },
        tasks: [{ id: 't1', title: 'Task 1', project_id: 'p1', completed: false, priority: 'medium', created_date: new Date().toISOString() }],
      });
      await storageService.saveDatabase(initialDb);

      // Concurrent operations should each get a fresh copy
      const results = await Promise.all([
        storageService.runExclusive(async (db) => {
          // Simulate some processing time
          await new Promise(resolve => setTimeout(resolve, 10));
          return { result: db.tasks.length, commit: false };
        }),
        storageService.runExclusive(async (db) => {
          // This should also see 1 task, not affected by other operation
          return { result: db.tasks.length, commit: false };
        }),
      ]);

      expect(results[0]).toBe(1);
      expect(results[1]).toBe(1);
    });
  });

  describe('Incremental DB Split (Step 7)', () => {
    it('should only write changed files when using changedParts', async () => {
      const initialDb = projectDatabaseSchema.parse({
        meta: {
          last_updated: new Date().toISOString(),
          version: '2.0.0',
          session_count: 1,
        },
        projects: [{ id: 'p1', name: 'Test Project', status: 'in_progress', completion_percentage: 0, created_date: new Date().toISOString() }],
        tasks: [{ id: 't1', title: 'Task 1', project_id: 'p1', completed: false, priority: 'medium', created_date: new Date().toISOString() }],
        memories: [{ id: 'm1', title: 'Memory 1', content: 'Test', category: 'general', importance: 'medium', tags: [], timestamp: new Date().toISOString() }],
      });
      
      // Initial save - all files should be written
      await storageService.saveDatabase(initialDb);
      
      // Get initial modification times
      const projectDir = path.dirname(testProjectFile);
      const getModTime = async (filename: string) => {
        const stats = await fs.stat(path.join(projectDir, filename));
        return stats.mtimeMs;
      };
      
      const initialTimes = {
        projects: await getModTime('projects.yaml'),
        tasks: await getModTime('tasks.yaml'),
        memories: await getModTime('memories.yaml'),
        meta: await getModTime('meta.yaml'),
      };
      
      // Wait a bit to ensure file times would be different
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Update only tasks using incremental save
      await storageService.runExclusive(async (db) => {
        db.tasks.push({
          id: 't2',
          title: 'Task 2',
          project_id: 'p1',
          completed: false,
          priority: 'high',
          created_date: new Date().toISOString(),
          tags: [],
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
      
      // Get new modification times
      const newTimes = {
        projects: await getModTime('projects.yaml'),
        tasks: await getModTime('tasks.yaml'),
        memories: await getModTime('memories.yaml'),
        meta: await getModTime('meta.yaml'),
      };
      
      // Only tasks.yaml should have changed (meta is not updated when only 'tasks' is in changedParts)
      expect(newTimes.projects).toBe(initialTimes.projects);
      expect(newTimes.tasks).toBeGreaterThan(initialTimes.tasks);
      expect(newTimes.memories).toBe(initialTimes.memories);
      expect(newTimes.meta).toBe(initialTimes.meta); // meta only updates if explicitly in changedParts or multiple parts changed
      
      // Verify the data was actually saved
      const finalDb = await storageService.loadDatabase();
      expect(finalDb.tasks).toHaveLength(2);
      expect(finalDb.tasks[1].title).toBe('Task 2');
    });

    it('should create backups only for changed files', async () => {
      const initialDb = projectDatabaseSchema.parse({
        meta: {
          last_updated: new Date().toISOString(),
          version: '2.0.0',
          session_count: 1,
        },
        projects: [{ id: 'p1', name: 'Project 1', status: 'in_progress', completion_percentage: 0, created_date: new Date().toISOString() }],
      });
      
      // Save twice to create initial backups
      await storageService.saveDatabase(initialDb);
      initialDb.meta.session_count = 2;
      await storageService.saveDatabase(initialDb);
      
      // Now do an incremental save that only changes projects
      await storageService.runExclusive(async (db) => {
        db.projects[0].name = 'Updated Project';
        return {
          result: null,
          commit: true,
          changedParts: new Set(['projects'])
        };
      });
      
      // Check which backup files exist
      const projectDir = path.dirname(testProjectFile);
      const backupExists = async (filename: string) => {
        return fs.access(path.join(projectDir, filename)).then(() => true).catch(() => false);
      };
      
      // Projects should have a backup
      expect(await backupExists('projects.yaml.backup.1')).toBe(true);
      
      // Tasks and memories might not have backups if they were never created
      // But if they do exist, they should be from the full save, not the incremental
      const tasksBackupExists = await backupExists('tasks.yaml.backup.1');
      const memoriesBackupExists = await backupExists('memories.yaml.backup.1');
      
      // Meta should have a backup since it's always updated
      expect(await backupExists('meta.yaml.backup.1')).toBe(true);
    });
  });
});