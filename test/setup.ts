import { jest } from '@jest/globals';

// Global test configuration
beforeAll(() => {
  // Set timezone for consistent date testing
  process.env.TZ = 'UTC';
  
  // Suppress console output in tests unless explicitly needed
  if (!process.env.VERBOSE_TESTS) {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  }
  
  // Mock performance.now for consistent timing tests
  if (!global.performance) {
    global.performance = {
      now: jest.fn(() => Date.now())
    } as any;
  }
});

afterAll(() => {
  // Restore console methods
  jest.restoreAllMocks();
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidTask(): R;
      toBeValidProject(): R;
      toBeValidMemory(): R;
      toHaveValidSchema(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidTask(received: any) {
    const pass = (
      typeof received === 'object' &&
      received !== null &&
      typeof received.id === 'string' &&
      received.id.startsWith('task_') &&
      typeof received.title === 'string' &&
      received.title.length > 0 &&
      typeof received.project_id === 'string' &&
      typeof received.completed === 'boolean' &&
      ['critical', 'high', 'medium', 'low'].includes(received.priority) &&
      Array.isArray(received.tags) &&
      Array.isArray(received.subtasks) &&
      Array.isArray(received.notes) &&
      Array.isArray(received.blockers)
    );

    return {
      message: () => pass 
        ? `Expected ${received} not to be a valid task`
        : `Expected ${received} to be a valid task with required fields`,
      pass,
    };
  },

  toBeValidProject(received: any) {
    const pass = (
      typeof received === 'object' &&
      received !== null &&
      typeof received.id === 'string' &&
      received.id.startsWith('proj_') &&
      typeof received.name === 'string' &&
      received.name.length > 0 &&
      ['active', 'in_progress', 'completed', 'on_hold'].includes(received.status) &&
      typeof received.completion_percentage === 'number' &&
      received.completion_percentage >= 0 &&
      received.completion_percentage <= 100 &&
      Array.isArray(received.tasks)
    );

    return {
      message: () => pass 
        ? `Expected ${received} not to be a valid project`
        : `Expected ${received} to be a valid project with required fields`,
      pass,
    };
  },

  toBeValidMemory(received: any) {
    const pass = (
      typeof received === 'object' &&
      received !== null &&
      typeof received.id === 'string' &&
      received.id.startsWith('mem_') &&
      typeof received.title === 'string' &&
      received.title.length > 0 &&
      typeof received.content === 'string' &&
      typeof received.category === 'string' &&
      ['critical', 'high', 'medium', 'low'].includes(received.importance) &&
      Array.isArray(received.tags) &&
      typeof received.timestamp === 'string'
    );

    return {
      message: () => pass 
        ? `Expected ${received} not to be a valid memory`
        : `Expected ${received} to be a valid memory with required fields`,
      pass,
    };
  },

  toHaveValidSchema(received: any) {
    const pass = (
      typeof received === 'object' &&
      received !== null &&
      received.type === 'object' &&
      typeof received.properties === 'object'
    );

    return {
      message: () => pass 
        ? `Expected ${received} not to have a valid schema`
        : `Expected ${received} to have a valid JSON schema structure`,
      pass,
    };
  },
});

// Test environment helpers
export const TEST_CONFIG = {
  // Timeouts
  DEFAULT_TIMEOUT: 5000,
  LONG_TIMEOUT: 30000,
  
  // Performance thresholds (in milliseconds)
  FAST_OPERATION: 10,
  MEDIUM_OPERATION: 100,
  SLOW_OPERATION: 1000,
  
  // Test data limits
  MAX_TEST_TASKS: 1000,
  MAX_TEST_PROJECTS: 100,
  MAX_TEST_MEMORIES: 500,
} as const;

// Error handling for async tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, just log
});

// Memory leak detection
let initialMemoryUsage: NodeJS.MemoryUsage;

beforeEach(() => {
  if (process.env.DETECT_MEMORY_LEAKS) {
    initialMemoryUsage = process.memoryUsage();
  }
});

afterEach(() => {
  if (process.env.DETECT_MEMORY_LEAKS && initialMemoryUsage) {
    const currentMemory = process.memoryUsage();
    const heapGrowth = currentMemory.heapUsed - initialMemoryUsage.heapUsed;
    
    // Warn if heap grew by more than 50MB in a single test
    if (heapGrowth > 50 * 1024 * 1024) {
      console.warn(`Potential memory leak detected: heap grew by ${Math.round(heapGrowth / 1024 / 1024)}MB`);
    }
  }
});

// Test isolation helpers
export function isolateTest(testFn: () => void | Promise<void>) {
  return async () => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    await testFn();

    // Clean up any remaining timers
    jest.clearAllTimers();
  };
}

// Console control utilities
export function withConsoleErrors<T>(testFn: () => T): T {
  const originalError = console.error;
  console.error = originalError; // Restore console.error for this test
  try {
    return testFn();
  } finally {
    if (!process.env.VERBOSE_TESTS) {
      console.error = jest.fn(); // Re-suppress after test
    }
  }
}

export function suppressConsoleInTest(methods: ('log' | 'error' | 'warn' | 'info')[] = ['error']) {
  const originalMethods: Record<string, any> = {};

  beforeEach(() => {
    methods.forEach(method => {
      originalMethods[method] = console[method];
      console[method] = jest.fn();
    });
  });

  afterEach(() => {
    methods.forEach(method => {
      console[method] = originalMethods[method];
    });
  });
}
