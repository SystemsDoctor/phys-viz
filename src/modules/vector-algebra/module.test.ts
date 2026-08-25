import { describe, it, expect } from 'vitest';
import module from './index';

describe(module.manifest.id, () => {
  it('has a manifest id matching its folder name', () => {
    expect(module.manifest.id).toBe('vector-algebra');
  });

  it('declares urlKeys that are unique and <= 4 characters', () => {
    const keys = module.params.map((p) => p.urlKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k.length).toBeLessThanOrEqual(4);
  });
});
