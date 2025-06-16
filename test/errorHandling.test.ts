/**
 * Comprehensive tests for error handling system and MCP awareness features
 */

import {
  MemoryPickleError,
  ValidationError,
  ProjectNotFoundError,
  TaskNotFoundError,
  MemoryNotFoundError,
  DuplicateProjectError,
  InvalidPriorityError,
  InvalidProgressError,
  CircularDependencyError,
  DryRunResult,
  formatErrorResponse,
  ValidationUtils
} from '../src/utils/errors.js';

describe('Error Handling System', () => {
  describe('Custom Error Classes', () => {
    test('MemoryPickleError should set name and code correctly', () => {
      const error = new MemoryPickleError('Test error', 'TEST_CODE');
      expect(error.name).toBe('MemoryPickleError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error instanceof Error).toBe(true);
    });

    test('ValidationError should format field validation message', () => {
      const error = new ValidationError('priority', 'urgent', 'Must be one of: critical, high, medium, low');
      expect(error.message).toBe("Validation failed for field 'priority': Must be one of: critical, high, medium, low. Received: urgent");
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    test('ProjectNotFoundError with suggestions', () => {
      const error = new ProjectNotFoundError('proj_123', ['proj_456', 'proj_789']);
      expect(error.message).toBe("Project 'proj_123' not found. Available projects: proj_456, proj_789");
      expect(error.code).toBe('PROJECT_NOT_FOUND');
    });

    test('ProjectNotFoundError without suggestions', () => {
      const error = new ProjectNotFoundError('proj_123');
      expect(error.message).toBe("Project 'proj_123' not found. No projects exist yet. Create a project first.");
      expect(error.code).toBe('PROJECT_NOT_FOUND');
    });

    test('TaskNotFoundError with suggestions', () => {
      const tasks = ['task_1', 'task_2', 'task_3', 'task_4', 'task_5', 'task_6'];
      const error = new TaskNotFoundError('missing_task', tasks);
      expect(error.message).toBe("Task 'missing_task' not found. Available tasks: task_1, task_2, task_3, task_4, task_5...");
      expect(error.code).toBe('TASK_NOT_FOUND');
    });

    test('TaskNotFoundError without tasks', () => {
      const error = new TaskNotFoundError('missing_task');
      expect(error.message).toBe("Task 'missing_task' not found. No tasks exist in current project.");
      expect(error.code).toBe('TASK_NOT_FOUND');
    });

    test('MemoryNotFoundError should format search query', () => {
      const error = new MemoryNotFoundError('database config');
      expect(error.message).toBe("No memories found matching query: 'database config'. Try broader search terms or check spelling.");
      expect(error.code).toBe('MEMORY_NOT_FOUND');
    });

    test('DuplicateProjectError should suggest alternatives', () => {
      const error = new DuplicateProjectError('My Project');
      expect(error.message).toBe("Project 'My Project' already exists. Use a different name or set it as current project.");
      expect(error.code).toBe('DUPLICATE_PROJECT');
    });

    test('InvalidPriorityError should list valid options', () => {
      const error = new InvalidPriorityError('urgent');
      expect(error.message).toBe("Invalid priority 'urgent'. Must be one of: critical, high, medium, low");
      expect(error.code).toBe('INVALID_PRIORITY');
    });

    test('InvalidProgressError should validate range', () => {
      const error = new InvalidProgressError(150);
      expect(error.message).toBe("Invalid progress value '150'. Must be between 0 and 100.");
      expect(error.code).toBe('INVALID_PROGRESS');
    });

    test('CircularDependencyError should explain the issue', () => {
      const error = new CircularDependencyError('task_1', 'task_2');
      expect(error.message).toBe("Cannot set parent 'task_2' for task 'task_1': would create circular dependency.");
      expect(error.code).toBe('CIRCULAR_DEPENDENCY');
    });

    test('DryRunResult should format simulation message', () => {
      const error = new DryRunResult('create_project', 'created project "Test" and set it as current');
      expect(error.message).toBe('[DRY RUN] create_project: Would have created project "Test" and set it as current');
      expect(error.code).toBe('DRY_RUN');
    });
  });

  describe('formatErrorResponse', () => {
    test('should format MemoryPickleError with code', () => {
      const error = new ValidationError('name', '', 'is required');
      const response = formatErrorResponse(error);
      
      expect(response).toEqual({
        content: [{
          type: "text",
          text: "[VALIDATION_ERROR] Validation failed for field 'name': is required. Received: "
        }],
        isError: true
      });
    });

    test('should format generic Error without code', () => {
      const error = new Error('Generic error message');
      const response = formatErrorResponse(error);
      
      expect(response).toEqual({
        content: [{
          type: "text",
          text: "[ERROR] Generic error message"
        }],
        isError: true
      });
    });

    test('should format MemoryPickleError without code', () => {
      const error = new MemoryPickleError('Custom error without code');
      const response = formatErrorResponse(error);
      
      expect(response).toEqual({
        content: [{
          type: "text",
          text: "[ERROR] Custom error without code"
        }],
        isError: true
      });
    });
  });

  describe('ValidationUtils', () => {
    describe('validatePriority', () => {
      test('should accept valid priorities', () => {
        expect(() => ValidationUtils.validatePriority('critical')).not.toThrow();
        expect(() => ValidationUtils.validatePriority('high')).not.toThrow();
        expect(() => ValidationUtils.validatePriority('medium')).not.toThrow();
        expect(() => ValidationUtils.validatePriority('low')).not.toThrow();
        expect(() => ValidationUtils.validatePriority(undefined)).not.toThrow();
      });

      test('should reject invalid priorities', () => {
        expect(() => ValidationUtils.validatePriority('urgent')).toThrow(InvalidPriorityError);
        expect(() => ValidationUtils.validatePriority('normal')).toThrow(InvalidPriorityError);
        expect(() => ValidationUtils.validatePriority('CRITICAL')).toThrow(InvalidPriorityError);
      });
    });

    describe('validateProgress', () => {
      test('should accept valid progress values', () => {
        expect(() => ValidationUtils.validateProgress(0)).not.toThrow();
        expect(() => ValidationUtils.validateProgress(50)).not.toThrow();
        expect(() => ValidationUtils.validateProgress(100)).not.toThrow();
        expect(() => ValidationUtils.validateProgress(undefined)).not.toThrow();
      });

      test('should reject invalid progress values', () => {
        expect(() => ValidationUtils.validateProgress(-1)).toThrow(InvalidProgressError);
        expect(() => ValidationUtils.validateProgress(101)).toThrow(InvalidProgressError);
        expect(() => ValidationUtils.validateProgress(150)).toThrow(InvalidProgressError);
      });
    });

    describe('validateRequiredField', () => {
      test('should accept valid values', () => {
        expect(() => ValidationUtils.validateRequiredField('valid', 'field')).not.toThrow();
        expect(() => ValidationUtils.validateRequiredField('  valid  ', 'field')).not.toThrow();
        expect(() => ValidationUtils.validateRequiredField(123, 'field')).not.toThrow();
        expect(() => ValidationUtils.validateRequiredField(true, 'field')).not.toThrow();
      });

      test('should reject invalid values', () => {
        expect(() => ValidationUtils.validateRequiredField('', 'field')).toThrow(ValidationError);
        expect(() => ValidationUtils.validateRequiredField('   ', 'field')).toThrow(ValidationError);
        expect(() => ValidationUtils.validateRequiredField(null, 'field')).toThrow(ValidationError);
        expect(() => ValidationUtils.validateRequiredField(undefined, 'field')).toThrow(ValidationError);
      });
    });

    describe('validateLineRange', () => {
      test('should accept valid line ranges', () => {
        expect(() => ValidationUtils.validateLineRange({ start_line: 1, end_line: 5 })).not.toThrow();
        expect(() => ValidationUtils.validateLineRange({ start_line: 10, end_line: 10 })).not.toThrow();
        expect(() => ValidationUtils.validateLineRange(undefined)).not.toThrow();
      });

      test('should reject invalid line ranges', () => {
        expect(() => ValidationUtils.validateLineRange({ start_line: 5, end_line: 3 })).toThrow(ValidationError);
        expect(() => ValidationUtils.validateLineRange({ start_line: 0, end_line: 5 })).toThrow(ValidationError);
        expect(() => ValidationUtils.validateLineRange({ start_line: 1 })).toThrow(ValidationError);
        expect(() => ValidationUtils.validateLineRange({ end_line: 5 })).toThrow(ValidationError);
      });
    });
  });
});