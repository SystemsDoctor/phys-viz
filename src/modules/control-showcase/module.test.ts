import { describe, it, expect } from 'vitest';
import type { SceneContext } from '@/scene/SceneContext';
import module from './index';
import type { ParamDef, ModuleState } from '../types';

// A minimal structural stand-in for SceneContext, built locally rather
// than importing MockSceneContext — modules may not import a sibling
// module (or `modules/testing`) via any path (ARCHITECTURE.md §6).
const noopHandle = { set: () => {}, visible: () => {}, dispose: () => {} };
const fakeCtx = new Proxy({} as SceneContext, {
  get(_target, prop) {
    if (prop === 'palette') return new Proxy({}, { get: () => '#000000' });
    if (prop === 'up') return 'y';
    if (prop === 'group') return (name: string) => ({ id: name });
    return () => noopHandle;
  },
});

function defaultState(): ModuleState {
  const params: ModuleState['params'] = {};
  for (const p of module.params) params[p.key] = p.default;
  const layers: ModuleState['layers'] = {};
  for (const l of module.layers) layers[l.key] = l.default;
  return { params, layers, t: 0 };
}

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

  // X-40 golden test: at the module's own DEFAULT params, `fValue`
  // (compileExpr(f, ['x'])({x: k})) must actually evaluate the
  // expression — a declaration-only check (like the ones above) can't
  // catch a default that fails to COMPILE and silently reads as 0
  // forever. Reproduces the exact bug: the old default 'sin(x) * k'
  // referenced `k` as a bare identifier outside the declared `vars: ['x']`.
  it('the default expression f(x) actually compiles and evaluates against k, not silently reading as 0', () => {
    const instance = module.create(fakeCtx);
    const state = defaultState();
    const k = state.params.k as number;
    const { fValue } = instance.scalars(state);
    expect(fValue).toBeCloseTo(Math.sin(k), 10);
    expect(fValue).not.toBe(0);
  });
});
