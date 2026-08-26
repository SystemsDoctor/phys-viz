/**
 * E2E smoke (Playwright). ARCHITECTURE.md §18.
 *
 * For every module id: navigate to its route, wait for canvas, assert
 * non-blank render, assert no console errors, toggle each layer once,
 * navigate away, assert WebGL context count did not grow.
 *
 * TODO(M3+): implement once the gallery and module routes exist. Reads
 * module ids dynamically so this file does not need editing per module.
 *
 * Until routing exists, `demo scene renders...` below is the M2-level
 * stand-in: confirms the throwaway demo scene (M2-19) actually paints
 * a non-blank frame with no console errors, using Playwright's real
 * (compositing) browser — the in-app preview pane used elsewhere in
 * this project's dev workflow does not composite frames at all, so it
 * cannot answer this question.
 */
import { test, expect } from '@playwright/test';

test('gallery loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/PhysViz/i);
});

test('demo scene renders every glyph with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  // Give the Viewport's ResizeObserver + first rendered frame time to land.
  await page.waitForTimeout(1500);

  // WebGLRenderer defaults to preserveDrawingBuffer: false, so the
  // drawing buffer is only guaranteed valid for readback inside the
  // same animation-frame task as the render call that filled it —
  // reading it back from an arbitrary later task (the common case)
  // can observe an already-cleared buffer. Read from inside our own
  // rAF callback, which runs in the same frame right after the app's
  // own tick() (registered earlier, so it runs first) has rendered.
  const nonBlank = await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => {
          const c = document.querySelector('canvas') as HTMLCanvasElement;
          const blank = document.createElement('canvas');
          blank.width = c.width;
          blank.height = c.height;
          resolve(c.toDataURL() !== blank.toDataURL());
        });
      }),
  );
  expect(nonBlank).toBe(true);
  expect(errors).toEqual([]);
});

// TODO: for (const id of moduleIds) { test(`${id} renders without console errors`, ...) }
