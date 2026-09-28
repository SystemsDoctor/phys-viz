import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getPalette, getSceneTheme } from '@/scene/theme';

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, 'tokens.css'), 'utf-8');

function readCssVar(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`tokens.css: --${name} not found`);
  return match[1];
}

/**
 * `--surf-2`/`--ink-0` each appear THREE times in tokens.css (the base
 * `:root` light value, the `@media (prefers-color-scheme: dark)` block,
 * and the explicit `:root[data-theme='dark']` override) — `readCssVar`
 * above only ever finds the first (light) occurrence, so X-38's dark
 * drift guard needs its own block-scoped reader instead.
 */
function readCssVarInBlock(blockStartMarker: string, name: string): string {
  const startIdx = css.indexOf(blockStartMarker);
  if (startIdx === -1) throw new Error(`tokens.css: block "${blockStartMarker}" not found`);
  const blockEnd = css.indexOf('}', startIdx);
  const block = css.slice(startIdx, blockEnd);
  const match = block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`tokens.css: --${name} not found in block "${blockStartMarker}"`);
  return match[1];
}

describe('scene/theme palette matches tokens.css (drift guard)', () => {
  it('every --q-* custom property matches getPalette()', () => {
    const palette = getPalette();
    const cssToKey: Record<string, keyof typeof palette> = {
      'q-position': 'position',
      'q-velocity': 'velocity',
      'q-accel': 'accel',
      'q-force': 'force',
      'q-angular': 'angular',
      'q-field': 'field',
      'q-energy': 'energy',
      'q-construction': 'construction',
    };
    for (const [cssVar, key] of Object.entries(cssToKey)) {
      expect(palette[key].toLowerCase()).toBe(readCssVar(cssVar).toLowerCase());
    }
  });
});

describe('scene/theme getSceneTheme matches tokens.css (X-38 drift guard)', () => {
  it('light background/overlayInk match --surf-2/--ink-0 in :root', () => {
    const light = getSceneTheme('light');
    expect(light.background.toLowerCase()).toBe(readCssVar('surf-2').toLowerCase());
    expect(light.overlayInk.toLowerCase()).toBe(readCssVar('ink-0').toLowerCase());
  });

  it("dark background/overlayInk match --surf-2/--ink-0 in :root[data-theme='dark']", () => {
    const dark = getSceneTheme('dark');
    expect(dark.background.toLowerCase()).toBe(
      readCssVarInBlock(":root[data-theme='dark']", 'surf-2').toLowerCase(),
    );
    expect(dark.overlayInk.toLowerCase()).toBe(
      readCssVarInBlock(":root[data-theme='dark']", 'ink-0').toLowerCase(),
    );
  });
});
