/**
 * GIF export E2E (ADR 0006, TASKS.md P-G). Runs against the real
 * production preview build. Exercises the actual UI (open the export
 * panel, click "Export GIF") rather than importing the encoder module
 * directly — the preview server only serves `dist/`, not raw `src/`, so
 * this is also the more realistic path.
 *
 * Determinism across two runs (P-G's literal "byte-identical") is
 * exercised by using two entirely fresh browser contexts against the
 * SAME module route with no interaction beyond opening the panel and
 * clicking export — a fresh context always starts from the module's own
 * declared defaults (no URL params), so both runs begin from identical
 * state without needing to explicitly synchronize anything.
 */
import { test, expect, type Browser } from '@playwright/test';
import fs from 'node:fs';

async function exportGifFrom(
  browser: Browser,
  moduleId: string,
  query = '',
): Promise<{ bytes: Buffer; paletteRgb: [number, number, number][] }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`#/m/${moduleId}${query}`);
  await expect(page.locator('canvas.pv-viewport-canvas')).toBeVisible();
  await page.waitForTimeout(500);

  await page.locator('.pv-gif-export summary').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.pv-gif-export button', { hasText: 'Export GIF' }).click(),
  ]);
  const path = await download.path();
  if (!path) throw new Error('download produced no path');
  const bytes = fs.readFileSync(path);

  // Parse just the global colour table for the palette check (P-11) —
  // header(6) + logical screen descriptor(7) gets us to the packed byte
  // at offset 10, same layout encoder.ts's own unit tests already verify
  // structurally.
  const packed = bytes[10];
  const gctSize = 1 << ((packed & 0x07) + 1);
  const paletteRgb: [number, number, number][] = [];
  for (let i = 0; i < gctSize; i++) {
    const o = 13 + i * 3;
    paletteRgb.push([bytes[o], bytes[o + 1], bytes[o + 2]]);
  }

  await context.close();
  return { bytes, paletteRgb };
}

// The §15 Okabe–Ito semantic tokens (src/scene/theme.ts's hardcoded
// HEX map) — hardcoded here the same way tests/e2e/smoke.spec.ts's own
// X-14 test already hardcodes ctx.palette.angular for a pixel check;
// Playwright test files aren't run through Vite's `@/` alias resolution.
const SEMANTIC_PALETTE: [number, number, number][] = [
  [0x00, 0x72, 0xb2], // position
  [0x00, 0x9e, 0x73], // velocity
  [0xd5, 0x5e, 0x00], // accel
  [0xcc, 0x79, 0xa7], // force
  [0x7a, 0x4f, 0xbf], // angular
  [0x56, 0xb4, 0xe9], // field
  [0xe6, 0x9f, 0x00], // energy
  [0x7b, 0x84, 0x94], // construction
];

test.describe('GIF export (ADR 0006)', () => {
  for (const moduleId of ['projectile-motion', 'rotational-dynamics']) {
    test(`${moduleId}: two exports from the same default state are byte-identical, and the palette survives quantization (P-G, P-11)`, async ({
      browser,
    }) => {
      const first = await exportGifFrom(browser, moduleId);
      const second = await exportGifFrom(browser, moduleId);

      expect(first.bytes.equals(second.bytes)).toBe(true);

      expect(String.fromCharCode(...first.bytes.subarray(0, 6))).toBe('GIF89a');

      for (const rgb of SEMANTIC_PALETTE) {
        expect(first.paletteRgb).toContainEqual(rgb);
      }
    });
  }

  // X-31 content assertion: renderNow() used to skip the frameListeners
  // loop that positions every arrow's shaft/head and sizes/positions
  // every point (arrow.ts/point.ts do that work in `onFrame`, never in
  // the module's own update() — point.ts's mesh.position is only ever
  // copied from `current.position` INSIDE onFrame, so without it the
  // mesh stays wherever `create()` first put it, forever). That bug is
  // invisible to the determinism check above (broken geometry is still
  // byte-identical run to run) and to the palette check (colours are
  // still declared and quantized correctly, just not painted where they
  // belong). It's also invisible if the module draws anything through a
  // path glyph (path.ts writes its BufferGeometry positions directly in
  // `.set()`, not gated behind onFrame) — projectile-motion's default
  // trajectory trace would make two exports differ regardless of this
  // bug, so this test explicitly turns the trace OFF and switches to
  // vector mode (`L=vmd,-amd,-trc`), leaving ONLY the ball (a `point`)
  // and its velocity arrow (an `arrow`) on screen — both exactly the
  // glyph kinds this bug freezes. Exporting from two genuinely different
  // physics states (bookmarked via `t=` — projectile-motion's flight is
  // ~1.73s, so t=1.1 is well clear of the launch point) must then
  // produce different GIF bytes; pre-fix it did not.
  test('projectile-motion: exporting a point+arrow-only view from two different physics states (t=0 vs t=1.1) produces genuinely different GIF content, not frozen geometry', async ({
    browser,
  }) => {
    const query = '&L=vmd,-amd,-trc';
    const atLaunch = await exportGifFrom(browser, 'projectile-motion', `?t=0${query}`);
    const midFlight = await exportGifFrom(browser, 'projectile-motion', `?t=1.1${query}`);

    expect(atLaunch.bytes.equals(midFlight.bytes)).toBe(false);

    // Not just "some byte differs" (a single anti-aliasing nudge would
    // do that) — the ball and its velocity arrow visibly relocate across
    // a third of the frame, so a real fraction of the encoded frame data
    // must differ too.
    const minLen = Math.min(atLaunch.bytes.length, midFlight.bytes.length);
    let diffCount = 0;
    for (let i = 0; i < minLen; i++) {
      if (atLaunch.bytes[i] !== midFlight.bytes[i]) diffCount++;
    }
    expect(diffCount).toBeGreaterThan(50);
  });
});
