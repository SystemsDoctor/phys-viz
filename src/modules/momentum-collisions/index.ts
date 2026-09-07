// Two carts on a frictionless 1D track collide once, head-on. Each
// cart moves at constant velocity before the collision and a different
// constant velocity after — both are closed-form linear functions of
// t, so `timeModel: 'parametric'` needs no integration (ARCHITECTURE.md
// §2, §12) and there is exactly one collision event, never a repeating
// or multi-body cascade (out of scope for this module — see §2's
// "closed form over solver" doctrine).
//
// The collision itself is the general 1D restitution formula (momentum
// conservation + `v2' - v1' = e (u1 - u2)`), not an elastic-only special
// case — `e` sweeps from 0 (perfectly inelastic, carts stick and share
// one velocity) to 1 (perfectly elastic, kinetic energy conserved).
// Momentum is conserved identically for every e by construction — see
// the cancellation noted at `solveCollision` below — which is also why
// the center of mass moves at one constant velocity `vcm` for ALL t,
// with no kink at the collision instant: `xcmAt(t)` is a single linear
// formula, never branched on `tCollision`. The "view in CM frame"
// toggle exploits exactly this: it makes that constant-velocity claim
// visible by recentering the whole scene on it, so the CM marker (and,
// in that frame, its velocity arrow) visibly stops moving regardless of
// what the two carts do.
//
// Every glyph stays on the canonical x/up plane (y = z = 0 in world
// space) — see X-17 in TASKS.md (a locked "2D-only" orthographic view
// issue with off-plane `surface`/`patch` geometry); not applicable to
// the `body`/`point`/`arrow` glyphs used here, but kept in-plane anyway
// since this module has no notion of a third dimension to draw in.
import type { PhysicsModule, ModuleState } from '../types';
import type { SceneContext } from '@/scene/SceneContext';
import manifest from './manifest';
import { params, layers, scalars } from './params';

type V3 = [number, number, number];

// Fixed initial layout (world units, schematic — not tied to any
// declared length param): cart 1 starts left of cart 2, closing speed
// and masses are the only free parameters that affect the dynamics.
const X1_0 = -3;
const X2_0 = 3;
const BALL_RADIUS_BASE = 0.35; // radius when mass = 1
const ARROW_SCALE = 0.4; // world units per unit velocity, for both carts and the CM
const EPS = 1e-9;

function radiusOf(mass: number): number {
  return BALL_RADIUS_BASE * Math.cbrt(mass);
}

/**
 * `body`'s `'sphere'` kind is built on `THREE.SphereGeometry(0.5, ...)`
 * (`src/scene/glyphs/body.ts`) — a unit-diameter sphere, so `scale` is a
 * DIAMETER multiplier, not a radius multiplier like it is for `'box'`
 * (built on a unit cube). Passing a radius directly as `scale` renders
 * a sphere at half the intended world radius.
 */
function sphereScaleFor(radius: number): [number, number, number] {
  const diameter = 2 * radius;
  return [diameter, diameter, diameter];
}

interface CollisionSolution {
  tCollision: number; // Infinity if the carts never meet (u1 <= u2)
  v1After: number;
  v2After: number;
  x1AtCollision: number;
  x2AtCollision: number;
}

/**
 * Closed-form 1D collision with restitution `e`:
 * momentum conservation `m1 u1 + m2 u2 = m1 v1' + m2 v2'` plus
 * `v2' - v1' = e (u1 - u2)` (separation speed = e × approach speed).
 * `e = 1` reduces to the standard elastic formulae; `e = 0` gives
 * `v1' = v2' = vcm` (the carts stick together).
 *
 * `m1 v1After + m2 v2After` always equals `m1 u1 + m2 u2` exactly — the
 * `(1+e) m1 m2 approachSpeed / totalMass` term cancels between the two
 * — which is the algebraic reason total momentum (and the center-of-mass
 * velocity) never depends on `e`.
 */
function solveCollision(
  m1: number,
  m2: number,
  u1: number,
  u2: number,
  e: number,
): CollisionSolution {
  const approachSpeed = u1 - u2; // positive => cart 1 closing on cart 2
  const totalMass = m1 + m2;
  const v1After = u1 - ((1 + e) * m2 * approachSpeed) / totalMass;
  const v2After = u2 + ((1 + e) * m1 * approachSpeed) / totalMass;

  const contactSeparation = radiusOf(m1) + radiusOf(m2);
  const initialSeparation = X2_0 - X1_0;
  const tCollision =
    approachSpeed > EPS ? (initialSeparation - contactSeparation) / approachSpeed : Infinity;

  // Only meaningful when tCollision is finite; guarded so a non-finite
  // tCollision (the "never collide" case) can't produce 0 * Infinity.
  const tAtContact = Number.isFinite(tCollision) ? tCollision : 0;
  return {
    tCollision,
    v1After,
    v2After,
    x1AtCollision: X1_0 + u1 * tAtContact,
    x2AtCollision: X2_0 + u2 * tAtContact,
  };
}

/** Position and velocity of one cart at time t, given its pre/post-collision motion. */
function kinematicsAt(
  t: number,
  x0: number,
  uBefore: number,
  vAfter: number,
  xAtCollision: number,
  tCollision: number,
): { x: number; v: number } {
  if (t < tCollision) return { x: x0 + uBefore * t, v: uBefore };
  return { x: xAtCollision + vAfter * (t - tCollision), v: vAfter };
}

/** Center-of-mass velocity — constant, independent of e and of t. */
function cmVelocity(m1: number, m2: number, u1: number, u2: number): number {
  return (m1 * u1 + m2 * u2) / (m1 + m2);
}

/** Center-of-mass position at time t — one linear formula, no branch at the collision. */
function cmPositionAt(m1: number, m2: number, u1: number, u2: number, t: number): number {
  const xcm0 = (m1 * X1_0 + m2 * X2_0) / (m1 + m2);
  return xcm0 + cmVelocity(m1, m2, u1, u2) * t;
}

const module: PhysicsModule = {
  manifest,
  params,
  layers,
  scalars,

  defaultView: { preset: '+z', projection: 'ortho' },

  create(ctx: SceneContext) {
    // No notion of gravitational "vertical" — motion is purely along
    // one horizontal axis, so ctx.up is not read (PHYSICS_CONVENTIONS.md:
    // a module with no notion of vertical ignores it entirely, same as
    // vector-algebra/fields-gradients).
    const X_HAT: V3 = [1, 0, 0];
    const toWorld = (x: number): V3 => [X_HAT[0] * x, X_HAT[1] * x, X_HAT[2] * x];

    const gCarts = ctx.group('carts');
    const gCm = ctx.group('cm');

    // Both carts share the same "position marker" colour (ctx.palette.
    // position) rather than two arbitrarily different colours — they
    // are two instances of the same quantity kind, distinguished by
    // radius (mass) and label, not colour, per PHYSICS_CONVENTIONS.md
    // ("the same quantity gets the same colour in every module").
    const cart1 = ctx.body({
      group: gCarts,
      kind: 'sphere',
      position: [0, 0, 0],
      color: ctx.palette.position,
    });
    const cart2 = ctx.body({
      group: gCarts,
      kind: 'sphere',
      position: [0, 0, 0],
      color: ctx.palette.position,
    });
    const label1 = ctx.label({ latex: 'm_1', anchor: [0, 0, 0], offset: [0, -26] });
    const label2 = ctx.label({ latex: 'm_2', anchor: [0, 0, 0], offset: [0, -26] });
    const v1Arrow = ctx.arrow({
      group: gCarts,
      color: ctx.palette.velocity,
      label: '\\vec{v}_1',
      from: [0, 0, 0],
      to: [0, 0, 0],
    });
    const v2Arrow = ctx.arrow({
      group: gCarts,
      color: ctx.palette.velocity,
      label: '\\vec{v}_2',
      from: [0, 0, 0],
      to: [0, 0, 0],
    });

    const cmMarker = ctx.point({
      group: gCm,
      color: ctx.palette.construction,
      position: [0, 0, 0],
      sizePx: 7,
    });
    const cmLabel = ctx.label({ latex: 'x_{cm}', anchor: [0, 0, 0], offset: [0, 20] });
    const cmArrow = ctx.arrow({
      group: gCm,
      color: ctx.palette.velocity,
      dashed: true,
      label: '\\vec{v}_{cm}',
      from: [0, 0, 0],
      to: [0, 0, 0],
    });

    return {
      update(state: ModuleState) {
        const m1 = state.params.m1 as number;
        const m2 = state.params.m2 as number;
        const u1 = state.params.u1 as number;
        const u2 = state.params.u2 as number;
        const e = state.params.e as number;
        const cmFrame = state.params.cmFrame as boolean;
        const cartsOn = state.layers.carts ?? true;
        const cmOn = state.layers.cm ?? true;

        const solution = solveCollision(m1, m2, u1, u2, e);
        const k1 = kinematicsAt(
          state.t,
          X1_0,
          u1,
          solution.v1After,
          solution.x1AtCollision,
          solution.tCollision,
        );
        const k2 = kinematicsAt(
          state.t,
          X2_0,
          u2,
          solution.v2After,
          solution.x2AtCollision,
          solution.tCollision,
        );
        const vcm = cmVelocity(m1, m2, u1, u2);
        const xcm = cmPositionAt(m1, m2, u1, u2, state.t);

        // In the CM frame, position is measured relative to the (moving)
        // center of mass, and velocity is measured relative to its
        // (constant) velocity — two different corrections, not one:
        // subtracting a t-dependent position offset alone would leave
        // every arrow's length (a velocity, i.e. a rate of change of
        // position) unchanged, which is wrong.
        const frameOffset = cmFrame ? xcm : 0;
        const velCorrection = cmFrame ? vcm : 0;

        const x1 = k1.x - frameOffset;
        const x2 = k2.x - frameOffset;
        const xcmDrawn = xcm - frameOffset;
        const v1 = k1.v - velCorrection;
        const v2 = k2.v - velCorrection;
        const vcmDrawn = vcm - velCorrection;

        const r1 = radiusOf(m1);
        const r2 = radiusOf(m2);
        const pos1: V3 = toWorld(x1);
        const pos2: V3 = toWorld(x2);
        const posCm: V3 = toWorld(xcmDrawn);

        cart1.set({ position: pos1, scale: sphereScaleFor(r1) });
        cart1.visible(cartsOn);
        cart2.set({ position: pos2, scale: sphereScaleFor(r2) });
        cart2.visible(cartsOn);
        label1.set({ anchor: pos1 });
        label1.visible(cartsOn);
        label2.set({ anchor: pos2 });
        label2.visible(cartsOn);

        v1Arrow.set({ from: pos1, to: toWorld(x1 + v1 * ARROW_SCALE) });
        v1Arrow.visible(cartsOn);
        v2Arrow.set({ from: pos2, to: toWorld(x2 + v2 * ARROW_SCALE) });
        v2Arrow.visible(cartsOn);

        cmMarker.set({ position: posCm });
        cmMarker.visible(cmOn);
        cmLabel.set({ anchor: posCm });
        cmLabel.visible(cmOn);
        cmArrow.set({ from: posCm, to: toWorld(xcmDrawn + vcmDrawn * ARROW_SCALE) });
        cmArrow.visible(cmOn);
      },

      scalars(state: ModuleState) {
        const m1 = state.params.m1 as number;
        const m2 = state.params.m2 as number;
        const u1 = state.params.u1 as number;
        const u2 = state.params.u2 as number;
        const e = state.params.e as number;

        // Readouts always report the lab frame, regardless of the
        // "view in CM frame" toggle — that toggle only recenters the
        // picture; it is not a second physical scenario.
        const solution = solveCollision(m1, m2, u1, u2, e);
        const v1 = kinematicsAt(
          state.t,
          X1_0,
          u1,
          solution.v1After,
          solution.x1AtCollision,
          solution.tCollision,
        ).v;
        const v2 = kinematicsAt(
          state.t,
          X2_0,
          u2,
          solution.v2After,
          solution.x2AtCollision,
          solution.tCollision,
        ).v;

        const p1 = m1 * v1;
        const p2 = m2 * v2;

        return {
          v1,
          v2,
          p1,
          p2,
          pTotal: p1 + p2,
          KE: 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2,
          vcm: cmVelocity(m1, m2, u1, u2),
        };
      },

      dispose() {
        cart1.dispose();
        cart2.dispose();
        label1.dispose();
        label2.dispose();
        v1Arrow.dispose();
        v2Arrow.dispose();
        cmMarker.dispose();
        cmLabel.dispose();
        cmArrow.dispose();
      },
    };
  },
};

export default module;
