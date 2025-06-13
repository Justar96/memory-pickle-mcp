import { jest, describe, it, expect } from '@jest/globals';
import { ProjectService } from '../src/services/ProjectService';
import { TaskService } from '../src/services/TaskService';
import type { Project, Task } from '../src/types';

describe('ProjectService', () => {
  let projectService: ProjectService;
  let taskService: TaskService;

  beforeEach(() => {
    projectService = new ProjectService();
    taskService = new TaskService();
  });

  describe('Project Creation and Management', () => {
    it('should create a project with required fields', () => {
      const project = projectService.createProject({
        name: 'Test Project',
        description: 'A test project'
      });

      expect(project.id).toMatch(/^proj_/);
      expect(project.name).toBe('Test Project');
      expect(project.description).toBe('A test project');
      expect(project.status).toBe('planning');
      expect(project.completion_percentage).toBe(0);
      expect(project.tasks).toEqual([]);
      expect(project.milestones).toEqual([]);
    });

    it('should throw error when creating project without name', () => {
      expect(() => projectService.createProject({
        description: 'A test project'
      } as any)).toThrow();
    });
  });

  describe('Project Completion Calculations', () => {
    it('should calculate completion percentage based on completed tasks', () => {
      const project: Project = {
        id: 'proj_1',
        name: 'Test Project',
        status: 'in_progress',
        completion_percentage: 0,
        created_date: new Date().toISOString(),
        tasks: ['task_1', 'task_2', 'task_3', 'task_4'],
        milestones: []
      };

      const tasks: Task[] = [
        {
          id: 'task_1',
          project_id: 'proj_1',
          title: 'Task 1',
          completed: true,
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
          title: 'Task 2',
          completed: true,
          created_date: new Date().toISOString(),
          priority: 'medium',
          tags: [],
          subtasks: [],
          notes: [],
          blockers: []
        },
        {
          id: 'task_3',
          project_id: 'proj_1',
          title: 'Task 3',
          completed: false,
          created_date: new Date().toISOString(),
          priority: 'medium',
          tags: [],
          subtasks: [],
          notes: [],
          blockers: []
        },
        {
          id: 'task_4',
          project_id: 'proj_1',
          title: 'Task 4',
          completed: false,
          created_date: new Date().toISOString(),
          priority: 'medium',
          tags: [],
          subtasks: [],
          notes: [],
          blockers: []
        }
      ];

      projectService.updateProjectCompletion(project, tasks);
      expect(project.completion_percentage).toBe(50); // 2 out of 4 tasks completed
      expect(project.status).toBe('in_progress');
    });

    it('should update project status based on completion', () => {
      const project: Project = {
        id: 'proj_1',
        name: 'Test Project',
        status: 'in_progress',
        completion_percentage: 0,
        created_date: new Date().toISOString(),
        tasks: ['task_1'],
        milestones: []
      };

      const tasks: Task[] = [
        {
          id: 'task_1',
          project_id: 'proj_1',
          title: 'Task 1',
          completed: true,
          created_date: new Date().toISOString(),
          priority: 'medium',
          tags: [],
          subtasks: [],
          notes: [],
          blockers: []
        }
      ];

      projectService.updateProjectCompletion(project, tasks);
      expect(project.completion_percentage).toBe(100);
      expect(project.status).toBe('completed');
    });

    it('should handle projects with no tasks', () => {
      const project: Project = {
        id: 'proj_1',
        name: 'Test Project',
        status: 'planning',
        completion_percentage: 0,
        created_date: new Date().toISOString(),
        tasks: [],
        milestones: []
      };

      projectService.updateProjectCompletion(project, []);
      expect(project.completion_percentage).toBe(0);
      expect(project.status).toBe('planning');
    });
  });

  describe('Project Summary Generation', () => {
    it('should generate comprehensive project summary', () => {
      const project: Project = {
        id: 'proj_1',
        name: 'Test Project',
        status: 'in_progress',
        completion_percentage: 50,
        created_date: new Date().toISOString(),
        tasks: ['task_1', 'task_2'],
        milestones: []
      };

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
          blockers: ['Waiting for API']
        },
        {
          id: 'task_2',
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
        }
      ];

      const summary = projectService.generateProjectSummary(project, tasks);

      expect(summary.total_tasks).toBe(2);
      expect(summary.completed_tasks).toBe(1);
      expect(summary.blocked_tasks).toBe(1);
      expect(summary.critical_items).toHaveLength(1);
      expect(summary.recent_completions).toHaveLength(1);
      expect(summary.completion_percentage).toBe(50);
    });
  });
});
