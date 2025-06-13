import { jest, describe, it, expect } from '@jest/globals';
import { serializeToYaml, deserializeFromYaml, serializeDataToYaml, deserializeDataFromYaml } from '../src/utils/yamlUtils';
import type { ProjectDatabase, Task, Project } from '../src/types';

describe('YAML Utilities', () => {
  describe('Serialization', () => {
    it('should serialize and deserialize a complete database', () => {
      const testDb: ProjectDatabase = {
        meta: {
          last_updated: new Date().toISOString(),
          version: '2.0.0',
          session_count: 1
        },
      projects: [{
        id: 'proj_1',
        name: 'Test Project',
        status: 'in_progress',
        completion_percentage: 0,
        created_date: new Date().toISOString(),
        tasks: [],
        milestones: []
      }],
      tasks: [{
        id: 'task_1',
        project_id: 'proj_1',
        title: 'Test Task',
        completed: false,
        created_date: new Date().toISOString(),
        priority: 'medium',
        tags: [],
        subtasks: [],
        notes: [],
        blockers: []
      }],
        memories: [],
        templates: {}
      };

      const yaml = serializeToYaml(testDb);
      expect(typeof yaml).toBe('string');
      
      const deserializedDb = deserializeFromYaml(yaml);
      expect(deserializedDb.meta.version).toBe(testDb.meta.version);
      expect(deserializedDb.projects[0].name).toBe(testDb.projects[0].name);
      expect(deserializedDb.tasks[0].title).toBe(testDb.tasks[0].title);
    });

    it('should handle special characters in text fields', () => {
      const testData = {
        title: 'Test with: special chars',
        description: `Multiple lines
with "quotes"
and other: special-chars!`,
        tags: ['tag:1', 'tag:2']
      };

      const yaml = serializeDataToYaml(testData);
      const deserialized = deserializeDataFromYaml(yaml);
      expect(deserialized).toEqual(testData);
    });

    it('should maintain data types after serialization', () => {
      const testData = {
        string: 'test',
        number: 42,
        boolean: true,
        date: new Date().toISOString(),
        array: [1, 2, 3],
        nested: {
          key: 'value'
        }
      };

      const yaml = serializeDataToYaml(testData);
      const deserialized = deserializeDataFromYaml(yaml);
      
      expect(typeof deserialized.string).toBe('string');
      expect(typeof deserialized.number).toBe('number');
      expect(typeof deserialized.boolean).toBe('boolean');
      expect(Array.isArray(deserialized.array)).toBe(true);
      expect(typeof deserialized.nested).toBe('object');
    });

    it('should handle empty or undefined optional fields', () => {
      const testTask: Task = {
        id: 'task_1',
        project_id: 'proj_1',
        title: 'Test Task',
        completed: false,
        created_date: new Date().toISOString(),
        priority: 'medium',
        tags: [],
        subtasks: [],
        notes: [],
        blockers: []
      };

      const yaml = serializeDataToYaml(testTask);
      const deserialized = deserializeDataFromYaml<Task>(yaml);
      
      expect(deserialized.description).toBeUndefined();
      expect(deserialized.due_date).toBeUndefined();
      expect(deserialized.progress).toBeUndefined();
      expect(deserialized.tags).toEqual([]);
    });

    it('should handle circular references gracefully', () => {
      const project: any = {
        id: 'proj_1',
        name: 'Test Project'
      };
      project.self = project; // Create circular reference

      expect(() => serializeDataToYaml(project)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw on invalid YAML syntax', () => {
      const invalidYaml = `
        key: "unclosed string
        invalid: : syntax
      `;

      expect(() => deserializeDataFromYaml(invalidYaml)).toThrow();
    });

    it('should throw on schema validation failure', () => {
      const invalidDb = {
        meta: {
          // Missing required fields
        }
      };

      expect(() => serializeToYaml(invalidDb as any)).toThrow();
    });
  });
});
