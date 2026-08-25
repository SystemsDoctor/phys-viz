/**
 * Boundary enforcement for the layered architecture described in
 * ARCHITECTURE.md §3 (Engineering principles) and §6 (Enforced boundaries).
 *
 *   src/kernel/**  -> pure. May import nothing internal. May NOT import
 *                     three, react, scene, shell, or modules.
 *   src/scene/**   -> may import kernel and three. May NOT import react,
 *                     shell, or modules.
 *   src/shell/**   -> may import kernel, scene, modules/types, and
 *                     modules/registry, plus react. May NOT import concrete
 *                     module implementations directly.
 *   src/modules/** -> may import kernel and modules/types. May NOT import
 *                     three, react, shell, or other modules.
 *
 * "The rule that matters most: modules cannot import three." (§6)
 */
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-hooks'],
  ignorePatterns: ['dist', 'node_modules', '*.cjs'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['src/kernel/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['three', 'react', 'react-dom', '@/scene/*', '@/shell/*', '@/modules/*'],
                message: 'kernel/ must stay pure: no rendering, no UI, no module imports.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/scene/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['react', 'react-dom', '@/shell/*', '@/modules/*'],
                message: 'scene/ may use kernel and three, but must not depend on react, shell, or modules.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/shell/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@/modules/*/index', '@/modules/*/manifest', '!@/modules/types', '!@/modules/registry'],
                message: 'shell/ may only depend on modules/types and modules/registry, never a concrete module implementation.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/modules/**/*.{ts,tsx}'],
      excludedFiles: ['src/modules/testing/**', 'src/modules/registry.ts', 'src/modules/types.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['three', 'react', 'react-dom', '@/shell/*'],
                message: 'modules/ must stay declarative: no three.js, no React, no shell imports. See ARCHITECTURE.md §6.',
              },
            ],
          },
        ],
      },
    },
  ],
};
