/**
 * E2E smoke (Playwright). ARCHITECTURE.md §18.
 *
 * For every module id: navigate to its route, wait for canvas, assert
 * non-blank render, assert no console errors, toggle each layer once,
 * navigate away, assert WebGL context count did not grow.
 *
 * TODO(M4-8): implement the per-module sweep properly (dynamic module
 * ids, layer toggling, context-count-on-navigate-away). `demo scene
 * renders...` below is M2-19's acceptance evidence — it still targets
 * `/_dev/demo-scene` (an unlisted route App.tsx keeps mounted
 * specifically so this measurement stays valid now that `/` is the
 * real gallery, not the throwaway scene), using Playwright's real
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

  // Hash routing: the route lives in the fragment, not the server path.
  // No leading slash — a leading '/' would replace baseURL's /phys-viz/
  // path segment entirely instead of joining onto it.
  await page.goto('#/_dev/demo-scene');
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

test('a real module route (vector-algebra) renders through the full ModuleView stack with no console errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('#/m/vector-algebra');
  await expect(page.locator('canvas.pv-viewport-canvas')).toBeVisible();
  // Param panel, layer manager, and timeline are all auto-generated
  // from the module's declared params/layers/timeModel — no module UI
  // code involved (§9's core promise, exercised end to end here).
  await expect(page.getByLabel('Vector a x')).toBeVisible();
  await expect(page.getByText('Sum a + b')).toBeVisible();

  await page.waitForTimeout(1000);
  expect(errors).toEqual([]);
});

// TODO: for (const id of moduleIds) { test(`${id} renders without console errors`, ...) }
