import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright smoke tests (ARCHITECTURE.md §18). Runs against the Vite
 * preview server so it exercises the actual production build, including
 * the `base: '/phys-viz/'` path used on GitHub Pages.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // Capped rather than left at Playwright's own CPU-based default
  // (TASKS.md X-18): every heavy test here constructs a real WebGL
  // `Viewport`, and enough of them running at once starves the
  // event loop badly enough that a page's own `hashchange`/React-
  // unmount handling stalls for well past any reasonable assertion
  // timeout — reproduced locally as a canvas-disposal check stuck
  // at a nonzero count for 20+ seconds straight (not a slow-but-
  // eventual race) at the default (CPU/2) worker count on a 12-core
  // machine; empirically clean across 250+ stress-test runs at 3
  // workers, still occasionally flaked at 4. This is GPU/event-loop
  // contention between concurrently-running tests, not an app bug —
  // see X-18 for the full investigation.
  workers: 3,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173/phys-viz/',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173/phys-viz/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
