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
        recordedSets.push({ kind, handleId: id, props: structuredClone(props) });
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
