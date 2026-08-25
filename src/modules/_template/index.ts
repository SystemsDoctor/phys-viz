// The implementation. Lazily loaded by the registry (§11) — this file's
// bundle is only fetched when a student actually opens this module.
//
// What a module author writes: manifest.ts (~20 lines of data), params.ts
// (data), a create() that builds handles ONCE, and an update() that sets
// their properties from state. No React, no three.js, no CSS, no
// routing, no URL handling, no plotting code (§10).
import type { PhysicsModule, ModuleState } from '../types';
import type { SceneContext } from '@/scene/SceneContext';
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
    // this module. Example:
    //
    // const gMain = ctx.group('main');
    // const arrow = ctx.arrow({ group: gMain, color: ctx.palette.position });

    return {
      update(_state: ModuleState) {
        // Only call .set() on handles created above. Never construct new
        // handles here — see the idempotence rule in ARCHITECTURE.md §3
        // and the contract test in §18.
      },

      scalars(_state: ModuleState) {
        return {};
      },

      // step(dt, state) { ... }   // only if manifest.timeModel === 'stepped'
      // reset(state) { ... }      // only if manifest.timeModel === 'stepped'

      dispose() {
        // arrow.dispose();
      },
    };
  },
};

export default module;
