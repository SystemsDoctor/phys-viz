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
import { test, expect, type Page } from '@playwright/test';
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

test("X-34: a bookmarked link's up=/pj= prefs apply for the session, without touching the saved localStorage profile", async ({
  page,
}) => {
  // Open a link carrying URL prefs the viewer's own saved profile
  // doesn't have (default up axis is y, default projector is off).
  await page.goto('#/m/vector-algebra?up=z&pj=1');
  await expect(page.locator('canvas.pv-viewport-canvas')).toBeVisible();

  await page.getByLabel('Display settings').click();
  await expect(page.getByLabel('Up axis')).toHaveValue('z');
  await expect(page.getByRole('checkbox', { name: 'Projector mode' })).toBeChecked();
  await expect(page.locator('html')).toHaveClass(/projector-mode/);

  // Session-only per ADR 0017: this must NOT have been written to
  // localStorage — savePrefs() is only ever called from the settings
  // panel, never from this URL-hydration path.
  const saved = await page.evaluate(() => window.localStorage.getItem('phys-viz:prefs'));
  expect(saved).toBeNull();
});

test('X-38: dark theme drives BOTH the scene background and the label overlay ink, so labels stay legible', async ({
  page,
}) => {
  // Sample the WebGL canvas's own background pixel — before this fix it
  // was hardcoded light (#eceef2) regardless of theme.
  await page.goto('#/m/vector-algebra?th=dark');
  await expect(page.locator('canvas.pv-viewport-canvas')).toBeVisible();
  await page.waitForTimeout(300);

  const bgColor = await page.evaluate(
    () =>
      new Promise<{ r: number; g: number; b: number }>((resolve) => {
        requestAnimationFrame(() => {
          const webgl = document.querySelector('canvas.pv-viewport-canvas') as HTMLCanvasElement;
          const offscreen = document.createElement('canvas');
          offscreen.width = webgl.width;
          offscreen.height = webgl.height;
          const ctx2d = offscreen.getContext('2d')!;
          ctx2d.drawImage(webgl, 0, 0);
          // Top-left corner is background — nothing schematic is drawn
          // there for this module at its default params/camera.
          const { data } = ctx2d.getImageData(0, 0, 1, 1);
          resolve({ r: data[0], g: data[1], b: data[2] });
        });
      }),
  );
  // getSceneTheme('dark').background === '#232833'; a generous tolerance
  // for gamma/tone-mapping, since the exact bug (hardcoded #eceef2, a
  // MUCH lighter grey) is nowhere close either way.
  expect(Math.abs(bgColor.r - 0x23)).toBeLessThan(10);
  expect(Math.abs(bgColor.g - 0x28)).toBeLessThan(10);
  expect(Math.abs(bgColor.b - 0x33)).toBeLessThan(10);

  // A real label (KaTeX overlay, a plain DOM element) must be legible
  // against that dark background — its resolved `color` should be the
  // dark-theme ink (#eef1f6), not a colour indistinguishable from the
  // (now also dark) background.
  const labelColor = await page.evaluate(() => {
    const label = document.querySelector('.pv-scene-overlay .katex') as HTMLElement | null;
    if (!label) return null;
    return getComputedStyle(label).color;
  });
  expect(labelColor).toBe('rgb(238, 241, 246)'); // #eef1f6
});

/**
 * Counts canvas pixels within `tol` (RGB distance) of `rgb` after loading
 * `url`. A coordinate-free proxy for a line's rendered width (X-49).
 *
 * `forceReload`: both URLs used by the projector tests differ only after
 * the `#` (hash routing) — a fragment-only navigation is a same-document
 * browser operation, so a second `page.goto()` to one does NOT remount
 * the app or re-run its URL-decode effects (`[module]`-keyed, module id
 * unchanged). Force a real reload so the second URL's `pj=1` takes effect
 * from a fresh mount, the same as a real bookmark open would.
 */
async function countMatchingPixels(
  page: Page,
  url: string,
  rgb: { r: number; g: number; b: number },
  tol = 12,
  forceReload = false,
  /** Optional clip rect in canvas fractions (0..1) to isolate one glyph. */
  clip: { x0: number; x1: number; y0: number; y1: number } = { x0: 0, x1: 1, y0: 0, y1: 1 },
  /** Count pixels FARTHER than `tol` from `rgb` instead (e.g. "anything but the background"). */
  invert = false,
): Promise<number> {
  await page.goto(url);
  if (forceReload) await page.reload();
  // Real module routes tag the viewport canvas; the dev demo scene's is bare.
  await expect(
    page.locator('canvas.pv-viewport-canvas').or(page.locator('canvas')).first(),
  ).toBeVisible();
  await page.waitForTimeout(300);
  return page.evaluate(
    ({ r, g, b, tol, clip, invert }) =>
      new Promise<number>((resolve) => {
        requestAnimationFrame(() => {
          const webgl = (document.querySelector('canvas.pv-viewport-canvas') ??
            document.querySelector('canvas')) as HTMLCanvasElement;
          const offscreen = document.createElement('canvas');
          offscreen.width = webgl.width;
          offscreen.height = webgl.height;
          const ctx2d = offscreen.getContext('2d')!;
          ctx2d.drawImage(webgl, 0, 0);
          const x0 = Math.floor(clip.x0 * offscreen.width);
          const y0 = Math.floor(clip.y0 * offscreen.height);
          const w = Math.floor((clip.x1 - clip.x0) * offscreen.width);
          const h = Math.floor((clip.y1 - clip.y0) * offscreen.height);
          const { data } = ctx2d.getImageData(x0, y0, w, h);
          let count = 0;
          for (let i = 0; i < data.length; i += 4) {
            const dr = data[i] - r;
            const dg = data[i + 1] - g;
            const db = data[i + 2] - b;
            if (Math.sqrt(dr * dr + dg * dg + db * db) < tol !== invert) count++;
          }
          resolve(count);
        });
      }),
    { ...rgb, tol, clip, invert },
  );
}

test('X-49: projector mode actually thickens a vector arrow shaft (Line2/LineMaterial, not a no-op THREE.Line)', async ({
  page,
}) => {
  // `a = [3, 0, 0]` — purely along world x, so under the default
  // 2D-lock y-up view the shaft renders as a straight run of the arrow's
  // exact flat colour (`ctx.palette.position`, `MeshBasicMaterial`-lit
  // head + now `MeshBasicMaterial`-equivalent flat-shaded `LineMaterial`
  // shaft, so it reads as one exact hex with no lighting gradient).
  // Counting how many canvas pixels match that exact colour is a
  // coordinate-free proxy for the shaft's rendered width: the head's
  // own screen-space size (`HEAD_LENGTH_PX`) doesn't depend on
  // `lineWidthMultiplier`, so any pixel-count increase between
  // projector off/on is attributable to the shaft actually thickening.
  // ctx.palette.position (#0072b2) — vector `a`'s colour.
  const position = { r: 0x00, g: 0x72, b: 0xb2 };
  const withoutProjector = await countMatchingPixels(page, '#/m/vector-algebra?a=3,0,0', position);
  const withProjector = await countMatchingPixels(
    page,
    '#/m/vector-algebra?a=3,0,0&pj=1',
    position,
    12,
    true,
  );

  expect(withoutProjector).toBeGreaterThan(0);
  // getProjectorAdjustments(true).lineWidthMultiplier === 1.6 — a
  // generous-but-real margin (not just anti-aliasing noise) over the
  // un-projected pixel count.
  expect(withProjector).toBeGreaterThan(withoutProjector * 1.15);
});

test('X-14: switching to a non-default rotational-dynamics panel actually renders its glyphs, not just their labels', async ({
  page,
}) => {
  // Regression test for a real bug: `Viewport.setGroupVisible`'s
  // re-entrancy guard let a redundant call (while a fade-in was already
  // in progress) re-capture "current" opacity — already mid-fade, i.e.
  // partway or already zeroed — as the new fade baseline, permanently
  // stranding the group at opacity 0 (invisible) even though `.visible`
  // stayed true. `LayerManager`'s exclusive-group radios (this module's
  // 7-way panel switch) trigger EXACTLY this: `selectExclusive` fires
  // one `setLayer` call per sibling, each of which independently
  // re-notifies the newly-active layer's `setGroupVisible(true)` via
  // ModuleView's per-layer subscribe loop, all synchronously within one
  // click. The "L vs ω" panel's omega/L arrows ended up rendering only
  // their labels (a separate DOM overlay, unaffected by the WebGL
  // material opacity bug), with the arrow geometry itself invisible —
  // exactly "the objects/glyphs... not displaying correctly, only the
  // variables".
  //
  // A non-blank-canvas check alone doesn't catch this — the reference
  // grid already makes every frame non-blank, bug or no bug — so this
  // looks for the arrows' own flat, unlit colour (`ctx.palette.angular`,
  // `MeshBasicMaterial` so it isn't shaded and reads as one exact hex)
  // directly in the canvas's pixels.
  await page.goto('#/m/rotational-dynamics');
  await expect(page.locator('canvas.pv-viewport-canvas')).toBeVisible();
  await page.waitForTimeout(500);

  await page.getByRole('radio', { name: 'L vs ω (non-parallel case)' }).check();
  await page.waitForTimeout(400); // §15 fade-in (150ms) plus margin

  const closestDistance = await page.evaluate(
    ({ r, g, b }) =>
      new Promise<number>((resolve) => {
        requestAnimationFrame(() => {
          const webgl = document.querySelector('canvas.pv-viewport-canvas') as HTMLCanvasElement;
          const offscreen = document.createElement('canvas');
          offscreen.width = webgl.width;
          offscreen.height = webgl.height;
          const ctx2d = offscreen.getContext('2d')!;
          ctx2d.drawImage(webgl, 0, 0);
          const { data } = ctx2d.getImageData(0, 0, offscreen.width, offscreen.height);
          let best = Infinity;
          for (let i = 0; i < data.length; i += 4) {
            const dr = data[i] - r;
            const dg = data[i + 1] - g;
            const db = data[i + 2] - b;
            const dist = Math.sqrt(dr * dr + dg * dg + db * db);
            if (dist < best) best = dist;
          }
          resolve(best);
        });
      }),
    // ctx.palette.angular (#7a4fbf) — the omega/L arrows' colour.
    { r: 0x7a, g: 0x4f, b: 0xbf },
  );

  // A generous tolerance for anti-aliased edge pixels; the bug's
  // signature is a closest match nowhere near this colour at all
  // (~68 on this exact scene), not a slightly-off shade.
  expect(closestDistance).toBeLessThan(20);
});

test('2D-only (ADR 0012) applies globally: unchecking it on a dimensions:3 module (not just dimensions:2) does not error', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  // rotational-dynamics declares dimensions: 3 — before ADR 0012 the
  // 2D lock had no wiring at all for a module like this.
  await page.goto('#/m/rotational-dynamics');
  await expect(page.locator('canvas.pv-viewport-canvas')).toBeVisible();

  await page.getByLabel('Display settings').click();
  const twoDOnly = page.getByRole('checkbox', { name: '2D-only' });
  await expect(twoDOnly).toBeChecked(); // checked (locked) by default
  await twoDOnly.uncheck();
  await page.waitForTimeout(100);
  await twoDOnly.check();
  // Re-locking tweens for ~400ms before forcing ortho — wait it out.
  await page.waitForTimeout(500);

  expect(errors).toEqual([]);
});

test('X-13: re-checking 2D-only always resets to the same canonical x/y view, and Recenter also resets pan (ADR 0012)', async ({
  page,
}) => {
  // rotational-dynamics's own defaultView is 'iso' (a 3D-ish angle), so
  // this module is exactly the case that used to expose the bug: locking
  // used to just freeze rotation wherever the camera happened to be
  // (the module's iso default, or wherever the user had last orbited to)
  // instead of a deterministic x/y-plane view.
  await page.goto('#/m/rotational-dynamics');
  const canvas = page.locator('canvas.pv-viewport-canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(500);

  // WebGLRenderer's drawing buffer is only guaranteed valid for readback
  // inside the same animation-frame task as the render call that filled
  // it (see the "demo scene renders..." test above for the same caveat)
  // — read from inside a rAF callback every time.
  const captureCanvas = (): Promise<string> =>
    page.evaluate(
      () =>
        new Promise<string>((resolve) => {
          requestAnimationFrame(() => {
            const c = document.querySelector('canvas.pv-viewport-canvas') as HTMLCanvasElement;
            resolve(c.toDataURL());
          });
        }),
    );

  const defaultLockedFrame = await captureCanvas();

  // Release the lock, then orbit to an arbitrary angle.
  await page.getByLabel('Display settings').click();
  await page.getByRole('checkbox', { name: '2D-only' }).uncheck();
  await page.getByLabel('Display settings').click();

  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + 220, centerY - 150, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  // Re-lock: must land on the exact same canonical view every time,
  // regardless of the arbitrary angle above — pixel-identical to the
  // original default-locked frame.
  await page.getByLabel('Display settings').click();
  await page.getByRole('checkbox', { name: '2D-only' }).check();
  await page.getByLabel('Display settings').click();
  await page.waitForTimeout(900); // ~400ms re-lock tween + ~420ms lock delay

  const relockedFrame = await captureCanvas();
  expect(relockedFrame).toBe(defaultLockedFrame);

  // Pan away while still locked (rotation is locked, pan/zoom stay live
  // per ADR 0007/0011 — right-drag is OrbitControls' default pan
  // binding), then Recenter. It must undo the pan too, not just
  // re-orient — the reported gap: Recenter previously only touched
  // orientation, never the pan target.
  await page.mouse.move(centerX, centerY);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(centerX - 160, centerY + 90, { steps: 10 });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(200);
  const pannedFrame = await captureCanvas();
  expect(pannedFrame).not.toBe(relockedFrame);

  await page.getByRole('button', { name: 'Recenter view' }).click();
  await page.waitForTimeout(600);
  const recenteredFrame = await captureCanvas();
  expect(recenteredFrame).toBe(defaultLockedFrame);
});

test('X-16: the "v" camera-cycle shortcut is a no-op while 2D-only is locked, and works again once unlocked', async ({
  page,
}) => {
  // Reported bug: "2D-only" sometimes appeared to revert to an
  // isometric-ish view instead of staying flat. Root cause: the "v" key
  // handler called `camera.goTo(...)` directly, which moves the camera
  // regardless of OrbitControls' `enableRotate=false` lock — so pressing
  // "v" while "2D-only" was checked silently cycled to iso/+x/+y while
  // the checkbox stayed checked, with nothing else visibly wrong until
  // the user next looked at the canvas.
  await page.goto('#/m/rotational-dynamics');
  const canvas = page.locator('canvas.pv-viewport-canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(500);

  const captureCanvas = (): Promise<string> =>
    page.evaluate(
      () =>
        new Promise<string>((resolve) => {
          requestAnimationFrame(() => {
            const c = document.querySelector('canvas.pv-viewport-canvas') as HTMLCanvasElement;
            resolve(c.toDataURL());
          });
        }),
    );

  // "2D-only" is checked by default (ADR 0012) — no need to open
  // settings to confirm before capturing the baseline locked frame.
  const lockedFrame = await captureCanvas();

  await canvas.click();
  await page.keyboard.press('v');
  await page.keyboard.press('v');
  await page.waitForTimeout(500);
  expect(await captureCanvas()).toBe(lockedFrame);

  // Unlock, and "v" should cycle the view again like normal.
  await page.getByLabel('Display settings').click();
  await page.getByRole('checkbox', { name: '2D-only' }).uncheck();
  await page.getByLabel('Display settings').click();

  await canvas.click();
  await page.keyboard.press('v');
  await page.waitForTimeout(500);
  expect(await captureCanvas()).not.toBe(lockedFrame);
});

test('X-11: a manual camera orbit is reflected in the URL and survives a reload in a fresh browser context (§14 bookmark round-trip)', async ({
  page,
  browser,
}) => {
  // rotational-dynamics (dimensions: 3), same as the 2D-only test above
  // — orbit is locked by default (ADR 0012), so it has to be released
  // first or the drag below would only pan.
  await page.goto('#/m/rotational-dynamics');
  await expect(page.locator('canvas.pv-viewport-canvas')).toBeVisible();

  await page.getByLabel('Display settings').click();
  await page.getByRole('checkbox', { name: '2D-only' }).uncheck();
  await page.getByLabel('Display settings').click(); // close the menu, it can overlay the canvas

  const canvas = page.locator('canvas.pv-viewport-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + 160, centerY - 120, { steps: 20 });
  await page.mouse.up();

  // Two chained debounces sit between the drag and the URL: viewport ->
  // store (this fix) and the pre-existing store -> URL sync, each up to
  // URL_SYNC_DEBOUNCE_MS/MAX_WAIT_MS in ModuleView.tsx.
  await page.waitForTimeout(1000);

  // The regression this test guards: without wiring `CameraController
  // .onChange` back into the store, `state.camera` never leaves its
  // default, so `encodeCamera` (urlCodec.ts) always omits `c=` entirely
  // — a manual orbit would be silently unbookmarkable.
  const urlAfterDrag = page.url();
  const cameraToken = urlAfterDrag.match(/[?&]c=([^&]+)/)?.[1] ?? null;
  expect(cameraToken).not.toBeNull();

  // Reload from a completely fresh browser context (no localStorage/
  // session carried over) so the only thing that can reproduce the
  // orientation is the URL itself.
  const freshContext = await browser.newContext();
  const freshPage = await freshContext.newPage();
  try {
    await freshPage.goto(urlAfterDrag);
    await expect(freshPage.locator('canvas.pv-viewport-canvas')).toBeVisible();
    await freshPage.waitForTimeout(500);

    // Compare only the orientation component (theta,phi,radius,target),
    // not the trailing `.o`/`.p` projection letter: `ui.lockTo2D` is
    // deliberately session-only, never persisted or URL-serialized
    // (store.ts) — a fresh reload always starts with it true (checked),
    // so ModuleView's mount effect re-locks to orthographic regardless
    // of which projection was bookmarked (ADR 0012's documented default).
    // That's a separate, intentional gate; the viewing angle itself —
    // what this test is actually about — isn't touched by it.
    const orientationOf = (token: string | null): string | null =>
      token?.replace(/\.[op]$/, '') ?? null;
    const cameraTokenAfterReload = freshPage.url().match(/[?&]c=([^&]+)/)?.[1] ?? null;
    expect(orientationOf(cameraTokenAfterReload)).toBe(orientationOf(cameraToken));
  } finally {
    await freshContext.close();
  }
});

test('Recenter view (ADR 0012) shifts content into the visible pane without erroring, on a 3D module too', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('#/m/fields-gradients');
  await expect(page.locator('canvas.pv-viewport-canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Recenter view' }).click();
  await page.waitForTimeout(500); // the goTo tween

  expect(errors).toEqual([]);
});

test("playback stops at the timeline's own end instead of running forever past it (ADR 0012)", async ({
  page,
}) => {
  // control-showcase is `timeModel: 'parametric'` and reachable without
  // any per-module setup. Speed 4x makes DEFAULT_MAX_T (20s) reachable
  // in ~5s of wall-clock playback instead of 20.
  await page.goto('#/m/control-showcase');
  await expect(page.locator('canvas.pv-viewport-canvas')).toBeVisible();

  await page.getByLabel('Speed').selectOption('4');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible({
    timeout: 8_000,
  });
  await expect(page.locator('.pv-timeline__t')).toHaveText('20.00s');

  // Playback actually stopped, not just visually capped: waiting longer
  // must not move t past the bound.
  await page.waitForTimeout(500);
  await expect(page.locator('.pv-timeline__t')).toHaveText('20.00s');
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
  // X-36: Space on a focused button now (correctly) activates the
  // button natively instead of the app's global play/pause shortcut
  // stealing it — the click above leaves "Predict, then reveal" itself
  // focused, so explicitly move focus off it first, the same way a
  // real user pressing Space elsewhere on the page would not still have
  // that specific button focused.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
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
  // orbit; "2D-only" now lives in the global settings menu (checked by
  // default) rather than an in-panel button, and unchecking it there is
  // what unlocks orbit for this module.
  await page.getByLabel('Display settings').click();
  const twoDOnly = page.getByRole('checkbox', { name: '2D-only' });
  await expect(twoDOnly).toBeChecked();
  await twoDOnly.uncheck();
  await expect(twoDOnly).not.toBeChecked();
  await twoDOnly.check();
  await page.getByLabel('Display settings').click(); // close the menu

  // URL round-trip (M3-37): change a param, confirm the URL reflects
  // it (debounced ~250ms, longer under CI/parallel-worker CPU
  // contention — poll instead of a fixed sleep so this isn't flaky
  // under load), reload, confirm the value survived.
  const kSlider = page.getByRole('slider', { name: /Stiffness k/ });
  await kSlider.fill('0.8');
  await expect.poll(() => page.url(), { timeout: 3000 }).toContain('k=');

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

test('X-49: projector mode actually thickens a path trace (gravitation orbit outline, Line2/LineMaterial)', async ({
  page,
}) => {
  // The orbit outline is gravitation's `ctx.path` in `palette.construction`
  // (#7b8494). Its per-vertex fade blends the oldest end toward the
  // background, so a generous tolerance is used to catch the whole faded
  // run, not just the full-colour tip.
  const construction = { r: 0x7b, g: 0x84, b: 0x94 };
  const withoutProjector = await countMatchingPixels(
    page,
    '#/m/gravitation?gr=0',
    construction,
    40,
  );
  const withProjector = await countMatchingPixels(
    page,
    '#/m/gravitation?gr=0&pj=1',
    construction,
    40,
    true,
  );
  expect(withoutProjector).toBeGreaterThan(0);
  expect(withProjector).toBeGreaterThan(withoutProjector * 1.15);
});

test('X-49: projector mode actually thickens a curvedArrow arc (vector-algebra right-hand-rule curl)', async ({
  page,
}) => {
  // a = x̂, b = ŷ puts a×b along +z, i.e. straight at the default 2D
  // camera: the cross-product arrow itself is end-on (a point), so the
  // visible `palette.angular` (#7a4fbf) stroke is the curl arc. Grid off
  // via `gr=0` so no axis lines share the pixel pool.
  const angular = { r: 0x7a, g: 0x4f, b: 0xbf };
  const base = '#/m/vector-algebra?a=1,0,0&b=0,1,0&L=xp&gr=0';
  const withoutProjector = await countMatchingPixels(page, base, angular, 20);
  const withProjector = await countMatchingPixels(page, `${base}&pj=1`, angular, 20, true);
  expect(withoutProjector).toBeGreaterThan(0);
  expect(withProjector).toBeGreaterThan(withoutProjector * 1.15);
});

test('X-49: projector mode actually thickens a dimensionLine (work-energy kinetic-energy bracket)', async ({
  page,
}) => {
  // The dimension line is drawn in flat black (grid off via `gr=0`;
  // labels are DOM, not canvas). At t=0.5 the bracket is non-degenerate.
  const black = { r: 0, g: 0, b: 0 };
  const base = '#/m/work-energy?t=0.5&gr=0';
  // Clip to the vertical dashed bracket's column (above the ball and the
  // potential curve) so only the dimension line's own pixels are counted.
  const clip = { x0: 0.33, x1: 0.39, y0: 0.28, y1: 0.5 };
  const withoutProjector = await countMatchingPixels(page, base, black, 170, false, clip);
  const withProjector = await countMatchingPixels(page, `${base}&pj=1`, black, 170, true, clip);
  expect(withoutProjector).toBeGreaterThan(0);
  expect(withProjector).toBeGreaterThan(withoutProjector * 1.15);
});

test('X-49: projector mode actually thickens the reference axes and tick marks (axes glyph)', async ({
  page,
}) => {
  // The shell-owned reference grid (`gr` defaults on) is the `axes` glyph
  // in `palette.construction`'s hex (#7b8494). vector-algebra's default
  // layers draw only `a`/`b` arrows, so the axes dominate that colour.
  const axisGrey = { r: 0x7b, g: 0x84, b: 0x94 };
  const base = '#/m/vector-algebra?a=1,0,0&b=0,1,0';
  const withoutProjector = await countMatchingPixels(page, base, axisGrey, 60);
  const withProjector = await countMatchingPixels(page, `${base}&pj=1`, axisGrey, 60, true);
  expect(withoutProjector).toBeGreaterThan(0);
  expect(withProjector).toBeGreaterThan(withoutProjector * 1.15);
});

test('X-49: projector mode actually thickens a per-plane grid (gridPlane glyph)', async ({
  page,
}) => {
  // Axes off (`gr=0`), the xy grid plane on (`gxy=1`), and no vectors
  // (a = b = 0) so the only non-background pixels are the grid's lines.
  // The scene background is #eceef2 (light theme, `getSceneTheme`).
  const background = { r: 0xec, g: 0xee, b: 0xf2 };
  const base = '#/m/vector-algebra?a=0,0,0&b=0,0,0&gr=0&gxy=1';
  const clip = { x0: 0, x1: 0.7, y0: 0.1, y1: 1 }; // clear of the param panel
  const withoutProjector = await countMatchingPixels(page, base, background, 4, false, clip, true);
  const withProjector = await countMatchingPixels(
    page,
    `${base}&pj=1`,
    background,
    4,
    true,
    clip,
    true,
  );
  expect(withoutProjector).toBeGreaterThan(0);
  expect(withProjector).toBeGreaterThan(withoutProjector * 1.15);
});

test('X-49: projector mode actually thickens a coordinate-frame triad (frame glyph)', async ({
  page,
}) => {
  // vector-algebra's "Components on rotated basis" layer (`L=cp`) draws a
  // `ctx.frame` whose x axis is #d55e00; a = b = 0 and the grid off leave
  // nothing else of that colour on screen.
  const frameX = { r: 0xd5, g: 0x5e, b: 0x00 };
  const base = '#/m/vector-algebra?a=0,0,0&b=0,0,0&L=cp&gr=0';
  const withoutProjector = await countMatchingPixels(page, base, frameX, 40);
  const withProjector = await countMatchingPixels(page, `${base}&pj=1`, frameX, 40, true);
  expect(withoutProjector).toBeGreaterThan(0);
  expect(withProjector).toBeGreaterThan(withoutProjector * 1.15);
});

test('X-49: projector mode actually thickens an angle arc (arc glyph)', async ({ page }) => {
  // vector-algebra's default layers draw the a-b angle arc in
  // `palette.construction` (#7b8494); a = x̂, b = ŷ with the grid off
  // leaves that arc as the only construction-coloured stroke.
  const construction = { r: 0x7b, g: 0x84, b: 0x94 };
  const base = '#/m/vector-algebra?a=1,0,0&b=0,1,0&gr=0';
  const withoutProjector = await countMatchingPixels(page, base, construction, 40);
  const withProjector = await countMatchingPixels(page, `${base}&pj=1`, construction, 40, true);
  expect(withoutProjector).toBeGreaterThan(0);
  expect(withProjector).toBeGreaterThan(withoutProjector * 1.15);
});

test('X-49: projector mode actually thickens a surface wireframe (surface glyph, via the dev demo scene)', async ({
  page,
}) => {
  // No real module draws a wireframe yet, so this uses the dev demo
  // scene (`wireframe: true` surface; `?pj=1` is a dev hook there). The
  // wire is flat #12161d; clip to the surface's footprint, which holds
  // nothing else of that colour (the dimension line is black, the
  // arrow/curved arrow/path/arc are coloured).
  const wire = { r: 0x12, g: 0x16, b: 0x1d };
  const clip = { x0: 0.1, x1: 0.9, y0: 0.1, y1: 0.9 };
  const withoutProjector = await countMatchingPixels(
    page,
    '#/_dev/demo-scene',
    wire,
    60,
    false,
    clip,
  );
  const withProjector = await countMatchingPixels(
    page,
    '#/_dev/demo-scene?pj=1',
    wire,
    60,
    true,
    clip,
  );
  expect(withoutProjector).toBeGreaterThan(0);
  expect(withProjector).toBeGreaterThan(withoutProjector * 1.15);
});

test('X-50: a backgrounded tab resuming does not make stepped playback race', async ({ page }) => {
  // Simulate the tab being hidden for a minute with Playwright's fake
  // clock: rAF stops, then the next frame arrives 60 s later. Before the
  // fix that frame's raw dt went straight into the stepped accumulator,
  // which kept its backlog past the per-frame step cap, so EVERY
  // following frame also ran flat-out and `t` raced ahead by about a
  // simulated second per frame.
  await page.clock.install();
  await page.goto('#/m/rotational-dynamics');
  await expect(page.locator('canvas.pv-viewport-canvas')).toBeVisible();
  await page.clock.runFor(500);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.clock.runFor(200);

  await page.clock.fastForward(60_000);
  await page.clock.runFor(500); // 30 more ordinary 60 fps frames

  const tText = await page.locator('.pv-timeline__t').innerText();
  const t = parseFloat(tText);
  // ~0.2 s before + <= 0.1 s clamped jump + ~0.5 s after = ~0.8 s of
  // simulated time. Pre-fix this was tens of seconds.
  expect(t).toBeGreaterThan(0.3);
  expect(t).toBeLessThan(2);
});

test('X-55: re-showing a layer that was drawn before actually fades it in (opaque-program bake)', async ({
  page,
}) => {
  // three bakes OPAQUE (alpha forced to 1) into a mesh material's compiled
  // program when `transparent` is false. The fade flips `transparent` on
  // (and opacity to 0) without `needsUpdate`, so for a layer already drawn
  // once the program stays opaque and the "fade-in" is a hard pop to full
  // colour. Gravitation's velocity arrowhead (flat green MeshBasicMaterial,
  // in the default-on `vectors` layer) is such a mesh.
  await page.clock.install({ time: 0 });
  await page.goto('#/m/gravitation?gr=0');
  await expect(page.locator('canvas.pv-viewport-canvas')).toBeVisible();
  await page.clock.runFor(1000);
  // Freeze time: Playwright's own actions (check/uncheck) take real time
  // that a running fake clock would count, finishing the 150 ms fade
  // before we could look at it on a loaded machine. From here the fade
  // only advances when this test says so.
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);

  const layer = page.getByRole('checkbox', { name: /Position, velocity & gravity vectors/ });
  // Count pixels of the arrowhead's green in what the compositor currently
  // shows. A screenshot (not `drawImage` on the live WebGL canvas) because
  // the viewport renders on demand and a WebGL drawing buffer is only
  // readable in the frame that rendered it — a settled scene reads blank.
  const countGreen = async (): Promise<number> => {
    const png = await page.locator('canvas.pv-viewport-canvas').screenshot();
    return page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx2d = c.getContext('2d')!;
      ctx2d.drawImage(img, 0, 0);
      const { data } = ctx2d.getImageData(0, 0, c.width, c.height);
      let count = 0;
      for (let k = 0; k < data.length; k += 4) {
        const dr = data[k] - 0x00;
        const dg = data[k + 1] - 0x9e;
        const db = data[k + 2] - 0x73;
        if (Math.sqrt(dr * dr + dg * dg + db * db) < 30) count++;
      }
      return count;
    }, png.toString('base64'));
  };

  const settledBefore = await countGreen();
  expect(settledBefore).toBeGreaterThan(0);

  await layer.uncheck();
  await page.clock.runFor(300);
  await layer.check();
  await page.clock.runFor(16); // one frame into the 150 ms fade
  const earlyInFade = await countGreen();
  await page.clock.runFor(500);
  const settledAfter = await countGreen();

  expect(settledAfter).toBeGreaterThan(settledBefore * 0.8);
  // The arrow SHAFT is a LineMaterial (its shader writes alpha itself, so it
  // fades correctly either way); the flat-green HEAD is the MeshBasicMaterial
  // that pops. One frame into a working 150 ms fade nothing is visible yet
  // (measured 2 of 283 px); with the bug the head pops in at once (81 of 283).
  expect(earlyInFade).toBeLessThan(settledAfter * 0.1);
});
