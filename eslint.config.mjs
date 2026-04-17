// @ts-check
import eslint from '@eslint/js';
import { globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  globalIgnores(['.next/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts']),
  eslint.configs.recommended,
  ...nextVitals,
  ...nextTs,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.eslint.json',
        },
      },
    },
  },
  {
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-inferrable-types': 'error',

      // Import sorting (auto-fixable)
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // React and Next.js
            ['^react', '^next'],
            // External packages
            ['^@?\\w'],
            // Internal aliases (@/ paths by layer)
            ['^@/core/'],
            ['^@/infrastructure/'],
            ['^@/presentation/'],
            ['^@/lib/', '^@/i18n/'],
            ['^@/'],
            // Relative imports: parent (..)
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            // Relative imports: current dir (.)
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            // Type imports last
            ['^.*\\u0000$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',

      // Core
      'no-console': 'warn',
      'no-duplicate-imports': 'error',

      // Prettier
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    files: ['e2e/**/*.ts', 'playwright.config.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      'no-console': 'off',
      // Playwright's fixture API takes a `use` callback that is not a React hook;
      // the Next.js ESLint config flags every `use(...)` call as a hook-rule violation.
      'react-hooks/rules-of-hooks': 'off',
    },
  },
);
