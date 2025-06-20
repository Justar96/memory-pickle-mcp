/**
 * Custom error classes for Memory Pickle MCP with specific error types
 * Provides structured error handling and better agent self-correction
 */

export class MemoryPickleError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends MemoryPickleError {
  constructor(field: string, value: any, requirement: string) {
    super(`Validation failed for field '${field}': ${requirement}. Received: ${value}`);
    this.code = 'VALIDATION_ERROR';
  }
}

export class ProjectNotFoundError extends MemoryPickleError {
  constructor(projectId: string, availableProjects: string[] = []) {
    const suggestion = availableProjects.length > 0 
      ? ` Available projects: ${availableProjects.join(', ')}`
      : ' No projects exist yet. Create a project first.';
    super(`Project '${projectId}' not found.${suggestion}`);
    this.code = 'PROJECT_NOT_FOUND';
  }
}

export class TaskNotFoundError extends MemoryPickleError {
  constructor(taskId: string, availableTasks: string[] = []) {
    const suggestion = availableTasks.length > 0 
      ? ` Available tasks: ${availableTasks.slice(0, 5).join(', ')}${availableTasks.length > 5 ? '...' : ''}`
      : ' No tasks exist in current project.';
    super(`Task '${taskId}' not found.${suggestion}`);
    this.code = 'TASK_NOT_FOUND';
  }
}

export class MemoryNotFoundError extends MemoryPickleError {
  constructor(query: string) {
    super(`No memories found matching query: '${query}'. Try broader search terms or check spelling.`);
    this.code = 'MEMORY_NOT_FOUND';
  }
}

export class DuplicateProjectError extends MemoryPickleError {
  constructor(projectName: string) {
    super(`Project '${projectName}' already exists. Use a different name or set it as current project.`);
    this.code = 'DUPLICATE_PROJECT';
  }
}

export class InvalidPriorityError extends MemoryPickleError {
  constructor(priority: string) {
    super(`Invalid priority '${priority}'. Must be one of: critical, high, medium, low`);
    this.code = 'INVALID_PRIORITY';
  }
}

export class InvalidProgressError extends MemoryPickleError {
  constructor(progress: number) {
    super(`Invalid progress value '${progress}'. Must be between 0 and 100.`);
    this.code = 'INVALID_PROGRESS';
  }
}

export class CircularDependencyError extends MemoryPickleError {
  constructor(taskId: string, parentId: string) {
    super(`Cannot set parent '${parentId}' for task '${taskId}': would create circular dependency.`);
    this.code = 'CIRCULAR_DEPENDENCY';
  }
}

export class DryRunResult extends MemoryPickleError {
  constructor(operation: string, wouldHave: string) {
    super(`[DRY RUN] ${operation}: Would have ${wouldHave}`);
    this.code = 'DRY_RUN';
  }
}

/**
 * Formats error for MCP response with clean text output
 */
export function formatErrorResponse(error: Error): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  const errorPrefix = error instanceof MemoryPickleError && error.code 
    ? `[${error.code}]` 
    : '[ERROR]';
  
  return {
    content: [{
      type: "text",
      text: `${errorPrefix} ${error.message}`
    }],
    isError: true
  };
}

