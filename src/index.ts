#!/usr/bin/env node

/**
 * Memory Pickle MCP Server
 * 
 * A persistent project management system for AI agents that provides:
 * - Task/checklist management with completion tracking
 * - Automatic session continuity and project state persistence
 * - Smart summarization for seamless handoffs between chat sessions
 * - YAML-based persistent storage for all project data
 * - Intelligent categorization and retrieval
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from 'fs';

// Import types
import type {
  Task,
  Project,
  Memory,
  ProjectDatabase,
  ProjectSummary,
  HandoffSummary
} from './types/index.js';

// Import configuration
import { DATA_DIR, PROJECT_FILE, SERVER_CONFIG } from './config/constants.js';
import { DEFAULT_TEMPLATES } from './config/templates.js';

// Import utilities
import { ensureDirectoryExists, fileExists } from './utils/fileUtils.js';
import { serializeToYaml, deserializeFromYaml } from './utils/yamlUtils.js';
import { generateId } from './utils/idGenerator.js';
import { EMOJIS, sectionHeader, taskCheckbox } from './utils/emojiUtils.js';

// Import services
import { StorageService, ProjectService, TaskService, MemoryService } from './services/index.js';

// Import tools
import { ALL_TOOLS, TOOL_NAMES } from './tools/index.js';


class MemoryPickleServer {
  private database: ProjectDatabase;
  private storageService: StorageService;
  private projectService: ProjectService;
  private taskService: TaskService;
  private memoryService: MemoryService;
  private sessionStartTime: Date;
  private taskIndex: Map<string, Task>;

  private constructor(
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

  private buildTaskIndex(): void {
    this.taskIndex.clear();
    for (const task of this.database.tasks) {
      this.taskIndex.set(task.id, task);
    }
  }

  static async create(): Promise<MemoryPickleServer> {
    const storageService = new StorageService();
    const projectService = new ProjectService();
    const taskService = new TaskService();
    const memoryService = new MemoryService();
    
    const database = await storageService.loadDatabase();

    // Backward compatibility: Load legacy memories if main DB is empty
    if (database.memories.length === 0) {
      const legacyMemories = await storageService.loadMemories();
      if (legacyMemories.length > 0) {
        database.memories = legacyMemories;
        console.error(`Loaded ${legacyMemories.length} memories from legacy file.`);
      }
    }
    
    return new MemoryPickleServer(database, storageService, projectService, taskService, memoryService);
  }

  private async saveDatabase(): Promise<void> {
    // Update the in-memory database reference with the committed version
    this.database = await this.storageService.runExclusive(async (db) => {
      // Copy current in-memory state to the fresh database
      Object.assign(db, this.database);
      return { result: db, commit: true };
    });
    
    // The legacy save also uses the lock
    if (this.database.memories && this.database.memories.length > 0) {
      await this.storageService.saveMemories(this.database.memories);
    }
  }

  // Project Management Methods
  async create_project(args: any): Promise<any> {
    const result = await this.storageService.runExclusive(async (db) => {
      const project = this.projectService.createProject(args);
      
      db.projects.push(project);
      db.meta.current_project_id = project.id;
      
      return {
        result: project,
        commit: true,
        changedParts: new Set(['projects', 'meta'] as const)
      };
    });

    // Update local state after successful commit
    this.database = await this.storageService.loadDatabase();
    this.buildTaskIndex();

    return {
      content: [{
        type: "text",
        text: `${EMOJIS.SUCCESS} Project created successfully!

**Project:** ${result.name}
**ID:** ${result.id}
**Status:** ${result.status}

Use \`create_task\` to start adding tasks to your project.`
      }]
    };
  }

  async create_task(args: any): Promise<any> {
    const result = await this.storageService.runExclusive(async (db) => {
      // Use current project if not specified
      const targetProjectId = args.project_id || db.meta.current_project_id;
      if (!targetProjectId) {
        throw new Error('No active project. Use create_project or set_current_project first.');
      }

      const task = this.taskService.createTask({
        ...args,
        project_id: targetProjectId
      });

      db.tasks.push(task);

      // Link task to project and parent
      const project = this.projectService.findProjectById(db.projects, targetProjectId);
      const parentTask = args.parent_id ? db.tasks.find(t => t.id === args.parent_id) : undefined;
      
      if (project) {
        this.taskService.linkTaskToProject(task, project, parentTask);
      }

      this.projectService.updateProjectCompletion(project!, db.tasks);
      
      return {
        result: task,
        commit: true,
        changedParts: new Set(['tasks', 'projects'] as const)
      };
    });

    // Update local state after successful commit
    this.database = await this.storageService.loadDatabase();
    this.buildTaskIndex();

    return {
      content: [{
        type: "text",
        text: `${EMOJIS.SUCCESS} Task created successfully!

**Task:** ${result.title}
**ID:** ${result.id}
**Priority:** ${result.priority}
**Status:** ⬜ Not completed
${args.parent_id ? `**Parent Task:** ${args.parent_id}` : ''}
${args.due_date ? `**Due Date:** ${args.due_date}` : ''}

Use \`toggle_task\` with ID "${result.id}" to mark it as complete.`
      }]
    };
  }

  async toggle_task(args: any): Promise<any> {
    const { task_id } = args;
    
    if (!task_id) {
      throw new Error('Task ID is required');
    }

    const result = await this.storageService.runExclusive(async (db) => {
      const task = db.tasks.find(t => t.id === task_id);
      if (!task) {
        throw new Error(`Task not found: ${task_id}`);
      }

      this.taskService.toggleTask(task);

      // Update parent task progress if applicable
      if (task.parent_id) {
        const parentTask = db.tasks.find(t => t.id === task.parent_id);
        if (parentTask) {
          this.taskService.updateParentProgress(parentTask, db.tasks);
        }
      }

      // Update project completion
      const project = this.projectService.findProjectById(db.projects, task.project_id);
      if (project) {
        this.projectService.updateProjectCompletion(project, db.tasks);
      }

      return {
        result: {
          task,
          projectCompletion: project ? project.completion_percentage : 0
        },
        commit: true,
        changedParts: new Set(['tasks', 'projects'] as const)
      };
    });

    // Update local state after successful commit
    this.database = await this.storageService.loadDatabase();
    this.buildTaskIndex();

    return {
      content: [{
        type: "text",
        text: `${taskCheckbox(result.task.completed)} Task ${result.task.completed ? 'completed' : 'marked as incomplete'}!

**Task:** ${result.task.title}
**Status:** ${result.task.completed ? `Completed ${EMOJIS.COMPLETED}` : `Incomplete ${EMOJIS.PENDING}`}
${result.task.completed_date ? `**Completed on:** ${new Date(result.task.completed_date).toLocaleDateString()}` : ''}

Project completion: ${result.projectCompletion}%`
      }]
    };
  }

  async get_project_status(args: any = {}): Promise<any> {
    const { project_id } = args;
    const targetProjectId = project_id || this.database.meta.current_project_id;

    if (!targetProjectId) {
      return this.getAllProjectsStatus();
    }

    const project = this.projectService.findProjectById(this.database.projects, targetProjectId);
    if (!project) {
      throw new Error(`Project not found: ${targetProjectId}`);
    }

    const summary = this.projectService.generateProjectSummary(project, this.database.tasks);
    
    let result = `# ${sectionHeader('Project Status', '📊')}: ${project.name}\n\n`;
    result += `**Status:** ${project.status} | **Completion:** ${summary.completion_percentage}%\n`;
    result += `**Total Tasks:** ${summary.total_tasks} | **Completed:** ${summary.completed_tasks} | **In Progress:** ${summary.in_progress_tasks}\n\n`;

    // Show task tree
    result += `${sectionHeader('Task List', '📋')}\n\n`;
    const rootTasks = this.taskService.filterTasks(this.database.tasks, {
      project_id: targetProjectId,
      parent_id: undefined
    });

    rootTasks.forEach(task => {
      result += this.taskService.formatTaskTree(task, this.database.tasks);
    });

    // Show critical/blocked items
    if (summary.blocked_tasks > 0) {
      result += `\n${sectionHeader('Blocked Items', '🚨')}\n\n`;
      this.database.tasks
        .filter(t => t.project_id === targetProjectId && t.blockers && t.blockers.length > 0)
        .forEach(task => {
          result += `- ${task.title}: ${task.blockers!.join(', ')}\n`;
        });
    }

    if (summary.critical_items.length > 0) {
      result += `\n${sectionHeader('Critical Priority Items', '⚡')}\n\n`;
      summary.critical_items.forEach(task => {
        result += `- ${taskCheckbox(task.completed)} ${task.title}\n`;
      });
    }

    // Recent completions
    if (summary.recent_completions.length > 0) {
      result += `\n${sectionHeader('Recently Completed', '✅')}\n\n`;
      summary.recent_completions.slice(0, 5).forEach(task => {
        result += `- ${task.title} (${new Date(task.completed_date!).toLocaleDateString()})\n`;
      });
    }

    return {
      content: [{
        type: "text",
        text: result
      }]
    };
  }

  async generate_handoff_summary(args: any = {}): Promise<any> {
    const { format = 'detailed' } = args;
    
    const result = await this.storageService.runExclusive(async (db) => {
      const projectId = db.meta.current_project_id;

      if (!projectId) {
        throw new Error('No active project. Use set_current_project first.');
      }

      const project = this.projectService.findProjectById(db.projects, projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const projectTasks = this.taskService.filterTasks(db.tasks, { project_id: projectId });
      const handoff = this.memoryService.generateHandoffSummary(
        project,
        projectTasks,
        db.meta.session_count,
        format,
        this.sessionStartTime
      );

      // Increment session count
      db.meta.session_count++;

      const formattedResult = this.memoryService.formatHandoffSummary(handoff, format);
      
      return {
        result: formattedResult,
        commit: true,
        changedParts: new Set(['meta'] as const)
      };
    });

    // Update local state after successful commit
    this.database = await this.storageService.loadDatabase();
    this.buildTaskIndex();

    return {
      content: [{
        type: "text",
        text: result
      }]
    };
  }

  async update_task_progress(args: any): Promise<any> {
    const { task_id, progress, notes, blockers } = args;
    
    if (!task_id) {
      throw new Error('Task ID is required');
    }

    const result = await this.storageService.runExclusive(async (db) => {
      const task = db.tasks.find(t => t.id === task_id);
      if (!task) {
        throw new Error(`Task not found: ${task_id}`);
      }

      this.taskService.updateTaskProgress(task, { progress, notes, blockers });

      if (task.parent_id) {
        const parentTask = db.tasks.find(t => t.id === task.parent_id);
        if (parentTask) {
          this.taskService.updateParentProgress(parentTask, db.tasks);
        }
      }

      const project = this.projectService.findProjectById(db.projects, task.project_id);
      if (project) {
        this.projectService.updateProjectCompletion(project, db.tasks);
      }

      return {
        result: task,
        commit: true,
        changedParts: new Set(['tasks', 'projects'] as const)
      };
    });

    // Update local state after successful commit
    this.database = await this.storageService.loadDatabase();
    this.buildTaskIndex();

    return {
      content: [{
        type: "text",
        text: `📊 Task updated successfully!

**Task:** ${result.title}
**Progress:** ${result.progress || 0}% ${result.completed ? '✅' : ''}
${result.blockers && result.blockers.length > 0 ? `**Blockers:** ${result.blockers.join(', ')}` : ''}
${notes ? `**New Note:** ${notes}` : ''}`
      }]
    };
  }

  async get_tasks(args: any = {}): Promise<any> {
    const { status, project_id, parent_id, priority } = args;
    const targetProjectId = project_id || this.database.meta.current_project_id;

    const filteredTasks = this.taskService.filterTasks(this.database.tasks, {
      status,
      project_id: targetProjectId,
      parent_id,
      priority
    });

    const sortedTasks = this.taskService.sortTasks(filteredTasks);
    const result = this.taskService.formatTaskList(sortedTasks);

    return {
      content: [{
        type: "text",
        text: result
      }]
    };
  }


  private generateProjectSummary(project: Project): ProjectSummary {
    const tasks = this.database.tasks.filter(t => t.project_id === project.id);
    
    const completed = tasks.filter(t => t.completed);
    const inProgress = tasks.filter(t => !t.completed && t.progress && t.progress > 0);
    const blocked = tasks.filter(t => t.blockers && t.blockers.length > 0);
    const critical = tasks.filter(t => t.priority === 'critical');
    
    const recentCompletions = completed
      .filter(t => t.completed_date)
      .sort((a, b) => new Date(b.completed_date!).getTime() - new Date(a.completed_date!).getTime())
      .slice(0, 5);

    const upcoming = tasks
      .filter(t => !t.completed)
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 5);

    return {
      project,
      total_tasks: tasks.length,
      completed_tasks: completed.length,
      in_progress_tasks: inProgress.length,
      blocked_tasks: blocked.length,
      recent_completions: recentCompletions,
      upcoming_tasks: upcoming,
      critical_items: critical,
      completion_percentage: project.completion_percentage
    };
  }

  private formatTaskTree(task: Task, indent: number): string {
    const indentStr = '  '.repeat(indent);
    const checkbox = task.completed ? '✅' : '⬜';
    const progress = task.progress ? ` (${task.progress}%)` : '';
    
    let result = `${indentStr}${checkbox} ${task.title}${progress} [${task.priority}]\n`;
    
    if (task.blockers && task.blockers.length > 0) {
      result += `${indentStr}  🚨 Blocked: ${task.blockers.join(', ')}\n`;
    }

    if (task.subtasks && task.subtasks.length > 0) {
      const subtasks = this.database.tasks.filter(t => task.subtasks!.includes(t.id));
      subtasks.forEach(subtask => {
        result += this.formatTaskTree(subtask, indent + 1);
      });
    }

    return result;
  }

  private getAllProjectsStatus(): any {
    if (this.database.projects.length === 0) {
      return {
        content: [{
          type: "text",
          text: `📋 No projects found. Use \`create_project\` to start a new project.`
        }]
      };
    }

    let result = `# 📊 All Projects Overview\n\n`;
    
    this.database.projects.forEach(project => {
      const tasks = this.database.tasks.filter(t => t.project_id === project.id);
      const completedTasks = tasks.filter(t => t.completed).length;
      
      result += `## ${project.name}\n`;
      result += `**Status:** ${project.status} | **Completion:** ${project.completion_percentage}%\n`;
      result += `**Tasks:** ${completedTasks}/${tasks.length} completed\n`;
      result += `**ID:** ${project.id}\n\n`;
    });

    return {
      content: [{
        type: "text",
        text: result
      }]
    };
  }

  // Legacy methods for backward compatibility
  async remember_this(args: any): Promise<any> {
    const { title, content, category = 'general', importance = 'medium', tags = [], task_id, project_id } = args;
    
    if (!title || !content) {
      throw new Error('Title and content are required');
    }

    const result = await this.storageService.runExclusive(async (db) => {
      const memory: Memory = {
        id: generateId('mem'),
        timestamp: new Date().toISOString(),
        category,
        importance: importance as Memory['importance'],
        tags: Array.isArray(tags) ? tags : [tags],
        title,
        content,
        task_id,
        project_id: project_id || db.meta.current_project_id,
        related_memories: []
      };

      db.memories.push(memory);
      
      return {
        result: memory,
        commit: true,
        changedParts: new Set(['memories'] as const)
      };
    });

    // Update local state after successful commit
    this.database = await this.storageService.loadDatabase();
    this.buildTaskIndex();

    return {
      content: [{
        type: "text",
        text: `${EMOJIS.SUCCESS} Memory stored successfully!
        
**ID:** ${result.id}
**Category:** ${result.category}
**Importance:** ${result.importance}
**Tags:** ${result.tags.join(', ')}`
      }]
    };
  }

  async recall_context(args: any): Promise<any> {
    const { query, category, tags, limit = 10 } = args;
    
    // If no parameters provided at all, show project status
    if (!query && !category && (!tags || tags.length === 0)) {
      return this.get_project_status();
    }

    // Ensure memories array exists
    if (!this.database.memories) {
      this.database.memories = [];
    }

    let results: Memory[] = [];

    // Always filter memories when any parameter is provided
    results = this.database.memories.filter(memory => {
      let matches = true;
      
      // Apply query filter if provided
      if (query) {
        const lowerQuery = query.toLowerCase();
        const matchesQuery =
          memory.title.toLowerCase().includes(lowerQuery) ||
          memory.content.toLowerCase().includes(lowerQuery) ||
          memory.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
        matches = matches && matchesQuery;
      }
      
      // Apply category filter if provided
      if (category) {
        matches = matches && memory.category === category;
      }
      
      // Apply tags filter if provided
      if (tags && tags.length > 0) {
        matches = matches && tags.some((tag: string) => memory.tags.includes(tag));
      }
      
      return matches;
    }).slice(0, limit);

    if (results.length === 0) {
      const filterDesc = [];
      if (category) filterDesc.push(`category: ${category}`);
      if (tags && tags.length > 0) filterDesc.push(`tags: ${tags.join(', ')}`);
      if (query) filterDesc.push(`query: "${query}"`);
      
      return {
        content: [{
          type: "text",
          text: `🧠 No memories found matching filters: ${filterDesc.join(', ')}\n\nTotal memories in database: ${this.database.memories.length}\n\nUse \`remember_this\` to store important information for future recall.`
        }]
      };
    }

    const formattedResults = results.map(memory => {
      return `## ${memory.title}
**Category:** ${memory.category} | **Importance:** ${memory.importance}
**Tags:** ${memory.tags.join(', ')}
**Date:** ${new Date(memory.timestamp).toLocaleDateString()}

${memory.content}`;
    }).join('\n\n---\n\n');

    return {
      content: [{
        type: "text",
        text: `${EMOJIS.MEMORY} Found ${results.length} relevant memories:\n\n${formattedResults}`
      }]
    };
  }

  async export_to_markdown(args: any): Promise<any> {
    const { output_file = 'project-export.md', include_tasks = true, include_memories = true } = args;
    
    let markdown = `# Project Export\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n`;
    markdown += `**Session Count:** ${this.database.meta.session_count}\n\n`;

    // Export projects and tasks
    if (include_tasks) {
      markdown += `## Projects & Tasks\n\n`;
      
      this.database.projects.forEach(project => {
        markdown += `### ${project.name}\n`;
        markdown += `**Status:** ${project.status} | **Completion:** ${project.completion_percentage}%\n\n`;
        
        const tasks = this.database.tasks.filter(t => t.project_id === project.id && !t.parent_id);
        tasks.forEach(task => {
          markdown += this.exportTaskTree(task, 0);
        });
        
        markdown += '\n';
      });
    }

    // Export memories
    if (include_memories && this.database.memories.length > 0) {
      markdown += `## Memories\n\n`;
      
      this.database.memories.forEach(memory => {
        markdown += `### ${memory.title}\n`;
        markdown += `**Category:** ${memory.category} | **Importance:** ${memory.importance}\n`;
        markdown += `**Tags:** ${memory.tags.join(', ')}\n\n`;
        markdown += `${memory.content}\n\n`;
        markdown += `---\n\n`;
      });
    }

    try {
      fs.writeFileSync(output_file, markdown, 'utf8');
      return {
        content: [{
          type: "text",
          text: `${EMOJIS.SUCCESS} Export saved to: ${output_file}\n\n**Stats:**\n- Projects: ${this.database.projects.length}\n- Tasks: ${this.database.tasks.length}\n- Memories: ${this.database.memories.length}\n- File size: ${Math.round(markdown.length / 1024)}KB`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error saving export: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private exportTaskTree(task: Task, indent: number): string {
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
      const subtasks = this.database.tasks.filter(t => task.subtasks!.includes(t.id));
      subtasks.forEach(subtask => {
        result += this.exportTaskTree(subtask, indent + 1);
      });
    }

    return result;
  }

  async apply_template(args: any): Promise<any> {
    const { template_name, context = {} } = args;
    
    if (!template_name) {
      throw new Error('Template name is required');
    }

    const template = this.database.templates[template_name];
    if (!template) {
      const availableTemplates = Object.keys(this.database.templates).join(', ');
      throw new Error(`Template "${template_name}" not found. Available: ${availableTemplates}`);
    }

    let result = `📋 **Template: ${template_name}**\n**Category:** ${template.category}\n\n`;
    
    template.structure.forEach((step, index) => {
      result += `**${index + 1}. ${step.step}**\n${step.prompt}\n\n`;
    });

    result += `\n💡 **Next Steps:**
1. Answer each prompt above
2. Create tasks based on your answers
3. Use \`create_task\` for each action item`;

    return {
      content: [{
        type: "text",
        text: result
      }]
    };
  }

  async list_categories(): Promise<any> {
    let result = `📊 **Project Management Overview**\n\n`;
    
    // Show project stats
    result += `**Active Projects:** ${this.database.projects.length}\n`;
    result += `**Total Tasks:** ${this.database.tasks.length}\n`;
    result += `**Completed Tasks:** ${this.database.tasks.filter(t => t.completed).length}\n`;
    result += `**Session Count:** ${this.database.meta.session_count}\n\n`;

    // Show available templates
    result += `**Available Templates:**\n`;
    Object.keys(this.database.templates).forEach(template => {
      result += `- ${template}\n`;
    });

    result += `\n💡 Use \`get_project_status\` to see your current tasks.`;

    return {
      content: [{
        type: "text",
        text: result
      }]
    };
  }

  async set_current_project(args: any): Promise<any> {
    const { project_id } = args;
    
    if (!project_id) {
      throw new Error('Project ID is required');
    }

    const result = await this.storageService.runExclusive(async (db) => {
      const project = db.projects.find(p => p.id === project_id);
      if (!project) {
        throw new Error(`Project not found: ${project_id}`);
      }

      db.meta.current_project_id = project_id;
      
      return {
        result: project,
        commit: true,
        changedParts: new Set(['meta'] as const)
      };
    });

    // Update local state after successful commit
    this.database = await this.storageService.loadDatabase();
    this.buildTaskIndex();

    return {
      content: [{
        type: "text",
        text: `${EMOJIS.SUCCESS} Current project set to: **${result.name}**\n\nAll new tasks will be added to this project by default.`
      }]
    };
  }
}

const server = new Server(
  SERVER_CONFIG,
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: ALL_TOOLS
  };
});

// Handle tool calls
// This function is defined outside the main block to be referenced later.
const callToolHandler = async (request: any, memoryServer: MemoryPickleServer) => {
  const { name, arguments: args } = request.params;

  try {
    // Dynamically call the method on the server instance
    if (typeof (memoryServer as any)[name] === 'function') {
      return await (memoryServer as any)[name](args);
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
};

// List resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources = [];
  
  if (fs.existsSync(PROJECT_FILE)) {
    resources.push({
      uri: `file://${PROJECT_FILE}`,
      mimeType: "text/yaml",
      name: "Project Database",
      description: "YAML database containing projects, tasks, and memories"
    });
  }

  return { resources };
});

// Read resources
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const url = new URL(request.params.uri);
  
  if (url.protocol === 'file:') {
    const filePath = url.pathname;
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return {
        contents: [{
          uri: request.params.uri,
          mimeType: "text/yaml",
          text: content
        }]
      };
    }
  }
  
  throw new Error(`Resource not found: ${request.params.uri}`);
});

// Start server
async function main() {
  const memoryServer = await MemoryPickleServer.create();
  const transport = new StdioServerTransport();
  
  // Set the handler, passing the created memoryServer instance.
  server.setRequestHandler(CallToolRequestSchema, (req) => callToolHandler(req, memoryServer));

  await server.connect(transport);
  console.error('Memory Pickle MCP server v1.0 running - Project Management Mode');
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
