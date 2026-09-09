// Bun Test Configuration
// Note: Bun has built-in testing, but this Jest config is kept for compatibility
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@domains/(.*)$': '<rootDir>/src/domains/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@presentation/(.*)$': '<rootDir>/src/presentation/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
  },
  // Bun compatibility settings
  testTimeout: 10000,
  maxWorkers: '50%',
};
