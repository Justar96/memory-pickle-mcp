import { jest, describe, it, expect } from '@jest/globals';
import { projectDatabaseSchema, taskSchema } from '../src/types/schemas';
import type { Task, Project, Memory } from '../src/types';

describe('Schema Validation', () => {
  describe('Task Schema', () => {
    it('should validate a valid task', () => {
      const validTask = {
        id: 'task_1',
        project_id: 'proj_1',
        title: 'Test Task',
        completed: false,
        created_date: new Date().toISOString(),
        priority: 'medium' as const,
        tags: ['test'],
        subtasks: [],
        notes: [],
        blockers: []
      };

      const result = taskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
    });

    it('should reject invalid priority values', () => {
      const invalidTask = {
        id: 'task_1',
        project_id: 'proj_1',
        title: 'Test Task',
        completed: false,
        created_date: new Date().toISOString(),
        priority: 'invalid_priority',
        tags: []
      };

      const result = taskSchema.safeParse(invalidTask);
      expect(result.success).toBe(false);
    });

    it('should handle optional fields correctly', () => {
      const minimalTask = {
        id: 'task_1',
        project_id: 'proj_1',
        title: 'Test Task',
        completed: false,
        created_date: new Date().toISOString(),
        priority: 'medium' as const
      };

      const result = taskSchema.safeParse(minimalTask);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual([]);
        expect(result.data.subtasks).toEqual([]);
        expect(result.data.notes).toEqual([]);
        expect(result.data.blockers).toEqual([]);
      }
    });
  });

  describe('Project Database Schema', () => {
    it('should validate a complete database structure', () => {
      const validDb = {
        meta: {
          last_updated: new Date().toISOString(),
          version: '2.0.0',
          session_count: 0
        },
        projects: [],
        tasks: [],
        memories: [],
        templates: {}
      };

      const result = projectDatabaseSchema.safeParse(validDb);
      expect(result.success).toBe(true);
    });

    it('should repair missing arrays with defaults', () => {
      const incompleteDb = {
        meta: {
          last_updated: new Date().toISOString(),
          version: '2.0.0',
          session_count: 0
        }
      };

      const result = projectDatabaseSchema.safeParse(incompleteDb);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.projects).toEqual([]);
        expect(result.data.tasks).toEqual([]);
        expect(result.data.memories).toEqual([]);
        expect(result.data.templates).toEqual({});
      }
    });

    it('should enforce required meta fields', () => {
      const invalidDb = {
        meta: {
          // missing required fields
        },
        projects: [],
        tasks: [],
        memories: []
      };

      const result = projectDatabaseSchema.safeParse(invalidDb);
      expect(result.success).toBe(false);
    });

    it('should validate relationships between entities', () => {
      const db = {
        meta: {
          last_updated: new Date().toISOString(),
          version: '2.0.0',
          session_count: 0
        },
        projects: [{
          id: 'proj_1',
          name: 'Test Project',
          status: 'in_progress' as const,
          completion_percentage: 0,
          created_date: new Date().toISOString(),
          tasks: ['task_1']
        }],
        tasks: [{
          id: 'task_1',
          project_id: 'proj_1',
          title: 'Test Task',
          completed: false,
          created_date: new Date().toISOString(),
          priority: 'medium' as const,
          tags: []
        }],
        memories: [{
          id: 'mem_1',
          title: 'Test Memory',
          content: 'Test content',
          timestamp: new Date().toISOString(),
          category: 'test',
          importance: 'medium' as const,
          tags: [],
          project_id: 'proj_1',
          task_id: 'task_1'
        }]
      };

      const result = projectDatabaseSchema.safeParse(db);
      expect(result.success).toBe(true);
    });
  });
});
