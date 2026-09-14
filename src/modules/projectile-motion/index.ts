// A point mass launched under gravity, no air resistance, in full 3D.
// `timeModel: 'parametric'` — position is a pure closed-form function of
// t (a straight line plus a `-1/2 g t^2` term along `ctx.up`), so
// update() never integrates anything (ARCHITECTURE.md §2, §12).
//
// The launch velocity can be specified two ways, chosen via a pair of
// mutually-exclusive `LayerDef`s (`angleMode`/`vectorMode`,
// `exclusiveGroup: 'launchMode'` — see params.ts's comment for why a
// layer pair rather than a new `ParamDef` kind): as speed + elevation
// (above horizontal) + azimuth (rotation within the horizontal plane),
// or directly as a velocity vector (both direction and magnitude at
// once). Both reduce to the same thing — a single world-space velocity
// vector `v0` fed into the same closed-form kinematics — so `sceneAt()`
// resolves whichever mode is active into `v0` once, up front.
//
// `startPosition`/`launchVelocity` are literal WORLD x/y/z vectors, not
// values pre-mapped through a `toWorld(horiz, vert)` helper the way
// earlier 2D-only modules in this library do it — `VectorPad` (the
// control every `kind: 'vector'` param renders as) always labels its
// three inputs "x"/"y"/"z" with no per-module override, so a vector
// param whose raw components meant something OTHER than literal world
// x/y/z would silently disagree with its own control's labels. Gravity
// and the elevation/azimuth decomposition still respect `ctx.up`
// (PHYSICS_CONVENTIONS.md) — they just do it via dot/cross products
// against `upVec` rather than a coordinate remap.
import type { PhysicsModule, ModuleState } from '../types';
import type { SceneContext } from '@/scene/SceneContext';
import type { Vec3 } from '@/kernel/math';
import { add, sub, scale, cross, dot, norm } from '@/kernel/math';
import manifest from './manifest';
import { params, layers, scalars } from './params';

type V3 = [number, number, number];

const Y_HAT: Vec3 = [0, 1, 0];
const Z_HAT: Vec3 = [0, 0, 1];
const FORWARD: Vec3 = [1, 0, 0]; // fixed horizontal reference direction — azimuth = 0 points here

// Number of samples used to draw the trace from t=0 to the current t.
// Fixed and small enough to stay cheap every frame; recomputed from
// scratch each update() (never accumulated) so idempotence holds.
const TRACE_SAMPLES = 64;

function mut3(v: Vec3): V3 {
  return [v[0], v[1], v[2]];
}

/** World-space launch velocity from speed/elevation/azimuth, given which axis is up. */
function velocityFromAngles(speed: number, elevation: number, azimuth: number, upVec: Vec3): Vec3 {
  const side = cross(upVec, FORWARD); // horizontal, perpendicular to FORWARD; unit since upVec ⟂ FORWARD
  const horizDir = add(scale(FORWARD, Math.cos(azimuth)), scale(side, Math.sin(azimuth)));
  const dir = add(scale(horizDir, Math.cos(elevation)), scale(upVec, Math.sin(elevation)));
  return scale(dir, speed);
}

/** Closed-form position at time t: straight-line drift plus free fall along `upVec`. */
function positionAt(t: number, r0: Vec3, v0: Vec3, g: number, upVec: Vec3): Vec3 {
  const gravityTerm = scale(upVec, -0.5 * g * t * t);
  return add(add(r0, scale(v0, t)), gravityTerm);
}

/** The component of `v` along `upVec` (a plain number, not a vector). */
function verticalComponent(v: Vec3, upVec: Vec3): number {
  return dot(v, upVec);
}

/** `v` with its `upVec` component removed — i.e. just the horizontal part. */
function horizontalComponent(v: Vec3, upVec: Vec3): Vec3 {
  return sub(v, scale(upVec, dot(v, upVec)));
}

/**
 * Time the projectile first returns to the world's vertical = 0
 * reference plane, given it starts at height `y0` (component of
 * `startPosition` along `upVec`) with vertical velocity `vy0`. Starting
 * below the plane (`y0 < 0`, reachable via `startPosition`'s param
 * range) freezes immediately rather than solving the quadratic — the
 * same "start already past the visible/valid region -> freeze at t=0"
 * choice `non-inertial-frames`' `exitTime()` makes (see that module's
 * X-* history in TASKS.md for why solving the quadratic unconditionally
 * there was a real bug). For `y0 >= 0` this is exactly one non-negative
 * root of `0.5 g t^2 - vy0 t - y0 = 0`; at `y0 = 0` it reduces exactly to
 * the original single-angle module's `2 v0 sinθ / g`.
 */
function timeToGround(y0: number, vy0: number, g: number): number {
  if (y0 < 0) return 0;
  const a = 0.5 * g;
  const b = -vy0;
  const c = -y0; // <= 0, so a real root >= 0 always exists (disc = b^2 - 4ac >= b^2 >= 0)
  const disc = Math.max(0, b * b - 4 * a * c);
  const sq = Math.sqrt(disc);
  return Math.max(0, (-b - sq) / (2 * a), (-b + sq) / (2 * a));
}

/** Resolve the current up-axis vector. `ctx.up` is documented as LIVE
 * (SceneContext.ts: "a later up-axis switch must be visible on the next
 * read") — must be re-read on every update()/scalars() call, never
 * cached once in create(), or a live axis switch (Settings -> Up axis)
 * silently leaves this module's gravity/range/height math on the old
 * axis while the camera reorients out from under it (TASKS.md X-22). */
function upVectorOf(ctx: SceneContext): Vec3 {
  return ctx.up === 'y' ? Y_HAT : Z_HAT;
}

/** World-space launch velocity for whichever mode is active. */
function launchVelocityOf(state: ModuleState, upVec: Vec3): Vec3 {
  if (state.layers.vectorMode ?? false) {
    return state.params.launchVelocity as V3;
  }
  const speed = state.params.speed as number;
  const elevation = state.params.elevation as number;
  const azimuth = state.params.azimuth as number;
  return velocityFromAngles(speed, elevation, azimuth, upVec);
}

function sceneAt(state: ModuleState, upVec: Vec3) {
  const r0 = state.params.startPosition as V3;
  const g = state.params.g as number;
  const v0 = launchVelocityOf(state, upVec);

  const y0 = verticalComponent(r0, upVec);
  const vy0 = verticalComponent(v0, upVec);
  const flight = timeToGround(y0, vy0, g);
  const t = Math.min(Math.max(state.t, 0), flight);
  const pos = positionAt(t, r0, v0, g, upVec);

  return { r0, v0, g, y0, vy0, flight, t, pos };
}

const module: PhysicsModule = {
  manifest,
  params,
  layers,
  scalars,

  defaultView: { preset: '+z', projection: 'ortho' },

  create(ctx: SceneContext) {
    // This module has a notion of "vertical" (gravity), so it reads
    // ctx.up instead of hardcoding +y — see PHYSICS_CONVENTIONS.md,
    // "Which axis is up." `ctx.up` is read fresh via `upVectorOf(ctx)`
    // inside update()/scalars() below, never cached here — see that
    // function's doc comment for why (TASKS.md X-22).
    const gProjectile = ctx.group('projectile');
    const gTrace = ctx.group('trace');

    const body = ctx.point({
      group: gProjectile,
      color: ctx.palette.position,
      position: [0, 0, 0],
      sizePx: 12,
    });
    const tag = ctx.label({ latex: '\\vec{r}(t)', anchor: [0, 0, 0], offset: [0, -18] });
    const velocityArrow = ctx.arrow({
      group: gProjectile,
      color: ctx.palette.velocity,
      label: '\\vec{v}_0',
      from: [0, 0, 0],
      to: [0, 0, 0],
    });

    const trace = ctx.path({
      group: gTrace,
      color: ctx.palette.position,
      points: [[0, 0, 0]],
    });

    // World units per unit velocity for the launch-velocity arrow —
    // fixed so the arrow reads at a legible length across the params'
    // full range without dominating the scene.
    const ARROW_SCALE = 0.5;

    return {
      update(state: ModuleState) {
        const upVec = upVectorOf(ctx);
        const projectileOn = state.layers.projectile ?? true;
        const traceOn = state.layers.trace ?? true;

        const { r0, v0, g, t, pos: posVec } = sceneAt(state, upVec);
        const pos = mut3(posVec);

        body.set({ position: pos });
        body.visible(projectileOn);

        tag.set({ anchor: pos });
        tag.visible(projectileOn);

        velocityArrow.set({ from: mut3(r0), to: mut3(add(r0, scale(v0, ARROW_SCALE))) });
        velocityArrow.visible(projectileOn);

        trace.visible(traceOn);
        if (traceOn) {
          const points: V3[] = [];
          for (let i = 0; i <= TRACE_SAMPLES; i++) {
            const ti = (t * i) / TRACE_SAMPLES;
            points.push(mut3(positionAt(ti, r0, v0, g, upVec)));
          }
          trace.set({ points });
        }
      },

      // Duplicates sceneAt()'s math rather than sharing state with
      // update() — scalars() must stay pure, same pattern as every other
      // parametric module in this library.
      scalars(state: ModuleState) {
        const upVec = upVectorOf(ctx);
        const { v0, g, y0, vy0, flight } = sceneAt(state, upVec);
        const range = norm(horizontalComponent(v0, upVec)) * flight;
        const maxHeight = y0 + (vy0 > 0 ? (vy0 * vy0) / (2 * g) : 0);
        return { timeOfFlight: flight, range, maxHeight };
      },

      dispose() {
        body.dispose();
        tag.dispose();
        velocityArrow.dispose();
        trace.dispose();
      },
    };
  },
};

export default module;
