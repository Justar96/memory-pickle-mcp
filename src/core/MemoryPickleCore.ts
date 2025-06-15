import type { ProjectDatabase, Project, Task } from '../types/index.js';
import { StorageService, ProjectService, TaskService, MemoryService } from '../services/index.js';

/**
 * Core business logic for Memory Pickle MCP Server with robust error handling
 * Contains all the business methods without MCP-specific concerns
 * Implements defensive programming practices and comprehensive validation
 */
export class MemoryPickleCore {
  private database: ProjectDatabase;
  private storageService: StorageService;
  private projectService: ProjectService;
  private taskService: TaskService;
  private memoryService: MemoryService;
  private sessionStartTime: Date;
  private taskIndex: Map<string, Task>;
  private isShuttingDown: boolean = false;

  constructor(
    database: ProjectDatabase,
    storageService: StorageService,
    projectService: ProjectService,
    taskService: TaskService,
    memoryService: MemoryService
  ) {
    this.database = database;
    this.storageService = storageService;
    this.projectService = projectService;
    this.taskService = taskService;
    this.memoryService = memoryService;
    this.sessionStartTime = new Date();
    this.taskIndex = new Map();
    this.buildTaskIndex();
  }

  static async create(): Promise<MemoryPickleCore> {
    const storageService = new StorageService();
    const projectService = new ProjectService();
    const taskService = new TaskService();
    const memoryService = new MemoryService();

    // Get the database reference directly from storage service
    const database = storageService.getDatabase();

    // Backward compatibility: Load legacy memories if main DB is empty
    if (database.memories.length === 0) {
      const legacyMemories = await storageService.loadMemories();
      if (legacyMemories.length > 0) {
        database.memories = legacyMemories;
        // Note: Removed console.error to prevent MCP stdio interference
        // Legacy memories loaded successfully
      }
    }

    return new MemoryPickleCore(database, storageService, projectService, taskService, memoryService);
  }

  private buildTaskIndex(): void {
    this.taskIndex.clear();
    for (const task of this.database.tasks) {
      this.taskIndex.set(task.id, task);
    }
  }

  /**
   * Validates input arguments and throws descriptive errors
   */
  private validateInput(args: any, requiredFields: string[], operation: string): void {
    if (!args || typeof args !== 'object') {
      throw new Error(`${operation}: Invalid arguments - expected object`);
    }

    for (const field of requiredFields) {
      if (args[field] === undefined || args[field] === null) {
        throw new Error(`${operation}: Missing required field '${field}'`);
      }

      if (typeof args[field] === 'string' && !args[field].trim()) {
        throw new Error(`${operation}: Field '${field}' cannot be empty`);
      }
    }
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
    const currentProjectId = this.database.meta?.current_project_id;

    if (!currentProjectId) {
      throw new Error('No current project set. Use set_current_project or provide project_id parameter.');
    }

    const project = this.projectService.findProjectById(this.database.projects, currentProjectId);
    if (!project) {
      // Auto-fix: clear invalid current project
      this.database.meta.current_project_id = undefined;
      throw new Error('Current project no longer exists. Please set a new current project.');
    }

    return currentProjectId;
  }

  // Project Management Methods
  async create_project(args: any): Promise<any> {
    return this.safeExecute('create_project', async () => {
      this.validateInput(args, ['name'], 'create_project');

      const { name, description = '', status = 'planning' } = args;

      // Additional validation
      if (name.length > 100) {
        throw new Error('Project name cannot exceed 100 characters');
      }
      if (description.length > 1000) {
        throw new Error('Project description cannot exceed 1000 characters');
      }
      if (status && !['planning', 'in_progress', 'blocked', 'completed', 'archived'].includes(status)) {
        throw new Error('Invalid project status');
      }

      const result = await this.storageService.runExclusive(async (db) => {
        const newProject = this.projectService.createProject({
          name: name.trim(),
          description: description.trim()
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

    // If no project_id provided, try to use the current project from meta
    let targetProjectId = project_id;
    if (!targetProjectId && this.database.meta?.current_project_id) {
      targetProjectId = this.database.meta.current_project_id;
    }

    // If still no project_id, show all projects
    if (!targetProjectId) {
      return this.getAllProjectsStatus();
    }

    const project = this.projectService.findProjectById(this.database.projects, targetProjectId);
    if (!project) {
      throw new Error(`Project not found: ${targetProjectId}`);
    }

    const projectTasks = this.database.tasks.filter(task => task.project_id === targetProjectId);
    const completedTasks = projectTasks.filter(task => task.completed);
    const activeTasks = projectTasks.filter(task => !task.completed);

    // Calculate actual completion percentage
    const actualCompletion = projectTasks.length > 0
      ? Math.round((completedTasks.length / projectTasks.length) * 100)
      : 0;

    // Update project completion if it's different
    if (project.completion_percentage !== actualCompletion) {
      await this.storageService.runExclusive(async (db) => {
        const proj = this.projectService.findProjectById(db.projects, project_id);
        if (proj) {
          proj.completion_percentage = actualCompletion;
        }
        return {
          result: undefined,
          commit: true,
          changedParts: new Set(['projects'] as const)
        };
      });
      project.completion_percentage = actualCompletion;
    }

    let statusText = `# Project Status: **${project.name}**\n\n`;
    statusText += `**ID:** ${project.id}\n`;
    statusText += `**Status:** ${project.status}\n`;
    statusText += `**Completion:** ${project.completion_percentage}%\n`;
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
    const projects = this.database.projects;

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
      const projectTasks = this.database.tasks.filter(task => task.project_id === project.id);
      const completedTasks = projectTasks.filter(task => task.completed);
      const completion = projectTasks.length > 0
        ? Math.round((completedTasks.length / projectTasks.length) * 100)
        : 0;

      const isCurrentProject = this.database.meta?.current_project_id === project.id;
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

    const result = await this.storageService.runExclusive(async (db) => {
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
      this.validateInput(args, ['title'], 'create_task');

      const { title, description = '', priority = 'medium', project_id, parent_id } = args;

      // Additional validation
      if (title.length > 200) {
        throw new Error('Task title cannot exceed 200 characters');
      }
      if (description.length > 2000) {
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

      const result = await this.storageService.runExclusive(async (db) => {
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
          title: title.trim(),
          description: description.trim(),
          priority,
          project_id: targetProjectId,
          parent_id
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

      const project = this.projectService.findProjectById(this.database.projects, targetProjectId);

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
      this.validateInput(args, ['task_id'], 'update_task');

      const { task_id, title, description, priority, completed, progress, notes, blockers } = args;

      // Additional validation
      if (title !== undefined && title.length > 200) {
        throw new Error('Task title cannot exceed 200 characters');
      }
      if (description !== undefined && description.length > 2000) {
        throw new Error('Task description cannot exceed 2000 characters');
      }
      if (priority !== undefined && !['low', 'medium', 'high', 'critical'].includes(priority)) {
        throw new Error('Invalid task priority');
      }

      const result = await this.storageService.runExclusive(async (db) => {
      const task = this.taskService.findTaskById(db.tasks, task_id);
      if (!task) {
        throw new Error(`Task not found: ${task_id}`);
      }

      const updates: Partial<Task> = {};
      if (title !== undefined) updates.title = title.trim();
      if (description !== undefined) updates.description = description.trim();
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
    const { content, title, importance = 'medium', project_id, task_id } = args;

    if (!content?.trim()) {
      throw new Error('Memory content is required');
    }

    const result = await this.storageService.runExclusive(async (db) => {
      const newMemory = this.memoryService.addMemory(db.memories, {
        title: title?.trim() || `Memory from ${new Date().toLocaleDateString()}`,
        content: content.trim(),
        importance,
        project_id,
        task_id
      });

      return {
        result: newMemory,
        commit: true,
        changedParts: new Set(['memories'] as const)
      };
    });

    // Note: No need to reload database since we're working with the same instance

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
  }

  async recall_context(args: any = {}): Promise<any> {
    const { query, project_id, importance, limit = 10 } = args;

    let memories = this.database.memories;

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
        const project = this.projectService.findProjectById(this.database.projects, memory.project_id);
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
    const { project_id } = args;

    let projects = this.database.projects;
    if (project_id) {
      const project = this.projectService.findProjectById(projects, project_id);
      if (!project) {
        throw new Error(`Project not found: ${project_id}`);
      }
      projects = [project];
    }

    let summary = `# [HANDOFF] Session Summary\n\n`;
    summary += `**Generated:** ${new Date().toLocaleString()}\n`;
    summary += `**Session Duration:** ${Math.round((Date.now() - this.sessionStartTime.getTime()) / 1000 / 60)} minutes\n\n`;

    for (const project of projects) {
      const projectTasks = this.database.tasks.filter(task => task.project_id === project.id);
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
      const recentMemories = this.database.memories
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
    const { project_id } = args;

    if (!project_id) {
      throw new Error('Project ID is required');
    }

    const result = await this.storageService.runExclusive(async (db) => {
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
    return this.database;
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

    // Cleanup storage service
    this.storageService.cleanup();
  }

  /**
   * Get system health and performance statistics
   */
  getSystemStats(): {
    database: ReturnType<StorageService['getStats']>;
    taskIndexSize: number;
    sessionDuration: number;
    isShuttingDown: boolean;
  } {
    return {
      database: this.storageService.getStats(),
      taskIndexSize: this.taskIndex.size,
      sessionDuration: Math.round((Date.now() - this.sessionStartTime.getTime()) / 1000 / 60),
      isShuttingDown: this.isShuttingDown
    };
  }

  /**
   * Cleanup orphaned data (tasks/memories without valid project references)
   */
  async cleanupOrphanedData(): Promise<{
    orphanedTasks: number;
    orphanedMemories: number;
    invalidCurrentProject: boolean;
  }> {
    return this.safeExecute('cleanupOrphanedData', async () => {
      const result = await this.storageService.runExclusive(async (db) => {
        const projectIds = new Set(db.projects.map(p => p.id));

        // Find orphaned tasks
        const orphanedTasks = db.tasks.filter(task => !projectIds.has(task.project_id));
        const orphanedTaskCount = orphanedTasks.length;

        // Find orphaned memories
        const orphanedMemories = db.memories.filter(memory =>
          memory.project_id && !projectIds.has(memory.project_id)
        );
        const orphanedMemoryCount = orphanedMemories.length;

        // Check current project validity
        const invalidCurrentProject = !!(
          db.meta.current_project_id &&
          !projectIds.has(db.meta.current_project_id)
        );

        // Remove orphaned data
        if (orphanedTaskCount > 0) {
          db.tasks = db.tasks.filter(task => projectIds.has(task.project_id));
        }

        if (orphanedMemoryCount > 0) {
          db.memories = db.memories.filter(memory =>
            !memory.project_id || projectIds.has(memory.project_id)
          );
        }

        if (invalidCurrentProject) {
          db.meta.current_project_id = undefined;
        }

        const hasChanges = orphanedTaskCount > 0 || orphanedMemoryCount > 0 || invalidCurrentProject;

        return {
          result: {
            orphanedTasks: orphanedTaskCount,
            orphanedMemories: orphanedMemoryCount,
            invalidCurrentProject
          },
          commit: hasChanges,
          changedParts: new Set(['tasks', 'memories', 'meta'] as const)
        };
      });

      // Rebuild task index if tasks were cleaned up
      if (result.orphanedTasks > 0) {
        this.buildTaskIndex();
      }

      return result;
    });
  }
}
