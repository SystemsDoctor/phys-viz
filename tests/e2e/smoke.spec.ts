/**
 * E2E smoke (Playwright). ARCHITECTURE.md §18.
 *
 * For every module id: navigate to its route, wait for canvas, assert
 * non-blank render, assert no console errors, toggle each layer once,
 * navigate away, assert WebGL context count did not grow.
 *
 * TODO(M3+): implement once the gallery and module routes exist. Reads
 * module ids dynamically so this file does not need editing per module.
 */
import { test, expect } from '@playwright/test';

test('gallery loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/PhysViz/i);
});

// TODO: for (const id of moduleIds) { test(`${id} renders without console errors`, ...) }
