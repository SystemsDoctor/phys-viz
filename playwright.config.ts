import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright smoke tests (ARCHITECTURE.md §18). Runs against the Vite
 * preview server so it exercises the actual production build, including
 * the `base: '/phys-viz/'` path used on GitHub Pages.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
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
