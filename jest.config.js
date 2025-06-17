/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',

  // Performance optimizations
  maxWorkers: '50%',
  testTimeout: 30000,

  // Modern ts-jest configuration (avoiding deprecated globals)
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
    }],
  },

  // Test file patterns
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

  // Setup files
  // setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],

  // Verbose output for CI
  verbose: process.env.CI === 'true',

  // Fail fast in development
  bail: process.env.NODE_ENV === 'development' ? 1 : 0,
};