/**
 * Single Zustand store (ARCHITECTURE.md §13). The render loop subscribes
 * to this OUTSIDE React (Zustand's `subscribe`) and calls
 * `instance.update()` directly. React re-renders only the chrome. Never
 * drive a 60fps three.js loop through React state.
 *
 * TODO(M3): implement with `zustand`'s `createStore`.
 */
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
}

export function createAppStore(_initial?: Partial<AppState>) {
  throw new Error('shell/state/store: not implemented (see M3 in ARCHITECTURE.md §20)');
}

// Re-exported here only for callers that need the type without pulling
// in ParamDef elsewhere.
export type { ParamDef };
