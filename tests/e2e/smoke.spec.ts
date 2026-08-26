/**
 * E2E smoke (Playwright). ARCHITECTURE.md §18.
 *
 * For every module id: navigate to its route, wait for canvas, assert
 * non-blank render, assert no console errors, toggle each layer once,
 * navigate away, assert WebGL context count did not grow.
 *
 * `demo scene renders...` below is M2-19's acceptance evidence — it
 * still targets `/_dev/demo-scene` (an unlisted route App.tsx keeps
 * mounted specifically so this measurement stays valid now that `/` is
 * the real gallery, not the throwaway scene), using Playwright's real
 * (compositing) browser — the in-app preview pane used elsewhere in
 * this project's dev workflow does not composite frames at all, so it
 * cannot answer this question.
 *
 * The per-module sweep at the bottom of this file (M4-8) reads module
 * ids off the filesystem (mirroring `registry.ts`'s own manifest glob,
 * one lowercase-named folder per module) rather than importing the
 * registry itself — `import.meta.glob` is a Vite build-time construct
 * the Playwright/Node test runner can't execute — so the sweep never
 * needs a per-module edit as the library grows.
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const modulesDir = path.resolve(dirname, '../../src/modules');
const moduleIds = fs
  .readdirSync(modulesDir)
  .filter((name) => /^[a-z]/.test(name))
  .filter((name) => fs.existsSync(path.join(modulesDir, name, 'manifest.ts')));

test('gallery loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/PhysViz/i);
});

test('gallery TTI (§17 budget): first module card is interactive well within 1.5s of navigation start', async ({
  page,
}) => {
  // A literal Lighthouse TTI trace isn't scriptable here; this measures
  // the same thing Lighthouse's TTI is a proxy for — how long after
  // navigation starts until the page has something a user can actually
  // click — via the Navigation Timing API plus a real DOM assertion,
  // against a production preview build (not `npm run dev`).
  await page.goto('/');
  const firstCard = page.locator('.pv-gallery__card').first();
  await expect(firstCard).toBeVisible();

  const domInteractiveMs = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return nav.domInteractive - nav.startTime;
  });
  console.log(`[perf] gallery domInteractive: ${domInteractiveMs.toFixed(0)} ms`);
  expect(domInteractiveMs).toBeLessThan(1500);
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

  // explain.md (§9, ADR 0002) is a separate lazily-loaded chunk (a
  // second network fetch after the module chunk itself), so it can
  // still be in flight when the params/layers above have already
  // rendered — give it its own wait rather than asserting immediately.
  await expect(page.getByRole('heading', { name: 'What am I looking at?' })).toBeVisible();
  // every inline $...$ and $$...$$ span across the expanded M4 explain.md
  await expect(page.locator('.pv-explain .katex')).toHaveCount(20);

  expect(errors).toEqual([]);
});

/**
 * M4-5: every demonstration state must be reachable in <= 3 clicks from
 * a bookmarked link, and each state's own URL must itself be a valid
 * bookmark (reload reproduces it exactly). "Open the module" from the
 * gallery counts as click 1 in the budget below.
 */
const DEMONSTRATION_STATES: {
  name: string;
  clicksFromGallery: number;
  reach: (page: import('@playwright/test').Page) => Promise<void>;
  confirm: (page: import('@playwright/test').Page) => Promise<void>;
}[] = [
  {
    name: 'sum (head-to-tail)',
    clicksFromGallery: 2, // open module, check "Sum"
    reach: async (page) => {
      await page.getByRole('checkbox', { name: 'Sum a + b' }).check();
    },
    confirm: async (page) => {
      await expect(page.getByRole('checkbox', { name: 'Sum a + b' })).toBeChecked();
    },
  },
  {
    name: 'sum (parallelogram)',
    clicksFromGallery: 3, // open module, check "Sum", select "Parallelogram"
    reach: async (page) => {
      await page.getByRole('checkbox', { name: 'Sum a + b' }).check();
      await page.getByLabel('Sum construction').selectOption('para');
    },
    confirm: async (page) => {
      await expect(page.getByLabel('Sum construction')).toHaveValue('para');
    },
  },
  {
    name: 'component decomposition on a rotated basis',
    clicksFromGallery: 2, // open module, check "Components on rotated basis"
    reach: async (page) => {
      await page.getByRole('checkbox', { name: 'Components on rotated basis' }).check();
    },
    confirm: async (page) => {
      await expect(
        page.getByRole('checkbox', { name: 'Components on rotated basis' }),
      ).toBeChecked();
    },
  },
  {
    name: 'direction cosines',
    clicksFromGallery: 2,
    reach: async (page) => {
      await page.getByRole('checkbox', { name: 'Direction cosines of a' }).check();
    },
    confirm: async (page) => {
      await expect(page.getByRole('checkbox', { name: 'Direction cosines of a' })).toBeChecked();
    },
  },
  {
    name: 'projection of a on b',
    clicksFromGallery: 2,
    reach: async (page) => {
      await page.getByRole('checkbox', { name: 'Projection of a on b' }).check();
    },
    confirm: async (page) => {
      await expect(page.getByRole('checkbox', { name: 'Projection of a on b' })).toBeChecked();
    },
  },
  {
    name: 'cross product with right-hand-rule curl',
    clicksFromGallery: 2,
    reach: async (page) => {
      await page.getByRole('checkbox', { name: 'Cross product a × b' }).check();
    },
    confirm: async (page) => {
      await expect(page.getByRole('checkbox', { name: 'Cross product a × b' })).toBeChecked();
    },
  },
  {
    name: 'parallelogram area',
    clicksFromGallery: 2,
    reach: async (page) => {
      await page.getByRole('checkbox', { name: 'Parallelogram area' }).check();
    },
    confirm: async (page) => {
      await expect(page.getByRole('checkbox', { name: 'Parallelogram area' })).toBeChecked();
    },
  },
  {
    name: 'scalar triple product (parallelepiped)',
    clicksFromGallery: 2,
    reach: async (page) => {
      await page.getByRole('checkbox', { name: 'Scalar triple product (parallelepiped)' }).check();
    },
    confirm: async (page) => {
      await expect(
        page.getByRole('checkbox', { name: 'Scalar triple product (parallelepiped)' }),
      ).toBeChecked();
    },
  },
  {
    name: '2D restriction applied to the cross product',
    clicksFromGallery: 3, // open module, check "Cross product", check "Restrict to xy-plane"
    reach: async (page) => {
      await page.getByRole('checkbox', { name: 'Cross product a × b' }).check();
      await page.getByRole('checkbox', { name: 'Restrict to xy-plane (2D)' }).check();
    },
    confirm: async (page) => {
      await expect(page.getByRole('checkbox', { name: 'Cross product a × b' })).toBeChecked();
      await expect(page.getByRole('checkbox', { name: 'Restrict to xy-plane (2D)' })).toBeChecked();
    },
  },
];

for (const state of DEMONSTRATION_STATES) {
  test(`M4-5 demonstration state "${state.name}" is <= 3 clicks from the gallery and bookmarkable`, async ({
    page,
  }) => {
    expect(state.clicksFromGallery).toBeLessThanOrEqual(3);

    // Click 1: open the module from the gallery.
    await page.goto('/');
    await page.getByRole('link', { name: /Vector Algebra/ }).click();
    await expect(page.locator('canvas.pv-viewport-canvas')).toBeVisible();

    // Remaining clicks: reach the demonstration state.
    await state.reach(page);
    await state.confirm(page);

    // The resulting URL must itself be a valid bookmark: reloading it
    // directly (no clicks at all) must reproduce the exact same state.
    await page.waitForTimeout(400); // state->URL sync is debounced (M3-23)
    const url = page.url();
    await page.goto(url);
    await expect(page.locator('canvas.pv-viewport-canvas')).toBeVisible();
    await state.confirm(page);
  });
}

test('keyboard map (§16): "?" opens the shortcut overlay, "1" toggles the first layer', async ({
  page,
}) => {
  await page.goto('#/m/vector-algebra');
  await expect(page.locator('canvas.pv-viewport-canvas')).toBeVisible();

  const sumCheckbox = page.getByRole('checkbox', { name: 'Sum a + b' });
  await expect(sumCheckbox).not.toBeChecked();

  await page.locator('body').press('1');
  await expect(sumCheckbox).toBeChecked();

  await page.locator('body').press('?');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  await expect(page.getByText('Toggle layer N')).toBeVisible();

  await page.locator('body').press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('settings menu (M3-41/42): up-axis choice persists across reload via localStorage', async ({
  page,
}) => {
  await page.goto('#/m/vector-algebra');
  await expect(page.locator('canvas.pv-viewport-canvas')).toBeVisible();

  await page.getByLabel('Display settings').click();
  await page.getByLabel('Up axis').selectOption('z');
  await expect(page.getByLabel('Up axis')).toHaveValue('z');

  await page.reload();
  await expect(page.locator('canvas.pv-viewport-canvas')).toBeVisible();
  await page.getByLabel('Display settings').click();
  await expect(page.getByLabel('Up axis')).toHaveValue('z');

  // Projector mode toggles html.projector-mode (design/projector.css) —
  // a pre-existing stub file this batch filled in, easy to silently
  // leave unwired since it's a separate file from shell.css.
  await expect(page.locator('html')).not.toHaveClass(/projector-mode/);
  await page.getByRole('checkbox', { name: 'Projector mode' }).check();
  await expect(page.locator('html')).toHaveClass(/projector-mode/);
});

test('320px layout (§18 manual checklist, M3-35): module route stacks instead of overflowing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('#/m/vector-algebra');
  await expect(page.locator('canvas.pv-viewport-canvas')).toBeVisible();
  await expect(page.getByLabel('Vector a x')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test('M3-G gate: control-showcase renders a complete usable UI with zero module UI code, and the URL round-trips', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('#/m/control-showcase');
  await expect(page.locator('canvas.pv-viewport-canvas')).toBeVisible();

  // One of every ParamDef kind actually rendered as a real control.
  await expect(page.getByLabel('Point p x')).toBeVisible(); // vector
  await expect(page.getByRole('slider', { name: 'Angle' })).toBeVisible(); // angle dial
  await expect(page.getByRole('slider', { name: /Stiffness k/ })).toBeVisible(); // logScale number
  await expect(page.getByLabel('f(x)')).toBeVisible(); // expression
  await expect(page.getByLabel('Display mode')).toBeVisible(); // select
  await expect(page.getByRole('checkbox', { name: 'Highlight' })).toBeVisible(); // toggle

  // Grouped layers + a reveal-gated one (predict mode's own toggle
  // isn't on by default, so "Predicted magnitude" should render as a
  // plain checkbox here, not a Reveal button).
  await expect(page.getByText('Predict', { exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Predicted magnitude' })).toBeVisible();

  // Predict mode (M3-27): entering it freezes t at 0 and hides the
  // reveal-tagged layer behind its own button; clicking that button is
  // the "commit" step.
  await page.getByRole('button', { name: 'Predict, then reveal' }).click();
  await expect(page.getByRole('checkbox', { name: 'Predicted magnitude' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: /Reveal: Predicted magnitude/ })).toBeVisible();
  await page.locator('body').press(' '); // Space (play) must not advance time while predicting
  await page.waitForTimeout(500);
  await expect(page.locator('.pv-timeline__t')).toHaveText('0.00s');
  await page.getByRole('button', { name: /Reveal: Predicted magnitude/ }).click();
  await expect(page.getByRole('checkbox', { name: 'Predicted magnitude' })).toBeVisible();
  await page.getByRole('button', { name: 'Exit predict mode' }).click();

  // Both plot types (M3-15/16), from a module that declares nothing
  // about plots itself. TimeSeriesPlot only renders once >1 point has
  // accumulated, which needs time actually advancing (playing defaults
  // to false) — press Space first.
  await page.locator('body').press(' ');
  await page.waitForTimeout(1500);
  await expect(page.locator('.pv-plot')).toHaveCount(2);

  // 2D lock (ADR 0007, M3-31) + ADR 0011: dimensions: 2 suppresses
  // orbit; "Free rotation" now lives in the global settings menu
  // (unchecked by default) rather than an in-panel button, and toggling
  // it there is what unlocks orbit for this module.
  await page.getByLabel('Display settings').click();
  const freeRotation = page.getByRole('checkbox', { name: 'Free rotation' });
  await expect(freeRotation).not.toBeChecked();
  await freeRotation.check();
  await expect(freeRotation).toBeChecked();
  await freeRotation.uncheck();
  await page.getByLabel('Display settings').click(); // close the menu

  // URL round-trip (M3-37): change a param, confirm the URL reflects
  // it (debounced ~250ms), reload, confirm the value survived.
  const kSlider = page.getByRole('slider', { name: /Stiffness k/ });
  await kSlider.fill('0.8');
  await page.waitForTimeout(400);
  expect(page.url()).toContain('k=');

  const urlBefore = page.url();
  await page.reload();
  await expect(page.locator('canvas.pv-viewport-canvas')).toBeVisible();
  expect(page.url()).toBe(urlBefore);

  expect(errors).toEqual([]);
});

for (const id of moduleIds) {
  test(`${id}: renders, no console errors, every layer toggles, disposes its WebGL context on navigate-away`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('#/m/' + id);
    const canvas = page.locator('canvas.pv-viewport-canvas');
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(1000);

    const nonBlank = await page.evaluate(
      () =>
        new Promise((resolve) => {
          requestAnimationFrame(() => {
            const c = document.querySelector('canvas.pv-viewport-canvas') as HTMLCanvasElement;
            const blank = document.createElement('canvas');
            blank.width = c.width;
            blank.height = c.height;
            resolve(c.toDataURL() !== blank.toDataURL());
          });
        }),
    );
    expect(nonBlank).toBe(true);

    // Toggle every declared layer once — auto-generated UI, no
    // module-specific selector needed.
    const layerCheckboxes = page.locator('.pv-layer-manager input[type="checkbox"]');
    const layerCount = await layerCheckboxes.count();
    for (let i = 0; i < layerCount; i++) {
      await layerCheckboxes.nth(i).click();
    }

    expect(errors).toEqual([]);

    // Navigate away and confirm disposal left no leaked canvas/WebGL
    // context behind (§18, M2-20's disposal discipline).
    await page.goto('#/');
    await expect(page.locator('canvas')).toHaveCount(0);
  });
}
