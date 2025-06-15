import type { Project, Task, Memory, ProjectDatabase } from '../types/index.js';

/**
 * Comprehensive validation utilities for data integrity and schema enforcement
 */
export class ValidationUtils {
  // Project validation
  static validateProject(project: Partial<Project>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!project.name || typeof project.name !== 'string') {
      errors.push('Project name is required and must be a string');
    } else if (project.name.length === 0 || project.name.length > 200) {
      errors.push('Project name must be between 1 and 200 characters');
    }

    if (project.description && typeof project.description !== 'string') {
      errors.push('Project description must be a string');
    } else if (project.description && project.description.length > 2000) {
      errors.push('Project description cannot exceed 2000 characters');
    }

    if (project.status && !['planning', 'in_progress', 'blocked', 'completed', 'archived'].includes(project.status)) {
      errors.push('Project status must be one of: planning, in_progress, blocked, completed, archived');
    }

    if (project.completion_percentage !== undefined) {
      if (typeof project.completion_percentage !== 'number' || 
          project.completion_percentage < 0 || 
          project.completion_percentage > 100) {
        errors.push('Project completion percentage must be a number between 0 and 100');
      }
    }

    if (project.id && (typeof project.id !== 'string' || project.id.length === 0)) {
      errors.push('Project ID must be a non-empty string');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Task validation
  static validateTask(task: Partial<Task>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!task.title || typeof task.title !== 'string') {
      errors.push('Task title is required and must be a string');
    } else if (task.title.length === 0 || task.title.length > 200) {
      errors.push('Task title must be between 1 and 200 characters');
    }

    if (task.description && typeof task.description !== 'string') {
      errors.push('Task description must be a string');
    } else if (task.description && task.description.length > 2000) {
      errors.push('Task description cannot exceed 2000 characters');
    }

    if (task.priority && !['low', 'medium', 'high', 'critical'].includes(task.priority)) {
      errors.push('Task priority must be one of: low, medium, high, critical');
    }

    if (!task.project_id || typeof task.project_id !== 'string') {
      errors.push('Task project_id is required and must be a string');
    }

    if (task.parent_id && typeof task.parent_id !== 'string') {
      errors.push('Task parent_id must be a string');
    }

    if (task.progress !== undefined) {
      if (typeof task.progress !== 'number' || task.progress < 0 || task.progress > 100) {
        errors.push('Task progress must be a number between 0 and 100');
      }
    }

    if (task.completed !== undefined && typeof task.completed !== 'boolean') {
      errors.push('Task completed must be a boolean');
    }

    if (task.notes && !Array.isArray(task.notes)) {
      errors.push('Task notes must be an array');
    } else if (task.notes) {
      task.notes.forEach((note, index) => {
        if (typeof note !== 'string') {
          errors.push(`Task note at index ${index} must be a string`);
        }
      });
    }

    if (task.blockers && !Array.isArray(task.blockers)) {
      errors.push('Task blockers must be an array');
    } else if (task.blockers) {
      task.blockers.forEach((blocker, index) => {
        if (typeof blocker !== 'string') {
          errors.push(`Task blocker at index ${index} must be a string`);
        }
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  // Memory validation
  static validateMemory(memory: Partial<Memory>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!memory.content || typeof memory.content !== 'string') {
      errors.push('Memory content is required and must be a string');
    } else if (memory.content.length === 0 || memory.content.length > 5000) {
      errors.push('Memory content must be between 1 and 5000 characters');
    }

    if (memory.title && typeof memory.title !== 'string') {
      errors.push('Memory title must be a string');
    } else if (memory.title && memory.title.length > 200) {
      errors.push('Memory title cannot exceed 200 characters');
    }

    if (memory.importance && !['low', 'medium', 'high', 'critical'].includes(memory.importance)) {
      errors.push('Memory importance must be one of: low, medium, high, critical');
    }

    if (memory.project_id && typeof memory.project_id !== 'string') {
      errors.push('Memory project_id must be a string');
    }

    if (memory.task_id && typeof memory.task_id !== 'string') {
      errors.push('Memory task_id must be a string');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Database schema validation
  static validateDatabaseSchema(database: Partial<ProjectDatabase>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required top-level properties
    if (!database.meta) {
      errors.push('Database meta is required');
    } else {
      if (!database.meta.version || typeof database.meta.version !== 'string') {
        errors.push('Database meta.version is required and must be a string');
      }
      if (!database.meta.last_updated || typeof database.meta.last_updated !== 'string') {
        errors.push('Database meta.last_updated is required and must be a string');
      }
      if (database.meta.session_count !== undefined && typeof database.meta.session_count !== 'number') {
        errors.push('Database meta.session_count must be a number');
      }
    }

    if (!Array.isArray(database.projects)) {
      errors.push('Database projects must be an array');
    } else {
      database.projects.forEach((project, index) => {
        const validation = this.validateProject(project);
        if (!validation.isValid) {
          errors.push(`Project at index ${index}: ${validation.errors.join(', ')}`);
        }
      });
    }

    if (!Array.isArray(database.tasks)) {
      errors.push('Database tasks must be an array');
    } else {
      database.tasks.forEach((task, index) => {
        const validation = this.validateTask(task);
        if (!validation.isValid) {
          errors.push(`Task at index ${index}: ${validation.errors.join(', ')}`);
        }
      });
    }

    if (!Array.isArray(database.memories)) {
      errors.push('Database memories must be an array');
    } else {
      database.memories.forEach((memory, index) => {
        const validation = this.validateMemory(memory);
        if (!validation.isValid) {
          errors.push(`Memory at index ${index}: ${validation.errors.join(', ')}`);
        }
      });
    }

    if (database.templates && typeof database.templates !== 'object') {
      errors.push('Database templates must be an object');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Input sanitization
  static sanitizeString(input: string): string {
    return input.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  }

  static sanitizeProject(project: Partial<Project>): Partial<Project> {
    const sanitized = { ...project };
    if (sanitized.name) sanitized.name = this.sanitizeString(sanitized.name);
    if (sanitized.description) sanitized.description = this.sanitizeString(sanitized.description);
    return sanitized;
  }

  static sanitizeTask(task: Partial<Task>): Partial<Task> {
    const sanitized = { ...task };
    if (sanitized.title) sanitized.title = this.sanitizeString(sanitized.title);
    if (sanitized.description) sanitized.description = this.sanitizeString(sanitized.description);
    if (sanitized.notes) {
      sanitized.notes = sanitized.notes.map(note => this.sanitizeString(note));
    }
    if (sanitized.blockers) {
      sanitized.blockers = sanitized.blockers.map(blocker => this.sanitizeString(blocker));
    }
    return sanitized;
  }

  static sanitizeMemory(memory: Partial<Memory>): Partial<Memory> {
    const sanitized = { ...memory };
    if (sanitized.title) sanitized.title = this.sanitizeString(sanitized.title);
    if (sanitized.content) sanitized.content = this.sanitizeString(sanitized.content);
    return sanitized;
  }

  // Data limits validation
  static validateDataLimits(database: ProjectDatabase): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (database.projects.length > 5000) {
      errors.push('Too many projects - maximum 5000 allowed');
    }
    
    if (database.tasks.length > 50000) {
      errors.push('Too many tasks - maximum 50000 allowed');
    }
    
    if (database.memories.length > 25000) {
      errors.push('Too many memories - maximum 25000 allowed');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Referential integrity validation
  static validateReferentialIntegrity(database: ProjectDatabase): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const projectIds = new Set(database.projects.map(p => p.id));
    const taskIds = new Set(database.tasks.map(t => t.id));

    // Check tasks reference valid projects
    database.tasks.forEach(task => {
      if (!projectIds.has(task.project_id)) {
        errors.push(`Task ${task.id} references non-existent project ${task.project_id}`);
      }
      if (task.parent_id && !taskIds.has(task.parent_id)) {
        errors.push(`Task ${task.id} references non-existent parent task ${task.parent_id}`);
      }
    });

    // Check memories reference valid projects/tasks
    database.memories.forEach(memory => {
      if (memory.project_id && !projectIds.has(memory.project_id)) {
        errors.push(`Memory ${memory.id} references non-existent project ${memory.project_id}`);
      }
      if (memory.task_id && !taskIds.has(memory.task_id)) {
        errors.push(`Memory ${memory.id} references non-existent task ${memory.task_id}`);
      }
    });

    // Check current project reference
    if (database.meta.current_project_id && !projectIds.has(database.meta.current_project_id)) {
      errors.push(`Current project ${database.meta.current_project_id} does not exist`);
    }

    return { isValid: errors.length === 0, errors };
  }

  // Comprehensive database validation
  static validateDatabase(database: ProjectDatabase): { isValid: boolean; errors: string[] } {
    const schemaValidation = this.validateDatabaseSchema(database);
    if (!schemaValidation.isValid) {
      return schemaValidation;
    }

    const limitsValidation = this.validateDataLimits(database);
    if (!limitsValidation.isValid) {
      return limitsValidation;
    }

    const integrityValidation = this.validateReferentialIntegrity(database);
    if (!integrityValidation.isValid) {
      return integrityValidation;
    }

    return { isValid: true, errors: [] };
  }
}