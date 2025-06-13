import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { StorageService } from '../src/services/StorageService';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('StorageService Concurrency and Locking', () => {
  let storageService: StorageService;
  const testDataDir = path.resolve(process.cwd(), 'test_data_storage');
  const testProjectFile = path.join(testDataDir, 'project-data.yaml');

  beforeEach(async () => {
    await fs.rm(testDataDir, { recursive: true, force: true });
    await fs.mkdir(testDataDir, { recursive: true });
    storageService = new StorageService(testProjectFile);
  });

  afterEach(async () => {
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  it('should acquire and release file lock properly', async () => {
    let lockAcquired = false;
    await storageService.runExclusive(async (db) => {
      lockAcquired = true;
      return { result: null, commit: false };
    });
    expect(lockAcquired).toBe(true);
  });

  it('should handle concurrent operations without data corruption', async () => {
    const initialDb = {
      meta: {
        last_updated: new Date().toISOString(),
        version: '2.0.0',
        session_count: 0,
      },
      projects: [],
      tasks: [],
      memories: [],
      templates: {}
    };
    await storageService.saveDatabase(initialDb);

    const promises: Promise<void>[] = [];
    for (let i = 0; i < 5; i++) {
      promises.push(storageService.runExclusive(async (db) => {
        db.meta.session_count = i + 1;
        return { result: undefined, commit: true };
      }));
    }

    await Promise.all(promises);

    const finalDb = await storageService.loadDatabase();
    expect([1, 2, 3, 4, 5]).toContain(finalDb.meta.session_count);
  });

  it('should throw error if lock cannot be acquired', async () => {
    // Simulate lock file existing
    const lockFile = testProjectFile + '.lock';
    await fs.writeFile(lockFile, 'lock');

    const storage = new StorageService(testProjectFile);
    await expect(storage.runExclusive(async () => {
      return { result: undefined, commit: false };
    })).rejects.toThrow();

    await fs.unlink(lockFile);
  });
});
