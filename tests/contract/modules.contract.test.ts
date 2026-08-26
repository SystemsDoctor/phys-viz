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
 *  5b. Determinism: update(A) called twice in a row (no state change
 *      between) produces byte-identical recorded handle-property sets;
 *      same for scalars(A) called twice. Catches Date.now()/unseeded
 *      Math.random()/captured mutable closure state (ARCHITECTURE.md
 *      §12, "Determinism requirement" — otherwise unenforced).
 *  6. Purity of scalars(): calling it twice with the same state gives
 *     identical results and does not mutate the scene.
 *  7. For parametric modules: update({t: 5}) from a fresh instance
 *     equals update({t: 0}); update({t: 5}).
 *  8. URL round-trip: encode(defaults) -> decode -> deep-equals
 *     defaults; and the same for a randomized state.
 *  9. No NaN in any scalar across a sampling of the parameter space
 *     (100 quasi-random states).
 * 10. Every explain.md, if present, parses.
 */
import { describe, it, expect } from 'vitest';
import { manifests, loadModule } from '@/modules/registry';
import { encodeState, decodeState } from '@/shell/state/urlCodec';
import { paramDefaults } from '@/shell/state/store';
import { createRng, nextRange } from '@/kernel/random';
import type { ParamDef } from '@/modules/types';
import type { ParamValue } from '@/shell/state/store';

/**
 * A random but valid value per ParamDef kind, seeded (not Math.random)
 * so a contract-test failure is reproducible. `expression` params keep
 * their default — a random string risks being syntactically invalid,
 * which would be testing kernel/expr's parser, not the codec.
 */
function randomParamValue(def: ParamDef, rng: () => number): ParamValue {
  switch (def.kind) {
    case 'number':
      return nextRange(rng, def.min, def.max);
    case 'vector':
      return [
        nextRange(rng, -def.range, def.range),
        nextRange(rng, -def.range, def.range),
        nextRange(rng, -def.range, def.range),
      ];
    case 'toggle':
      return rng() < 0.5;
    case 'select':
      return def.options[Math.floor(rng() * def.options.length)].value;
    case 'expression':
      return def.default;
    case 'angle':
      return nextRange(rng, def.min ?? -Math.PI, def.max ?? Math.PI);
  }
}

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
      it.todo('update(A) is deterministic when called twice in a row');
      it.todo('scalars() is pure');
      it.todo('scalars(A) is deterministic when called twice in a row');
      it.todo('parametric modules: update({t}) is independent of history');

      it('URL round-trip: encode(defaults) -> decode deep-equals defaults', async () => {
        const module = await loadModule(manifest.id);
        const codecCtx = {
          schemaVersion: module.manifest.schemaVersion,
          params: module.params,
          layers: module.layers,
        };
        const defaults = paramDefaults(module.params);
        const defaultLayers = Object.fromEntries(module.layers.map((l) => [l.key, l.default]));

        const encoded = encodeState(
          {
            moduleId: module.manifest.id,
            params: defaults,
            layers: defaultLayers,
            time: { t: 0, playing: false, speed: 1, direction: 1 },
            camera: decodeState('', codecCtx).camera!,
            ui: { presenterMode: false, predictMode: false, panelsOpen: [] },
            prefs: { upAxis: 'y', theme: 'light', projector: false },
          },
          codecCtx,
        );
        const decoded = decodeState(encoded, codecCtx);
        expect(decoded.params).toEqual(defaults);
        expect(decoded.layers).toEqual(defaultLayers);
      });

      it('URL round-trip: encode(randomized) -> decode deep-equals the randomized state', async () => {
        const module = await loadModule(manifest.id);
        const codecCtx = {
          schemaVersion: module.manifest.schemaVersion,
          params: module.params,
          layers: module.layers,
        };
        // Seeded by the module id (via a trivial hash) so it's stable
        // across runs and still varies per module.
        const seed = manifest.id.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
        const rng = createRng(seed);

        const params: Record<string, ParamValue> = {};
        for (const p of module.params) params[p.key] = randomParamValue(p, rng);
        const layers: Record<string, boolean> = {};
        for (const l of module.layers) layers[l.key] = rng() < 0.5;
        // t=' spec-mandated 2dp truncation is a documented lossy field
        // (urlCodec's own doc comment) — round here so this check tests
        // the codec's round-trip contract, not that lossiness.
        const t = Math.round(nextRange(rng, 0, 20) * 100) / 100;

        const state = {
          moduleId: module.manifest.id,
          params,
          layers,
          time: { t, playing: false, speed: 1, direction: 1 as const },
          camera: decodeState('', codecCtx).camera!,
          ui: { presenterMode: false, predictMode: false, panelsOpen: [] },
          prefs: { upAxis: 'y' as const, theme: 'light' as const, projector: false },
        };
        const decoded = decodeState(encodeState(state, codecCtx), codecCtx);
        expect(decoded.params).toEqual(params);
        expect(decoded.layers).toEqual(layers);
        expect(decoded.time?.t).toBe(t);
      });

      it.todo('no NaN across a sampling of the parameter space');
      it.todo('explain.md, if present, parses');
    });
  }

  it('registers at least one module', () => {
    expect(manifests.length).toBeGreaterThan(0);
  });
});
