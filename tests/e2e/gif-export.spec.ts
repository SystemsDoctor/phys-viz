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
): Promise<{ bytes: Buffer; paletteRgb: [number, number, number][] }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`#/m/${moduleId}`);
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
});
