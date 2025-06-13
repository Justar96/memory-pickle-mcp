import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { TaskService } from '../src/services/TaskService';
import type { Task, Project } from '../src/types';

describe('TaskService', () => {
  let taskService: TaskService;

  beforeEach(() => {
    taskService = new TaskService();
  });

  describe('Task Creation', () => {
    it('should create a task with required fields', () => {
      const task = taskService.createTask({
        title: 'Test Task',
        project_id: 'proj_1'
      });

      expect(task.id).toMatch(/^task_/);
      expect(task.title).toBe('Test Task');
      expect(task.project_id).toBe('proj_1');
      expect(task.completed).toBe(false);
      expect(task.priority).toBe('medium');
      expect(task.subtasks).toEqual([]);
      expect(task.notes).toEqual([]);
      expect(task.blockers).toEqual([]);
    });

    it('should throw error if title is missing', () => {
      expect(() => taskService.createTask({
        project_id: 'proj_1'
      } as any)).toThrow();
    });

    it('should throw error if project_id is missing', () => {
      expect(() => taskService.createTask({
        title: 'Test Task'
      } as any)).toThrow();
    });
  });

  describe('Task Progress Updates', () => {
    it('should toggle task completion status', () => {
      const task = taskService.createTask({
        title: 'Test Task',
        project_id: 'proj_1'
      });

      expect(task.completed).toBe(false);
      taskService.toggleTask(task);
      expect(task.completed).toBe(true);
      expect(task.progress).toBe(100);
      expect(task.completed_date).toBeDefined();

      taskService.toggleTask(task);
      expect(task.completed).toBe(false);
      expect(task.progress).toBe(0);
      expect(task.completed_date).toBeUndefined();
    });

    it('should update task progress and notes', () => {
      const task = taskService.createTask({
        title: 'Test Task',
        project_id: 'proj_1'
      });

      taskService.updateTaskProgress(task, {
        progress: 50,
        notes: 'Halfway done',
        blockers: ['Waiting for review']
      });

      expect(task.progress).toBe(50);
      expect(task.notes.length).toBe(1);
      expect(task.notes[0]).toContain('Halfway done');
      expect(task.blockers).toEqual(['Waiting for review']);
    });

    it('should mark task as completed when progress reaches 100', () => {
      const task = taskService.createTask({
        title: 'Test Task',
        project_id: 'proj_1'
      });

      taskService.updateTaskProgress(task, { progress: 100 });
      expect(task.completed).toBe(true);
      expect(task.completed_date).toBeDefined();
    });
  });

  describe('Task Hierarchy and Linking', () => {
    it('should update parent task progress based on subtasks', () => {
      const parentTask = taskService.createTask({
        title: 'Parent Task',
        project_id: 'proj_1'
      });

      const subtask1 = taskService.createTask({
        title: 'Subtask 1',
        project_id: 'proj_1',
        parent_id: parentTask.id
      });

      const subtask2 = taskService.createTask({
        title: 'Subtask 2',
        project_id: 'proj_1',
        parent_id: parentTask.id
      });

      parentTask.subtasks = [subtask1.id, subtask2.id];

      const allTasks = [parentTask, subtask1, subtask2];

      taskService.updateTaskProgress(subtask1, { progress: 100 });
      taskService.updateTaskProgress(subtask2, { progress: 50 });

      taskService.updateParentProgress(parentTask, allTasks);

      expect(parentTask.progress).toBe(75);
      expect(parentTask.completed).toBe(false);

      taskService.updateTaskProgress(subtask2, { progress: 100 });
      taskService.updateParentProgress(parentTask, allTasks);

      expect(parentTask.progress).toBe(100);
      expect(parentTask.completed).toBe(true);
      expect(parentTask.completed_date).toBeDefined();
    });

    it('should link task to project and parent task', () => {
      const project: Project = {
        id: 'proj_1',
        name: 'Test Project',
        status: 'in_progress',
        completion_percentage: 0,
        created_date: new Date().toISOString(),
        tasks: [],
        milestones: []
      };

      const parentTask = taskService.createTask({
        title: 'Parent Task',
        project_id: 'proj_1'
      });

      const childTask = taskService.createTask({
        title: 'Child Task',
        project_id: 'proj_1',
        parent_id: parentTask.id
      });

      taskService.linkTaskToProject(childTask, project, parentTask);

      expect(project.tasks).toContain(childTask.id);
      expect(parentTask.subtasks).toContain(childTask.id);
    });
  });

  describe('Task Filtering and Sorting', () => {
    it('should filter tasks by status', () => {
      const tasks: Task[] = [
        taskService.createTask({ title: 'Task 1', project_id: 'proj_1' }),
        taskService.createTask({ title: 'Task 2', project_id: 'proj_1' }),
        taskService.createTask({ title: 'Task 3', project_id: 'proj_1' }),
      ];

      tasks[0].completed = true;
      tasks[1].progress = 50;
      tasks[2].progress = 0;

      const completed = taskService.filterTasks(tasks, { status: 'completed' });
      expect(completed).toHaveLength(1);

      const inProgress = taskService.filterTasks(tasks, { status: 'in_progress' });
      expect(inProgress).toHaveLength(1);

      const pending = taskService.filterTasks(tasks, { status: 'pending' });
      expect(pending).toHaveLength(1);
    });

    it('should sort tasks by completion and priority', () => {
      const tasks: Task[] = [
        taskService.createTask({ title: 'Low Priority', project_id: 'proj_1', priority: 'low' }),
        taskService.createTask({ title: 'Critical Priority', project_id: 'proj_1', priority: 'critical' }),
        taskService.createTask({ title: 'Medium Priority', project_id: 'proj_1', priority: 'medium' }),
      ];

      tasks[0].completed = true;

      const sorted = taskService.sortTasks(tasks);

      expect(sorted[0].priority).toBe('critical');
      expect(sorted[1].priority).toBe('medium');
      expect(sorted[2].completed).toBe(true);
    });
  });
});
