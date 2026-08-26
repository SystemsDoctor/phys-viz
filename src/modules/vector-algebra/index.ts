/**
 * The flagship module (ARCHITECTURE.md M4, §20). Full scope: sums
 * (head-to-tail / parallelogram), a rotatable-basis component
 * decomposition, dot product with projection shadow, cross product with
 * a right-hand-rule curl and its parallelogram area, scalar triple
 * product as a parallelepiped, and direction cosines.
 *
 * Note what is absent: no React, no three.js, no CSS, no event
 * handlers, no URL code, no plotting, no layer `if` statements, no
 * registry edit, no route registration.
 */
import type { PhysicsModule, ModuleState } from '../types';
import type { SceneContext } from '@/scene/SceneContext';
import {
  cross,
  dot,
  norm,
  scale,
  add,
  normalize,
  fromAxisAngle,
  rotateVec3,
} from '@/kernel/math';
import manifest from './manifest';
import { params, layers, scalars } from './params';

type V3 = readonly [number, number, number];

const ORIGIN: V3 = [0, 0, 0];
const X_AXIS: V3 = [1, 0, 0];
const Y_AXIS: V3 = [0, 1, 0];
const Z_AXIS: V3 = [0, 0, 1];

/** ADR 0008: the 2D restriction just drops the out-of-plane component. */
function effective(v: V3, planar: boolean): V3 {
  return planar ? [v[0], v[1], 0] : v;
}

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
    const gComps = ctx.group('comps');
    const gDircos = ctx.group('dircos');
    const gTriple = ctx.group('triple');

    const aArrow = ctx.arrow({
      group: gA,
      color: ctx.palette.position,
      label: '\\vec{a}',
      from: ORIGIN,
      to: ORIGIN,
    });
    const bArrow = ctx.arrow({
      group: gA,
      color: ctx.palette.velocity,
      label: '\\vec{b}',
      from: ORIGIN,
      to: ORIGIN,
    });
    const cArrow = ctx.arrow({
      group: gTriple,
      color: ctx.palette.field,
      label: '\\vec{c}',
      from: ORIGIN,
      to: ORIGIN,
    });
    const sArrow = ctx.arrow({
      group: gSum,
      color: ctx.palette.energy,
      label: '\\vec{a}+\\vec{b}',
      from: ORIGIN,
      to: ORIGIN,
    });
    const shadow = ctx.arrow({
      group: gProj,
      color: ctx.palette.construction,
      dashed: true,
      from: ORIGIN,
      to: ORIGIN,
    });
    const xArrow = ctx.arrow({
      group: gCross,
      color: ctx.palette.angular,
      doubleHead: true,
      label: '\\vec{a}\\times\\vec{b}',
      from: ORIGIN,
      to: ORIGIN,
    });
    // Right-hand-rule curl: a small arc swept about the cross-product
    // axis, always in the positive (counter-clockwise-from-+axis) sense
    // per ADR 0008 — this IS the right-hand rule, drawn rather than stated.
    const curl = ctx.curvedArrow({
      group: gCross,
      color: ctx.palette.angular,
      center: [0, 0, 0],
      axis: [0, 0, 1],
      radius: 0.6,
      startAngle: 0,
      endAngle: 4.71238898, // 3π/2 — most of a turn, direction is what matters
    });
    const patch = ctx.patch({
      group: gArea,
      color: ctx.palette.angular,
      opacity: 0.18,
      points: [],
    });
    const angle = ctx.arc({
      group: gA,
      color: ctx.palette.construction,
      label: '\\theta',
      from: X_AXIS,
      to: Y_AXIS,
      radius: 1.2,
    });

    // Rotatable-basis component decomposition of a's projection onto the
    // (e1, e2) plane spanned by the basis, oriented by `basisAngle`.
    const basisFrame = ctx.frame({
      group: gComps,
      origin: [0, 0, 0],
      orientation: [0, 0, 0, 1],
      scale: 1.5,
    });
    const comp1 = ctx.arrow({
      group: gComps,
      color: ctx.palette.construction,
      dashed: true,
      from: ORIGIN,
      to: ORIGIN,
    });
    const comp2 = ctx.arrow({
      group: gComps,
      color: ctx.palette.construction,
      dashed: true,
      from: ORIGIN,
      to: ORIGIN,
    });

    // Direction cosines of a: the angle it makes with each Cartesian axis.
    const arcAlpha = ctx.arc({
      group: gDircos,
      color: ctx.palette.position,
      label: '\\alpha',
      from: X_AXIS,
      to: X_AXIS,
      radius: 1.0,
    });
    const arcBeta = ctx.arc({
      group: gDircos,
      color: ctx.palette.position,
      label: '\\beta',
      from: Y_AXIS,
      to: Y_AXIS,
      radius: 1.0,
    });
    const arcGamma = ctx.arc({
      group: gDircos,
      color: ctx.palette.position,
      label: '\\gamma',
      from: Z_AXIS,
      to: Z_AXIS,
      radius: 1.0,
    });

    // Scalar triple product: |a . (b x c)| as the volume of the
    // parallelepiped spanned by a, b, c. Six parallelogram faces, each a
    // `patch` (a single translucent fill per face; no new glyph needed).
    const tripleFaces = Array.from({ length: 6 }, () =>
      ctx.patch({ group: gTriple, color: ctx.palette.construction, opacity: 0.12, points: [] }),
    );

    return {
      update(s: ModuleState) {
        const planar = s.params.planar as boolean;
        const a = effective(s.params.a as V3, planar);
        const b = effective(s.params.b as V3, planar);
        const c = effective(s.params.c as V3, planar);
        const basisAngle = s.params.basisAngle as number;

        // Only set(); never construct. Layer visibility is handled by
        // the shell via the groups, so there are no `if (layers.x)`
        // branches here.
        aArrow.set({ from: ORIGIN, to: a });
        bArrow.set({ from: ORIGIN, to: b });
        cArrow.set({ from: ORIGIN, to: c });

        const style = s.params.sumStyle as string;
        sArrow.set(
          style === 'tip' ? { from: a, to: add(a, b) } : { from: ORIGIN, to: add(a, b) },
        );

        const bLenSq = dot(b, b);
        const proj = bLenSq > 0 ? scale(b, dot(a, b) / bLenSq) : ORIGIN;
        shadow.set({ from: ORIGIN, to: proj });

        const x = cross(a, b);
        xArrow.set({ from: ORIGIN, to: x });
        patch.set({ points: [ORIGIN, a, add(a, b), b] });
        angle.set({ from: a, to: b, radius: 1.2 });

        const xNorm = normalize(x);
        const curlVisible = norm(x) > 1e-9;
        curl.visible(curlVisible);
        if (curlVisible) curl.set({ axis: [xNorm[0], xNorm[1], xNorm[2]] });

        // Component decomposition onto the rotated basis (e1, e2), always
        // in the xy-plane so it composes cleanly regardless of `planar`.
        const q = fromAxisAngle(Z_AXIS, basisAngle);
        const e1 = rotateVec3(q, X_AXIS);
        const e2 = rotateVec3(q, Y_AXIS);
        basisFrame.set({ orientation: [q[0], q[1], q[2], q[3]] });
        const a1 = dot(a, e1);
        const a2 = dot(a, e2);
        const comp1Tip = scale(e1, a1);
        comp1.set({ from: ORIGIN, to: comp1Tip });
        comp2.set({ from: comp1Tip, to: add(comp1Tip, scale(e2, a2)) });

        // Direction cosines: the angle a makes with each Cartesian axis.
        arcAlpha.set({ from: X_AXIS, to: a, radius: 1.0 });
        arcBeta.set({ from: Y_AXIS, to: a, radius: 1.0 });
        arcGamma.set({ from: Z_AXIS, to: a, radius: 1.0 });

        // Parallelepiped: 6 parallelogram faces spanned by a, b, c.
        const ab = add(a, b);
        const ac = add(a, c);
        const bc = add(b, c);
        const abc = add(ab, c);
        const facePoints: V3[][] = [
          [ORIGIN, a, ab, b],
          [c, ac, abc, bc],
          [ORIGIN, a, ac, c],
          [b, ab, abc, bc],
          [ORIGIN, b, bc, c],
          [a, ab, abc, ac],
        ];
        tripleFaces.forEach((face, i) => face.set({ points: facePoints[i] }));
      },

      scalars(s) {
        const planar = s.params.planar as boolean;
        const a = effective(s.params.a as V3, planar);
        const b = effective(s.params.b as V3, planar);
        const c = effective(s.params.c as V3, planar);
        const aNorm = norm(a);
        return {
          dot: dot(a, b),
          theta: (Math.acos(dot(a, b) / (norm(a) * norm(b))) * 180) / Math.PI,
          xmag: norm(cross(a, b)),
          volume: Math.abs(dot(a, cross(b, c))),
          cosAlpha: a[0] / aNorm,
          cosBeta: a[1] / aNorm,
          cosGamma: a[2] / aNorm,
        };
      },

      dispose() {
        [
          aArrow,
          bArrow,
          cArrow,
          sArrow,
          shadow,
          xArrow,
          curl,
          patch,
          angle,
          basisFrame,
          comp1,
          comp2,
          arcAlpha,
          arcBeta,
          arcGamma,
          ...tripleFaces,
        ].forEach((h) => h.dispose());
      },
    };
  },
};

export default module;
