import type { Task, Project } from '../types/index.js';
import { generateId } from '../utils/idGenerator.js';

/**
 * Service responsible for task management operations
 */
export class TaskService {
  /**
   * Creates a new task
   */
  createTask(args: {
    title: string;
    description?: string;
    parent_id?: string;
    priority?: 'critical' | 'high' | 'medium' | 'low';
    due_date?: string;
    tags?: string[];
    project_id: string;
  }): Task {
    const {
      title,
      description,
      parent_id,
      priority,
      due_date,
      tags = [],
      project_id
    } = args;

    // Auto-detect priority from title and description
    const detectedPriority = this.detectPriorityFromText(title, description);
    
    // Use explicit priority if provided, otherwise use auto-detected priority
    const finalPriority = priority || detectedPriority;
    
    if (!title) {
      throw new Error('Task title is required');
    }

    if (!project_id) {
      throw new Error('Project ID is required');
    }

    return {
      id: generateId('task'),
      project_id,
      parent_id,
      title,
      description,
      completed: false,
      created_date: new Date().toISOString(),
      due_date,
      priority: finalPriority,
      tags: Array.isArray(tags) ? tags : [tags],
      subtasks: [],
      notes: [],
      blockers: []
    };
  }

  /**
   * Toggles task completion status
   */
  toggleTask(task: Task): void {
    task.completed = !task.completed;
    if (task.completed) {
      task.completed_date = new Date().toISOString();
      task.progress = 100;
    } else {
      task.completed_date = undefined;
      task.progress = 0; // Reset progress to 0 when marking as incomplete
    }
  }

  /**
   * Updates task progress and related fields
   */
  updateTaskProgress(task: Task, args: {
    progress?: number;
    notes?: string;
    blockers?: string[];
  }): void {
    const { progress, notes, blockers } = args;

    if (progress !== undefined) {
      task.progress = Math.min(100, Math.max(0, progress));
      if (task.progress === 100) {
        task.completed = true;
        task.completed_date = new Date().toISOString();
      }
    }

    if (notes) {
      task.notes = task.notes || [];
      task.notes.push(`[${new Date().toLocaleString()}] ${notes}`);
    }

    if (blockers !== undefined) {
      task.blockers = Array.isArray(blockers) ? blockers : [blockers];
    }
  }

  /**
   * Updates parent task progress based on subtasks
   */
  updateParentProgress(parentTask: Task, allTasks: Task[]): void {
    if (!parentTask.subtasks || parentTask.subtasks.length === 0) return;

    const subtasks = allTasks.filter(t => 
      parentTask.subtasks!.includes(t.id)
    );

    if (subtasks.length === 0) return;

    const totalProgress = subtasks.reduce((sum, task) => {
      if (task.completed) return sum + 100;
      return sum + (task.progress || 0);
    }, 0);

    parentTask.progress = Math.round(totalProgress / subtasks.length);
    
    if (parentTask.progress === 100) {
      parentTask.completed = true;
      parentTask.completed_date = new Date().toISOString();
    }
  }

  /**
   * Adds task to project and parent task if applicable
   */
  linkTaskToProject(task: Task, project: Project, parentTask?: Task): void {
    // Add to project's task list
    if (!project.tasks.includes(task.id)) {
      project.tasks.push(task.id);
    }

    // Add to parent's subtasks if applicable
    if (parentTask && task.parent_id === parentTask.id) {
      parentTask.subtasks = parentTask.subtasks || [];
      if (!parentTask.subtasks.includes(task.id)) {
        parentTask.subtasks.push(task.id);
      }
    }
  }

  /**
   * Finds a task by ID
   */
  findTaskById(tasks: Task[], taskId: string): Task | undefined {
    return tasks.find(t => t.id === taskId);
  }

  /**
   * Filters tasks based on criteria
   */
  filterTasks(tasks: Task[], filters: {
    status?: 'completed' | 'pending' | 'in_progress';
    project_id?: string;
    parent_id?: string;
    priority?: 'critical' | 'high' | 'medium' | 'low';
  }): Task[] {
    const { status, project_id, parent_id, priority } = filters;
    
    let filteredTasks = [...tasks];

    if (project_id) {
      filteredTasks = filteredTasks.filter(t => t.project_id === project_id);
    }

    if (status === 'completed') {
      filteredTasks = filteredTasks.filter(t => t.completed === true);
    } else if (status === 'pending') {
      filteredTasks = filteredTasks.filter(t => t.completed === false && (!t.progress || t.progress === 0));
    } else if (status === 'in_progress') {
      filteredTasks = filteredTasks.filter(t => t.completed === false && t.progress && t.progress > 0 && t.progress < 100);
    }

    if (parent_id !== undefined) {
      filteredTasks = filteredTasks.filter(t => t.parent_id === parent_id);
    }

    if (priority) {
      filteredTasks = filteredTasks.filter(t => t.priority === priority);
    }

    return filteredTasks;
  }

  /**
   * Sorts tasks by priority and completion status
   */
  sortTasks(tasks: Task[]): Task[] {
    return tasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Formats task tree for display
   */
  formatTaskTree(task: Task, allTasks: Task[], indent: number = 0): string {
    const indentStr = '  '.repeat(indent);
    const checkbox = task.completed ? '✅' : '⬜';
    const progress = task.progress ? ` (${task.progress}%)` : '';
    
    let result = `${indentStr}${checkbox} ${task.title}${progress} [${task.priority}]\n`;
    
    if (task.blockers && task.blockers.length > 0) {
      result += `${indentStr}  🚨 Blocked: ${task.blockers.join(', ')}\n`;
    }

    if (task.subtasks && task.subtasks.length > 0) {
      const subtasks = allTasks.filter(t => task.subtasks!.includes(t.id));
      subtasks.forEach(subtask => {
        result += this.formatTaskTree(subtask, allTasks, indent + 1);
      });
    }

    return result;
  }

  /**
   * Formats task list for display
   */
  formatTaskList(tasks: Task[]): string {
    let result = `# 📋 Task List\n\n`;
    result += `**Found:** ${tasks.length} tasks\n\n`;

    tasks.forEach(task => {
      result += `${task.completed ? '✅' : '⬜'} **${task.title}** (${task.id})\n`;
      result += `   Priority: ${task.priority} | Progress: ${task.progress || 0}%\n`;
      if (task.description) result += `   ${task.description}\n`;
      if (task.blockers && task.blockers.length > 0) {
        result += `   🚨 Blocked: ${task.blockers.join(', ')}\n`;
      }
      result += '\n';
    });

    return result;
  }

  /**
   * Exports task tree to markdown format
   */
  exportTaskTree(task: Task, allTasks: Task[], indent: number = 0): string {
    const indentStr = '  '.repeat(indent);
    const checkbox = task.completed ? '- [x]' : '- [ ]';
    
    let result = `${indentStr}${checkbox} ${task.title}`;
    if (task.priority !== 'medium') result += ` (${task.priority})`;
    if (task.progress && !task.completed) result += ` - ${task.progress}%`;
    result += '\n';
    
    if (task.description) {
      result += `${indentStr}  > ${task.description}\n`;
    }
    
    if (task.blockers && task.blockers.length > 0) {
      result += `${indentStr}  > 🚨 Blocked: ${task.blockers.join(', ')}\n`;
    }

    if (task.subtasks && task.subtasks.length > 0) {
      const subtasks = allTasks.filter(t => task.subtasks!.includes(t.id));
      subtasks.forEach(subtask => {
        result += this.exportTaskTree(subtask, allTasks, indent + 1);
      });
    }

    return result;
  }

  /**
   * Detects priority level from task title and description text
   */
  private detectPriorityFromText(title: string, description?: string): 'critical' | 'high' | 'medium' | 'low' {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    // Critical priority keywords
    const criticalKeywords = ['urgent', 'critical', 'emergency', 'blocking', 'security', 'urgent:', 'critical:', 'emergency:'];
    if (criticalKeywords.some(keyword => text.includes(keyword))) {
      return 'critical';
    }
    
    // High priority keywords
    const highKeywords = ['important', 'deadline', 'core feature', 'must have', 'high priority', 'asap', 'important:'];
    if (highKeywords.some(keyword => text.includes(keyword))) {
      return 'high';
    }
    
    // Low priority keywords
    const lowKeywords = ['nice to have', 'maybe', 'consider', 'polish', 'optional', 'low priority', 'when time permits'];
    if (lowKeywords.some(keyword => text.includes(keyword))) {
      return 'low';
    }
    
    // Default to medium if no keywords match
    return 'medium';
  }

  /**
   * Builds quick-lookup indexes for tasks.
   * Returns plain objects for easy JSON-serialisation.
   *
   * Example:
   * ```ts
   * const { tasksById, tasksByProject } = TaskService.buildIndexes(allTasks);
   * const myTask = tasksById[taskId];
   * const tasksForProject = tasksByProject[projectId] || [];
   * ```
   */
  static buildIndexes(tasks: Task[]): {
    tasksById: Record<string, Task>;
    tasksByProject: Record<string, Task[]>;
  } {
    const tasksById: Record<string, Task> = {};
    const tasksByProject: Record<string, Task[]> = {};

    tasks.forEach(task => {
      tasksById[task.id] = task;

      if (!tasksByProject[task.project_id]) {
        tasksByProject[task.project_id] = [];
      }
      tasksByProject[task.project_id].push(task);
    });

    return { tasksById, tasksByProject };
  }
}