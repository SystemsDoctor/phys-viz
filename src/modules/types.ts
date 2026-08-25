/**
 * THE MODULE CONTRACT. See ARCHITECTURE.md §10.
 *
 * This is the interface that makes the project extensible. Treat changes
 * to it as breaking and record them as an ADR (docs/adr/). Modules may
 * import ONLY this file and `@/kernel/*` — never `three`, `react`,
 * `@/shell/*`, or other modules (enforced by the lint boundary, §6).
 */

import type { Dimension } from '@/kernel/units';
import type { SceneContext } from '@/scene/SceneContext';

/**
 * Version of THIS FILE's contract shape (not a module's `schemaVersion`,
 * which versions one module's param meanings). Bump only alongside a
 * breaking change to the interfaces below, recorded as an ADR
 * (docs/adr/), per ARCHITECTURE.md §10. Existing module folders carry no
 * per-module marker against this number today — a bump is a signal to
 * manually sweep `src/modules/*` for the break, not something CI checks
 * for you yet.
 */
export const MODULE_CONTRACT_VERSION = 1;

/** How a module relates to time. Prefer 'parametric' over 'stepped'. */
export type TimeModel =
  | 'static' // no time dependence; timeline hidden
  | 'parametric' // state is a pure function of t; scrubbing and reverse are free
  | 'stepped'; // state advances by integration; see ARCHITECTURE.md §12 for the obligations

export type Category =
  | 'vectors'
  | 'kinematics'
  | 'dynamics'
  | 'energy'
  | 'momentum'
  | 'rotation'
  | 'oscillations'
  | 'gravitation'
  | 'fields'
  | 'statics'
  | 'engineering'
  | 'sandbox';

export interface ModuleManifest {
  /** kebab-case, stable forever — it appears in shared URLs. */
  id: string;
  title: string;
  category: Category;
  /** One sentence for the gallery card. */
  blurb: string;
  tags: string[];
  timeModel: TimeModel;
  dimensions: 2 | 3 | 'both';
  /** Bump when a param key changes meaning; drives URL migration. */
  schemaVersion: number;
  /** Course level, for filtering the gallery. */
  level: 'algebra-based' | 'calculus-based' | 'upper-division';
}

/* ---------- Parameters: declared as data, rendered by the shell ---------- */

interface ParamBase {
  /** Long key, used in code. */
  key: string;
  /** Short key (<=4 chars, unique within module) used in the URL. */
  urlKey: string;
  label: string;
  /** Optional accordion grouping in the control panel. */
  group?: string;
  /** KaTeX shown next to the label, e.g. '\\vec{a}'. */
  symbol?: string;
  help?: string;
}

export type ParamDef =
  | (ParamBase & {
      kind: 'number';
      min: number;
      max: number;
      step: number;
      default: number;
      unit?: Dimension;
      logScale?: boolean;
    })
  | (ParamBase & {
      kind: 'vector';
      default: [number, number, number];
      range: number;
      draggable?: boolean;
      unit?: Dimension;
    })
  | (ParamBase & { kind: 'toggle'; default: boolean })
  | (ParamBase & {
      kind: 'select';
      options: { value: string; label: string }[];
      default: string;
    })
  | (ParamBase & { kind: 'expression'; vars: string[]; default: string })
  | (ParamBase & { kind: 'angle'; default: number; min?: number; max?: number });

export interface LayerDef {
  key: string;
  urlKey: string;
  label: string;
  default: boolean;
  group?: string;
  /** Hidden until revealed in predict mode. */
  reveal?: boolean;
}

/* ---------- Declared outputs ---------- */

export interface ScalarDef {
  key: string;
  label: string;
  symbol?: string; // KaTeX
  unit?: Dimension;
  /** Show in the readout table by default. */
  readout?: boolean;
  /** Offer as a plottable series. */
  plottable?: boolean;
}

/* ---------- The module itself ---------- */

export interface ModuleState {
  params: Record<string, number | boolean | string | [number, number, number]>;
  layers: Record<string, boolean>;
  t: number;
}

export interface PhysicsModule {
  manifest: ModuleManifest;
  params: ParamDef[];
  layers: LayerDef[];
  scalars: ScalarDef[];
  /** Camera hints the shell applies on first mount. */
  defaultView?: { preset: 'iso' | '+x' | '+y' | '+z'; projection: 'ortho' | 'persp' };
  create(ctx: SceneContext): ModuleInstance;
}

export interface ModuleInstance {
  /**
   * Called on every param or layer change, and every frame while time
   * runs. MUST be idempotent: same state in, same scene out, regardless
   * of history. MUST NOT allocate geometry — mutate retained handles
   * only.
   */
  update(state: ModuleState): void;

  /** Values for readouts and plots. Pure; no side effects on the scene. */
  scalars(state: ModuleState): Record<string, number>;

  /** Only for timeModel === 'stepped'. Advance internal state by dt. */
  step?(dt: number, state: ModuleState): void;

  /** Only for timeModel === 'stepped'. Return to t = 0. */
  reset?(state: ModuleState): void;

  /** Release every handle created in create(). */
  dispose(): void;
}
