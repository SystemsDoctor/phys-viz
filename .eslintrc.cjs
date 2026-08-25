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
                group: [
                  'three',
                  'three/*',
                  'react',
                  'react-dom',
                  '@/scene/*',
                  '@/shell/*',
                  '@/modules/*',
                ],
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
                message:
                  'scene/ may use kernel and three, but must not depend on react, shell, or modules.',
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
                group: [
                  '@/modules/*/index',
                  '@/modules/*/manifest',
                  '!@/modules/types',
                  '!@/modules/registry',
                ],
                message:
                  'shell/ may only depend on modules/types and modules/registry, never a concrete module implementation.',
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
        // Plain no-restricted-imports can't tell a type-only import from a
        // runtime one; the @typescript-eslint version can, which is what
        // lets us allow `import type { SceneContext } from '@/scene/SceneContext'`
        // (the §21 cookbook pattern) while still banning every other scene
        // import. Paired with consistent-type-imports so a type-only usage
        // is always written as `import type` and therefore actually visible
        // to that check, not smuggled in as a plain value import.
        'no-restricted-imports': 'off',
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['three', 'three/*', 'react', 'react-dom', '@/shell/*', '../../shell/*'],
                message:
                  'modules/ must stay declarative: no three.js, no React, no shell imports. See ARCHITECTURE.md §6.',
              },
              {
                group: ['@/modules/*', '!@/modules/types'],
                message:
                  'modules/ must not import another module — only kernel and modules/types are allowed. See ARCHITECTURE.md §6.',
              },
              {
                group: ['../*', '!../types'],
                message:
                  'modules/ must not import a sibling module (or anything else in modules/) via a relative path — only kernel and modules/types are allowed. See ARCHITECTURE.md §6.',
              },
              {
                group: ['../../scene/*'],
                message:
                  'modules/ must not reach into scene/ via a relative path — use the SceneContext type from @/scene/SceneContext instead. See ARCHITECTURE.md §6/§21.',
              },
              {
                group: ['@/scene/*', '!@/scene/SceneContext'],
                message:
                  'modules/ may only use scene via the SceneContext type, never other scene runtime values. See ARCHITECTURE.md §6/§21.',
              },
              {
                group: ['@/scene/SceneContext'],
                allowTypeImports: true,
                message:
                  'modules/ may only import SceneContext as a type (`import type ... from "@/scene/SceneContext"`), never as a runtime value. See ARCHITECTURE.md §6/§21.',
              },
            ],
          },
        ],
      },
    },
  ],
};
