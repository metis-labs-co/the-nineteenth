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
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    // Disable rules that don't exist in @typescript-eslint v6 (expo config expects v8+)
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-wrapper-object-types': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
