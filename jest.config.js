module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/*.test.ts',
    '**/*.test.tsx',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  transformIgnorePatterns: [],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.styles.ts',
  ],
  coverageThreshold: {
    // Targeted coverage for tested utility files
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
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
