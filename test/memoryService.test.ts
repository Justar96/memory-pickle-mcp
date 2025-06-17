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

    it('should create memory with all optional fields', () => {
      const memory = memoryService.createMemory({
        title: 'Advanced Memory',
        content: 'Complex memory with all fields',
        category: 'development',
        importance: 'critical',
        tags: ['react', 'typescript'],
        task_id: 'task_123',
        project_id: 'proj_456',
        line_range: {
          start_line: 10,
          end_line: 20,
          file_path: 'src/test.ts'
        }
      });

      expect(memory.category).toBe('development');
      expect(memory.importance).toBe('critical');
      expect(memory.tags).toEqual(['react', 'typescript']);
      expect(memory.task_id).toBe('task_123');
      expect(memory.project_id).toBe('proj_456');
      expect(memory.line_range).toEqual({
        start_line: 10,
        end_line: 20,
        file_path: 'src/test.ts'
      });
    });

    it('should handle tags as single string', () => {
      const memory = memoryService.createMemory({
        title: 'Test Memory',
        content: 'Test content',
        tags: 'single-tag' as any
      });

      expect(memory.tags).toEqual(['single-tag']);
    });
  });

  describe('Line Range Validation', () => {
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
        title: 'Test Memory',
        content: 'Test content',
        line_range: {
          start_line: 0,
          end_line: 10,
          file_path: 'test.ts'
        }
      })).toThrow('Line numbers must be positive (1-based)');

      // Test negative line numbers
      expect(() => memoryService.createMemory({
        title: 'Test Memory',
        content: 'Test content',
        line_range: {
          start_line: -1,
          end_line: 10,
          file_path: 'test.ts'
        }
      })).toThrow('Line numbers must be positive (1-based)');

      // Test start_line > end_line
      expect(() => memoryService.createMemory({
        title: 'Test Memory',
        content: 'Test content',
        line_range: {
          start_line: 20,
          end_line: 10,
          file_path: 'test.ts'
        }
      })).toThrow('start_line must be less than or equal to end_line');

      // Test non-number line values
      expect(() => memoryService.createMemory({
        title: 'Test Memory',
        content: 'Test content',
        line_range: {
          start_line: 'invalid' as any,
          end_line: 10,
          file_path: 'test.ts'
        }
      })).toThrow('Line range start_line and end_line must be numbers');

      expect(() => memoryService.createMemory({
        title: 'Test Memory',
        content: 'Test content',
        line_range: {
          start_line: 10,
          end_line: 'invalid' as any,
          file_path: 'test.ts'
        }
      })).toThrow('Line range start_line and end_line must be numbers');
    });
  });

  describe('Memory Addition', () => {
    it('should add memory to array and return it', () => {
      const memories: Memory[] = [];
      const memory = memoryService.addMemory(memories, {
        title: 'Test Memory',
        content: 'Test content'
      });

      expect(memories).toHaveLength(1);
      expect(memories[0]).toBe(memory);
      expect(memory.title).toBe('Test Memory');
    });

    it('should add multiple memories to array', () => {
      const memories: Memory[] = [];
      
      const memory1 = memoryService.addMemory(memories, {
        title: 'First Memory',
        content: 'First content'
      });
      
      const memory2 = memoryService.addMemory(memories, {
        title: 'Second Memory',
        content: 'Second content'
      });

      expect(memories).toHaveLength(2);
      expect(memories[0]).toBe(memory1);
      expect(memories[1]).toBe(memory2);
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

    it('should return empty array when no filters provided', () => {
      const results = memoryService.searchMemories(memories, {});
      expect(results).toHaveLength(0);
    });

    it('should search by category alone', () => {
      const results = memoryService.searchMemories(memories, {
        category: 'backend'
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('mem_2');
    });

    it('should search by tags alone', () => {
      const results = memoryService.searchMemories(memories, {
        tags: ['performance']
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('mem_2');
    });

    it('should respect limit parameter', () => {
      const results = memoryService.searchMemories(memories, {
        query: 'react',
        limit: 1
      });
      expect(results).toHaveLength(1);
    });

    it('should handle no matches', () => {
      const results = memoryService.searchMemories(memories, {
        query: 'nonexistent'
      });
      expect(results).toHaveLength(0);
    });
  });

  describe('Memory Result Formatting', () => {
    it('should format memory results correctly', () => {
      const memories: Memory[] = [
        {
          id: 'mem_1',
          title: 'Test Memory',
          content: 'Test content',
          timestamp: '2024-01-01T12:00:00.000Z',
          category: 'test',
          importance: 'high',
          tags: ['tag1', 'tag2'],
          related_memories: []
        }
      ];

      const formatted = memoryService.formatMemoryResults(memories);
      
      expect(formatted).toContain('[FOUND] Found 1 relevant memories:');
      expect(formatted).toContain('## Test Memory');
      expect(formatted).toContain('**Category:** test | **Importance:** high');
      expect(formatted).toContain('**Tags:** tag1, tag2');
      expect(formatted).toContain('Test content');
    });

    it('should format multiple memories with separators', () => {
      const memories: Memory[] = [
        {
          id: 'mem_1',
          title: 'Memory 1',
          content: 'Content 1',
          timestamp: '2024-01-01T12:00:00.000Z',
          category: 'test',
          importance: 'high',
          tags: [],
          related_memories: []
        },
        {
          id: 'mem_2',
          title: 'Memory 2',
          content: 'Content 2',
          timestamp: '2024-01-01T12:00:00.000Z',
          category: 'test',
          importance: 'medium',
          tags: [],
          related_memories: []
        }
      ];

      const formatted = memoryService.formatMemoryResults(memories);
      
      expect(formatted).toContain('[FOUND] Found 2 relevant memories:');
      expect(formatted).toContain('## Memory 1');
      expect(formatted).toContain('## Memory 2');
      expect(formatted).toContain('---');
    });

    it('should handle empty memories array', () => {
      const formatted = memoryService.formatMemoryResults([]);
      expect(formatted).toBe('[FOUND] Found 0 relevant memories:\n\n');
    });
  });

  describe('Handoff Summary Generation', () => {
    const project: Project = {
      id: 'proj_1',
      name: 'Test Project',
      status: 'in_progress',
      completion_percentage: 50,
      created_date: new Date().toISOString(),
      tasks: ['task_1', 'task_2', 'task_3'],
      milestones: []
    };

    it('should generate a detailed handoff summary', () => {
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

    it('should handle project with no recent activity', () => {
      const tasks: Task[] = [
        {
          id: 'task_1',
          project_id: 'proj_1',
          title: 'Old Completed Task',
          completed: true,
          completed_date: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
          created_date: new Date().toISOString(),
          priority: 'medium',
          tags: [],
          subtasks: [],
          notes: [],
          blockers: []
        }
      ];

      const summary = memoryService.generateHandoffSummary(project, tasks, 1);

      expect(summary.completed_in_last_session).toHaveLength(0);
      expect(summary.in_progress).toHaveLength(0);
      expect(summary.blocked_items).toHaveLength(0);
    });

    it('should handle custom session start time', () => {
      const sessionStart = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const tasks: Task[] = [
        {
          id: 'task_1',
          project_id: 'proj_1',
          title: 'Recent Task',
          completed: true,
          completed_date: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
          created_date: new Date().toISOString(),
          priority: 'medium',
          tags: [],
          subtasks: [],
          notes: [],
          blockers: []
        }
      ];

      const summary = memoryService.generateHandoffSummary(project, tasks, 1, sessionStart);

      expect(summary.completed_in_last_session).toHaveLength(1);
    });

    it('should handle tasks without progress or blockers', () => {
      const tasks: Task[] = [
        {
          id: 'task_1',
          project_id: 'proj_1',
          title: 'Simple Task',
          completed: false,
          created_date: new Date().toISOString(),
          priority: 'low',
          tags: [],
          subtasks: [],
          notes: [],
          blockers: []
        }
      ];

      const summary = memoryService.generateHandoffSummary(project, tasks, 1);

      expect(summary.in_progress).toHaveLength(0);
      expect(summary.blocked_items).toHaveLength(0);
      expect(summary.next_priorities).toHaveLength(0);
    });

    it('should prioritize tasks correctly in next_priorities', () => {
      const tasks: Task[] = [
        {
          id: 'task_1',
          project_id: 'proj_1',
          title: 'Critical Task',
          completed: false,
          created_date: new Date().toISOString(),
          priority: 'critical',
          tags: [],
          subtasks: [],
          notes: [],
          blockers: []
        },
        {
          id: 'task_2',
          project_id: 'proj_1',
          title: 'High Task',
          completed: false,
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
          title: 'Medium Task',
          completed: false,
          created_date: new Date().toISOString(),
          priority: 'medium',
          tags: [],
          subtasks: [],
          notes: [],
          blockers: []
        }
      ];

      const summary = memoryService.generateHandoffSummary(project, tasks, 1);

      expect(summary.next_priorities).toHaveLength(2); // Only critical and high
      expect(summary.next_priorities[0]).toBe('Critical Task (critical)');
      expect(summary.next_priorities[1]).toBe('High Task (high)');
    });

    it('should limit next_priorities to 5 items', () => {
      const tasks: Task[] = Array.from({ length: 10 }, (_, i) => ({
        id: `task_${i}`,
        project_id: 'proj_1',
        title: `Task ${i}`,
        completed: false,
        created_date: new Date().toISOString(),
        priority: 'critical' as const,
        tags: [],
        subtasks: [],
        notes: [],
        blockers: []
      }));

      const summary = memoryService.generateHandoffSummary(project, tasks, 1);

      expect(summary.next_priorities).toHaveLength(5);
    });

    it('should handle tasks from different projects', () => {
      const tasks: Task[] = [
        {
          id: 'task_1',
          project_id: 'other_proj',
          title: 'Other Project Task',
          completed: true,
          completed_date: new Date().toISOString(),
          created_date: new Date().toISOString(),
          priority: 'critical',
          tags: [],
          subtasks: [],
          notes: [],
          blockers: []
        },
        {
          id: 'task_2',
          project_id: 'proj_1',
          title: 'Current Project Task',
          completed: true,
          completed_date: new Date().toISOString(),
          created_date: new Date().toISOString(),
          priority: 'high',
          tags: [],
          subtasks: [],
          notes: [],
          blockers: []
        }
      ];

      const summary = memoryService.generateHandoffSummary(project, tasks, 1);

      expect(summary.completed_in_last_session).toHaveLength(1);
      expect(summary.completed_in_last_session[0]).toBe('Current Project Task');
    });
  });

  describe('Handoff Summary Formatting', () => {
    const handoffSummary = {
      project_name: 'Test Project',
      completion_percentage: 75,
      last_session_date: '2024-01-01T12:00:00.000Z',
      completed_in_last_session: ['Task 1', 'Task 2'],
      in_progress: ['Task 3 (50%)', 'Task 4 (25%)'],
      blocked_items: ['Task 5: API not ready', 'Task 6: Dependencies missing'],
      next_priorities: ['Task 7 (critical)', 'Task 8 (high)'],
      session_notes: 'Session #2'
    };

    it('should format detailed handoff summary', () => {
      const formatted = memoryService.formatHandoffSummary(handoffSummary, 'detailed');

      expect(formatted).toContain('# [HANDOFF] Project Handoff Summary');
      expect(formatted).toContain('**Project:** Test Project');
      expect(formatted).toContain('**Completion:** 75%');
      expect(formatted).toContain('## [DONE] Completed This Session');
      expect(formatted).toContain('- Task 1');
      expect(formatted).toContain('- Task 2');
      expect(formatted).toContain('## [ACTIVE] In Progress');
      expect(formatted).toContain('- Task 3 (50%)');
      expect(formatted).toContain('## [BLOCKED] Blocked Items');
      expect(formatted).toContain('- Task 5: API not ready');
      expect(formatted).toContain('## [NEXT] Next Priorities');
      expect(formatted).toContain('- Task 7 (critical)');
      expect(formatted).toContain('*Copy this summary to your next chat session to continue where you left off.*');
    });

    it('should format compact handoff summary', () => {
      const formatted = memoryService.formatHandoffSummary(handoffSummary, 'compact');

      expect(formatted).toContain('# [HANDOFF] Project Handoff Summary');
      expect(formatted).toContain('**Project:** Test Project');
      expect(formatted).toContain('**Completion:** 75%');
      expect(formatted).toContain('**Quick Summary:**');
      expect(formatted).toContain('Completed: 2 tasks |');
      expect(formatted).toContain('In Progress: 2 |');
      expect(formatted).toContain('Blocked: 2');
      expect(formatted).toContain('**Continue with:** Task 7 (critical)');
      expect(formatted).toContain('*Copy this summary to your next chat session to continue where you left off.*');
    });

    it('should handle empty handoff summary sections', () => {
      const emptyHandoff = {
        project_name: 'Empty Project',
        completion_percentage: 0,
        last_session_date: '2024-01-01T12:00:00.000Z',
        completed_in_last_session: [],
        in_progress: [],
        blocked_items: [],
        next_priorities: [],
        session_notes: 'Session #1'
      };

      const formatted = memoryService.formatHandoffSummary(emptyHandoff, 'detailed');

      expect(formatted).toContain('- No tasks completed this session');
      expect(formatted).toContain('- No tasks currently in progress');
      expect(formatted).not.toContain('## [BLOCKED] Blocked Items');
      expect(formatted).toContain('- No high priority items pending');
    });

    it('should handle compact format with empty next priorities', () => {
      const emptyNextHandoff = {
        project_name: 'Test Project',
        completion_percentage: 50,
        last_session_date: '2024-01-01T12:00:00.000Z',
        completed_in_last_session: [],
        in_progress: [],
        blocked_items: [],
        next_priorities: [],
        session_notes: 'Session #1'
      };

      const formatted = memoryService.formatHandoffSummary(emptyNextHandoff, 'compact');

      expect(formatted).toContain('**Continue with:** Review project status for next tasks');
    });

    it('should default to detailed format when no format specified', () => {
      const formatted = memoryService.formatHandoffSummary(handoffSummary);

      expect(formatted).toContain('## [DONE] Completed This Session');
      expect(formatted).toContain('## [ACTIVE] In Progress');
      expect(formatted).toContain('## [NEXT] Next Priorities');
    });
  });
});
