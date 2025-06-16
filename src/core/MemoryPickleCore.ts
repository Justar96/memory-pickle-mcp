import type { ProjectDatabase, Project, Task, Memory } from '../types/index.js';
import { StorageService, ProjectService, TaskService, MemoryService, DataIntegrityService } from '../services/index.js';
import { DEFAULT_TEMPLATES } from '../config/templates.js';
import { EMOJIS } from '../utils/emojiUtils.js';

/**
 * Core business logic for Memory Pickle MCP Server
 * Contains all the business methods without MCP-specific concerns
 */
export class MemoryPickleCore {
  private database: ProjectDatabase;
  private storageService: StorageService;
  private projectService: ProjectService;
  private taskService: TaskService;
  private memoryService: MemoryService;
  private dataIntegrityService: DataIntegrityService;
  private sessionStartTime: Date;
  private taskIndex: Map<string, Task>;

  constructor(
    database: ProjectDatabase,
    storageService: StorageService,
    projectService: ProjectService,
    taskService: TaskService,
    memoryService: MemoryService,
    dataIntegrityService: DataIntegrityService
  ) {
    this.database = database;
    this.storageService = storageService;
    this.projectService = projectService;
    this.taskService = taskService;
    this.memoryService = memoryService;
    this.dataIntegrityService = dataIntegrityService;
    this.sessionStartTime = new Date();
    this.taskIndex = new Map();
    this.buildTaskIndex();
  }

  static async create(): Promise<MemoryPickleCore> {
    const storageService = new StorageService();
    const projectService = new ProjectService();
    const taskService = new TaskService();
    const memoryService = new MemoryService();
    const dataIntegrityService = new DataIntegrityService();

    const database = await storageService.loadDatabase();

    // Backward compatibility: Load legacy memories if main DB is empty
    if (database.memories.length === 0) {
      const legacyMemories = await storageService.loadMemories();
      if (legacyMemories.length > 0) {
        database.memories = legacyMemories;
        console.error(`Loaded ${legacyMemories.length} memories from legacy file.`);
      }
    }

    // Validate and repair database integrity on startup
    const validation = dataIntegrityService.validateAndRepair(database);
    if (!validation.isValid) {
      console.error(`Database integrity issues found and repaired: ${validation.issues.length} issues`);
      validation.issues.forEach(issue => console.error(`  - ${issue}`));
      
      // Save the repaired database
      await storageService.runExclusive(async (db) => {
        Object.assign(db, validation.repairedDatabase);
        return { result: undefined, commit: true };
      });
    }

    return new MemoryPickleCore(database, storageService, projectService, taskService, memoryService, dataIntegrityService);
  }

  private buildTaskIndex(): void {
    this.taskIndex.clear();
    for (const task of this.database.tasks) {
      this.taskIndex.set(task.id, task);
    }
  }

  // Project Management Methods
  async create_project(args: any): Promise<any> {
    const { name, description = '', status = 'planning' } = args;

    if (!name?.trim()) {
      throw new Error('Project name is required');
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

      return {
        result: newProject,
        commit: true,
        changedParts: new Set(['projects'] as const)
      };
    });

    // Update local state after successful commit
    this.database = await this.storageService.loadDatabase();

    return {
      content: [{
        type: "text",
        text: `${EMOJIS.SUCCESS} **Project Created Successfully!**\n\n**Name:** ${result.name}\n**ID:** ${result.id}\n**Status:** ${result.status}\n**Description:** ${result.description || 'No description provided'}\n\nYou can now add tasks to this project using the \`create_task\` tool.`
      }]
    };
  }

  async get_project_status(args: any): Promise<any> {
    const { project_id } = args;

    if (!project_id) {
      throw new Error('Project ID is required');
    }

    const project = this.projectService.findProjectById(this.database.projects, project_id);
    if (!project) {
      throw new Error(`Project not found: ${project_id}`);
    }

    const projectTasks = this.database.tasks.filter(task => task.project_id === project_id);
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

    let statusText = `# ${EMOJIS.PROJECT} Project Status: **${project.name}**\n\n`;
    statusText += `**ID:** ${project.id}\n`;
    statusText += `**Status:** ${project.status}\n`;
    statusText += `**Completion:** ${project.completion_percentage}%\n`;
    statusText += `**Description:** ${project.description || 'No description'}\n\n`;

    statusText += `## ${EMOJIS.TASK} Tasks Summary\n`;
    statusText += `- **Total Tasks:** ${projectTasks.length}\n`;
    statusText += `- **Completed:** ${completedTasks.length}\n`;
    statusText += `- **Active:** ${activeTasks.length}\n\n`;

    if (activeTasks.length > 0) {
      statusText += `### ${EMOJIS.ACTIVE} Active Tasks:\n`;
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

    // Update local state after successful commit
    this.database = await this.storageService.loadDatabase();

    return {
      content: [{
        type: "text",
        text: `${EMOJIS.SUCCESS} **Project Updated Successfully!**\n\n**Name:** ${result.name}\n**Status:** ${result.status}\n**Description:** ${result.description || 'No description'}`
      }]
    };
  }

  async list_projects(args: any = {}): Promise<any> {
    const projects = this.database.projects;

    if (projects.length === 0) {
      return {
        content: [{
          type: "text",
          text: `${EMOJIS.INFO} **No Projects Found**\n\nCreate your first project using the \`create_project\` tool.`
        }]
      };
    }

    let response = `# ${EMOJIS.PROJECT} Projects Overview\n\n`;

    projects.forEach(project => {
      const projectTasks = this.database.tasks.filter(task => task.project_id === project.id);
      const completedTasks = projectTasks.filter(task => task.completed);

      response += `## ${project.name}\n`;
      response += `- **ID:** ${project.id}\n`;
      response += `- **Status:** ${project.status}\n`;
      response += `- **Progress:** ${project.completion_percentage}%\n`;
      response += `- **Tasks:** ${completedTasks.length}/${projectTasks.length} completed\n`;
      if (project.description) {
        response += `- **Description:** ${project.description}\n`;
      }
      response += `\n`;
    });

    return {
      content: [{
        type: "text",
        text: response
      }]
    };
  }

  // Task Management Methods
  async create_task(args: any): Promise<any> {
    const { title, description = '', priority = 'medium', project_id, parent_id } = args;

    if (!title?.trim()) {
      throw new Error('Task title is required');
    }

    // If no project_id provided, try to use the current project from meta
    let targetProjectId = project_id;
    if (!targetProjectId && this.database.meta?.current_project_id) {
      targetProjectId = this.database.meta.current_project_id;
    }

    if (!targetProjectId) {
      throw new Error('Project ID is required. Either provide project_id or set a current project using set_current_project.');
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

    // Update local state after successful commit
    this.database = await this.storageService.loadDatabase();
    this.buildTaskIndex();

    const project = this.projectService.findProjectById(this.database.projects, targetProjectId);

    return {
      content: [{
        type: "text",
        text: `${EMOJIS.SUCCESS} **Task Created Successfully!**\n\n**Title:** ${result.title}\n**ID:** ${result.id}\n**Project:** ${project?.name}\n**Priority:** ${result.priority}\n**Description:** ${result.description || 'No description provided'}\n\nTask is ready to be worked on!`
      }]
    };
  }

  async update_task(args: any): Promise<any> {
    const { task_id, title, description, priority, completed } = args;

    if (!task_id) {
      throw new Error('Task ID is required');
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
      if (completed !== undefined) updates.completed = completed;

      const updatedTask = this.taskService.updateTask(db.tasks, task_id, updates);

      return {
        result: updatedTask,
        commit: true,
        changedParts: new Set(['tasks'] as const)
      };
    });

    // Update local state after successful commit
    this.database = await this.storageService.loadDatabase();
    this.buildTaskIndex();

    return {
      content: [{
        type: "text",
        text: `${EMOJIS.SUCCESS} **Task Updated Successfully!**\n\n**Title:** ${result.title}\n**Priority:** ${result.priority}\n**Status:** ${result.completed ? 'Completed' : 'Active'}`
      }]
    };
  }

  async toggle_task(args: any): Promise<any> {
    const { task_id } = args;

    if (!task_id) {
      throw new Error('Task ID is required');
    }

    const result = await this.storageService.runExclusive(async (db) => {
      const task = this.taskService.findTaskById(db.tasks, task_id);
      if (!task) {
        throw new Error(`Task not found: ${task_id}`);
      }

      const updatedTask = this.taskService.toggleTask(db.tasks, task_id);

      return {
        result: updatedTask,
        commit: true,
        changedParts: new Set(['tasks'] as const)
      };
    });

    // Update local state after successful commit
    this.database = await this.storageService.loadDatabase();
    this.buildTaskIndex();

    const statusEmoji = result.completed ? EMOJIS.SUCCESS : EMOJIS.ACTIVE;
    const statusText = result.completed ? 'completed' : 'reopened';

    return {
      content: [{
        type: "text",
        text: `${statusEmoji} **Task ${statusText}!**\n\n**${result.title}** has been ${statusText}.`
      }]
    };
  }

  async list_tasks(args: any = {}): Promise<any> {
    const { project_id, completed, priority } = args;

    let tasks = this.database.tasks;

    // Apply filters
    if (project_id) {
      tasks = tasks.filter(task => task.project_id === project_id);
    }
    if (completed !== undefined) {
      tasks = tasks.filter(task => task.completed === completed);
    }
    if (priority) {
      tasks = tasks.filter(task => task.priority === priority);
    }

    if (tasks.length === 0) {
      return {
        content: [{
          type: "text",
          text: `${EMOJIS.INFO} **No Tasks Found**\n\nCreate your first task using the \`create_task\` tool.`
        }]
      };
    }

    let response = `# ${EMOJIS.TASK} Tasks Overview\n\n`;

    // Group by project
    const tasksByProject = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!tasksByProject.has(task.project_id)) {
        tasksByProject.set(task.project_id, []);
      }
      tasksByProject.get(task.project_id)!.push(task);
    }

    for (const [projectId, projectTasks] of tasksByProject) {
      const project = this.projectService.findProjectById(this.database.projects, projectId);
      response += `## ${project?.name || 'Unknown Project'}\n\n`;

      projectTasks.forEach(task => {
        const statusEmoji = task.completed ? EMOJIS.SUCCESS : EMOJIS.ACTIVE;
        response += `${statusEmoji} **${task.title}**\n`;
        response += `   - ID: ${task.id}\n`;
        response += `   - Priority: ${task.priority}\n`;
        if (task.description) {
          response += `   - Description: ${task.description}\n`;
        }
        response += `\n`;
      });
    }

    return {
      content: [{
        type: "text",
        text: response
      }]
    };
  }

  async get_tasks(args: any = {}): Promise<any> {
    return this.list_tasks(args);
  }

  async update_task_progress(args: any): Promise<any> {
    const { task_id, progress_note, completed } = args;

    if (!task_id) {
      throw new Error('Task ID is required');
    }

    const result = await this.storageService.runExclusive(async (db) => {
      const task = this.taskService.findTaskById(db.tasks, task_id);
      if (!task) {
        throw new Error(`Task not found: ${task_id}`);
      }

      const updates: Partial<Task> = {};
      if (completed !== undefined) {
        updates.completed = completed;
      }

      const updatedTask = this.taskService.updateTask(db.tasks, task_id, updates);

      // Add progress note as memory if provided
      if (progress_note?.trim()) {
        this.memoryService.addMemory(db.memories, {
          title: `Progress: ${task.title}`,
          content: progress_note.trim(),
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

    // Update local state after successful commit
    this.database = await this.storageService.loadDatabase();
    this.buildTaskIndex();

    let response = `${EMOJIS.SUCCESS} **Task Progress Updated!**\n\n**${result.title}**\n`;
    if (completed !== undefined) {
      response += `Status: ${result.completed ? 'Completed' : 'Active'}\n`;
    }
    if (progress_note?.trim()) {
      response += `Progress note saved to memories.\n`;
    }

    return {
      content: [{
        type: "text",
        text: response
      }]
    };
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

    // Update local state after successful commit
    this.database = await this.storageService.loadDatabase();

    return {
      content: [{
        type: "text",
        text: `${EMOJIS.SUCCESS} **Memory Saved!**\n\n**Title:** ${result.title}\n**Importance:** ${result.importance}\n**Content:** ${result.content.substring(0, 100)}${result.content.length > 100 ? '...' : ''}`
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
          text: `${EMOJIS.INFO} **No Memories Found**\n\nNo memories match your search criteria.`
        }]
      };
    }

    let response = `# ${EMOJIS.MEMORY} Recalled Memories\n\n`;

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

  async add_memory(args: any): Promise<any> {
    return this.remember_this(args);
  }

  async search_memories(args: any): Promise<any> {
    return this.recall_context(args);
  }

  // Utility Methods
  async export_to_markdown(args: any = {}): Promise<any> {
    const { project_id } = args;

    let projects = this.database.projects;
    if (project_id) {
      const project = this.projectService.findProjectById(projects, project_id);
      if (!project) {
        throw new Error(`Project not found: ${project_id}`);
      }
      projects = [project];
    }

    const result = await this.storageService.runExclusive(async (db) => {
      let markdown = `# Project Export\n\n`;
      markdown += `Generated on: ${new Date().toLocaleString()}\n\n`;

      for (const project of projects) {
        markdown += `## ${project.name}\n\n`;
        markdown += `**Status:** ${project.status}\n`;
        markdown += `**Completion:** ${project.completion_percentage}%\n`;
        if (project.description) {
          markdown += `**Description:** ${project.description}\n`;
        }
        markdown += `\n`;

        const projectTasks = db.tasks.filter(task => task.project_id === project.id);
        if (projectTasks.length > 0) {
          markdown += `### Tasks\n\n`;
          projectTasks.forEach(task => {
            const status = task.completed ? '✅' : '⏳';
            markdown += `${status} **${task.title}** (${task.priority})\n`;
            if (task.description) {
              markdown += `   ${task.description}\n`;
            }
            markdown += `\n`;
          });
        }

        const projectMemories = db.memories.filter(memory => memory.project_id === project.id);
        if (projectMemories.length > 0) {
          markdown += `### Notes & Memories\n\n`;
          projectMemories.forEach(memory => {
            markdown += `#### ${memory.title}\n`;
            markdown += `${memory.content}\n\n`;
          });
        }

        markdown += `---\n\n`;
      }

      // Save to file
      const exportPath = 'project-export.md';
      await this.storageService.saveExport(exportPath, markdown);

      return {
        result: { markdown, exportPath },
        commit: false
      };
    });

    return {
      content: [{
        type: "text",
        text: `${EMOJIS.SUCCESS} **Export Complete!**\n\nProject data exported to: \`${result.exportPath}\`\n\nThe export includes:\n- Project details and status\n- All tasks with completion status\n- Associated memories and notes\n\nYou can access the exported file through the MCP resources.`
      }]
    };
  }

  async list_templates(args: any = {}): Promise<any> {
    const templates = Object.entries(DEFAULT_TEMPLATES);

    if (templates.length === 0) {
      return {
        content: [{
          type: "text",
          text: `${EMOJIS.INFO} **No Templates Available**`
        }]
      };
    }

    let response = `# ${EMOJIS.TEMPLATE} Available Templates\n\n`;

    templates.forEach(([name, template]) => {
      response += `## ${name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
      response += `**Category:** ${template.category}\n`;
      response += `**Steps:** ${template.structure.length}\n\n`;

      template.structure.forEach((step, index) => {
        response += `${index + 1}. **${step.step}**\n`;
        if (step.prompt) {
          response += `   ${step.prompt}\n`;
        }
      });
      response += `\n---\n\n`;
    });

    return {
      content: [{
        type: "text",
        text: response
      }]
    };
  }

  async list_categories(args: any = {}): Promise<any> {
    const categories = new Set(Object.values(DEFAULT_TEMPLATES).map(t => t.category));

    let response = `# ${EMOJIS.CATEGORY} Template Categories\n\n`;

    Array.from(categories).forEach(category => {
      const categoryTemplates = Object.entries(DEFAULT_TEMPLATES)
        .filter(([_, template]) => template.category === category);

      response += `## ${category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
      response += `**Templates:** ${categoryTemplates.length}\n\n`;

      categoryTemplates.forEach(([name, _]) => {
        response += `- ${name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
      });
      response += `\n`;
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

    let summary = `# 📋 Handoff Summary\n\n`;
    summary += `**Generated:** ${new Date().toLocaleString()}\n`;
    summary += `**Session Duration:** ${Math.round((Date.now() - this.sessionStartTime.getTime()) / 1000 / 60)} minutes\n\n`;

    for (const project of projects) {
      const projectTasks = this.database.tasks.filter(task => task.project_id === project.id);
      const completedTasks = projectTasks.filter(task => task.completed);
      const activeTasks = projectTasks.filter(task => !task.completed);

      summary += `## 🎯 ${project.name}\n\n`;
      summary += `**Status:** ${project.status}\n`;
      summary += `**Progress:** ${project.completion_percentage}%\n`;
      summary += `**Tasks:** ${completedTasks.length}/${projectTasks.length} completed\n\n`;

      if (activeTasks.length > 0) {
        summary += `### 🔄 Active Tasks\n`;
        activeTasks.forEach(task => {
          summary += `- **${task.title}** (${task.priority} priority)\n`;
        });
        summary += `\n`;
      }

      if (completedTasks.length > 0) {
        summary += `### ✅ Recently Completed\n`;
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
        summary += `### 💭 Recent Notes\n`;
        recentMemories.forEach(memory => {
          summary += `- **${memory.title}:** ${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}\n`;
        });
        summary += `\n`;
      }

      summary += `---\n\n`;
    }

    return {
      content: [{
        type: "text",
        text: summary
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

    // Update local state after successful commit
    this.database = await this.storageService.loadDatabase();

    return {
      content: [{
        type: "text",
        text: `${EMOJIS.SUCCESS} Current project set to: **${result.name}**\n\nAll new tasks will be added to this project by default.`
      }]
    };
  }

  // Data Integrity Methods
  async validate_database(args: any = {}): Promise<any> {
    const { auto_repair = true, generate_report = true } = args;

    const validation = this.dataIntegrityService.validateAndRepair(this.database);

    if (auto_repair && !validation.isValid) {
      // Apply repairs to the database
      await this.storageService.runExclusive(async (db) => {
        Object.assign(db, validation.repairedDatabase);
        return {
          result: validation,
          commit: true,
          changedParts: new Set(['projects', 'tasks', 'memories', 'meta'] as const)
        };
      });

      // Update local state after successful commit
      this.database = await this.storageService.loadDatabase();
      this.buildTaskIndex();
    }

    let response = '';
    if (validation.isValid) {
      response = `✅ **Database Validation: PASSED**\n\nNo integrity issues found. Your data is consistent and healthy.`;
    } else {
      response = `⚠️ **Database Validation: ISSUES FOUND**\n\n`;
      response += `Found ${validation.issues.length} issues:\n\n`;
      validation.issues.forEach((issue, index) => {
        response += `${index + 1}. ${issue}\n`;
      });

      if (auto_repair) {
        response += `\n✅ **Auto-repair completed!** All issues have been fixed.`;
      }
    }

    if (generate_report) {
      const healthReport = this.dataIntegrityService.generateHealthReport(this.database);
      response += `\n\n---\n\n${healthReport}`;
    }

    return {
      content: [{
        type: "text",
        text: response
      }]
    };
  }

  async check_workflow_state(args: any = {}): Promise<any> {
    const { project_id } = args;

    const validation = this.dataIntegrityService.validateAndRepair(this.database);

    let response = `# 🔍 Workflow State Check\n\n`;

    if (project_id) {
      const project = this.projectService.findProjectById(this.database.projects, project_id);
      if (!project) {
        throw new Error(`Project not found: ${project_id}`);
      }

      response += `**Project:** ${project.name}\n`;
      response += `**Status:** ${project.status}\n`;
      response += `**Completion:** ${project.completion_percentage}%\n\n`;

      const projectTasks = this.database.tasks.filter(t => t.project_id === project_id);
      const orphanedTasks = projectTasks.filter(task =>
        !this.database.projects.some(p => p.id === task.project_id)
      );

      if (orphanedTasks.length > 0) {
        response += `⚠️ **Issues Found:**\n`;
        response += `- ${orphanedTasks.length} orphaned tasks without valid project references\n`;
      } else {
        response += `✅ **Workflow State:** Healthy\n`;
      }
    } else {
      // Check overall workflow state
      if (validation.isValid) {
        response += `✅ **Overall Workflow State:** Healthy\n\n`;
        response += `All projects, tasks, and memories have valid references and consistent data.`;
      } else {
        response += `⚠️ **Workflow Issues Found:**\n\n`;
        validation.issues.forEach((issue, index) => {
          response += `${index + 1}. ${issue}\n`;
        });
        response += `\n💡 **Recommendation:** Run \`validate_database\` with auto_repair=true to fix these issues.`;
      }
    }

    return {
      content: [{
        type: "text",
        text: response
      }]
    };
  }

  async repair_orphaned_data(args: any = {}): Promise<any> {
    const validation = this.dataIntegrityService.validateAndRepair(this.database);

    if (validation.isValid) {
      return {
        content: [{
          type: "text",
          text: `✅ **No Orphaned Data Found**\n\nAll tasks, memories, and references are properly linked. No repairs needed.`
        }]
      };
    }

    // Apply repairs
    await this.storageService.runExclusive(async (db) => {
      Object.assign(db, validation.repairedDatabase);
      return {
        result: validation,
        commit: true,
        changedParts: new Set(['projects', 'tasks', 'memories'] as const)
      };
    });

    // Update local state after successful commit
    this.database = await this.storageService.loadDatabase();
    this.buildTaskIndex();

    let response = `🔧 **Orphaned Data Repair Complete**\n\n`;
    response += `Fixed ${validation.issues.length} issues:\n\n`;
    validation.issues.forEach((issue, index) => {
      response += `${index + 1}. ${issue}\n`;
    });

    return {
      content: [{
        type: "text",
        text: response
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
}
