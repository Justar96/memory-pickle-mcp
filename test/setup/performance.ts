/**
 * Performance Test Setup
 * 
 * Setup and teardown for performance tests with extended timeouts
 */

// Very extended timeout for performance tests
jest.setTimeout(120000);

// Global test cleanup to prevent Jest hanging
let perfCoreInstances: any[] = [];

// Track MemoryPickleCore instances for cleanup
(global as any).trackCoreInstance = (core: any) => {
  perfCoreInstances.push(core);
};

// Cleanup all core instances after each test
afterEach(async () => {
  await Promise.all(
    perfCoreInstances.map(async (core) => {
      try {
        if (core && typeof core.shutdown === 'function') {
          await core.shutdown();
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    })
  );
  perfCoreInstances = [];
});

// Enable performance monitoring
beforeEach(() => {
  // Mock console.warn but keep console.log for performance metrics
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
}); 