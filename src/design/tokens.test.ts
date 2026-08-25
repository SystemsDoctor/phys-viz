import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getPalette } from '@/scene/theme';

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, 'tokens.css'), 'utf-8');

function readCssVar(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`tokens.css: --${name} not found`);
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
