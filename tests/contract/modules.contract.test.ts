/**
 * The contract test — the extensibility guard (ARCHITECTURE.md §18).
 * Iterates `manifests` and runs EVERY registered module through a
 * conformance suite using a headless MockSceneContext (no WebGL, no
 * DOM). This is what keeps module #30 honest, and what a new module
 * must pass to merge — no module-specific test code is required to get
 * this coverage.
 *
 * TODO(M1-M3): implement each assertion as the substrate it depends on
 * (MockSceneContext, urlCodec) lands. Checklist, verbatim from §18:
 *
 *  1. Manifest is well-formed; id matches its folder name.
 *  2. urlKeys are unique within the module and <= 4 characters.
 *  3. Every numeric param default lies within [min, max].
 *  4. create() -> update(defaults) -> dispose() leaves zero undisposed
 *     handles (the mock context tallies creates and disposes).
 *  5. Idempotence: update(A); update(B); update(A) produces the same
 *     recorded handle-property set as update(A) alone.
 *  6. Purity of scalars(): calling it twice with the same state gives
 *     identical results and does not mutate the scene.
 *  7. For parametric modules: update({t: 5}) from a fresh instance
 *     equals update({t: 0}); update({t: 5}).
 *  8. URL round-trip: encode(defaults) -> decode -> deep-equals
 *     defaults; and the same for a randomized state.
 *  9. No NaN in any scalar across a sampling of the parameter space
 *     (100 quasi-random states).
 * 10. Every explain.mdx, if present, parses.
 */
import { describe, it, expect } from 'vitest';
import { manifests } from '@/modules/registry';

describe('module contract', () => {
  for (const manifest of manifests) {
    describe(manifest.id, () => {
      it('has a well-formed manifest', () => {
        expect(manifest.id).toMatch(/^[a-z][a-z0-9-]*$/);
      });

      it.todo('urlKeys are unique and <= 4 characters');
      it.todo('every numeric param default lies within [min, max]');
      it.todo('create -> update(defaults) -> dispose leaves zero undisposed handles');
      it.todo('update is idempotent regardless of history');
      it.todo('scalars() is pure');
      it.todo('parametric modules: update({t}) is independent of history');
      it.todo('URL round-trip preserves state');
      it.todo('no NaN across a sampling of the parameter space');
      it.todo('explain.mdx, if present, parses');
    });
  }

  it('registers at least one module', () => {
    expect(manifests.length).toBeGreaterThan(0);
  });
});
