/**
 * Unit Test Setup
 * 
 * Setup and teardown for unit tests focusing on individual components
 */

// Global test timeout for unit tests
jest.setTimeout(10000);

// Global test cleanup to prevent Jest hanging
let coreInstances: any[] = [];

// Track MemoryPickleCore instances for cleanup
(global as any).trackCoreInstance = (core: any) => {
  coreInstances.push(core);
};

// Cleanup all core instances after each test
afterEach(async () => {
  await Promise.all(
    coreInstances.map(async (core) => {
      try {
        if (core && typeof core.shutdown === 'function') {
          await core.shutdown();
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    })
  );
  coreInstances = [];
});

// Reset console.warn for clean test output
beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
}); 