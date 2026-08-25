/**
 * The flagship module (ARCHITECTURE.md M4, §20). This file is the
 * illustrative skeleton given verbatim in the authoring cookbook (§21) —
 * it demonstrates the pattern (declare params/layers/scalars as data,
 * build handles once in create(), mutate them in update()) but does not
 * yet cover the full M4 scope: the 2D/3D toggle, component decomposition
 * onto a rotatable basis, right-hand-rule animation, scalar triple
 * product, and direction cosines. Expand it to meet the M4 acceptance
 * criterion before considering this module done.
 *
 * Note what is absent: no React, no three.js, no CSS, no event
 * handlers, no URL code, no plotting, no layer `if` statements, no
 * registry edit, no route registration.
 */
import type { PhysicsModule, ModuleState } from '../types';
import type { SceneContext } from '@/scene/SceneContext';
import { cross, dot, norm, scale, add } from '@/kernel/math';
import manifest from './manifest';
import { params, layers, scalars } from './params';

const module: PhysicsModule = {
  manifest,
  params,
  layers,
  scalars,

  defaultView: { preset: 'iso', projection: 'ortho' },

  create(ctx: SceneContext) {
    // Create every handle ONCE. Attach to layer groups so the shell's
    // toggles work without any code here.
    const gA = ctx.group('always');
    const gSum = ctx.group('sum');
    const gProj = ctx.group('proj');
    const gCross = ctx.group('xprod');
    const gArea = ctx.group('xarea');

    const aArrow = ctx.arrow({ group: gA, color: ctx.palette.position, label: '\\vec{a}', from: [0, 0, 0], to: [0, 0, 0] });
    const bArrow = ctx.arrow({ group: gA, color: ctx.palette.velocity, label: '\\vec{b}', from: [0, 0, 0], to: [0, 0, 0] });
    const sArrow = ctx.arrow({ group: gSum, color: ctx.palette.energy, label: '\\vec{a}+\\vec{b}', from: [0, 0, 0], to: [0, 0, 0] });
    const shadow = ctx.arrow({ group: gProj, color: ctx.palette.construction, dashed: true, from: [0, 0, 0], to: [0, 0, 0] });
    const xArrow = ctx.arrow({
      group: gCross,
      color: ctx.palette.angular,
      doubleHead: true,
      label: '\\vec{a}\\times\\vec{b}',
      from: [0, 0, 0],
      to: [0, 0, 0],
    });
    const patch = ctx.patch({ group: gArea, color: ctx.palette.angular, opacity: 0.18, points: [] });
    const angle = ctx.arc({ group: gA, color: ctx.palette.construction, label: '\\theta', from: [1, 0, 0], to: [0, 1, 0], radius: 1.2 });

    return {
      update(s: ModuleState) {
        const a = s.params.a as [number, number, number];
        const b = s.params.b as [number, number, number];

        // Only set(); never construct. Layer visibility is handled by
        // the shell via the groups, so there are no `if (layers.x)`
        // branches here.
        aArrow.set({ from: [0, 0, 0], to: a });
        bArrow.set({ from: [0, 0, 0], to: b });

        const style = s.params.sumStyle as string;
        sArrow.set(style === 'tip' ? { from: a, to: add(a, b) } : { from: [0, 0, 0], to: add(a, b) });

        const proj = scale(b, dot(a, b) / dot(b, b));
        shadow.set({ from: [0, 0, 0], to: proj });

        const x = cross(a, b);
        xArrow.set({ from: [0, 0, 0], to: x });
        patch.set({ points: [[0, 0, 0], a, add(a, b), b] });
        angle.set({ from: a, to: b, radius: 1.2 });
      },

      scalars(s) {
        const a = s.params.a as [number, number, number];
        const b = s.params.b as [number, number, number];
        return {
          dot: dot(a, b),
          theta: (Math.acos(dot(a, b) / (norm(a) * norm(b))) * 180) / Math.PI,
          xmag: norm(cross(a, b)),
        };
      },

      dispose() {
        [aArrow, bArrow, sArrow, shadow, xArrow, patch, angle].forEach((h) => h.dispose());
      },
    };
  },
};

export default module;
