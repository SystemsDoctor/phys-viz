import { describe, it, expect } from 'vitest';
import { getPalette } from '@/scene/theme';
import { buildExportPalette, nearestIndex, quantizeFrame } from './quantize';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

describe('buildExportPalette', () => {
  it('fits within GIF’s 256-entry limit', () => {
    expect(buildExportPalette().length).toBeLessThanOrEqual(256);
  });

  it('is deterministic', () => {
    expect(buildExportPalette()).toEqual(buildExportPalette());
  });

  it('contains every §15 semantic colour exactly (P-11)', () => {
    const palette = buildExportPalette();
    const semantic = Object.values(getPalette()).map(hexToRgb);
    for (const rgb of semantic) {
      expect(palette).toContainEqual(rgb);
    }
  });
});

describe('nearestIndex / quantizeFrame', () => {
  it('resolves an exact semantic colour to itself with zero error', () => {
    const palette = buildExportPalette();
    for (const hex of Object.values(getPalette())) {
      const rgb = hexToRgb(hex);
      const index = nearestIndex(rgb.r, rgb.g, rgb.b, palette);
      expect(palette[index]).toEqual(rgb);
    }
  });

  it('quantizes an RGBA buffer to one index per pixel, ignoring alpha', () => {
    const palette = buildExportPalette();
    const white = hexToRgb('#ffffff');
    const whiteIndex = nearestIndex(white.r, white.g, white.b, palette);
    const rgba = new Uint8ClampedArray([255, 255, 255, 0, 255, 255, 255, 255]);
    const indices = quantizeFrame(rgba, palette);
    expect(Array.from(indices)).toEqual([whiteIndex, whiteIndex]);
  });

  it('picks the closer of two candidates for an in-between colour', () => {
    const palette = [
      { r: 0, g: 0, b: 0 },
      { r: 100, g: 100, b: 100 },
      { r: 255, g: 255, b: 255 },
    ];
    expect(nearestIndex(90, 90, 90, palette)).toBe(1);
    expect(nearestIndex(10, 10, 10, palette)).toBe(0);
    expect(nearestIndex(250, 250, 250, palette)).toBe(2);
  });
});
