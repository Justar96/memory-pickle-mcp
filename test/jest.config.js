export default {
  // Multi-project configuration for organized test structure
  projects: [
    {
      displayName: {
        name: 'unit',
        color: 'cyan'
      },
      testMatch: ['<rootDir>/unit/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/setup/unit.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest/presets/default-esm',
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          isolatedModules: true
        }]
      },
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
      },
      testTimeout: 10000,
      forceExit: true,
      detectOpenHandles: true
    },
    {
      displayName: {
        name: 'integration', 
        color: 'yellow'
      },
      testMatch: ['<rootDir>/integration/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/setup/integration.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest/presets/default-esm',
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          isolatedModules: true
        }]
      },
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
      },
      testTimeout: 30000,
      forceExit: true,
      detectOpenHandles: true
    },
    {
      displayName: {
        name: 'e2e',
        color: 'green'
      },
      testMatch: ['<rootDir>/e2e/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/setup/e2e.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest/presets/default-esm',
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          isolatedModules: true
        }]
      },
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
      },
      testTimeout: 60000,
      forceExit: true,
      detectOpenHandles: true
    },
    {
      displayName: {
        name: 'performance',
        color: 'magenta'
      },
      testMatch: ['<rootDir>/performance/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/setup/performance.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest/presets/default-esm',
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          isolatedModules: true
        }]
      },
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
      },
      testTimeout: 120000,
      forceExit: true,
      detectOpenHandles: true
    }
  ],

  // Coverage configuration (global level)
  collectCoverage: true,
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    '../src/**/*.ts',
    '!../src/**/*.d.ts',
    '!../src/index.ts',
  ],
  
  // Global settings
  maxWorkers: '50%',
  verbose: true,
  clearMocks: true,
  restoreMocks: true
}; 