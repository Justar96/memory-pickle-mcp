/**
 * Integration Test Setup
 * 
 * Setup and teardown for integration tests covering component interactions
 */

// Extended timeout for integration tests
jest.setTimeout(30000);

// Global test cleanup to prevent Jest hanging
let integrationCoreInstances: any[] = [];

// Track MemoryPickleCore instances for cleanup
(global as any).trackCoreInstance = (core: any) => {
  integrationCoreInstances.push(core);
};

// Cleanup all core instances after each test
afterEach(async () => {
  await Promise.all(
    integrationCoreInstances.map(async (core) => {
      try {
        if (core && typeof core.shutdown === 'function') {
          await core.shutdown();
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    })
  );
  integrationCoreInstances = [];
});

// Reset console output for clean test runs
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
}); 