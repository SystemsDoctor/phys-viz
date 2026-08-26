import { describe, it, expect } from 'vitest';
import module from './index';
import type { ParamDef } from '../types';

describe(module.manifest.id, () => {
  it('has a manifest id matching its folder name', () => {
    expect(module.manifest.id).toBe('control-showcase');
  });

  it('declares urlKeys that are unique and <= 4 characters, for both params and layers', () => {
    const keys = [...module.params.map((p) => p.urlKey), ...module.layers.map((l) => l.urlKey)];
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k.length).toBeLessThanOrEqual(4);
  });

  it('declares one of every ParamDef kind (this is the whole point of the module)', () => {
    const kinds = new Set(module.params.map((p) => p.kind));
    const expected: ParamDef['kind'][] = [
      'number',
      'vector',
      'toggle',
      'select',
      'expression',
      'angle',
    ];
    for (const kind of expected) expect(kinds.has(kind)).toBe(true);
  });

  it('declares a logScale number param', () => {
    const numberParam = module.params.find((p) => p.kind === 'number');
    expect(numberParam?.kind === 'number' && numberParam.logScale).toBe(true);
  });

  it('declares grouped layers and at least one reveal-tagged layer', () => {
    expect(module.layers.some((l) => l.group !== undefined)).toBe(true);
    expect(module.layers.some((l) => l.reveal === true)).toBe(true);
  });

  it('declares at least one plottable scalar (for both plot types)', () => {
    expect(module.scalars.some((s) => s.plottable)).toBe(true);
  });

  it('is dimensions: 2 (exercises the 2D lock, ADR 0007)', () => {
    expect(module.manifest.dimensions).toBe(2);
  });
});
