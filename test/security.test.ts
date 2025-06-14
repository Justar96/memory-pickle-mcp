import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { validateExportPath, validateAndSanitizeFilePath, setSecureFilePermissions } from '../src/utils/securityUtils.js';
import { withFileLock, ensureDirectoryExists } from '../src/utils/fileUtils.js';

describe('Security Tests', () => {
  let tempDir: string;
  let testBaseDir: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'memory-pickle-security-test-'));
    testBaseDir = path.join(tempDir, 'base');
    await fs.mkdir(testBaseDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Path Traversal Protection', () => {
    test('should prevent path traversal with ../', async () => {
      const maliciousPath = '../../../etc/passwd.md';
      
      expect(() => {
        validateExportPath(maliciousPath, testBaseDir);
      }).toThrow('Path traversal attempt detected');
    });

    test('should prevent path traversal with ..\\ (Windows)', async () => {
      const maliciousPath = '..\\..\\..\\Windows\\System32\\config\\SAM.md';
      
      expect(() => {
        validateExportPath(maliciousPath, testBaseDir);
      }).toThrow('Path traversal attempt detected');
    });

    test('should prevent absolute path attacks', async () => {
      const maliciousPath = '/etc/passwd.md';
      
      expect(() => {
        validateExportPath(maliciousPath, testBaseDir);
      }).toThrow('Path traversal attempt detected');
    });

    test('should prevent null byte injection', async () => {
      const maliciousPath = 'innocent.txt\0../../etc/passwd';
      
      expect(() => {
        validateAndSanitizeFilePath(maliciousPath, testBaseDir);
      }).toThrow('File path contains null bytes');
    });

    test('should reject invalid file extensions', async () => {
      const maliciousPath = 'script.sh';
      
      expect(() => {
        validateExportPath(maliciousPath, testBaseDir);
      }).toThrow('Invalid file extension');
    });

    test('should accept valid markdown files', async () => {
      const validPath = 'export.md';
      const result = validateExportPath(validPath, testBaseDir);
      
      expect(result).toBe(path.join(testBaseDir, 'export.md'));
    });

    test('should reject filenames with dangerous characters', async () => {
      const dangerousNames = [
        'file<.md',
        'file>.md', 
        'file|.md',
        'file:.md',
        'file*.md',
        'file?.md'
      ];

      dangerousNames.forEach(filename => {
        expect(() => {
          validateAndSanitizeFilePath(filename, testBaseDir);
        }).toThrow('Filename contains dangerous characters');
      });
    });

    test('should reject empty or invalid filenames', async () => {
      // Test cases that should be caught by early validation
      expect(() => {
        validateAndSanitizeFilePath('', testBaseDir);
      }).toThrow('Invalid file path provided');
      
      expect(() => {
        validateAndSanitizeFilePath('.', testBaseDir);
      }).toThrow(); // No extension
      
      expect(() => {
        validateAndSanitizeFilePath('..', testBaseDir);
      }).toThrow('Path traversal attempt detected');
      
      // Test filename that is just an extension (no base name)
      expect(() => {
        validateAndSanitizeFilePath('.md', testBaseDir);
      }).toThrow('Invalid file extension'); // .md has no extension, just a filename starting with dot
    });

    test('should reject filenames that are too long', async () => {
      const longFilename = 'a'.repeat(300) + '.md';
      
      expect(() => {
        validateAndSanitizeFilePath(longFilename, testBaseDir);
      }).toThrow('Filename too long');
    });
  });

  describe('File Lock Security', () => {
    test('should create lock files with secure permissions', async () => {
      const testFile = path.join(testBaseDir, 'test.txt');
      await fs.writeFile(testFile, 'test content');

      await withFileLock(testFile, async () => {
        const lockFile = testFile + '.lock';
        expect(existsSync(lockFile)).toBe(true);
        
        // Check permissions (should be 0o600 - owner read/write only)
        const stats = await fs.stat(lockFile);
        const mode = stats.mode & parseInt('777', 8);
        expect(mode).toBe(0o600);
      });
    });

    test('should handle stale locks correctly', async () => {
      const testFile = path.join(testBaseDir, 'stale-test.txt');
      const lockFile = testFile + '.lock';
      
      // Create a stale lock file (old timestamp, non-existent PID)
      const staleLock = {
        pid: 99999, // Non-existent PID
        timestamp: Date.now() - 60000, // 1 minute ago
        token: 'old-token',
        hostname: os.hostname()
      };
      
      await fs.writeFile(lockFile, JSON.stringify(staleLock), { mode: 0o600 });
      
      // Should be able to acquire lock by removing stale lock
      let lockAcquired = false;
      await withFileLock(testFile, async () => {
        lockAcquired = true;
      });
      
      expect(lockAcquired).toBe(true);
    });

    test('should prevent lock file race conditions', async () => {
      const testFile = path.join(testBaseDir, 'race-test.txt');
      
      // Try to acquire the same lock from multiple operations
      const results = await Promise.allSettled([
        withFileLock(testFile, async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'operation1';
        }),
        withFileLock(testFile, async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'operation2';
        })
      ]);
      
      // Both operations should complete successfully
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
    });

    test('should cleanup lock files on process exit', async () => {
      const testFile = path.join(testBaseDir, 'cleanup-test.txt');
      const lockFile = testFile + '.lock';
      
      await withFileLock(testFile, async () => {
        expect(existsSync(lockFile)).toBe(true);
      });
      
      // Lock file should be cleaned up after operation
      expect(existsSync(lockFile)).toBe(false);
    });
  });

  describe('File Permission Security', () => {
    test('should set secure permissions on created files', async () => {
      const testFile = path.join(testBaseDir, 'secure-test.txt');
      await fs.writeFile(testFile, 'test content');
      
      await setSecureFilePermissions(testFile);
      
      const stats = await fs.stat(testFile);
      const mode = stats.mode & parseInt('777', 8);
      expect(mode).toBe(0o600); // Owner read/write only
    });

    test('should create directories with secure permissions', async () => {
      const secureDir = path.join(testBaseDir, 'secure-dir');
      
      await ensureDirectoryExists(secureDir);
      
      const stats = await fs.stat(secureDir);
      const mode = stats.mode & parseInt('777', 8);
      expect(mode).toBe(0o700); // Owner read/write/execute only
    });
  });

  describe('Export Function Security', () => {
    test('should sanitize export file paths', async () => {
      // Test with a mock export function that uses our security utils
      const mockExportFunction = (outputFile: string) => {
        return validateExportPath(outputFile, testBaseDir);
      };

      // Valid export paths
      expect(mockExportFunction('project-export.md')).toBe(
        path.join(testBaseDir, 'project-export.md')
      );
      expect(mockExportFunction('backup.yaml')).toBe(
        path.join(testBaseDir, 'backup.yaml')
      );

      // Invalid export paths should throw
      expect(() => mockExportFunction('../../../etc/passwd')).toThrow();
      expect(() => mockExportFunction('/etc/passwd')).toThrow();
      expect(() => mockExportFunction('script.js')).toThrow();
    });

    test('should handle edge cases in file paths', async () => {
      // Test various edge cases
      const edgeCases = [
        { input: 'normal-file.md', shouldPass: true },
        { input: 'with-dashes-and_underscores.md', shouldPass: true },
        { input: 'with.dots.md', shouldPass: true },
        { input: 'with/slash.md', shouldPass: false },  // Directory separator
        { input: '.hidden.md', shouldPass: true },      // Hidden file (should pass)
        { input: 'very-long-filename-that-might-cause-issues.md', shouldPass: true },
      ];

      edgeCases.forEach(({ input, shouldPass }) => {
        if (shouldPass) {
          expect(() => validateExportPath(input, testBaseDir)).not.toThrow();
        } else {
          expect(() => validateExportPath(input, testBaseDir)).toThrow();
        }
      });
    });
  });

  describe('Input Validation Security', () => {
    test('should reject non-string inputs', async () => {
      const invalidInputs = [null, undefined, 123, {}, [], true];

      invalidInputs.forEach(input => {
        expect(() => {
          validateAndSanitizeFilePath(input as any, testBaseDir);
        }).toThrow('Invalid file path provided');
      });
    });

    test('should handle unicode and special characters safely', async () => {
      // Most unicode should pass filename validation
      expect(() => validateAndSanitizeFilePath('файл.md', testBaseDir)).not.toThrow();
      expect(() => validateAndSanitizeFilePath('tëst.md', testBaseDir)).not.toThrow();
      
      // Dangerous characters should fail
      expect(() => validateAndSanitizeFilePath('test<script>.md', testBaseDir)).toThrow();
      expect(() => validateAndSanitizeFilePath('test|pipe.md', testBaseDir)).toThrow();
    });
  });

  describe('Concurrent Access Security', () => {
    test('should handle multiple concurrent file operations safely', async () => {
      const testFiles = Array.from({ length: 5 }, (_, i) => 
        path.join(testBaseDir, `concurrent-test-${i}.txt`)
      );

      // Create multiple concurrent file operations
      const operations = testFiles.map(async (file, index) => {
        return withFileLock(file, async () => {
          await fs.writeFile(file, `content-${index}`);
          await new Promise(resolve => setTimeout(resolve, 50));
          const content = await fs.readFile(file, 'utf8');
          return content;
        });
      });

      const results = await Promise.all(operations);
      
      // All operations should complete successfully
      results.forEach((result, index) => {
        expect(result).toBe(`content-${index}`);
      });
    });

    test('should prevent file corruption during concurrent writes', async () => {
      const testFile = path.join(testBaseDir, 'corruption-test.txt');
      
      // Multiple concurrent writes to the same file
      const writes = Array.from({ length: 10 }, (_, i) => 
        withFileLock(testFile, async () => {
          const content = `write-${i}-${'x'.repeat(100)}`;
          await fs.writeFile(testFile, content);
          return content;
        })
      );

      const results = await Promise.all(writes);
      
      // Final file should contain content from one of the writes
      const finalContent = await fs.readFile(testFile, 'utf8');
      expect(results).toContain(finalContent);
    });
  });

  describe('Error Handling Security', () => {
    test('should not leak sensitive information in error messages', async () => {
      try {
        validateExportPath('../../../etc/passwd', testBaseDir);
        fail('Should have thrown an error');
      } catch (error) {
        const errorMessage = (error as Error).message.toLowerCase();
        
        // Error message should not contain sensitive system paths
        expect(errorMessage).not.toContain('/etc/passwd');
        expect(errorMessage).not.toContain('system32');
        expect(errorMessage).not.toContain('windows');
      }
    });

    test('should handle permission denied errors gracefully', async () => {
      // This test may not work on all systems due to permission restrictions
      const restrictedDir = path.join(testBaseDir, 'restricted');
      await fs.mkdir(restrictedDir, { mode: 0o000 }); // No permissions
      
      try {
        await expect(async () => {
          await ensureDirectoryExists(path.join(restrictedDir, 'subdir'));
        }).rejects.toThrow();
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(restrictedDir, 0o700);
      }
    });
  });
});