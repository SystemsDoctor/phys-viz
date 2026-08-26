import { describe, it, expect } from 'vitest';
import { createAppStore, DEFAULT_APP_STATE, paramDefaults } from './store';
import type { ParamDef } from '@/modules/types';

describe('createAppStore', () => {
  it('starts at DEFAULT_APP_STATE merged with any initial overrides', () => {
    const store = createAppStore({ moduleId: 'vector-algebra' });
    expect(store.getState().moduleId).toBe('vector-algebra');
    expect(store.getState().time).toEqual(DEFAULT_APP_STATE.time);
  });

  it('setParam patches one key without touching the rest', () => {
    const store = createAppStore({ params: { a: 1, b: 2 } });
    store.getState().setParam('a', 5);
    expect(store.getState().params).toEqual({ a: 5, b: 2 });
  });

  it('setLayer patches one key without touching the rest', () => {
    const store = createAppStore({ layers: { x: true, y: false } });
    store.getState().setLayer('y', true);
    expect(store.getState().layers).toEqual({ x: true, y: true });
  });

  it('patchTime merges into the time slice', () => {
    const store = createAppStore();
    store.getState().patchTime({ playing: true, t: 3 });
    expect(store.getState().time).toEqual({ ...DEFAULT_APP_STATE.time, playing: true, t: 3 });
  });

  it('patchUi and patchPrefs merge into their slices', () => {
    const store = createAppStore();
    store.getState().patchUi({ presenterMode: true });
    store.getState().patchPrefs({ upAxis: 'z' });
    expect(store.getState().ui.presenterMode).toBe(true);
    expect(store.getState().prefs.upAxis).toBe('z');
    expect(store.getState().prefs.theme).toBe('light'); // untouched
  });

  it('hydrate replaces params/layers/time/camera/ui but keeps prefs (viewer-local, not per-module)', () => {
    const store = createAppStore();
    store.getState().patchPrefs({ upAxis: 'z' });
    store.getState().hydrate({ moduleId: 'x', params: { q: 1 } });
    expect(store.getState().moduleId).toBe('x');
    expect(store.getState().params).toEqual({ q: 1 });
    expect(store.getState().prefs.upAxis).toBe('z');
  });

  it('reset restores params/layers to given defaults and time to zero', () => {
    const store = createAppStore();
    store.getState().setParam('a', 99);
    store.getState().patchTime({ t: 10, playing: true });
    store.getState().reset({ params: { a: 1 }, layers: { l: true } });
    expect(store.getState().params).toEqual({ a: 1 });
    expect(store.getState().layers).toEqual({ l: true });
    expect(store.getState().time).toEqual(DEFAULT_APP_STATE.time);
  });

  it('two instances from createAppStore do not share state', () => {
    const a = createAppStore();
    const b = createAppStore();
    a.getState().setParam('x', 1);
    expect(b.getState().params).toEqual({});
  });
});

describe('paramDefaults', () => {
  it('builds a key -> default map from ParamDef[]', () => {
    const defs: ParamDef[] = [
      {
        kind: 'number',
        key: 'x',
        urlKey: 'x',
        label: 'X',
        min: 0,
        max: 1,
        step: 0.1,
        default: 0.5,
      },
      { kind: 'toggle', key: 'on', urlKey: 'on', label: 'On', default: true },
    ];
    expect(paramDefaults(defs)).toEqual({ x: 0.5, on: true });
  });
});
