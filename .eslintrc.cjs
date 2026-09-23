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
      // X-33/ADR 0016: the `@/*` patterns below (e.g. `@/scene/*`) only
      // match a SUBPATH — they never matched the bare barrel imports
      // (`@/scene`, `@/shell`, `@/modules`), so those, and a relative
      // escape at kernel's own real nesting depth (kernel/<subdir>/x.ts
      // is 2 levels below src/, so `../../scene/...` reaches it; a file
      // directly in kernel/ needs only `../scene/...`), both passed
      // lint undetected. Listed explicitly at both depths rather than a
      // general regex, matching this tree's actual (shallow, one level)
      // nesting — the same "explicit depths, not a blanket ban" shape
      // modules/'s own `'../*'`/`'../../scene/*'` pair already uses,
      // since kernel legitimately imports ACROSS its own subdirectories
      // via one-level `../math`-style relative paths that a blanket
      // `'../*'` ban would break.
      files: ['src/kernel/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              { name: '@/scene', message: 'kernel/ must stay pure: no scene imports.' },
              { name: '@/shell', message: 'kernel/ must stay pure: no shell imports.' },
              { name: '@/modules', message: 'kernel/ must stay pure: no module imports.' },
            ],
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
                  '../scene/*',
                  '../../scene/*',
                  '../shell/*',
                  '../../shell/*',
                  '../modules/*',
                  '../../modules/*',
                ],
                message: 'kernel/ must stay pure: no rendering, no UI, no module imports.',
              },
            ],
          },
        ],
        // Dynamic import() is invisible to no-restricted-imports in
        // every layer above — kernel should never need one at all.
        'no-restricted-syntax': [
          'error',
          {
            selector:
              'ImportExpression[source.value=/^(three|react|react-dom|@\\/(scene|shell|modules)|(\\.\\.\\/)+(scene|shell|modules))/]',
            message:
              'kernel/ must not dynamically import() three, react, scene, shell, or modules.',
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
            paths: [
              { name: '@/shell', message: 'scene/ must not depend on shell.' },
              { name: '@/modules', message: 'scene/ must not depend on modules.' },
            ],
            patterns: [
              {
                group: [
                  'react',
                  'react-dom',
                  '@/shell/*',
                  '@/modules/*',
                  // scene/ has the same one-level nesting shape kernel/
                  // does (scene/glyphs/x.ts etc.) — same two explicit
                  // depths, same reasoning as the kernel override above.
                  '../shell/*',
                  '../../shell/*',
                  '../modules/*',
                  '../../modules/*',
                ],
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
            // X-33/ADR 0016: `paths` does an EXACT string match (unlike
            // `patterns`, which is gitignore-style and — the gotcha that
            // cost real debugging time here — can't be un-ignored by a
            // later `!`-negation once a bare, wildcard-free entry like
            // `@/modules` has matched it as a "directory", the same way
            // a plain `foo` .gitignore entry silently swallows any later
            // `!foo/bar`). The bare barrel import (the registry-glob,
            // which pulls in every OTHER module) belongs here, not in
            // `patterns` below, specifically so it can't interfere with
            // that array's `!@/modules/types`/`!@/modules/registry`
            // exceptions.
            paths: [
              {
                name: '@/modules',
                message:
                  'shell/ may only depend on modules/types and modules/registry, never the modules barrel (which pulls in every module via the registry glob).',
              },
            ],
            patterns: [
              {
                // X-33/ADR 0016: inverted from an allowlist-shaped ban
                // (only `*/index`/`*/manifest`) to a real denylist —
                // `@/modules/<id>/params` and the equivalent relative
                // forms at shell's own nesting depths (shell/x.ts,
                // shell/routes/x.tsx, shell/export/gif/x.ts) all passed
                // before. `modules/testing` is shell-accessible test
                // scaffolding only, not a boundary hole worth carving an
                // exception for — nothing in shell/ uses it today.
                group: [
                  '@/modules/*',
                  '!@/modules/types',
                  '!@/modules/registry',
                  '../modules/*',
                  '!../modules/types',
                  '!../modules/registry',
                  '../../modules/*',
                  '!../../modules/types',
                  '!../../modules/registry',
                  '../../../modules/*',
                  '!../../../modules/types',
                  '!../../../modules/registry',
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
            // X-33/ADR 0016: `paths` (exact match) for the bare barrels,
            // separate from `patterns` (gitignore-style glob+negation)
            // below — see the shell/ override's comment above for why a
            // bare, wildcard-free entry can't safely share a `patterns`
            // group with a later `!`-negation for one of its own
            // subpaths (it silently wins over the negation, the same
            // gotcha a plain `foo` .gitignore entry has for `!foo/bar`).
            paths: [
              { name: '@/shell', message: 'modules/ must stay declarative: no shell imports.' },
              {
                name: '@/modules',
                message:
                  'modules/ must not import the modules barrel (which pulls in every other module via the registry glob).',
              },
              {
                name: '@/scene',
                message: 'modules/ may only use scene via the SceneContext type.',
              },
            ],
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
        // X-33: dynamic import() is invisible to no-restricted-imports —
        // a module should never need one (no lazy-loading of three,
        // shell, or a sibling module).
        'no-restricted-syntax': [
          'error',
          {
            selector:
              'ImportExpression[source.value=/^(three|react|react-dom|@\\/(scene|shell|modules)|\\.\\.\\/)/]',
            message:
              'modules/ must not dynamically import() three, react, shell, scene, or another module.',
          },
        ],
      },
    },
    {
      // The service worker script (ADR 0005) runs in ServiceWorkerGlobalScope:
      // no DOM, no React, no three, not even the browser `window`. It is a
      // "fifth layer" the table in ARCHITECTURE.md §6 doesn't name, so it
      // gets its own override here rather than silently falling through to
      // the root config (which assumes `env: browser`) with no boundary
      // enforcement at all.
      files: ['src/sw.ts'],
      env: { serviceworker: true, browser: false },
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
                message: 'sw.ts must stay dependency-free: no rendering, no UI, no module imports.',
              },
            ],
          },
        ],
      },
    },
  ],
};
