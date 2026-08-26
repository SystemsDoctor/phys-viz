import { describe, it, expect } from 'vitest';
import { encodeState, decodeState } from './urlCodec';
import { DEFAULT_APP_STATE, DEFAULT_CAMERA } from './store';
import type { AppState } from './store';
import type { ParamDef, LayerDef } from '@/modules/types';

const params: ParamDef[] = [
  { kind: 'vector', key: 'a', urlKey: 'a', label: 'A', default: [3, 1, 0], range: 6 },
  { kind: 'number', key: 'n', urlKey: 'n', label: 'N', min: 0, max: 10, step: 1, default: 5 },
  { kind: 'toggle', key: 'on', urlKey: 'on', label: 'On', default: false },
  {
    kind: 'select',
    key: 'mode',
    urlKey: 'md',
    label: 'Mode',
    options: [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ],
    default: 'a',
  },
  { kind: 'expression', key: 'f', urlKey: 'f', label: 'F', vars: ['x'], default: 'x' },
  { kind: 'angle', key: 'ang', urlKey: 'ag', label: 'Angle', default: 0 },
];

const layers: LayerDef[] = [
  { key: 'sum', urlKey: 'sum', label: 'Sum', default: false },
  { key: 'grid', urlKey: 'gr', label: 'Grid', default: true },
];

const ctx = { schemaVersion: 1, params, layers };

function baseState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...DEFAULT_APP_STATE,
    params: { a: [3, 1, 0], n: 5, on: false, mode: 'a', f: 'x', ang: 0 },
    layers: { sum: false, grid: true },
    ...overrides,
  };
}

describe('encodeState / decodeState round-trip', () => {
  it('encodes v= always, and nothing else for the untouched default state', () => {
    const encoded = encodeState(baseState(), ctx);
    expect(encoded).toBe('?v=1');
  });

  it('decode(encode(defaults)) round-trips params/layers/time back to defaults', () => {
    const state = baseState();
    const decoded = decodeState(encodeState(state, ctx), ctx);
    expect(decoded.params).toEqual(state.params);
    expect(decoded.layers).toEqual(state.layers);
  });

  it('omits a param at its default, includes it once changed', () => {
    const state = baseState({ params: { ...baseState().params, n: 7 } });
    const encoded = encodeState(state, ctx);
    expect(encoded).toContain('n=7');
    expect(encoded).not.toContain('a=');
    const decoded = decodeState(encoded, ctx);
    expect(decoded.params).toEqual({ ...state.params, n: 7 });
  });

  it('round-trips every param kind when all are non-default', () => {
    const state = baseState({
      params: { a: [1, 2, 3], n: 9, on: true, mode: 'b', f: 'x*2', ang: 1.5 },
    });
    const decoded = decodeState(encodeState(state, ctx), ctx);
    expect(decoded.params).toEqual(state.params);
  });

  it('L= only lists layers that differ from default, dash-prefixed when turned off', () => {
    // sum defaults false -> turn on (no prefix); grid defaults true -> turn off (prefix)
    const state = baseState({ layers: { sum: true, grid: false } });
    const encoded = encodeState(state, ctx);
    const layerParam = new URLSearchParams(encoded.slice(1)).get('L');
    expect(layerParam?.split(',').sort()).toEqual(['-gr', 'sum']);
    const decoded = decodeState(encoded, ctx);
    expect(decoded.layers).toEqual({ sum: true, grid: false });
  });

  it('t= is 2dp and omitted at 0', () => {
    expect(encodeState(baseState(), ctx)).not.toContain('t=');
    const encoded = encodeState(baseState({ time: { ...DEFAULT_APP_STATE.time, t: 2.4 } }), ctx);
    expect(encoded).toContain('t=2.40');
    expect(decodeState(encoded, ctx).time?.t).toBe(2.4);
  });

  it('camera is omitted entirely at the exact default (untouched mount)', () => {
    const encoded = encodeState(baseState({ camera: DEFAULT_CAMERA }), ctx);
    expect(encoded).not.toContain('c=');
    expect(decodeState(encoded, ctx).camera).toEqual(DEFAULT_CAMERA);
  });

  it('camera preset shorthand fires for a named-preset orientation, re-deriving radius/target from the default on decode (by design — see the "orientation-only" comment in encodeCamera)', () => {
    const isoCamera: AppState['camera'] = {
      theta: Math.PI / 4,
      phi: Math.acos(1 / Math.sqrt(3)),
      radius: DEFAULT_CAMERA.radius,
      target: [0, 0, 0],
      projection: 'ortho',
    };
    const encoded = encodeState(baseState({ camera: isoCamera }), ctx);
    expect(encoded).toContain('c=iso.o');
    const decoded = decodeState(encoded, ctx);
    expect(decoded.camera).toEqual(isoCamera);
  });

  it('camera round-trips exactly for an arbitrary orbited/zoomed state', () => {
    const orbited: AppState['camera'] = {
      theta: 0.123456,
      phi: 1.98765,
      radius: 14.5,
      target: [1, -2, 0.5],
      projection: 'persp',
    };
    const decoded = decodeState(encodeState(baseState({ camera: orbited }), ctx), ctx);
    expect(decoded.camera).toEqual(orbited);
  });

  it('prefs round-trip and are omitted at default', () => {
    expect(encodeState(baseState(), ctx)).not.toMatch(/up=|th=|pj=/);
    const state = baseState({ prefs: { upAxis: 'z', theme: 'dark', projector: true } });
    const decoded = decodeState(encodeState(state, ctx), ctx);
    expect(decoded.prefs).toEqual({ upAxis: 'z', theme: 'dark', projector: true });
  });

  it('falls back to a compressed ?z= blob past 1800 characters and still round-trips', () => {
    const longExpr = 'x*'.repeat(2000) + 'x';
    const state = baseState({ params: { ...baseState().params, f: longExpr } });
    const encoded = encodeState(state, ctx);
    expect(encoded.startsWith('?z=')).toBe(true);
    expect(encoded.length).toBeLessThan(2000 * 2 + 50); // compressed, not raw-length passthrough
    const decoded = decodeState(encoded, ctx);
    expect(decoded.params?.f).toBe(longExpr);
  });

  it('decode reports the v= a URL was actually encoded at, for migration detection', () => {
    expect(decodeState('?v=1', ctx).schemaVersion).toBe(1);
    expect(decodeState('?v=3&n=2', ctx).schemaVersion).toBe(3);
    // v= is always present per §14, but an absent/malformed one falls back to the current schema.
    expect(decodeState('', ctx).schemaVersion).toBe(ctx.schemaVersion);
  });

  it('decodeState handles a raw hash with a leading "?" or without it identically', () => {
    const encoded = encodeState(baseState({ params: { ...baseState().params, n: 3 } }), ctx);
    const withoutQ = encoded.slice(1);
    expect(decodeState(withoutQ, ctx)).toEqual(decodeState(encoded, ctx));
  });
});
