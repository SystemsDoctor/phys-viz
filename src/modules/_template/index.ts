// The implementation. Lazily loaded by the registry (§11) — this file's
// bundle is only fetched when a student actually opens this module.
//
// What a module author writes: manifest.ts (~20 lines of data), params.ts
// (data), a create() that builds handles ONCE, and an update() that sets
// their properties from state. No React, no three.js, no CSS, no
// routing, no URL handling, no plotting code (§10).
import type { PhysicsModule, ModuleState } from '../types';
import type { SceneContext } from '@/scene/SceneContext';
import { norm, normalize } from '@/kernel/math';
import manifest from './manifest';
import { params, layers, scalars } from './params';

const module: PhysicsModule = {
  manifest,
  params,
  layers,
  scalars,

  // defaultView: { preset: 'iso', projection: 'ortho' },

  create(ctx: SceneContext) {
    // Build every handle ONCE here, attached to a ctx.group(...) that
    // matches a layer `key` so the shell's toggles work with no code in
    // this module.
    const gMain = ctx.group('main');
    const vector = ctx.arrow({
      group: gMain,
      color: ctx.palette.construction,
      from: [0, 0, 0],
      to: [1, 0, 0],
    });
    const tag = ctx.label({ latex: '\\vec{v}', anchor: [1, 0, 0] });

    return {
      update(state: ModuleState) {
        // Only call .set()/.visible() on handles created above. Never
        // construct new handles here — see the idempotence rule in
        // ARCHITECTURE.md §3 and the contract test in §18.
        const amplitude = state.params.amplitude as number;
        const direction = state.params.direction as [number, number, number];
        const showLabel = state.params.showLabel as boolean;
        const style = state.params.style as string;
        const mainOn = state.layers.main ?? true;

        const dir = norm(direction) > 0 ? normalize(direction) : [1, 0, 0];
        const tip: [number, number, number] = [
          dir[0] * amplitude,
          dir[1] * amplitude,
          dir[2] * amplitude,
        ];

        vector.set({ to: tip, dashed: style === 'dashed' });
        vector.visible(mainOn);

        tag.set({ anchor: tip });
        tag.visible(mainOn && showLabel);
      },

      scalars(state: ModuleState) {
        return { magnitude: state.params.amplitude as number };
      },

      // step(dt, state) { ... }   // only if manifest.timeModel === 'stepped'
      // reset(state) { ... }      // only if manifest.timeModel === 'stepped'

      dispose() {
        vector.dispose();
        tag.dispose();
      },
    };
  },
};

export default module;
