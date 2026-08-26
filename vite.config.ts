import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// NOTE: `base` MUST match the GitHub Pages repo name exactly (case-sensitive),
// e.g. https://<user>.github.io/<repo>/. This scaffold assumes the repo will
// be named "phys-viz" to match this local folder. Update it here if the
// GitHub remote ends up with a different name (see ARCHITECTURE.md §19).
export default defineConfig({
  base: '/phys-viz/',
  plugins: [react()],
  resolve: {
    alias: {
      '@/kernel': path.resolve(__dirname, 'src/kernel'),
      '@/scene': path.resolve(__dirname, 'src/scene'),
      '@/shell': path.resolve(__dirname, 'src/shell'),
      '@/modules': path.resolve(__dirname, 'src/modules'),
      '@/design': path.resolve(__dirname, 'src/design'),
    },
  },
  build: {
    target: 'es2020',
    // Emits dist/.vite/manifest.json (source file -> chunk, with static
    // vs. dynamic imports distinguished) — what scripts/check-bundle-budget.mjs
    // reads to enforce the §17 bundle budgets (X-3/X-4).
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          vendor: ['react', 'react-dom', 'zustand'],
          katex: ['katex'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/kernel/**'],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 90,
      },
    },
  },
});
