/**
 * E2E Test Setup
 * 
 * Setup and teardown for end-to-end tests covering complete workflows
 */

// Extended timeout for e2e tests
jest.setTimeout(60000);

// Global test cleanup to prevent Jest hanging
let e2eCoreInstances: any[] = [];

// Track MemoryPickleCore instances for cleanup
(global as any).trackCoreInstance = (core: any) => {
  e2eCoreInstances.push(core);
};

// Cleanup all core instances after each test
afterEach(async () => {
  await Promise.all(
    e2eCoreInstances.map(async (core) => {
      try {
        if (core && typeof core.shutdown === 'function') {
          await core.shutdown();
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    })
  );
  e2eCoreInstances = [];
});

// Keep console output for e2e test debugging
beforeEach(() => {
  // Don't mock console for e2e tests - we want to see the full output
}); 