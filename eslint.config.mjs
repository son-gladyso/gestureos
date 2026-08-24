import globals from 'globals';

export default [
  {
    files: ['**/*.js'],
    ignores: ['app.exe', '.vs/**', '.vscode/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.es2024,
        Hands: 'readonly',
        Camera: 'readonly'
      }
    },
    rules: {
      eqeqeq: ['error', 'always'],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
      'no-undef': 'error'
    }
  }
];
