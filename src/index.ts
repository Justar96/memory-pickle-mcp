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
import * as path from 'path';

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
import { validateExportPath, setSecureFilePermissions } from './utils/securityUtils.js';

// Import services
import { StorageService, ProjectService, TaskService, MemoryService, IntelligentTaskService } from './services/index.js';

// Import tools
import { ALL_TOOLS, TOOL_NAMES } from './tools/index.js';


class MemoryPickleServer {
  private database: ProjectDatabase;
  private storageService: StorageService;
  private projectService: ProjectService;
  private taskService: TaskService;
  private memoryService: MemoryService;
  private intelligentTaskService: IntelligentTaskService;
  private sessionStartTime: Date;
  private taskIndex: Map<string, Task>;

  private constructor(
    database: ProjectDatabase,
    storageService: StorageService,
    projectService: ProjectService,
    taskService: TaskService,
    memoryService: MemoryService,
    intelligentTaskService: IntelligentTaskService
  ) {
    this.database = database;
    this.storageService = storageService;
    this.projectService = projectService;
    this.taskService = taskService;
    this.memoryService = memoryService;
    this.intelligentTaskService = intelligentTaskService;
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
    const intelligentTaskService = new IntelligentTaskService();
    
    const database = await storageService.loadDatabase();

    // Backward compatibility: Load legacy memories if main DB is empty
    if (database.memories.length === 0) {
      const legacyMemories = await storageService.loadMemories();
      if (legacyMemories.length > 0) {
        database.memories = legacyMemories;
        console.error(`Loaded ${legacyMemories.length} memories from legacy file.`);
      }
    }
    
    return new MemoryPickleServer(database, storageService, projectService, taskService, memoryService, intelligentTaskService);
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

      // Apply intelligent analysis to the task
      const complexityAnalysis = this.intelligentTaskService.analyzeTaskComplexity(task);
      const effortEstimate = this.intelligentTaskService.estimateEffort(task);
      const dependencyAnalysis = this.intelligentTaskService.detectDependencies(task, db.tasks);

      // Enhance task with intelligent data
      task.complexity_score = complexityAnalysis.confidence;
      task.effort_estimate = effortEstimate.estimate;
      task.suggested_subtasks = complexityAnalysis.suggestions;
      task.dependencies = dependencyAnalysis.dependencies.map(dep => dep.id);

      db.tasks.push(task);

      // Link task to project and parent
      const project = this.projectService.findProjectById(db.projects, targetProjectId);
      const parentTask = args.parent_id ? db.tasks.find(t => t.id === args.parent_id) : undefined;
      
      if (project) {
        this.taskService.linkTaskToProject(task, project, parentTask);
      }

      this.projectService.updateProjectCompletion(project!, db.tasks);
      
      return {
        result: {
          task,
          complexityAnalysis,
          effortEstimate,
          dependencyAnalysis
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
        text: `${EMOJIS.SUCCESS} Task created successfully!

**Task:** ${result.task.title}
**ID:** ${result.task.id}
**Priority:** ${result.task.priority}
**Effort Estimate:** ${result.task.effort_estimate} (${result.effortEstimate.reasoning})
**Status:** ⬜ Not completed
${args.parent_id ? `**Parent Task:** ${args.parent_id}` : ''}
${args.due_date ? `**Due Date:** ${args.due_date}` : ''}

${result.complexityAnalysis.shouldBreakdown ? `💡 **AI Suggestion:** This task appears complex and might benefit from being broken down into subtasks:\n${result.task.suggested_subtasks?.map(s => `• ${s}`).join('\n')}` : ''}

${result.dependencyAnalysis.dependencies.length > 0 ? `🔗 **Dependencies:** ${result.dependencyAnalysis.suggestions.slice(0, 2).join(', ')}` : ''}

Use \`toggle_task\` with ID "${result.task.id}" to mark it as complete.`
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
      // Validate and sanitize the output file path to prevent path traversal attacks
      const safePath = validateExportPath(output_file, DATA_DIR);
      const outputDir = path.dirname(safePath);
      
      // Ensure output directory exists
      await ensureDirectoryExists(outputDir);
      
      // Write file with proper async handling
      await fs.promises.writeFile(safePath, markdown, 'utf8');
      
      // Set secure file permissions
      await setSecureFilePermissions(safePath);
      
      return {
        content: [{
          type: "text",
          text: `${EMOJIS.SUCCESS} Export saved to: ${safePath}\n\n**Stats:**\n- Projects: ${this.database.projects.length}\n- Tasks: ${this.database.tasks.length}\n- Memories: ${this.database.memories.length}\n- File size: ${Math.round(markdown.length / 1024)}KB`
        }]
      };
    } catch (error) {
      const errorMsg = `Failed to save export to ${output_file}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('Export error:', errorMsg);
      return {
        content: [{
          type: "text",
          text: `❌ Error saving export: ${errorMsg}`
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

  // Intelligent Task Analysis Methods
  async analyze_task(args: any): Promise<any> {
    const { task_id } = args;
    
    if (!task_id) {
      throw new Error('Task ID is required');
    }

    const task = this.taskIndex.get(task_id);
    if (!task) {
      throw new Error(`Task not found: ${task_id}`);
    }

    const complexityAnalysis = this.intelligentTaskService.analyzeTaskComplexity(task);
    const effortEstimate = this.intelligentTaskService.estimateEffort(task);
    const dependencyAnalysis = this.intelligentTaskService.detectDependencies(task, this.database.tasks);

    let result = `${EMOJIS.BRAIN} **Intelligent Task Analysis**\n\n`;
    result += `**Task:** ${task.title}\n`;
    result += `**Complexity Score:** ${complexityAnalysis.confidence}/100\n`;
    result += `**Effort Estimate:** ${effortEstimate.estimate} (${effortEstimate.reasoning})\n\n`;

    if (complexityAnalysis.shouldBreakdown) {
      result += `💡 **Breakdown Recommended:** ${complexityAnalysis.reasoning}\n\n`;
      result += `**Suggested Subtasks:**\n${complexityAnalysis.suggestions.map(s => `• ${s}`).join('\n')}\n\n`;
    }

    if (dependencyAnalysis.dependencies.length > 0) {
      result += `🔗 **Dependencies Detected:**\n${dependencyAnalysis.suggestions.slice(0, 3).join('\n')}\n\n`;
    }

    result += `**Analysis Summary:**\n${complexityAnalysis.reasoning}`;

    return {
      content: [{
        type: "text",
        text: result
      }]
    };
  }

  async suggest_subtasks(args: any): Promise<any> {
    const { task_id, auto_create = false } = args;
    
    if (!task_id) {
      throw new Error('Task ID is required');
    }

    const task = this.taskIndex.get(task_id);
    if (!task) {
      throw new Error(`Task not found: ${task_id}`);
    }

    const complexityAnalysis = this.intelligentTaskService.analyzeTaskComplexity(task);
    
    if (!complexityAnalysis.shouldBreakdown) {
      return {
        content: [{
          type: "text",
          text: `${EMOJIS.INFO} Task "${task.title}" doesn't appear to need breakdown.\n\n**Reason:** ${complexityAnalysis.reasoning}`
        }]
      };
    }

    let result = `${EMOJIS.LIGHTBULB} **Intelligent Subtask Suggestions**\n\n`;
    result += `**Parent Task:** ${task.title}\n`;
    result += `**Breakdown Confidence:** ${complexityAnalysis.confidence}%\n\n`;
    result += `**Suggested Subtasks:**\n${complexityAnalysis.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n`;

    if (auto_create) {
      const createdSubtasks = [];
      for (const suggestion of complexityAnalysis.suggestions) {
        try {
          const subtaskResult = await this.create_task({
            title: suggestion,
            parent_id: task_id,
            project_id: task.project_id,
            priority: 'medium'
          });
          createdSubtasks.push(suggestion);
        } catch (error) {
          console.error(`Failed to create subtask: ${suggestion}`, error);
        }
      }
      
      if (createdSubtasks.length > 0) {
        result += `✅ **Auto-created ${createdSubtasks.length} subtasks:**\n${createdSubtasks.map(s => `• ${s}`).join('\n')}\n\n`;
      }
    } else {
      result += `💡 Use \`suggest_subtasks\` with \`auto_create: true\` to automatically create these subtasks.`;
    }

    return {
      content: [{
        type: "text",
        text: result
      }]
    };
  }

  async detect_blockers(args: any = {}): Promise<any> {
    const { task_id, project_id, scope = 'task' } = args;
    
    let targetTasks: Task[] = [];
    let analysisScope = '';

    if (scope === 'task' && task_id) {
      const task = this.taskIndex.get(task_id);
      if (!task) {
        throw new Error(`Task not found: ${task_id}`);
      }
      targetTasks = [task];
      analysisScope = `Task: ${task.title}`;
    } else if (scope === 'project' || project_id) {
      const targetProjectId = project_id || this.database.meta.current_project_id;
      if (!targetProjectId) {
        throw new Error('No active project. Specify project_id or set current project.');
      }
      targetTasks = this.database.tasks.filter(t => t.project_id === targetProjectId);
      const project = this.database.projects.find(p => p.id === targetProjectId);
      analysisScope = `Project: ${project?.name || targetProjectId}`;
    } else {
      targetTasks = this.database.tasks;
      analysisScope = 'All tasks';
    }

    const blockerAnalysis = this.intelligentTaskService.identifyPotentialBlockers(targetTasks, this.database.tasks);

    let result = `${EMOJIS.WARNING} **Proactive Blocker Detection**\n\n`;
    result += `**Analysis Scope:** ${analysisScope}\n`;
    result += `**Tasks Analyzed:** ${targetTasks.length}\n\n`;

    if (blockerAnalysis.length === 0) {
      result += `✅ **No significant blockers detected!**\n\nAll analyzed tasks appear to have clear paths forward.`;
    } else {
      result += `**Potential Blockers Identified:**\n\n`;
      blockerAnalysis.forEach((analysis, index) => {
        result += `**${index + 1}. ${analysis.task.title}**\n`;
        result += `Risk Level: ${analysis.riskLevel}\n`;
        result += `Blockers: ${analysis.potentialBlockers.join(', ')}\n`;
        if (analysis.suggestions.length > 0) {
          result += `Suggestions: ${analysis.suggestions.join(', ')}\n`;
        }
        result += `\n`;
      });

      result += `💡 **Recommendations:**\n`;
      result += `• Address high-risk blockers first\n`;
      result += `• Consider creating preparation tasks for identified risks\n`;
      result += `• Review dependencies before starting blocked tasks`;
    }

    return {
      content: [{
        type: "text",
        text: result
      }]
    };
  }

  async optimize_workflow(args: any = {}): Promise<any> {
    const { project_id, focus = 'balanced' } = args;
    
    const targetProjectId = project_id || this.database.meta.current_project_id;
    if (!targetProjectId) {
      throw new Error('No active project. Specify project_id or set current project.');
    }

    const project = this.database.projects.find(p => p.id === targetProjectId);
    const projectTasks = this.database.tasks.filter(t => t.project_id === targetProjectId);
    
    if (projectTasks.length === 0) {
      return {
        content: [{
          type: "text",
          text: `${EMOJIS.INFO} No tasks found in project to optimize.`
        }]
      };
    }

    const workflowOptimization = this.intelligentTaskService.optimizeWorkflow(projectTasks, focus);

    let result = `${EMOJIS.ROCKET} **Intelligent Workflow Optimization**\n\n`;
    result += `**Project:** ${project?.name || targetProjectId}\n`;
    result += `**Focus:** ${focus}\n`;
    result += `**Tasks Analyzed:** ${projectTasks.length}\n\n`;

    result += `**Optimal Task Order:**\n`;
    workflowOptimization.recommendedOrder.forEach((task, index) => {
      const priority = task.priority === 'critical' ? '🔥' : task.priority === 'high' ? '⚡' : task.priority === 'medium' ? '📋' : '📝';
      const effort = task.effort_estimate ? ` [${task.effort_estimate}]` : '';
      result += `${index + 1}. ${priority} ${task.title}${effort}\n`;
    });

    result += `\n**Optimization Insights:**\n`;
    workflowOptimization.insights.forEach(insight => {
      result += `• ${insight}\n`;
    });

    if (workflowOptimization.parallelOpportunities.length > 0) {
      result += `\n**Parallel Work Opportunities:**\n`;
      workflowOptimization.parallelOpportunities.forEach(opportunity => {
        result += `• ${opportunity}\n`;
      });
    }

    if (workflowOptimization.efficiencyTips.length > 0) {
      result += `\n💡 **Efficiency Tips:**\n`;
      workflowOptimization.efficiencyTips.forEach(tip => {
        result += `• ${tip}\n`;
      });
    }

    return {
      content: [{
        type: "text",
        text: result
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
  console.error('Memory Pickle MCP server v1.2.0 running - Intelligent Project Management Mode');
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
