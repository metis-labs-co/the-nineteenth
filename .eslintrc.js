module.exports = {
  root: true,
  extends: [
    'expo',
    'prettier',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    // Supabase dynamic queries and React Native bridges frequently require
    // values whose generated/runtime shape cannot be expressed statically.
    '@typescript-eslint/no-explicit-any': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    // Disable prop-types (we use TypeScript)
    'react/prop-types': 'off',
    // Disable rules that don't exist in @typescript-eslint v6 (expo config expects v8+)
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-wrapper-object-types': 'off',
  },
  overrides: [
    {
      // Relaxed rules for test files (Jest mocks, test utilities)
      files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**/*', '**/jest.setup.js'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-explicit-any': 'off', // Test mocks often need any
      },
    },
    {
      // Relaxed rules for Storybook story files
      files: ['**/*.stories.tsx'],
      rules: {
        'react/no-unescaped-entities': 'off',
        'react-hooks/rules-of-hooks': 'off', // Storybook render functions use hooks
        'react/display-name': 'off',
        '@typescript-eslint/no-explicit-any': 'off', // Stories use any for flexibility
      },
    },
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
};
