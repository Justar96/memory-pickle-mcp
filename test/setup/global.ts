/**
 * Global Test Setup
 * 
 * Universal setup and teardown for all test types in the organized structure
 */

// Global test cleanup to prevent Jest hanging
let globalCoreInstances: any[] = [];

// Track MemoryPickleCore instances for cleanup
(global as any).trackCoreInstance = (core: any) => {
  globalCoreInstances.push(core);
};

// Cleanup all core instances after each test
afterEach(async () => {
  await Promise.all(
    globalCoreInstances.map(async (core) => {
      try {
        if (core && typeof core.shutdown === 'function') {
          await core.shutdown();
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    })
  );
  globalCoreInstances = [];
}); 