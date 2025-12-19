/**
 * Jest Configuration
 *
 * Configured for React Native/Expo with TypeScript support.
 * Includes support for:
 * - Component testing with React Testing Library
 * - Path aliases (@/ -> src/)
 * - React Native module transformation
 */

module.exports = {
  // Use jest-expo preset for Expo-specific transformations
  preset: 'jest-expo',

  // Test root directory
  roots: ['<rootDir>/src'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/*.test.ts',
    '**/*.test.tsx',
  ],

  // Ignore patterns for tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.storybook/',
    '\\.stories\\.',
  ],

  // Module path aliases (must match tsconfig.json paths)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
  },

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.styles.ts',
    '!src/**/*.stories.tsx',
  ],

  // Coverage thresholds for utility files (existing)
  coverageThreshold: {
    'src/utils/competitionPoints.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'src/utils/teamGeneration.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'src/utils/scoring.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Increase timeout for slower component tests
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output for debugging
  verbose: true,
};
