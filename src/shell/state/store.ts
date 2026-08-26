/**
 * Single Zustand store (ARCHITECTURE.md §13). The render loop subscribes
 * to this OUTSIDE React (`useAppStore.subscribe`, a static method
 * zustand's `create()` hook carries per its v4 API) and calls
 * `instance.update()` directly. React components read it via the hook
 * for chrome re-renders only — never drive a 60fps three.js loop
 * through React state.
 */
import { create } from 'zustand';
import type { ParamDef } from '@/modules/types';

export type ParamValue = number | boolean | string | [number, number, number];

export interface AppState {
  moduleId: string | null;
  params: Record<string, ParamValue>;
  layers: Record<string, boolean>;
  time: { t: number; playing: boolean; speed: number; direction: 1 | -1 };
  camera: {
    theta: number;
    phi: number;
    radius: number;
    target: [number, number, number];
    projection: 'ortho' | 'persp';
  };
  ui: { presenterMode: boolean; predictMode: boolean; panelsOpen: string[] };
  /** Viewer display preferences (ADR 0009, §13) — persisted locally, not per-module. */
  prefs: { upAxis: 'y' | 'z'; theme: 'light' | 'dark'; projector: boolean };
}

export const DEFAULT_CAMERA: AppState['camera'] = {
  theta: Math.PI / 4,
  phi: Math.PI / 3,
  radius: 8,
  target: [0, 0, 0],
  projection: 'ortho',
};

export const DEFAULT_TIME: AppState['time'] = { t: 0, playing: false, speed: 1, direction: 1 };

export const DEFAULT_UI: AppState['ui'] = {
  presenterMode: false,
  predictMode: false,
  panelsOpen: [],
};

export const DEFAULT_PREFS: AppState['prefs'] = {
  upAxis: 'y',
  theme: 'light',
  projector: false,
};

export const DEFAULT_APP_STATE: AppState = {
  moduleId: null,
  params: {},
  layers: {},
  time: DEFAULT_TIME,
  camera: DEFAULT_CAMERA,
  ui: DEFAULT_UI,
  prefs: DEFAULT_PREFS,
};

export interface AppStore extends AppState {
  setModuleId(id: string | null): void;
  setParam(key: string, value: ParamValue): void;
  setLayer(key: string, value: boolean): void;
  patchTime(patch: Partial<AppState['time']>): void;
  setCamera(camera: AppState['camera']): void;
  patchUi(patch: Partial<AppState['ui']>): void;
  patchPrefs(patch: Partial<AppState['prefs']>): void;
  /** Full-state replace — used when a module mounts (seeded from its ParamDef/LayerDef defaults merged with any decoded URL state) and when a URL is decoded on load. */
  hydrate(state: Partial<AppState>): void;
  reset(defaults: { params: Record<string, ParamValue>; layers: Record<string, boolean> }): void;
}

export function paramDefaults(params: ParamDef[]): Record<string, ParamValue> {
  const out: Record<string, ParamValue> = {};
  for (const p of params) out[p.key] = p.default;
  return out;
}

/** Builds a fresh store instance. `useAppStore` below is the app-wide singleton; tests build their own via this factory so they don't share state. */
export function createAppStore(initial?: Partial<AppState>) {
  return create<AppStore>()((set, get) => ({
    ...DEFAULT_APP_STATE,
    ...initial,

    setModuleId(id) {
      set({ moduleId: id });
    },
    setParam(key, value) {
      set({ params: { ...get().params, [key]: value } });
    },
    setLayer(key, value) {
      set({ layers: { ...get().layers, [key]: value } });
    },
    patchTime(patch) {
      set({ time: { ...get().time, ...patch } });
    },
    setCamera(camera) {
      set({ camera });
    },
    patchUi(patch) {
      set({ ui: { ...get().ui, ...patch } });
    },
    patchPrefs(patch) {
      set({ prefs: { ...get().prefs, ...patch } });
    },
    hydrate(state) {
      set({ ...DEFAULT_APP_STATE, prefs: get().prefs, ...state });
    },
    reset(defaults) {
      set({ params: defaults.params, layers: defaults.layers, time: DEFAULT_TIME });
    },
  }));
}

/** App-wide singleton store. */
export const useAppStore = createAppStore();

// Re-exported here only for callers that need the type without pulling
// in ParamDef elsewhere.
export type { ParamDef };
