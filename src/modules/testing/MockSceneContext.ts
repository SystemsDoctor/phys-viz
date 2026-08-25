/**
 * MockSceneContext — a headless SceneContext with no WebGL and no DOM.
 * Powers the contract test (ARCHITECTURE.md §18) that runs every
 * registered module through a conformance suite, and lets module authors
 * unit-test `create()`/`update()`/`scalars()` without a browser.
 *
 * Must mirror the real SceneContext API exactly — checked by a
 * type-level test as part of the M2 acceptance criterion (§20). It also
 * tallies every handle created and disposed, which is what makes
 * assertion #4 in the contract suite (§18) — "zero undisposed handles"
 * — possible.
 *
 * TODO(M2/M3): implement alongside the real SceneContext.
 */
import type { SceneContext, GroupHandle } from '@/scene/SceneContext';

export interface MockSceneContextStats {
  created: number;
  disposed: number;
}

export function createMockSceneContext(): SceneContext & { readonly stats: MockSceneContextStats } {
  throw new Error('modules/testing: not implemented (see M2/M3 in ARCHITECTURE.md §20)');
}
