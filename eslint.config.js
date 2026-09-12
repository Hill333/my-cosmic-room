import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', 'playwright-report', 'test-results', 'assets'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['tools/**/*.ts', 'e2e/**/*.ts', '*.config.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    // SPEC §16.2: core/ imports nothing from the DOM or Preact.
    files: ['src/core/**/*.ts', 'src/catalog/**/*.ts', 'src/strings/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['preact', 'preact/*', '@preact/*', '@/ui/*', '@/state/*'] },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'navigator'],
    },
  },
);
