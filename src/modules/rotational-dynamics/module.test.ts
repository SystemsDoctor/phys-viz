import { describe, it, expect } from 'vitest';
import module from './index';

describe(module.manifest.id, () => {
  it('has a manifest id matching its folder name', () => {
    expect(module.manifest.id).toBe('rotational-dynamics');
  });
});
