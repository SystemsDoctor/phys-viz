/**
 * MockSceneContext — a headless SceneContext with no WebGL and no DOM.
 * Powers the contract test (ARCHITECTURE.md §18) that runs every
 * registered module through a conformance suite, and lets module authors
 * unit-test `create()`/`update()`/`scalars()` without a browser.
 *
 * Must mirror the real SceneContext API exactly — checked by the
 * type-level test in `SceneContext.mirror.types.ts`. Also tallies every
 * handle created and disposed, which is what makes contract assertion 4
 * ("zero undisposed handles") possible, and records every `set()`/
 * `visible()` call so assertions 5/5b (idempotence, determinism) can
 * diff two recorded runs.
 *
 * One generic `makeHandle` builds every glyph/annotate/draggable method,
 * so there is exactly one place that could drift from `Handle<Props>`'s
 * exact shape. `id`/`kind` live only in closures — never as enumerable
 * fields on the returned object — so the returned type is exactly
 * `Handle<P>`, with no excess properties to corrupt the mirror-type
 * comparison.
 *
 * `set()` snapshots props via `sanitizeForRecording`, not the native
 * `structuredClone` — `surface`/`field` props (`parametric`,
 * `colorField`, `sample`) are functions by design (both glyphs'
 * own doc comments anticipate a fresh closure passed to `set()` every
 * call, e.g. a time-varying field), and `structuredClone` throws on a
 * function value. It also wouldn't help determinism/idempotence
 * comparisons anyway: two structurally-identical closures created on
 * separate `update()` calls are different object references, so a
 * literal clone would still fail `toEqual` even once cloning stopped
 * throwing. `sanitizeForRecording` clones ordinary data and replaces
 * every function with the same stable placeholder, so those assertions
 * compare the DATA a module computed, not incidental closure identity —
 * first surfaced by M5's fields-gradients, the first module to run
 * `surface`/`field` glyphs through the real contract suite.
 */
import type { SceneContext, UpAxis } from '@/scene/SceneContext';
import type { Handle } from '@/scene/glyphs/Handle';
import { getPalette } from '@/scene/theme';

export interface MockSceneContextStats {
  created: number;
  disposed: number;
}

export interface RecordedSet {
  kind: string;
  handleId: number;
  props: unknown;
}

export interface RecordedVisibility {
  kind: string;
  handleId: number;
  show: boolean;
}

/**
 * Everything MockSceneContext adds beyond the real SceneContext shape.
 * Kept as one type so the mirror test can `Omit<>` it in one place no
 * matter how many test-only fields accrue later.
 */
export interface MockSceneContextTestSurface {
  readonly stats: MockSceneContextStats;
  readonly recordedSets: readonly RecordedSet[];
  readonly recordedVisibility: readonly RecordedVisibility[];
  resetRecording(): void;
}

export interface MockSceneContextOptions {
  up?: UpAxis;
}

/** Deep-clones plain data; replaces every function with a stable placeholder (see the file-level doc comment). */
function sanitizeForRecording(value: unknown): unknown {
  if (typeof value === 'function') return '[[Function]]';
  if (Array.isArray(value)) return value.map(sanitizeForRecording);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) out[key] = sanitizeForRecording(v);
    return out;
  }
  return value;
}

export function createMockSceneContext(
  options?: MockSceneContextOptions,
): SceneContext & MockSceneContextTestSurface {
  const stats: MockSceneContextStats = { created: 0, disposed: 0 };
  let recordedSets: RecordedSet[] = [];
  let recordedVisibility: RecordedVisibility[] = [];
  let nextId = 0;

  function makeHandle<P>(kind: string): Handle<P> {
    const id = nextId++;
    stats.created++;
    let disposed = false;
    return {
      set(props: Partial<P>) {
        if (disposed) throw new Error(`${kind}#${id}: set() called after dispose()`);
        recordedSets.push({ kind, handleId: id, props: sanitizeForRecording(props) });
      },
      visible(show: boolean) {
        if (disposed) throw new Error(`${kind}#${id}: visible() called after dispose()`);
        recordedVisibility.push({ kind, handleId: id, show });
      },
      dispose() {
        if (disposed) throw new Error(`${kind}#${id}: dispose() called twice`);
        disposed = true;
        stats.disposed++;
      },
    };
  }

  const upAxis: UpAxis = options?.up ?? 'y';

  return {
    get palette() {
      return getPalette();
    },
    get up() {
      return upAxis;
    },

    group(name) {
      return { id: name };
    },

    arrow: () => makeHandle('arrow'),
    curvedArrow: () => makeHandle('curvedArrow'),
    path: () => makeHandle('path'),
    point: () => makeHandle('point'),
    patch: () => makeHandle('patch'),
    surface: () => makeHandle('surface'),
    arc: () => makeHandle('arc'),
    body: () => makeHandle('body'),
    field: () => makeHandle('field'),
    frame: () => makeHandle('frame'),
    axes: () => makeHandle('axes'),
    graticule: () => makeHandle('graticule'),

    label: () => makeHandle('label'),
    dimensionLine: () => makeHandle('dimensionLine'),

    draggable: () => makeHandle('draggable'),

    get stats() {
      return stats;
    },
    get recordedSets() {
      return recordedSets;
    },
    get recordedVisibility() {
      return recordedVisibility;
    },
    resetRecording() {
      recordedSets = [];
      recordedVisibility = [];
    },
  };
}
