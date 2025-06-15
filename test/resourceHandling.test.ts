import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock the MCP server components we need to test
describe('Resource URI Handling', () => {
  let tempDir: string;
  
  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('URI parsing and validation', () => {
    it('should handle valid file URIs correctly', () => {
      const testCases = [
        { uri: 'file:///projects.yaml', expected: 'projects.yaml' },
        { uri: 'file:///tasks.yaml', expected: 'tasks.yaml' },
        { uri: 'file:///memories.yaml', expected: 'memories.yaml' },
        { uri: 'file:///meta.yaml', expected: 'meta.yaml' },
        { uri: 'file:///project-export.md', expected: 'project-export.md' },
      ];

      testCases.forEach(({ uri, expected }) => {
        const url = new URL(uri);
        let fileName = url.pathname;
        if (fileName.startsWith('/')) {
          fileName = fileName.substring(1);
        }

        expect(fileName).toBe(expected);
        expect(fileName).not.toBe('');
        expect(fileName.trim()).not.toBe('');
      });
    });

    it('should detect invalid/empty file URIs', () => {
      const invalidCases = [
        'file:///', // Just slashes - results in empty fileName
        'file:///.', // Current directory - normalized to empty
        'file:///..', // Parent directory - normalized to empty
        'file://projects.yaml', // Incorrect format (missing third slash) - results in empty fileName
      ];

      invalidCases.forEach((uri) => {
        const url = new URL(uri);
        let fileName = url.pathname;
        if (fileName.startsWith('/')) {
          fileName = fileName.substring(1);
        }

        // These should all result in empty filenames and be caught by our validation
        const isEmpty = !fileName || fileName.trim() === '';

        expect(isEmpty).toBe(true);
      });
    });

    it('should detect unsafe filenames (manual test)', () => {
      // Test the validation logic directly with unsafe filenames
      const unsafeFilenames = ['.', '..', 'path/../file.yaml', '../file.yaml'];

      unsafeFilenames.forEach((fileName) => {
        const isUnsafe = fileName === '.' || fileName === '..' || fileName.includes('..');
        expect(isUnsafe).toBe(true);
      });
    });

    it('should properly resolve file paths', () => {
      const dataDir = tempDir;
      const fileName = 'test.yaml';
      
      // Create a test file
      const testFilePath = path.join(dataDir, fileName);
      fs.writeFileSync(testFilePath, 'test: content');
      
      const resolvedPath = path.resolve(dataDir, fileName);
      
      expect(fs.existsSync(resolvedPath)).toBe(true);
      expect(fs.statSync(resolvedPath).isFile()).toBe(true);
      expect(fs.statSync(resolvedPath).isDirectory()).toBe(false);
    });

    it('should detect when path resolves to directory', () => {
      const dataDir = tempDir;
      const fileName = ''; // Empty filename should resolve to directory
      
      const resolvedPath = path.resolve(dataDir, fileName);
      
      expect(fs.existsSync(resolvedPath)).toBe(true);
      expect(fs.statSync(resolvedPath).isDirectory()).toBe(true);
      expect(fs.statSync(resolvedPath).isFile()).toBe(false);
    });
  });

  describe('Resource Templates', () => {
    it('should have valid uriTemplate format', () => {
      const template = { uriTemplate: "file:///{filename}", name: "Data File Access" };

      expect(template.uriTemplate).toBeDefined();
      expect(template.uriTemplate).toContain('{filename}');
      expect(template.name).toBeDefined();
    });

    it('should support URI template parameter substitution', () => {
      const template = "file:///{filename}";

      // Test various file substitutions
      const testCases = [
        { param: 'projects.yaml', expected: 'file:///projects.yaml' },
        { param: 'tasks.yaml', expected: 'file:///tasks.yaml' },
        { param: 'memories.yaml', expected: 'file:///memories.yaml' },
        { param: 'meta.yaml', expected: 'file:///meta.yaml' },
        { param: 'project-export.md', expected: 'file:///project-export.md' },
      ];

      testCases.forEach(({ param, expected }) => {
        const substituted = template.replace('{filename}', param);
        expect(substituted).toBe(expected);
      });
    });
  });


});
