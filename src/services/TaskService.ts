import type { Task, Project, LineRange } from '../types/index.js';
import { generateId } from '../utils/idGenerator.js';

/**
 * High-performance service for task management operations with optimized algorithms and caching
 */
export class TaskService {
  // Cache for priority detection to avoid repeated regex operations
  private static priorityCache = new Map<string, 'critical' | 'high' | 'medium' | 'low'>();
  private static readonly PRIORITY_CACHE_SIZE = 100;

  /**
   * Creates a new task with intelligent priority detection
   */
  createTask(args: {
    title: string;
    description?: string;
    parent_id?: string;
    priority?: 'critical' | 'high' | 'medium' | 'low';
    due_date?: string;
    tags?: string[];
    project_id: string;
    line_range?: LineRange;
  }): Task {
    const {
      title,
      description,
      parent_id,
      priority,
      due_date,
      tags = [],
      project_id,
      line_range
    } = args;

    // Validate required fields
    if (!title?.trim()) {
      throw new Error('Task title is required and cannot be empty');
    }
    if (!project_id?.trim()) {
      throw new Error('Project ID is required and cannot be empty');
    }

    // Validate priority if provided
    if (priority && !['critical', 'high', 'medium', 'low'].includes(priority)) {
      throw new Error(`Invalid priority: ${priority}. Must be one of: critical, high, medium, low`);
    }

    // Validate line_range if provided
    this.validateLineRange(line_range);

    // Auto-detect priority from title and description
    const detectedPriority = priority || this.detectPriorityFromText(title, description);

    return {
      id: generateId('task'),
      project_id,
      parent_id,
      title: title.trim(),
      description: description?.trim(),
      completed: false,
      progress: 0,
      created_date: new Date().toISOString(),
      due_date,
      priority: detectedPriority,
      tags: Array.isArray(tags) ? tags.filter(tag => tag?.trim()) : [],
      subtasks: [],
      notes: [],
      blockers: [],
      line_range
    };
  }

  /**
   * Validates line range parameters
   */
  private validateLineRange(line_range: LineRange | undefined): void {
    if (!line_range) return;
    
    if (typeof line_range.start_line !== 'number' || typeof line_range.end_line !== 'number') {
      throw new Error('Line range start_line and end_line must be numbers');
    }
    if (line_range.start_line < 1 || line_range.end_line < 1) {
      throw new Error('Line numbers must be positive (1-based)');
    }
    if (line_range.start_line > line_range.end_line) {
      throw new Error('start_line must be less than or equal to end_line');
    }
    if (line_range.file_path && !line_range.file_path.trim()) {
      throw new Error('file_path cannot be empty if provided');
    }
  }

  /**
   * Updates task progress and related fields efficiently
   */
  updateTaskProgress(task: Task, args: {
    progress?: number;
    notes?: string;
    blockers?: string[];
  }): void {
    const { progress, notes, blockers } = args;

    if (progress !== undefined) {
      if (typeof progress !== 'number' || progress < 0 || progress > 100) {
        throw new Error('Progress must be a number between 0 and 100');
      }
      
      task.progress = Math.round(progress); // Round to avoid floating point issues
      
      if (task.progress === 100 && !task.completed) {
        task.completed = true;
        task.completed_date = new Date().toISOString();
      } else if (task.progress < 100 && task.completed) {
        // If progress is reduced below 100, un-complete the task
        task.completed = false;
        task.completed_date = undefined;
      }
    }

    if (notes?.trim()) {
      task.notes = task.notes || [];
      task.notes.push(`[${new Date().toLocaleString()}] ${notes.trim()}`);
    }

    if (blockers !== undefined) {
      task.blockers = blockers.filter(blocker => typeof blocker === 'string' && blocker.trim());
    }
  }

  /**
   * Updates parent task progress based on subtasks with optimized calculation
   */
  updateParentProgress(parentTask: Task, allTasks: Task[]): void {
    if (!parentTask.subtasks || parentTask.subtasks.length === 0) return;

    // Use Set for O(1) lookup instead of Array.includes
    const subtaskIds = new Set(parentTask.subtasks);
    const subtasks = allTasks.filter(t => subtaskIds.has(t.id));

    if (subtasks.length === 0) return;

    const totalProgress = subtasks.reduce((sum, task) => {
      return sum + (task.completed ? 100 : (task.progress || 0));
    }, 0);

    parentTask.progress = Math.round(totalProgress / subtasks.length);
    
    if (parentTask.progress === 100 && !parentTask.completed) {
      parentTask.completed = true;
      parentTask.completed_date = new Date().toISOString();
    }
  }

  /**
   * Links task to project and parent task efficiently
   */
  linkTaskToProject(task: Task, project: Project, parentTask?: Task): void {
    // Add to project's task list if not already present
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
   * Finds a task by ID with error context
   */
  findTaskById(tasks: Task[], taskId: string): Task | undefined {
    if (!Array.isArray(tasks)) {
      throw new Error('Tasks parameter must be an array');
    }
    if (!taskId?.trim()) {
      throw new Error('Task ID is required and cannot be empty');
    }
    
    return tasks.find(t => t.id === taskId);
  }

  /**
   * Updates a task in the tasks array with comprehensive validation
   */
  updateTask(tasks: Task[], taskId: string, updates: Partial<Task>): Task {
    const task = this.findTaskById(tasks, taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}. Available task IDs: ${tasks.slice(0, 5).map(t => t.id).join(', ')}${tasks.length > 5 ? '...' : ''}`);
    }

    // Validate updates before applying
    if (updates.progress !== undefined) {
      if (typeof updates.progress !== 'number' || updates.progress < 0 || updates.progress > 100) {
        throw new Error('Progress must be a number between 0 and 100');
      }
    }

    if (updates.priority && !['critical', 'high', 'medium', 'low'].includes(updates.priority)) {
      throw new Error(`Invalid priority: ${updates.priority}`);
    }

    if (updates.title !== undefined && !updates.title?.trim()) {
      throw new Error('Task title cannot be empty');
    }

    // Apply updates
    Object.assign(task, updates);

    // Handle completion date when completed is set to true
    if (updates.completed === true && !task.completed_date) {
      task.completed_date = new Date().toISOString();
    } else if (updates.completed === false) {
      task.completed_date = undefined;
    }

    // Handle progress-based completion (only if progress reaches 100 and completed wasn't explicitly set)
    if (updates.progress !== undefined && updates.progress >= 100 && updates.completed === undefined) {
      task.completed = true;
      task.completed_date = new Date().toISOString();
    }

    return task;
  }

  /**
   * Optimized task toggling with overloaded signatures
   */
  toggleTask(tasks: Task[], taskId: string): Task;
  toggleTask(task: Task): void;
  toggleTask(tasksOrTask: Task[] | Task, taskId?: string): Task | void {
    if (Array.isArray(tasksOrTask)) {
      // Array version
      const task = this.findTaskById(tasksOrTask, taskId!);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }
      this.toggleSingleTask(task);
      return task;
    } else {
      // Single task version
      this.toggleSingleTask(tasksOrTask);
    }
  }

  /**
   * Helper method for toggling a single task
   */
  private toggleSingleTask(task: Task): void {
    task.completed = !task.completed;
    if (task.completed) {
      task.completed_date = new Date().toISOString();
      task.progress = 100;
    } else {
      task.completed_date = undefined;
      task.progress = 0;
    }
  }

  /**
   * Optimized task filtering with better performance for large datasets
   */
  filterTasks(tasks: Task[], filters: {
    status?: 'completed' | 'pending' | 'in_progress';
    project_id?: string;
    parent_id?: string;
    priority?: 'critical' | 'high' | 'medium' | 'low';
    text_search?: string;
  }): Task[] {
    const { status, project_id, parent_id, priority, text_search } = filters;
    
    let filteredTasks = tasks;

    // Apply filters in order of selectivity for better performance
    if (project_id) {
      filteredTasks = filteredTasks.filter(t => t.project_id === project_id);
    }

    if (priority) {
      filteredTasks = filteredTasks.filter(t => t.priority === priority);
    }

    if (parent_id !== undefined) {
      filteredTasks = filteredTasks.filter(t => t.parent_id === parent_id);
    }

    if (status) {
      switch (status) {
        case 'completed':
          filteredTasks = filteredTasks.filter(t => t.completed === true);
          break;
        case 'pending':
          filteredTasks = filteredTasks.filter(t => !t.completed && (!t.progress || t.progress === 0));
          break;
        case 'in_progress':
          filteredTasks = filteredTasks.filter(t => !t.completed && t.progress && t.progress > 0 && t.progress < 100);
          break;
      }
    }

    if (text_search?.trim()) {
      const searchTerm = text_search.trim().toLowerCase();
      filteredTasks = filteredTasks.filter(t => 
        t.title.toLowerCase().includes(searchTerm) ||
        (t.description && t.description.toLowerCase().includes(searchTerm)) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    return filteredTasks;
  }

  /**
   * Optimized task sorting with stable sort algorithm
   */
  sortTasks(tasks: Task[], sortBy: 'priority' | 'created_date' | 'progress' | 'title' = 'priority'): Task[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    return [...tasks].sort((a, b) => {
      // Always sort completed tasks after incomplete ones
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      switch (sortBy) {
        case 'priority':
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'created_date':
          return new Date(a.created_date).getTime() - new Date(b.created_date).getTime();
        case 'progress':
          return (b.progress || 0) - (a.progress || 0);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
    });
  }

  /**
   * Optimized task tree formatting with better performance
   */
  formatTaskTree(task: Task, allTasks: Task[], indent: number = 0): string {
    const indentStr = '  '.repeat(indent);
    const checkbox = task.completed ? '[DONE]' : '[ ]';
    const progress = task.progress ? ` (${task.progress}%)` : '';
    
    let result = `${indentStr}${checkbox} ${task.title}${progress} [${task.priority}]\n`;
    
    if (task.blockers && task.blockers.length > 0) {
      result += `${indentStr}  [BLOCKED] ${task.blockers.join(', ')}\n`;
    }

    if (task.subtasks && task.subtasks.length > 0) {
      // Use Set for O(1) lookup performance
      const taskMap = new Map(allTasks.map(t => [t.id, t]));
      const subtasks = task.subtasks.map(id => taskMap.get(id)).filter(Boolean) as Task[];
      
      subtasks.forEach(subtask => {
        result += this.formatTaskTree(subtask, allTasks, indent + 1);
      });
    }

    return result;
  }

  /**
   * Enhanced task list formatting with summary statistics
   */
  formatTaskList(tasks: Task[], includeStats: boolean = true): string {
    let result = `# Task List\n\n`;
    
    if (includeStats) {
      const completed = tasks.filter(t => t.completed).length;
      const inProgress = tasks.filter(t => !t.completed && t.progress && t.progress > 0).length;
      const blocked = tasks.filter(t => t.blockers && t.blockers.length > 0).length;
      
      result += `**Summary:** ${tasks.length} total • ${completed} completed • ${inProgress} in progress • ${blocked} blocked\n\n`;
    } else {
      result += `**Found:** ${tasks.length} tasks\n\n`;
    }

    tasks.forEach(task => {
      const status = task.completed ? '[DONE]' : '[ ]';
      result += `${status} **${task.title}** (${task.id})\n`;
      result += `   Priority: ${task.priority} | Progress: ${task.progress || 0}%`;
      
      if (task.due_date) {
        result += ` | Due: ${new Date(task.due_date).toLocaleDateString()}`;
      }
      result += '\n';
      
      if (task.description) {
        result += `   ${task.description}\n`;
      }
      
      if (task.blockers && task.blockers.length > 0) {
        result += `   [BLOCKED] ${task.blockers.join(', ')}\n`;
      }
      
      result += '\n';
    });

    return result;
  }

  /**
   * Optimized markdown export with better performance
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
      result += `${indentStr}  > [BLOCKED] ${task.blockers.join(', ')}\n`;
    }

    if (task.subtasks && task.subtasks.length > 0) {
      // Use Map for O(1) lookup
      const taskMap = new Map(allTasks.map(t => [t.id, t]));
      const subtasks = task.subtasks.map(id => taskMap.get(id)).filter(Boolean) as Task[];
      
      subtasks.forEach(subtask => {
        result += this.exportTaskTree(subtask, allTasks, indent + 1);
      });
    }

    return result;
  }

  /**
   * Cached priority detection from task title and description text
   */
  private detectPriorityFromText(title: string, description?: string): 'critical' | 'high' | 'medium' | 'low' {
    const cacheKey = `${title}|${description || ''}`;
    
    // Check cache first
    if (TaskService.priorityCache.has(cacheKey)) {
      return TaskService.priorityCache.get(cacheKey)!;
    }

    const text = `${title} ${description || ''}`.toLowerCase();
    let detectedPriority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
    
    // Critical priority keywords
    if (/\b(urgent|critical|emergency|blocking|security|asap|immediately)\b/.test(text)) {
      detectedPriority = 'critical';
    }
    // High priority keywords
    else if (/\b(important|deadline|core feature|must have|high priority)\b/.test(text)) {
      detectedPriority = 'high';
    }
    // Low priority keywords
    else if (/\b(nice to have|maybe|consider|polish|optional|low priority|when time permits)\b/.test(text)) {
      detectedPriority = 'low';
    }

    // Cache the result (with size limit)
    if (TaskService.priorityCache.size >= TaskService.PRIORITY_CACHE_SIZE) {
      // Clear oldest entries (simple FIFO)
      const keys = Array.from(TaskService.priorityCache.keys());
      for (let i = 0; i < Math.floor(TaskService.PRIORITY_CACHE_SIZE * 0.2); i++) {
        TaskService.priorityCache.delete(keys[i]);
      }
    }
    
    TaskService.priorityCache.set(cacheKey, detectedPriority);
    return detectedPriority;
  }

  /**
   * Builds optimized quick-lookup indexes for tasks with better performance
   */
  static buildIndexes(tasks: Task[]): {
    tasksById: Map<string, Task>;
    tasksByProject: Map<string, Task[]>;
    tasksByStatus: Map<string, Task[]>;
    tasksByPriority: Map<string, Task[]>;
  } {
    const tasksById = new Map<string, Task>();
    const tasksByProject = new Map<string, Task[]>();
    const tasksByStatus = new Map<string, Task[]>();
    const tasksByPriority = new Map<string, Task[]>();

    tasks.forEach(task => {
      // By ID index
      tasksById.set(task.id, task);

      // By project index
      if (!tasksByProject.has(task.project_id)) {
        tasksByProject.set(task.project_id, []);
      }
      tasksByProject.get(task.project_id)!.push(task);

      // By status index
      const status = task.completed ? 'completed' : 'active';
      if (!tasksByStatus.has(status)) {
        tasksByStatus.set(status, []);
      }
      tasksByStatus.get(status)!.push(task);

      // By priority index
      if (!tasksByPriority.has(task.priority)) {
        tasksByPriority.set(task.priority, []);
      }
      tasksByPriority.get(task.priority)!.push(task);
    });

    return { tasksById, tasksByProject, tasksByStatus, tasksByPriority };
  }

  /**
   * Clears the priority detection cache (useful for testing)
   */
  static clearPriorityCache(): void {
    TaskService.priorityCache.clear();
  }
}