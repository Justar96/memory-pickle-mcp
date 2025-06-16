import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { MemoryService } from '../src/services/MemoryService';
import type { Memory, Project, Task } from '../src/types';

describe('MemoryService', () => {
  let memoryService: MemoryService;

  beforeEach(() => {
    memoryService = new MemoryService();
  });

  describe('Memory Creation', () => {
    it('should create a memory with required fields', () => {
      const memory = memoryService.createMemory({
        title: 'Test Memory',
        content: 'This is a test memory'
      });

      expect(memory.id).toMatch(/^mem_/);
      expect(memory.title).toBe('Test Memory');
      expect(memory.content).toBe('This is a test memory');
      expect(memory.category).toBe('general');
      expect(memory.importance).toBe('medium');
      expect(memory.tags).toEqual([]);
    });

    it('should throw error if title or content is missing', () => {
      expect(() => memoryService.createMemory({
        content: 'This is a test memory'
      } as any)).toThrow();

      expect(() => memoryService.createMemory({
        title: 'Test Memory'
      } as any)).toThrow();
    });
  });

  describe('Memory Search', () => {
    const memories: Memory[] = [
      {
        id: 'mem_1',
        title: 'React Hooks',
        content: 'useState, useEffect, useContext',
        timestamp: new Date().toISOString(),
        category: 'frontend',
        importance: 'high',
        tags: ['react', 'hooks', 'frontend'],
        related_memories: []
      },
      {
        id: 'mem_2',
        title: 'Node.js Performance',
        content: 'Event loop, worker threads',
        timestamp: new Date().toISOString(),
        category: 'backend',
        importance: 'medium',
        tags: ['node', 'performance', 'backend'],
        related_memories: []
      },
      {
        id: 'mem_3',
        title: 'React State Management',
        content: 'Redux, MobX, Zustand',
        timestamp: new Date().toISOString(),
        category: 'frontend',
        importance: 'high',
        tags: ['react', 'state-management', 'frontend'],
        related_memories: []
      }
    ];

    it('should search memories by query in title, content, and tags', () => {
      const results = memoryService.searchMemories(memories, { query: 'react' });
      expect(results).toHaveLength(2);
    });

    it('should filter memories by category', () => {
      const results = memoryService.searchMemories(memories, {
        query: 'react',
        category: 'frontend'
      });
      expect(results).toHaveLength(2);
    });

    it('should filter memories by tags with AND logic', () => {
      const results = memoryService.searchMemories(memories, {
        query: 'react',
        tags: ['react', 'hooks']
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('mem_1');
    });

    it('should be case-insensitive', () => {
      const results = memoryService.searchMemories(memories, {
        query: 'REACT',
        tags: ['REACT', 'HOOKS']
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('mem_1');
    });
  });

  describe('Handoff Summary Generation', () => {
    it('should generate a detailed handoff summary', () => {
      const project: Project = {
        id: 'proj_1',
        name: 'Test Project',
        status: 'in_progress',
        completion_percentage: 50,
        created_date: new Date().toISOString(),
        tasks: ['task_1', 'task_2', 'task_3'],
        milestones: []
      };

      const tasks: Task[] = [
        {
          id: 'task_1',
          project_id: 'proj_1',
          title: 'Completed Task',
          completed: true,
          completed_date: new Date().toISOString(),
          created_date: new Date().toISOString(),
          priority: 'medium',
          tags: [],
          subtasks: [],
          notes: [],
          blockers: []
        },
        {
          id: 'task_2',
          project_id: 'proj_1',
          title: 'In-Progress Task',
          completed: false,
          progress: 50,
          created_date: new Date().toISOString(),
          priority: 'high',
          tags: [],
          subtasks: [],
          notes: [],
          blockers: []
        },
        {
          id: 'task_3',
          project_id: 'proj_1',
          title: 'Blocked Task',
          completed: false,
          created_date: new Date().toISOString(),
          priority: 'critical',
          tags: [],
          subtasks: [],
          notes: [],
          blockers: ['API not ready']
        }
      ];

      const summary = memoryService.generateHandoffSummary(project, tasks, 1);

      expect(summary.project_name).toBe('Test Project');
      expect(summary.completion_percentage).toBe(50);
      expect(summary.completed_in_last_session).toHaveLength(1);
      expect(summary.in_progress).toHaveLength(1);
      expect(summary.blocked_items).toHaveLength(1);
      expect(summary.next_priorities).toHaveLength(2);
    });
  });

  describe('Line Range Functionality', () => {
    it('should create memory with valid line_range', () => {
      const memory = memoryService.createMemory({
        title: 'Important code section',
        content: 'This section handles user authentication and needs to be refactored',
        importance: 'high',
        line_range: {
          start_line: 100,
          end_line: 150,
          file_path: 'src/components/UserAuth.tsx'
        }
      });

      expect(memory.title).toBe('Important code section');
      expect(memory.line_range).toBeDefined();
      expect(memory.line_range?.start_line).toBe(100);
      expect(memory.line_range?.end_line).toBe(150);
      expect(memory.line_range?.file_path).toBe('src/components/UserAuth.tsx');
    });

    it('should create memory without line_range (optional)', () => {
      const memory = memoryService.createMemory({
        title: 'General note',
        content: 'Remember to update the documentation',
        importance: 'medium'
      });

      expect(memory.title).toBe('General note');
      expect(memory.line_range).toBeUndefined();
    });

    it('should validate line_range parameters for memories', () => {
      // Test invalid line numbers (zero)
      expect(() => memoryService.createMemory({
        title: 'Invalid memory',
        content: 'Test content',
        line_range: {
          start_line: 0,
          end_line: 10
        }
      })).toThrow('Line numbers must be positive');

      // Test invalid line range (start > end)
      expect(() => memoryService.createMemory({
        title: 'Invalid memory 2',
        content: 'Test content',
        line_range: {
          start_line: 50,
          end_line: 25
        }
      })).toThrow('start_line must be less than or equal to end_line');
    });
  });
});
