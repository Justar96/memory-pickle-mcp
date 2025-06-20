/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',

  // Performance optimizations
  maxWorkers: '50%',
  testTimeout: 30000,

  // Force Jest to exit even with hanging timers/intervals
  forceExit: true,
  detectOpenHandles: true,

  // Modern ts-jest configuration (avoiding deprecated globals)
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
    }],
  },

  // Use the organized test structure - find all test files in test directory
  testMatch: ['**/test/**/*.test.ts'],

  // Module resolution
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Test organization
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/coverage/',
  ],

  // Setup files for global configuration
  setupFilesAfterEnv: ['<rootDir>/test/setup/global.ts'],

  // Verbose output for CI
  verbose: process.env.CI === 'true',

  // Fail fast in development
  bail: process.env.NODE_ENV === 'development' ? 1 : 0,
};