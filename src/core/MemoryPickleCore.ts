import type { ProjectDatabase, Project, Task } from '../types/index.js';
import { InMemoryStore, ProjectService, TaskService, MemoryService } from '../services/index.js';
import { ValidationUtils } from '../utils/ValidationUtils.js';
import { DryRunResult, formatErrorResponse } from '../utils/errors.js';

/**
 * Core business logic for Memory Pickle MCP Server with robust error handling
 * Contains all the business methods without MCP-specific concerns
 * Implements defensive programming practices and comprehensive validation
 */
export class MemoryPickleCore {
  private inMemoryStore: InMemoryStore;
  private projectService: ProjectService;
  private taskService: TaskService;
  private memoryService: MemoryService;
  private sessionStartTime: Date;
  private taskIndex: Map<string, Task>;
  private isShuttingDown: boolean = false;

  // Enhanced session tracking
  private sessionActivity: {
    tasksCreated: string[];
    tasksUpdated: string[];
    tasksCompleted: string[];
    memoriesCreated: string[];
    projectsCreated: string[];
    projectSwitches: string[];
    lastActiveProject?: string;
    keyDecisions: string[];
    toolUsageCount: Map<string, number>;
  };

  constructor(
    inMemoryStore: InMemoryStore,
    projectService: ProjectService,
    taskService: TaskService,
    memoryService: MemoryService
  ) {
    this.inMemoryStore = inMemoryStore;
    this.projectService = projectService;
    this.taskService = taskService;
    this.memoryService = memoryService;
    this.sessionStartTime = new Date();
    this.taskIndex = new Map();
    this.sessionActivity = {
      tasksCreated: [],
      tasksUpdated: [],
      tasksCompleted: [],
      memoriesCreated: [],
      projectsCreated: [],
      projectSwitches: [],
      keyDecisions: [],
      toolUsageCount: new Map()
    };
    this.buildTaskIndex();
  }

  static async create(): Promise<MemoryPickleCore> {
    const inMemoryStore = new InMemoryStore();
    const projectService = new ProjectService();
    const taskService = new TaskService();
    const memoryService = new MemoryService();

    return new MemoryPickleCore(inMemoryStore, projectService, taskService, memoryService);
  }

  private buildTaskIndex(): void {
    if (this.isShuttingDown) return;

    const database = this.inMemoryStore.getDatabase();
    this.taskIndex.clear();
    for (const task of database.tasks) {
      this.taskIndex.set(task.id, task);
    }
  }

  /**
   * Recalculates and updates project completion percentage based on current tasks
   */
  private async _recalculateProjectCompletion(projectId: string): Promise<void> {
    await this.inMemoryStore.runExclusive(async (db) => {
      const project = this.projectService.findProjectById(db.projects, projectId);
      if (!project) {
        return { result: undefined, commit: false };
      }

      // Use the existing ProjectService logic for consistency
      this.projectService.updateProjectCompletion(project, db.tasks);

      return {
        result: undefined,
        commit: true,
        changedParts: new Set(['projects'] as const)
      };
    });
  }



  /**
   * Safely executes operations with comprehensive error handling
   */
  private async safeExecute<T>(
    operation: string,
    executor: () => Promise<T>
  ): Promise<T> {
    if (this.isShuttingDown) {
      throw new Error(`${operation}: System is shutting down`);
    }

    try {
      return await executor();
    } catch (error) {
      // Log error details for debugging (without console output)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Re-throw with operation context
      throw new Error(`${operation}: ${errorMessage}`);
    }
  }

  /**
   * Validates that the current project exists and is accessible
   */
  private validateCurrentProject(): string {
    // Always get fresh database reference to avoid stale data
    const currentDatabase = this.inMemoryStore.getDatabase();
    const currentProjectId = currentDatabase.meta?.current_project_id;

    if (!currentProjectId) {
      throw new Error('No current project set. Use set_current_project or provide project_id parameter.');
    }

    const project = this.projectService.findProjectById(currentDatabase.projects, currentProjectId);
    if (!project) {
      // Auto-fix: clear invalid current project
      currentDatabase.meta.current_project_id = undefined;
      throw new Error('Current project no longer exists. Please set a new current project.');
    }

    return currentProjectId;
  }

  // Project Management Methods
  async create_project(args: any): Promise<any> {
    return this.safeExecute('create_project', async () => {
      this.trackToolUsage('create_project');

      // Basic input validation (MCP schemas handle structure, but we need null checks)
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments - expected object');
      }

      const { name, description = '', status = 'planning', dry_run = false } = args;

      // Check required fields and sanitize
      if (name === undefined || name === null) {
        throw new Error("Missing required field 'name'");
      }

      const sanitizedName = ValidationUtils.sanitizeString(name);
      const sanitizedDescription = ValidationUtils.sanitizeString(description);

      if (!sanitizedName) {
        throw new Error("Field 'name' cannot be empty");
      }
      if (sanitizedName.length > 200) {
        throw new Error('Project name cannot exceed 200 characters');
      }
      if (sanitizedDescription.length > 20000) {
        throw new Error('Project description cannot exceed 20000 characters');
      }
      if (status && !['planning', 'in_progress', 'blocked', 'completed', 'archived'].includes(status)) {
        throw new Error('Invalid project status');
      }

      // Handle dry run
      if (dry_run) {
        return {
          content: [{
            type: "text",
            text: `[DRY RUN] create_project: Would create project '${sanitizedName}' with description '${sanitizedDescription}' and set it as current project. No changes made.`
          }],
          isError: false
        };
      }

      const result = await this.inMemoryStore.runExclusive(async (db) => {
        const newProject = this.projectService.createProject({
          name: sanitizedName,
          description: sanitizedDescription
        });

        // Set status if provided
        if (status && status !== 'planning') {
          newProject.status = status;
        }

        db.projects.push(newProject);

        // Automatically set this as the current project
        if (!db.meta) {
          db.meta = {
            last_updated: new Date().toISOString(),
            version: "2.0.0",
            session_count: 0,
            current_project_id: newProject.id
          };
        } else {
          db.meta.current_project_id = newProject.id;
          db.meta.last_updated = new Date().toISOString();
        }

        return {
          result: newProject,
          commit: true,
          changedParts: new Set(['projects', 'meta'] as const)
        };
      });

      // Track session activity
      this.trackToolUsage('create_project', 'project_created', result.id);

      // Note: No need to reload database since we're working with the same instance

      return {
        content: [{
          type: "text",
          text: `[OK] **Project Created Successfully!**\n\n**Name:** ${result.name}\n**ID:** ${result.id}\n**Status:** ${result.status}\n**Description:** ${result.description || 'No description provided'}\n\n[OK] **This project is now your current project.** You can add tasks using the \`create_task\` tool without specifying a project_id.\n\n[INFO] **Note:** Data is stored in memory only. Consider creating markdown files to document your project progress for future reference.`
        }]
      };
    });
  }

  async get_project_status(args: any): Promise<any> {
    const { project_id } = args;

    // Always get fresh database reference
    const currentDatabase = this.inMemoryStore.getDatabase();
    
    // If no project_id provided, try to use the current project from meta
    let targetProjectId = project_id;
    if (!targetProjectId && currentDatabase.meta?.current_project_id) {
      targetProjectId = currentDatabase.meta.current_project_id;
    }

    // If still no project_id, show all projects
    if (!targetProjectId) {
      return this.getAllProjectsStatus();
    }

    const project = this.projectService.findProjectById(currentDatabase.projects, targetProjectId);
    if (!project) {
      throw new Error(`Project not found: ${targetProjectId}`);
    }

    const projectTasks = currentDatabase.tasks.filter(task => task.project_id === targetProjectId);
    const completedTasks = projectTasks.filter(task => task.completed);
    const activeTasks = projectTasks.filter(task => !task.completed);

    // Calculate completion percentage for display (read-only, no side effects)
    const displayCompletion = projectTasks.length > 0
      ? Math.round((completedTasks.length / projectTasks.length) * 100)
      : 0;

    let statusText = `# Project Status: **${project.name}**\n\n`;
    statusText += `**ID:** ${project.id}\n`;
    statusText += `**Status:** ${project.status}\n`;
    statusText += `**Completion:** ${displayCompletion}%\n`;
    statusText += `**Description:** ${project.description || 'No description'}\n\n`;

    statusText += `## Tasks Summary\n`;
    statusText += `- **Total Tasks:** ${projectTasks.length}\n`;
    statusText += `- **Completed:** ${completedTasks.length}\n`;
    statusText += `- **Active:** ${activeTasks.length}\n\n`;

    if (activeTasks.length > 0) {
      statusText += `### Active Tasks:\n`;
      activeTasks.slice(0, 5).forEach(task => {
        statusText += `- **${task.title}** (${task.priority} priority)\n`;
      });
      if (activeTasks.length > 5) {
        statusText += `- ... and ${activeTasks.length - 5} more\n`;
      }
    }

    return {
      content: [{
        type: "text",
        text: statusText
      }]
    };
  }

  /**
   * Get status for all projects when no specific project is requested
   */
  private getAllProjectsStatus(): any {
    const currentDatabase = this.inMemoryStore.getDatabase();
    const projects = currentDatabase.projects;

    if (projects.length === 0) {
      return {
        content: [{
          type: "text",
          text: `[INFO] **No Projects Found**\n\nYou haven't created any projects yet. Use the \`create_project\` tool to get started!`
        }]
      };
    }

    let statusText = `[INFO] **All Projects Overview**\n\n`;

    projects.forEach(project => {
      const projectTasks = currentDatabase.tasks.filter(task => task.project_id === project.id);
      const completedTasks = projectTasks.filter(task => task.completed);
      const completion = projectTasks.length > 0
        ? Math.round((completedTasks.length / projectTasks.length) * 100)
        : 0;

      const isCurrentProject = currentDatabase.meta?.current_project_id === project.id;
      const currentMarker = isCurrentProject ? ' [CURRENT]' : '';

      statusText += `**${project.name}**${currentMarker}\n`;
      statusText += `- Status: ${project.status}\n`;
      statusText += `- Tasks: ${projectTasks.length} total, ${completedTasks.length} completed (${completion}%)\n`;
      statusText += `- ID: ${project.id}\n\n`;
    });

    statusText += `Use \`get_project_status\` with a specific project_id for detailed information.`;

    return {
      content: [{
        type: "text",
        text: statusText
      }]
    };
  }

  async update_project(args: any): Promise<any> {
    const { project_id, name, description, status } = args;

    if (!project_id) {
      throw new Error('Project ID is required');
    }

    const result = await this.inMemoryStore.runExclusive(async (db) => {
      const project = this.projectService.findProjectById(db.projects, project_id);
      if (!project) {
        throw new Error(`Project not found: ${project_id}`);
      }

      const updates: Partial<Project> = {};
      if (name !== undefined) updates.name = name.trim();
      if (description !== undefined) updates.description = description.trim();
      if (status !== undefined) updates.status = status;

      const updatedProject = this.projectService.updateProject(db.projects, project_id, updates);

      return {
        result: updatedProject,
        commit: true,
        changedParts: new Set(['projects'] as const)
      };
    });

    // Note: No need to reload database since we're working with the same instance

    return {
      content: [{
        type: "text",
        text: `[OK] **Project Updated Successfully!**\n\n**Name:** ${result.name}\n**Status:** ${result.status}\n**Description:** ${result.description || 'No description'}`
      }]
    };
  }



  // Task Management Methods
  async create_task(args: any): Promise<any> {
    return this.safeExecute('create_task', async () => {
      this.trackToolUsage('create_task');

      // Basic input validation (MCP schemas handle structure, but we need null checks)
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments - expected object');
      }

      const { title, description = '', priority = 'medium', project_id, parent_id, line_range, dry_run = false } = args;

      // Check required fields and sanitize
      if (title === undefined || title === null) {
        throw new Error("Missing required field 'title'");
      }

      const sanitizedTitle = ValidationUtils.sanitizeString(title);
      const sanitizedDescription = ValidationUtils.sanitizeString(description);

      if (!sanitizedTitle) {
        throw new Error("Field 'title' cannot be empty");
      }
      if (sanitizedTitle.length > 200) {
        throw new Error('Task title cannot exceed 200 characters');
      }
      if (sanitizedDescription.length > 2000) {
        throw new Error('Task description cannot exceed 2000 characters');
      }
      if (priority && !['low', 'medium', 'high', 'critical'].includes(priority)) {
        throw new Error('Invalid task priority');
      }

      // If no project_id provided, try to use the current project from meta
      let targetProjectId = project_id;
      if (!targetProjectId) {
        targetProjectId = this.validateCurrentProject();
      }

      // Handle dry run
      if (dry_run) {
        return {
          content: [{
            type: "text",
            text: `[DRY RUN] create_task: Would create task '${sanitizedTitle}' with priority '${priority}' in project '${targetProjectId}'. No changes made.`
          }],
          isError: false
        };
      }

      const result = await this.inMemoryStore.runExclusive(async (db) => {
        // Verify project exists
        const project = this.projectService.findProjectById(db.projects, targetProjectId);
        if (!project) {
          throw new Error(`Project not found: ${targetProjectId}`);
        }

        // Verify parent task exists if provided
        if (parent_id) {
          const parentTask = this.taskService.findTaskById(db.tasks, parent_id);
          if (!parentTask) {
            throw new Error(`Parent task not found: ${parent_id}`);
          }
          if (parentTask.project_id !== targetProjectId) {
            throw new Error('Parent task must be in the same project');
          }
        }

        const newTask = this.taskService.createTask({
          title: sanitizedTitle,
          description: sanitizedDescription,
          priority,
          project_id: targetProjectId,
          parent_id,
          line_range
        });

        db.tasks.push(newTask);

        return {
          result: newTask,
          commit: true,
          changedParts: new Set(['tasks'] as const)
        };
      });

      // Note: No need to reload database since we're working with the same instance
      this.buildTaskIndex();

      // Recalculate project completion since we added a new task
      await this._recalculateProjectCompletion(targetProjectId);

      // Track session activity
      this.trackToolUsage('create_task', 'task_created', result.id);

      const database = this.inMemoryStore.getDatabase();
      const project = this.projectService.findProjectById(database.projects, targetProjectId);

      return {
        content: [{
          type: "text",
          text: `[OK] **Task Created Successfully!**\n\n**Title:** ${result.title}\n**ID:** ${result.id}\n**Project:** ${project?.name}\n**Priority:** ${result.priority}\n**Description:** ${result.description || 'No description provided'}\n\nTask is ready to be worked on!`
        }]
      };
    });
  }

  async update_task(args: any): Promise<any> {
    return this.safeExecute('update_task', async () => {
      this.trackToolUsage('update_task');

      // Basic input validation (MCP schemas handle structure, but we need null checks)
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments - expected object');
      }

      const { task_id, title, description, priority, completed, progress, notes, blockers, dry_run = false } = args;

      // Check required fields
      if (task_id === undefined || task_id === null) {
        throw new Error("Missing required field 'task_id'");
      }

      const sanitizedTitle = title !== undefined ? ValidationUtils.sanitizeString(title) : undefined;
      const sanitizedDescription = description !== undefined ? ValidationUtils.sanitizeString(description) : undefined;

      if (sanitizedTitle !== undefined && sanitizedTitle.length > 200) {
        throw new Error('Task title cannot exceed 200 characters');
      }
      if (sanitizedDescription !== undefined && sanitizedDescription.length > 2000) {
        throw new Error('Task description cannot exceed 2000 characters');
      }
      if (priority !== undefined && !['low', 'medium', 'high', 'critical'].includes(priority)) {
        throw new Error('Invalid task priority');
      }

      // Handle dry run
      if (dry_run) {
        return {
          content: [{
            type: "text",
            text: `[DRY RUN] update_task: Would update task '${task_id}' with provided changes. No changes made.`
          }],
          isError: false
        };
      }

      const result = await this.inMemoryStore.runExclusive(async (db) => {
      const task = this.taskService.findTaskById(db.tasks, task_id);
      if (!task) {
        throw new Error(`Task not found: ${task_id}`);
      }

      const updates: Partial<Task> = {};
      if (sanitizedTitle !== undefined) updates.title = sanitizedTitle;
      if (sanitizedDescription !== undefined) updates.description = sanitizedDescription;
      if (priority !== undefined) updates.priority = priority;
      if (completed !== undefined) {
        updates.completed = completed;
        if (completed) {
          updates.completed_date = new Date().toISOString();
        }
      }
      if (progress !== undefined) updates.progress = progress;

      const updatedTask = this.taskService.updateTask(db.tasks, task_id, updates);

      // Add notes and blockers if provided
      if (notes) {
        if (!updatedTask.notes) updatedTask.notes = [];

        if (Array.isArray(notes)) {
          // Handle array of notes
          for (const note of notes) {
            if (note?.trim()) {
              updatedTask.notes.push(`${new Date().toISOString()}: ${note.trim()}`);
            }
          }
        } else if (typeof notes === 'string' && notes.trim()) {
          // Handle single note string
          updatedTask.notes.push(`${new Date().toISOString()}: ${notes.trim()}`);
        }
      }

      if (blockers && Array.isArray(blockers)) {
        updatedTask.blockers = [...(updatedTask.blockers || []), ...blockers];
      }

      // Add progress note as memory if provided
      const noteContent = Array.isArray(notes) ? notes.join('; ') : notes;
      if (noteContent?.trim()) {
        this.memoryService.addMemory(db.memories, {
          title: `Progress: ${task.title}`,
          content: noteContent.trim(),
          importance: 'medium',
          project_id: task.project_id,
          task_id: task.id
        });
      }

      return {
        result: updatedTask,
        commit: true,
        changedParts: new Set(['tasks', 'memories'] as const)
      };
    });

    // Note: No need to reload database since we're working with the same instance
    this.buildTaskIndex();

    // Recalculate project completion if task completion status changed
    if (completed !== undefined) {
      await this._recalculateProjectCompletion(result.project_id);
    }

    // Track session activity
    this.trackToolUsage('update_task', 'task_updated', result.id);
    if (completed === true) {
      this.trackToolUsage('update_task', 'task_completed', result.id);
    }

    let response = `[OK] **Task Updated Successfully!**\n\n**${result.title}**\n`;
    if (completed !== undefined) {
      response += `Status: ${result.completed ? 'Completed [DONE]' : 'Active [ACTIVE]'}\n`;
    }
    if (priority !== undefined) {
      response += `Priority: ${result.priority}\n`;
    }
    if (progress !== undefined) {
      response += `Progress: ${progress}%\n`;
    }
    const noteContent = Array.isArray(notes) ? notes.join('; ') : notes;
    if (noteContent?.trim()) {
      response += `Progress note saved.\n`;
    }
    if (blockers && blockers.length > 0) {
      response += `Blockers added: ${blockers.join(', ')}\n`;
    }

      return {
        content: [{
          type: "text",
          text: response
        }]
      };
    });
  }







  // Memory Management Methods
  async remember_this(args: any): Promise<any> {
    return this.safeExecute('remember_this', async () => {
      this.trackToolUsage('remember_this');

      // Basic input validation (MCP schemas handle structure, but we need null checks)
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments - expected object');
      }

      const { content, title, importance = 'medium', project_id, task_id, line_range, dry_run = false } = args;

      // Check required fields and sanitize
      if (content === undefined || content === null) {
        throw new Error("Missing required field 'content'");
      }

      const sanitizedContent = ValidationUtils.sanitizeString(content);
      const sanitizedTitle = title ? ValidationUtils.sanitizeString(title) : undefined;

      if (!sanitizedContent) {
        throw new Error("Field 'content' cannot be empty");
      }

      // Use InMemoryStore validation for memory data
      const memoryData = {
        content: sanitizedContent,
        title: sanitizedTitle,
        importance,
        project_id,
        task_id,
        line_range
      };

      const validatedMemory = this.inMemoryStore.validateAndSanitizeInput('memory', memoryData);

      // Handle dry run
      if (dry_run) {
        return {
          content: [{
            type: "text",
            text: `[DRY RUN] remember_this: Would store memory '${sanitizedTitle || 'Untitled'}' with importance '${importance}'. No changes made.`
          }],
          isError: false
        };
      }

      const result = await this.inMemoryStore.runExclusive(async (db) => {
        const newMemory = this.memoryService.addMemory(db.memories, {
          title: validatedMemory.title || `Memory from ${new Date().toLocaleDateString()}`,
          content: validatedMemory.content,
          importance: validatedMemory.importance,
          project_id: validatedMemory.project_id,
          task_id: validatedMemory.task_id,
          line_range: validatedMemory.line_range
        });

        return {
          result: newMemory,
          commit: true,
          changedParts: new Set(['memories'] as const)
        };
      });

      // Track session activity
      this.trackToolUsage('remember_this', 'memory_created', result.id);

      // Generate markdown suggestion for critical/high importance memories
      let markdownSuggestion = '';
      if (result.importance === 'critical' || result.importance === 'high') {
        const filename = result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.md';
        markdownSuggestion = `\n\n[INFO] **Suggestion:** Since this is ${result.importance} importance, consider creating a markdown file:\n\`\`\`markdown\n# ${result.title}\n\n${result.content}\n\n*Created: ${new Date().toLocaleDateString()}*\n*Importance: ${result.importance}*\n\`\`\`\n\nSave as: \`${filename}\``;
      }

      return {
        content: [{
          type: "text",
          text: `[OK] **Memory Saved!**\n\n**Title:** ${result.title}\n**Importance:** ${result.importance}\n**Content:** ${result.content.substring(0, 100)}${result.content.length > 100 ? '...' : ''}${markdownSuggestion}`
        }]
      };
    });
  }

  async recall_context(args: any = {}): Promise<any> {
    const { query, project_id, importance, limit = 10 } = args;

    // Always get fresh database reference
    const database = this.inMemoryStore.getDatabase();
    let memories = database.memories;

    // Apply filters
    if (project_id) {
      memories = memories.filter(memory => memory.project_id === project_id);
    }
    if (importance) {
      memories = memories.filter(memory => memory.importance === importance);
    }

    // Simple text search if query provided
    if (query?.trim()) {
      const searchTerm = query.trim().toLowerCase();
      memories = memories.filter(memory =>
        memory.title.toLowerCase().includes(searchTerm) ||
        memory.content.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by creation date (newest first) and limit
    memories = memories
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    if (memories.length === 0) {
      return {
        content: [{
          type: "text",
          text: `[INFO] **No Memories Found**\n\nNo memories match your search criteria.`
        }]
      };
    }

    let response = `# Recalled Memories\n\n`;

    memories.forEach((memory, index) => {
      response += `## ${index + 1}. ${memory.title}\n`;
      response += `**Importance:** ${memory.importance}\n`;
      response += `**Date:** ${new Date(memory.timestamp).toLocaleDateString()}\n`;
      if (memory.project_id) {
        const project = this.projectService.findProjectById(database.projects, memory.project_id);
        response += `**Project:** ${project?.name || 'Unknown'}\n`;
      }
      response += `**Content:** ${memory.content}\n\n`;
    });

    return {
      content: [{
        type: "text",
        text: response
      }]
    };
  }





  async generate_handoff_summary(args: any = {}): Promise<any> {
    this.trackToolUsage('generate_handoff_summary');
    const { project_id, format = 'detailed' } = args;

    // Always get fresh database reference
    const database = this.inMemoryStore.getDatabase();
    let projects = database.projects;
    if (project_id) {
      const project = this.projectService.findProjectById(projects, project_id);
      if (!project) {
        throw new Error(`Project not found: ${project_id}`);
      }
      projects = [project];
    }

    // Get session activity data
    const sessionActivity = this.getSessionActivity();

    let summary = `# [HANDOFF] Enhanced Session Summary\n\n`;
    summary += `**Generated:** ${new Date().toLocaleString()}\n`;
    summary += `**Session Duration:** ${sessionActivity.sessionDuration} minutes\n`;
    summary += `**Session Activity:** ${Object.values(sessionActivity.toolUsageCount).reduce((a, b) => a + b, 0)} tool calls\n\n`;

    // Add session activity summary
    if (sessionActivity.tasksCreated.length > 0 || sessionActivity.tasksUpdated.length > 0 || sessionActivity.memoriesCreated.length > 0) {
      summary += `## [SESSION] What Happened This Session\n\n`;

      if (sessionActivity.tasksCreated.length > 0) {
        summary += `**Tasks Created:** ${sessionActivity.tasksCreated.length}\n`;
        sessionActivity.tasksCreated.slice(0, 3).forEach(taskId => {
          const task = database.tasks.find(t => t.id === taskId);
          if (task) summary += `- ${task.title}\n`;
        });
        if (sessionActivity.tasksCreated.length > 3) {
          summary += `- ... and ${sessionActivity.tasksCreated.length - 3} more\n`;
        }
        summary += `\n`;
      }

      if (sessionActivity.tasksCompleted.length > 0) {
        summary += `**Tasks Completed:** ${sessionActivity.tasksCompleted.length}\n`;
        sessionActivity.tasksCompleted.forEach(taskId => {
          const task = database.tasks.find(t => t.id === taskId);
          if (task) summary += `- ✅ ${task.title}\n`;
        });
        summary += `\n`;
      }

      if (sessionActivity.memoriesCreated.length > 0) {
        summary += `**Notes/Memories Created:** ${sessionActivity.memoriesCreated.length}\n`;
        sessionActivity.memoriesCreated.slice(0, 3).forEach(memoryId => {
          const memory = database.memories.find(m => m.id === memoryId);
          if (memory) summary += `- ${memory.title}\n`;
        });
        if (sessionActivity.memoriesCreated.length > 3) {
          summary += `- ... and ${sessionActivity.memoriesCreated.length - 3} more\n`;
        }
        summary += `\n`;
      }

      if (Object.keys(sessionActivity.toolUsageCount).length > 0) {
        summary += `**Tool Usage:**\n`;
        Object.entries(sessionActivity.toolUsageCount).forEach(([tool, count]) => {
          summary += `- ${tool}: ${count}x\n`;
        });
        summary += `\n`;
      }

      summary += `---\n\n`;
    }

    for (const project of projects) {
      const projectTasks = database.tasks.filter(task => task.project_id === project.id);
      const completedTasks = projectTasks.filter(task => task.completed);
      const activeTasks = projectTasks.filter(task => !task.completed);

      summary += `## [PROJECT] ${project.name}\n\n`;
      summary += `**Status:** ${project.status}\n`;
      summary += `**Progress:** ${project.completion_percentage}%\n`;
      summary += `**Tasks:** ${completedTasks.length}/${projectTasks.length} completed\n\n`;

      if (activeTasks.length > 0) {
        summary += `### [ACTIVE] Active Tasks\n`;
        activeTasks.forEach(task => {
          summary += `- **${task.title}** (${task.priority} priority)\n`;
        });
        summary += `\n`;
      }

      if (completedTasks.length > 0) {
        summary += `### [DONE] Recently Completed\n`;
        completedTasks.slice(-3).forEach(task => {
          summary += `- **${task.title}**\n`;
        });
        summary += `\n`;
      }

      // Recent memories for context
      const recentMemories = database.memories
        .filter(memory => memory.project_id === project.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 3);

      if (recentMemories.length > 0) {
        summary += `### [NOTES] Recent Notes\n`;
        recentMemories.forEach(memory => {
          summary += `- **${memory.title}:** ${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}\n`;
        });
        summary += `\n`;
      }

      summary += `---\n\n`;
    }

    // Add markdown file suggestion
    const dateStr = new Date().toISOString().split('T')[0];
    const markdownSuggestion = `\n\n[SUGGESTION] Save this summary as a markdown file for future reference:\n\`session-summary-${dateStr}.md\`\n\nThis will help you pick up where you left off in future sessions.`;

    return {
      content: [{
        type: "text",
        text: summary + markdownSuggestion
      }]
    };
  }


  async set_current_project(args: any): Promise<any> {
    this.trackToolUsage('set_current_project');
    const { project_id, dry_run = false } = args;

    if (!project_id) {
      throw new Error('Project ID is required');
    }

    // Handle dry run
    if (dry_run) {
      return {
        content: [{
          type: "text",
          text: `[DRY RUN] set_current_project: Would set project '${project_id}' as current project. No changes made.`
        }],
        isError: false
      };
    }

    const result = await this.inMemoryStore.runExclusive(async (db) => {
      const project = this.projectService.findProjectById(db.projects, project_id);
      if (!project) {
        throw new Error(`Project not found: ${project_id}`);
      }

      // Update meta information
      if (!db.meta) {
        db.meta = {
          last_updated: new Date().toISOString(),
          version: "2.0.0",
          session_count: 0,
          current_project_id: project_id
        };
      } else {
        db.meta.current_project_id = project_id;
      }

      return {
        result: project,
        commit: true,
        changedParts: new Set(['meta'] as const)
      };
    });

    // Track session activity
    this.trackToolUsage('set_current_project', 'project_switched', result.id);

    // Note: No need to reload database since we're working with the same instance

    return {
      content: [{
        type: "text",
        text: `[OK] Current project set to: **${result.name}**\n\nAll new tasks will be added to this project by default.`
      }]
    };
  }



  // Getter methods for accessing internal state (useful for handlers)
  getDatabase(): ProjectDatabase {
    return this.inMemoryStore.getDatabase();
  }

  getTaskIndex(): Map<string, Task> {
    return this.taskIndex;
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Clear task index to free memory
    this.taskIndex.clear();

    // Cleanup in-memory store
    this.inMemoryStore.cleanup();
  }

  /**
   * Track tool usage and session activity
   */
  private trackToolUsage(toolName: string, activityType?: string, itemId?: string) {
    // Track tool usage count
    const currentCount = this.sessionActivity.toolUsageCount.get(toolName) || 0;
    this.sessionActivity.toolUsageCount.set(toolName, currentCount + 1);

    // Track specific activities
    if (activityType && itemId) {
      switch (activityType) {
        case 'task_created':
          this.sessionActivity.tasksCreated.push(itemId);
          break;
        case 'task_updated':
          this.sessionActivity.tasksUpdated.push(itemId);
          break;
        case 'task_completed':
          this.sessionActivity.tasksCompleted.push(itemId);
          break;
        case 'memory_created':
          this.sessionActivity.memoriesCreated.push(itemId);
          break;
        case 'project_created':
          this.sessionActivity.projectsCreated.push(itemId);
          break;
        case 'project_switched':
          this.sessionActivity.projectSwitches.push(itemId);
          this.sessionActivity.lastActiveProject = itemId;
          break;
      }
    }
  }

  /**
   * Get session activity summary
   */
  getSessionActivity() {
    return {
      ...this.sessionActivity,
      sessionDuration: Math.round((Date.now() - this.sessionStartTime.getTime()) / 1000 / 60),
      toolUsageCount: Object.fromEntries(this.sessionActivity.toolUsageCount)
    };
  }

  /**
   * Reset session activity (useful for testing)
   */
  resetSessionActivity() {
    this.sessionActivity = {
      tasksCreated: [],
      tasksUpdated: [],
      tasksCompleted: [],
      memoriesCreated: [],
      projectsCreated: [],
      projectSwitches: [],
      keyDecisions: [],
      toolUsageCount: new Map()
    };
    this.sessionStartTime = new Date();
  }

  /**
   * Get system health and performance statistics
   */
  getSystemStats(): {
    database: ReturnType<InMemoryStore['getStats']>;
    taskIndexSize: number;
    sessionDuration: number;
    isShuttingDown: boolean;
  } {
    return {
      database: this.inMemoryStore.getStats(),
      taskIndexSize: this.taskIndex.size,
      sessionDuration: Math.round((Date.now() - this.sessionStartTime.getTime()) / 1000 / 60),
      isShuttingDown: this.isShuttingDown
    };
  }

  /**
   * Simplified cleanup of orphaned data for data integrity recovery
   */
  async cleanupOrphanedData(): Promise<{
    orphanedTasks: number;
    orphanedMemories: number;
    invalidTaskReferences: number;
    invalidCurrentProject: boolean;
    duplicatesRemoved: number;
    corruptedDataFixed: number;
  }> {
    return this.safeExecute('cleanupOrphanedData', async () => {
      const result = await this.inMemoryStore.runExclusive(async (db) => {
        const stats = {
          orphanedTasks: 0,
          orphanedMemories: 0,
          invalidTaskReferences: 0,
          invalidCurrentProject: false,
          duplicatesRemoved: 0,
          corruptedDataFixed: 0
        };

        const projectIds = new Set(db.projects.map(p => p.id));
        const taskIds = new Set(db.tasks.map(t => t.id));

        // 1. Remove duplicates using Set-based deduplication
        const uniqueProjects = new Map();
        db.projects = db.projects.filter(project => {
          if (uniqueProjects.has(project.id)) {
            stats.duplicatesRemoved++;
            return false;
          }
          uniqueProjects.set(project.id, project);
          return true;
        });

        const uniqueTasks = new Map();
        db.tasks = db.tasks.filter(task => {
          if (uniqueTasks.has(task.id)) {
            stats.duplicatesRemoved++;
            return false;
          }
          uniqueTasks.set(task.id, task);
          return true;
        });

        const uniqueMemories = new Map();
        db.memories = db.memories.filter(memory => {
          if (uniqueMemories.has(memory.id)) {
            stats.duplicatesRemoved++;
            return false;
          }
          uniqueMemories.set(memory.id, memory);
          return true;
        });

        // 2. Remove orphaned data
        db.tasks = db.tasks.filter(task => {
          if (!projectIds.has(task.project_id)) {
            stats.orphanedTasks++;
            return false;
          }
          return true;
        });

        db.memories = db.memories.filter(memory => {
          if (memory.project_id && !projectIds.has(memory.project_id)) {
            stats.orphanedMemories++;
            return false;
          }
          return true;
        });

        // 3. Fix invalid references
        db.tasks.forEach(task => {
          if (task.parent_id && !taskIds.has(task.parent_id)) {
            task.parent_id = undefined;
            stats.invalidTaskReferences++;
          }
        });

        db.memories.forEach(memory => {
          if (memory.task_id && !taskIds.has(memory.task_id)) {
            memory.task_id = undefined;
            stats.invalidTaskReferences++;
          }
        });

        // 4. Fix invalid current project
        if (db.meta.current_project_id && !projectIds.has(db.meta.current_project_id)) {
          db.meta.current_project_id = undefined;
          stats.invalidCurrentProject = true;
        }

        // 5. Fix corrupted data (missing required fields)
        db.projects.forEach(project => {
          if (!project.id || !project.name) {
            stats.corruptedDataFixed++;
            if (!project.id) project.id = `project-${Date.now()}-${Math.random()}`;
            if (!project.name) project.name = 'Recovered Project';
          }
        });

        db.tasks.forEach(task => {
          if (!task.id || !task.title) {
            stats.corruptedDataFixed++;
            if (!task.id) task.id = `task-${Date.now()}-${Math.random()}`;
            if (!task.title) task.title = 'Recovered Task';
          }
        });

        db.memories.forEach(memory => {
          if (!memory.id || !memory.content) {
            stats.corruptedDataFixed++;
            if (!memory.id) memory.id = `memory-${Date.now()}-${Math.random()}`;
            if (!memory.content) memory.content = 'Recovered memory content';
          }
        });

        // Only commit if there were actual changes
        const hasChanges = Object.values(stats).some(value =>
          typeof value === 'number' ? value > 0 : value === true
        );

        return {
          result: stats,
          commit: hasChanges,
          changedParts: new Set(['projects', 'tasks', 'memories', 'meta'] as const)
        };
      });

      // Rebuild task index if tasks were changed
      if (result.orphanedTasks > 0 || result.duplicatesRemoved > 0) {
        this.buildTaskIndex();
      }

      return result;
    });
  }
}
