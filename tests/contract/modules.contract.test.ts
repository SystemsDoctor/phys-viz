/**
 * The contract test — the extensibility guard (ARCHITECTURE.md §18).
 * Iterates `manifests` and runs EVERY registered module through a
 * conformance suite using a headless MockSceneContext (no WebGL, no
 * DOM). This is what keeps module #30 honest, and what a new module
 * must pass to merge — no module-specific test code is required to get
 * this coverage.
 *
 * Checklist, verbatim from §18:
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
 * 11. For `stepped` modules: `step()` and `reset()` are actually
 *     implemented (M5-2/M5-8) — `ModuleInstance.step`/`reset` are
 *     optional on the type for every timeModel, so a `stepped` module
 *     that forgot them was previously unenforced.
 *
 * Assertions 4-7 and 9 run under BOTH up-axis settings (M4-10, ADR
 * 0009) — cheap leverage that catches a module which only half-reads
 * `ctx.up`, since idempotence/determinism/disposal/NaN-freedom must all
 * hold regardless of which axis is "up".
 */
import { describe, it, expect } from 'vitest';
import { manifests, loadModule, loadExplain } from '@/modules/registry';
import { encodeState, decodeState } from '@/shell/state/urlCodec';
import { paramDefaults } from '@/shell/state/store';
import { createRng, nextRange } from '@/kernel/random';
import { createMockSceneContext } from '@/modules/testing/MockSceneContext';
import { parseExplain } from '@/shell/explain';
import type { ParamDef, ModuleState, PhysicsModule } from '@/modules/types';
import type { UpAxis } from '@/scene/SceneContext';
import type { ParamValue } from '@/shell/state/store';
import type { RecordedSet } from '@/modules/testing/MockSceneContext';

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

function defaultLayers(module: PhysicsModule): Record<string, boolean> {
  return Object.fromEntries(module.layers.map((l) => [l.key, l.default]));
}

function stateAt(module: PhysicsModule, t: number): ModuleState {
  return { params: paramDefaults(module.params), layers: defaultLayers(module), t };
}

/** Keep only the last recorded `set()` per handle — the final scene state a run settles on. */
function lastSetPerHandle(sets: readonly RecordedSet[]): Map<number, RecordedSet> {
  const out = new Map<number, RecordedSet>();
  for (const s of sets) out.set(s.handleId, s);
  return out;
}

function collectNumbers(value: unknown, out: number[]): void {
  if (typeof value === 'number') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectNumbers(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectNumbers(v, out));
}

const UP_AXES: readonly UpAxis[] = ['y', 'z'];

describe('module contract', () => {
  for (const manifest of manifests) {
    describe(manifest.id, () => {
      it('has a well-formed manifest', () => {
        expect(manifest.id).toMatch(/^[a-z][a-z0-9-]*$/);
      });

      it('declares urlKeys that are unique and <= 4 characters', async () => {
        const module = await loadModule(manifest.id);
        const keys = module.params.map((p) => p.urlKey);
        expect(new Set(keys).size).toBe(keys.length);
        for (const k of keys) expect(k.length).toBeLessThanOrEqual(4);
      });

      it('every numeric param default lies within [min, max]', async () => {
        const module = await loadModule(manifest.id);
        for (const p of module.params) {
          if (p.kind === 'number') {
            expect(p.default).toBeGreaterThanOrEqual(p.min);
            expect(p.default).toBeLessThanOrEqual(p.max);
          }
        }
      });

      it.skipIf(manifest.timeModel !== 'stepped')(
        'stepped modules implement step() and reset()',
        async () => {
          const module = await loadModule(manifest.id);
          const instance = module.create(createMockSceneContext());
          expect(typeof instance.step).toBe('function');
          expect(typeof instance.reset).toBe('function');
        },
      );

      for (const up of UP_AXES) {
        describe(`up=${up}`, () => {
          it('create -> update(defaults) -> dispose leaves zero undisposed handles', async () => {
            const module = await loadModule(manifest.id);
            const ctx = createMockSceneContext({ up });
            const instance = module.create(ctx);
            instance.update(stateAt(module, 0));
            instance.dispose();
            expect(ctx.stats.disposed).toBe(ctx.stats.created);
          });

          it('update is idempotent regardless of history', async () => {
            const module = await loadModule(manifest.id);
            const a = stateAt(module, 0);
            const b: ModuleState = { ...a, t: 1 };

            const ctxDirect = createMockSceneContext({ up });
            const direct = module.create(ctxDirect);
            direct.update(a);
            const directFinal = lastSetPerHandle(ctxDirect.recordedSets);

            const ctxHistory = createMockSceneContext({ up });
            const withHistory = module.create(ctxHistory);
            withHistory.update(a);
            withHistory.update(b);
            withHistory.update(a);
            const historyFinal = lastSetPerHandle(ctxHistory.recordedSets);

            expect(historyFinal).toEqual(directFinal);
          });

          it('update(A) is deterministic when called twice in a row', async () => {
            const module = await loadModule(manifest.id);
            const a = stateAt(module, 0);
            const ctx = createMockSceneContext({ up });
            const instance = module.create(ctx);

            instance.update(a);
            const first = ctx.recordedSets;
            ctx.resetRecording();
            instance.update(a);
            const second = ctx.recordedSets;

            expect(second).toEqual(first);
          });

          it('scalars() is pure', async () => {
            const module = await loadModule(manifest.id);
            const a = stateAt(module, 0);
            const ctx = createMockSceneContext({ up });
            const instance = module.create(ctx);
            instance.update(a);
            ctx.resetRecording();
            const before = ctx.stats.created;

            instance.scalars(a);

            expect(ctx.recordedSets.length).toBe(0);
            expect(ctx.stats.created).toBe(before);
          });

          it('scalars(A) is deterministic when called twice in a row', async () => {
            const module = await loadModule(manifest.id);
            const a = stateAt(module, 0);
            const ctx = createMockSceneContext({ up });
            const instance = module.create(ctx);
            instance.update(a);

            expect(instance.scalars(a)).toEqual(instance.scalars(a));
          });

          it.skipIf(manifest.timeModel !== 'parametric')(
            'parametric modules: update({t}) is independent of history',
            async () => {
              const module = await loadModule(manifest.id);

              const ctxFresh = createMockSceneContext({ up });
              const fresh = module.create(ctxFresh);
              fresh.update(stateAt(module, 5));
              const freshFinal = lastSetPerHandle(ctxFresh.recordedSets);

              const ctxSeq = createMockSceneContext({ up });
              const seq = module.create(ctxSeq);
              seq.update(stateAt(module, 0));
              seq.update(stateAt(module, 5));
              const seqFinal = lastSetPerHandle(ctxSeq.recordedSets);

              expect(seqFinal).toEqual(freshFinal);
            },
          );

          it('no NaN across a sampling of the parameter space', async () => {
            const module = await loadModule(manifest.id);
            const seed = manifest.id.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
            const rng = createRng(seed);
            const ctx = createMockSceneContext({ up });
            const instance = module.create(ctx);
            const layers = defaultLayers(module);

            for (let i = 0; i < 100; i++) {
              const params: Record<string, ParamValue> = {};
              for (const p of module.params) params[p.key] = randomParamValue(p, rng);
              const t = nextRange(rng, 0, 20);
              const state: ModuleState = { params, layers, t };

              instance.update(state);
              const numbers: number[] = [];
              collectNumbers(instance.scalars(state), numbers);
              for (const n of numbers) expect(Number.isNaN(n)).toBe(false);
            }
            instance.dispose();
          });
        });
      }

      it('URL round-trip: encode(defaults) -> decode deep-equals defaults', async () => {
        const module = await loadModule(manifest.id);
        const codecCtx = {
          schemaVersion: module.manifest.schemaVersion,
          params: module.params,
          layers: module.layers,
        };
        const defaults = paramDefaults(module.params);
        const defLayers = defaultLayers(module);

        const encoded = encodeState(
          {
            moduleId: module.manifest.id,
            params: defaults,
            layers: defLayers,
            time: { t: 0, playing: false, speed: 1, direction: 1 },
            camera: decodeState('', codecCtx).camera!,
            ui: { presenterMode: false, predictMode: false, panelsOpen: [] },
            prefs: { upAxis: 'y', theme: 'light', projector: false },
          },
          codecCtx,
        );
        const decoded = decodeState(encoded, codecCtx);
        expect(decoded.params).toEqual(defaults);
        expect(decoded.layers).toEqual(defLayers);
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

      it('explain.md, if present, parses', async () => {
        const source = await loadExplain(manifest.id);
        if (source === null) return;
        expect(parseExplain(source).ok).toBe(true);
      });
    });
  }

  it('registers at least one module', () => {
    expect(manifests.length).toBeGreaterThan(0);
  });
});
