// A puck moves in a straight line at constant velocity in the lab frame
// — no real force acts on it at all, frictionless and force-free — while
// a platform spins at a constant angular velocity omega about the axis
// perpendicular to the page. Two mutually-exclusive panels share this one
// closed-form scenario (ARCHITECTURE.md §2 — a rigid rotation at constant
// omega is exactly evaluable at any t, no `kernel/ode` needed):
// "Lab frame" draws the platform's own reference mark visibly orbiting
// and the puck tracing a straight line; "Rotating frame" redraws the
// SAME puck motion in the co-rotating observer's own coordinates (a
// fixed 2D rotation by -omega*t) and adds the Coriolis/centrifugal
// acceleration terms that kernel/frames' M1-6 `transformAcceleration`
// exposes as separately-retrievable components — this is the module that
// API was built for (ARCHITECTURE.md §7/§20). Because the puck feels no
// real force, its lab-frame acceleration is exactly zero at every
// instant, so the rotating observer's own "relative" acceleration must
// exactly cancel the Coriolis + centrifugal terms; the three arrows in
// that panel are drawn tip-to-tail so the loop visibly closes back on
// the puck, and `residual` in the readout table (and a golden test in
// module.test.ts) checks that sum is ~0 to machine precision.
// `timeModel: 'parametric'`: r(t) is a pure closed-form function of t.
//
// Every glyph stays on the canonical z=0 plane, viewed face-on under the
// default locked "2D-only" +z camera (X-17 in TASKS.md — off-plane
// `surface`/`patch` geometry fails to render there; not applicable to the
// `body`/`point`/`arrow`/`path` glyphs used here, but kept in-plane
// anyway). The platform disc is drawn flat via a FIXED one-time
// orientation (its local cylinder axis rotated onto world +Z) and never
// reoriented in update() — spin is shown instead by an orbiting reference
// mark fixed to the platform, which is far simpler than animating the
// (rotationally symmetric, so visually unchanged anyway) disc mesh's own
// quaternion every frame. This module has no notion of gravitational
// "vertical" — the rotation axis is the screen-perpendicular world Z
// axis, not `ctx.up` — so `ctx.up` is not read (PHYSICS_CONVENTIONS.md: a
// module with no notion of vertical ignores it entirely), same as
// vector-algebra/momentum-collisions.
//
// The world<->rotating-frame position/velocity math below is written
// directly against kernel/math rather than through a shared "moving
// group" scene-layer helper. TASKS.md's M7-3 note floated generalizing
// momentum-collisions' 1D CM-frame recenter (`frameOffset`/
// `velCorrection`) into a reusable src/scene-level helper; investigating
// it here found no such mechanism is actually usable from a module
// today — `ctx.frame()` is a *visible* coordinate-triad glyph (it always
// draws RGB axis lines) that only nests other frame glyphs via its own
// `parent` prop, not a generic invisible parent group that an
// arrow/point/body glyph could attach under, and a module cannot create
// its own three.js Group to fill that role (no `three` import, §6).
// Building that capability would be a real Layer 1 addition, not a small
// refactor — per ADR-3's own precedent ("share capability downward only
// once a concrete duplication case is demonstrated") this module
// generalizes the *pattern* (a rotation applied to a world position and
// velocity before drawing) without inventing a new shared abstraction. A
// real transform-aware `ctx.group()` is worth building if a third module
// ends up needing the same thing.
import type { PhysicsModule, ModuleState } from '../types';
import type { SceneContext } from '@/scene/SceneContext';
import { fromAxisAngle } from '@/kernel/math';
import type { Quat } from '@/kernel/math';
import { transformAcceleration } from '@/kernel/frames';
import type { Frame } from '@/kernel/frames';
import manifest from './manifest';
import { params, layers, scalars } from './params';

type V2 = [number, number];
type V3 = [number, number, number];

const IDENTITY_QUAT: [number, number, number, number] = [0, 0, 0, 1];

const PLATFORM_RADIUS = 2.6;
// The puck freezes once it first leaves this radius — like
// projectile-motion resting at touchdown — so an unbounded straight line
// doesn't run off the visible scene over the shell's 20s scrub range.
const EXIT_RADIUS = 3.4;
const MARK_RADIUS = 1.8; // orbit radius of the reference mark painted on the platform
const VEL_ARROW_SCALE = 0.6; // world units per unit velocity
const ACC_ARROW_SCALE = 0.25; // world units per unit acceleration — accelerations run much larger than velocities here
const TRACE_SAMPLES = 64;
const EPS = 1e-9;

// The `disc` glyph's own local axis of rotational symmetry is its
// geometry's Y axis (CylinderGeometry) — rotate that onto world +Z once
// so the flat face reads as a circle under the locked +z view, instead
// of edge-on as a line. Fixed for the glyph's lifetime; never touched in
// update().
function mutQ(q: Quat): [number, number, number, number] {
  return [q[0], q[1], q[2], q[3]];
}
const DISC_ORIENTATION = mutQ(fromAxisAngle([1, 0, 0], Math.PI / 2));
// CylinderGeometry(0.5, 0.5, 0.05, 32): local radius 0.5 (a unit
// diameter), so `scale`'s X/Z components are a DIAMETER multiplier — see
// the M7-2 QA checkpoint's sphere-radius bug in TASKS.md for the same
// gotcha on `body`'s `'sphere'` kind.
const DISC_SCALE: V3 = [PLATFORM_RADIUS * 2, 1, PLATFORM_RADIUS * 2];
const MARK_POS_ROT: V3 = [MARK_RADIUS, 0, 0]; // fixed forever — by construction, the frame's own mark never moves in its own view

function toWorld(x: number, y: number): V3 {
  return [x, y, 0];
}

/**
 * Time the straight-line puck first LEAVES radius R, given it starts
 * inside it (Infinity if it never does). If it starts already at or
 * beyond R (`x0`/`y0`'s param range can reach that — e.g. x0=3, y0=3 puts
 * the default-radius start point past EXIT_RADIUS), returns 0 rather
 * than solving the quadratic at all: a puck starting outside the visible
 * area should freeze immediately, not wait for whatever future instant
 * it happens to re-cross the boundary while moving through the middle.
 * (An earlier version solved the quadratic unconditionally and returned
 * the smaller root any time the puck started outside and later curved
 * back in — freezing it at the moment it first entered instead of the
 * moment it truly left, which reads as the puck teleporting to the rim
 * and stopping forever instead of visibly crossing the interior.)
 */
function exitTime(x0: number, y0: number, vx: number, vy: number, radius: number): number {
  const c = x0 * x0 + y0 * y0 - radius * radius;
  if (c >= 0) return 0; // already at or beyond the visible boundary
  const a = vx * vx + vy * vy;
  if (a < EPS) return Infinity; // effectively at rest: never reaches the boundary
  const b = 2 * (x0 * vx + y0 * vy);
  // c < 0 guarantees a real, positive root here: the product of the two
  // roots is c/a < 0, so they have opposite sign and the discriminant is
  // automatically non-negative — no `disc < 0` guard needed.
  const disc = b * b - 4 * a * c;
  const sq = Math.sqrt(Math.max(0, disc));
  return Math.max((-b - sq) / (2 * a), (-b + sq) / (2 * a));
}

interface LabKinematics {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Lab-frame (world) position/velocity of the force-free puck at time t — closed form, constant velocity. */
function labKinematics(
  t: number,
  x0: number,
  y0: number,
  speed: number,
  angle: number,
): LabKinematics {
  const vx = speed * Math.cos(angle);
  const vy = speed * Math.sin(angle);
  return { x: x0 + vx * t, y: y0 + vy * t, vx, vy };
}

/**
 * Position and velocity as measured by an observer co-rotating with the
 * platform at `omega`, given the lab-frame values — the inverse of
 * kernel/frames' local -> world transform (M1-5/M1-6 only go that
 * direction, since a module drawing a *known* local motion in world
 * space is the more common case; here the KNOWN quantity is instead the
 * world description, so the rotation is applied in reverse):
 * `r_rel = R(-theta) r_lab`, and differentiating that relation gives
 * `v_rel = R(-theta) v_lab - omega x r_rel`.
 */
function rotatingKinematics(
  omega: number,
  theta: number,
  labX: number,
  labY: number,
  labVx: number,
  labVy: number,
): LabKinematics {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const x = c * labX + s * labY;
  const y = -s * labX + c * labY;
  const rotatedVx = c * labVx + s * labVy;
  const rotatedVy = -s * labVx + c * labVy;
  // omega x r_rel, omega = (0,0,omega), r_rel = (x,y,0) -> (-omega*y, omega*x, 0)
  const vx = rotatedVx + omega * y;
  const vy = rotatedVy - omega * x;
  return { x, y, vx, vy };
}

interface FictitiousTerms {
  relative: V2;
  coriolis: V2;
  centrifugal: V2;
  residual: number; // |relative + coriolis + centrifugal + euler| — should be ~0
}

/**
 * Consumes kernel/frames' `transformAcceleration` (M1-6) to recover the
 * separately-retrievable Coriolis/centrifugal/Euler terms, then the
 * "relative" acceleration the rotating observer must attribute to the
 * puck to explain its motion. The puck feels no real force, so the true
 * (lab-frame) total acceleration is exactly zero; `relative` is whatever
 * exactly cancels the other three. Calling the function twice — once
 * with a zero relative-acceleration guess just to read off the three
 * kinematic terms, once more with the real relative term plugged in — is
 * the direct way to use kernel/frames' own math for both steps, rather
 * than re-deriving the cross products by hand a second time in this
 * module. `frame.orientation` is identity here: `transformAcceleration`
 * rotates every term from the frame's local basis into "world" via
 * `frame.orientation`, and this module already works entirely in the
 * frame's own (rotating) local basis (see `rotatingKinematics` above),
 * so identity makes its "world" output exactly that local basis,
 * unrotated a second time.
 */
function fictitiousTermsAt(omega: number, rRel: V2, vRel: V2): FictitiousTerms {
  const frame: Frame = {
    origin: [0, 0, 0],
    orientation: IDENTITY_QUAT,
    omega: [0, 0, omega],
    omegaDot: [0, 0, 0], // omega held constant — the Euler term is identically zero
  };
  const r3: V3 = [rRel[0], rRel[1], 0];
  const v3: V3 = [vRel[0], vRel[1], 0];
  const kinematic = transformAcceleration(frame, r3, v3, [0, 0, 0]);
  const relative3: V3 = [-kinematic.total[0], -kinematic.total[1], -kinematic.total[2]];
  const terms = transformAcceleration(frame, r3, v3, relative3);
  return {
    relative: [terms.relative[0], terms.relative[1]],
    coriolis: [terms.coriolis[0], terms.coriolis[1]],
    centrifugal: [terms.centrifugal[0], terms.centrifugal[1]],
    residual: Math.hypot(terms.total[0], terms.total[1], terms.total[2]),
  };
}

/** Shared by update() and scalars() — see the duplication note at the bottom of update(). */
function sceneAt(state: ModuleState) {
  const omega = state.params.omega as number;
  const speed = state.params.speed as number;
  const launchAngle = state.params.launchAngle as number;
  const x0 = state.params.x0 as number;
  const y0 = state.params.y0 as number;

  const vx0 = speed * Math.cos(launchAngle);
  const vy0 = speed * Math.sin(launchAngle);
  const tExit = exitTime(x0, y0, vx0, vy0, EXIT_RADIUS);
  const t = Math.min(Math.max(state.t, 0), tExit);

  const lab = labKinematics(t, x0, y0, speed, launchAngle);
  const theta = omega * t;
  const rot = rotatingKinematics(omega, theta, lab.x, lab.y, lab.vx, lab.vy);
  const terms = fictitiousTermsAt(omega, [rot.x, rot.y], [rot.vx, rot.vy]);

  return { omega, x0, y0, speed, launchAngle, t, theta, lab, rot, terms };
}

const module: PhysicsModule = {
  manifest,
  params,
  layers,
  scalars,

  defaultView: { preset: '+z', projection: 'ortho' },

  create(ctx: SceneContext) {
    const gLab = ctx.group('labFrame');
    const gRot = ctx.group('rotFrame');

    // --- Lab-frame panel ---
    const discLab = ctx.body({
      group: gLab,
      kind: 'disc',
      position: [0, 0, 0],
      orientation: DISC_ORIENTATION,
      scale: DISC_SCALE,
      color: ctx.palette.construction,
    });
    const markArrowLab = ctx.arrow({
      group: gLab,
      color: ctx.palette.construction,
      from: [0, 0, 0],
      to: [MARK_RADIUS, 0, 0],
    });
    const markDotLab = ctx.point({
      group: gLab,
      color: ctx.palette.construction,
      position: [MARK_RADIUS, 0, 0],
      sizePx: 6,
    });
    const puckLab = ctx.point({
      group: gLab,
      color: ctx.palette.position,
      position: [0, 0, 0],
      sizePx: 10,
    });
    const puckLabelLab = ctx.label({ latex: '\\vec{r}(t)', anchor: [0, 0, 0], offset: [0, -20] });
    const velArrowLab = ctx.arrow({
      group: gLab,
      color: ctx.palette.velocity,
      label: '\\vec{v}',
      from: [0, 0, 0],
      to: [0, 0, 0],
    });
    const traceLab = ctx.path({ group: gLab, color: ctx.palette.position, points: [[0, 0, 0]] });

    // --- Rotating-frame panel ---
    // The platform disc and its reference mark are drawn identically to
    // the lab panel EXCEPT the mark never moves (MARK_POS_ROT is a
    // constant) — visibly demonstrating that this observer perceives the
    // platform, and the mark painted on it, as stationary.
    const discRot = ctx.body({
      group: gRot,
      kind: 'disc',
      position: [0, 0, 0],
      orientation: DISC_ORIENTATION,
      scale: DISC_SCALE,
      color: ctx.palette.construction,
    });
    const markArrowRot = ctx.arrow({
      group: gRot,
      color: ctx.palette.construction,
      from: [0, 0, 0],
      to: MARK_POS_ROT,
    });
    const markDotRot = ctx.point({
      group: gRot,
      color: ctx.palette.construction,
      position: MARK_POS_ROT,
      sizePx: 6,
    });
    const puckRot = ctx.point({
      group: gRot,
      color: ctx.palette.position,
      position: [0, 0, 0],
      sizePx: 10,
    });
    const puckLabelRot = ctx.label({
      latex: "\\vec{r}\\,'(t)",
      anchor: [0, 0, 0],
      offset: [0, -20],
    });
    const velArrowRot = ctx.arrow({
      group: gRot,
      color: ctx.palette.velocity,
      label: "\\vec{v}\\,'",
      from: [0, 0, 0],
      to: [0, 0, 0],
    });
    const traceRot = ctx.path({ group: gRot, color: ctx.palette.position, points: [[0, 0, 0]] });
    // Drawn tip-to-tail (centrifugal, then coriolis from its tip, then
    // relative closing the loop back to the puck) so the closed triangle
    // is itself the proof that the three terms sum to zero.
    const centrifugalArrow = ctx.arrow({
      group: gRot,
      color: ctx.palette.accel,
      label: '\\vec{a}_{cf}',
      from: [0, 0, 0],
      to: [0, 0, 0],
    });
    const coriolisArrow = ctx.arrow({
      group: gRot,
      color: ctx.palette.accel,
      label: '\\vec{a}_{Cor}',
      from: [0, 0, 0],
      to: [0, 0, 0],
    });
    const relativeArrow = ctx.arrow({
      group: gRot,
      color: ctx.palette.accel,
      label: "\\vec{a}\\,'",
      dashed: true,
      from: [0, 0, 0],
      to: [0, 0, 0],
    });

    return {
      update(state: ModuleState) {
        const labOn = state.layers.labFrame ?? true;
        const rotOn = state.layers.rotFrame ?? false;
        const traceOn = state.layers.trace ?? true;

        const { x0, y0, speed, launchAngle, omega, t, theta, lab, rot, terms } = sceneAt(state);

        // Lab panel — the disc and its mark's fixed geometry were set
        // once at create(); only the mark's ORBIT position and the
        // puck's own motion change per frame.
        discLab.visible(labOn);
        const markPosLab = toWorld(MARK_RADIUS * Math.cos(theta), MARK_RADIUS * Math.sin(theta));
        markArrowLab.set({ to: markPosLab });
        markArrowLab.visible(labOn);
        markDotLab.set({ position: markPosLab });
        markDotLab.visible(labOn);

        const puckPosLab = toWorld(lab.x, lab.y);
        puckLab.set({ position: puckPosLab });
        puckLab.visible(labOn);
        puckLabelLab.set({ anchor: puckPosLab });
        puckLabelLab.visible(labOn);
        velArrowLab.set({
          from: puckPosLab,
          to: toWorld(lab.x + lab.vx * VEL_ARROW_SCALE, lab.y + lab.vy * VEL_ARROW_SCALE),
        });
        velArrowLab.visible(labOn);
        traceLab.visible(labOn && traceOn);
        if (labOn && traceOn) {
          traceLab.set({ points: [toWorld(x0, y0), puckPosLab] });
        }

        // Rotating panel — the disc and its mark never move at all
        // (fixed props from create()); only visibility changes.
        discRot.visible(rotOn);
        markArrowRot.visible(rotOn);
        markDotRot.visible(rotOn);

        const puckPosRot = toWorld(rot.x, rot.y);
        puckRot.set({ position: puckPosRot });
        puckRot.visible(rotOn);
        puckLabelRot.set({ anchor: puckPosRot });
        puckLabelRot.visible(rotOn);
        velArrowRot.set({
          from: puckPosRot,
          to: toWorld(rot.x + rot.vx * VEL_ARROW_SCALE, rot.y + rot.vy * VEL_ARROW_SCALE),
        });
        velArrowRot.visible(rotOn);

        traceRot.visible(rotOn && traceOn);
        if (rotOn && traceOn) {
          const points: V3[] = [];
          for (let i = 0; i <= TRACE_SAMPLES; i++) {
            const ti = (t * i) / TRACE_SAMPLES;
            const li = labKinematics(ti, x0, y0, speed, launchAngle);
            const ri = rotatingKinematics(omega, omega * ti, li.x, li.y, li.vx, li.vy);
            points.push(toWorld(ri.x, ri.y));
          }
          traceRot.set({ points });
        }

        const cfTip = toWorld(
          rot.x + terms.centrifugal[0] * ACC_ARROW_SCALE,
          rot.y + terms.centrifugal[1] * ACC_ARROW_SCALE,
        );
        centrifugalArrow.set({ from: puckPosRot, to: cfTip });
        centrifugalArrow.visible(rotOn);
        const corTip = toWorld(
          cfTip[0] + terms.coriolis[0] * ACC_ARROW_SCALE,
          cfTip[1] + terms.coriolis[1] * ACC_ARROW_SCALE,
        );
        coriolisArrow.set({ from: cfTip, to: corTip });
        coriolisArrow.visible(rotOn);
        relativeArrow.set({ from: corTip, to: puckPosRot });
        relativeArrow.visible(rotOn);
      },

      // Duplicates sceneAt()'s math rather than sharing mutable state
      // with update() — scalars() must stay pure (no side effects on the
      // scene) and idempotent on its own, so it recomputes everything
      // from `state` directly, same as momentum-collisions'
      // solveCollision()/kinematicsAt() duplication (TASKS.md's QA
      // checkpoint entry flags this as a maintenance-drift risk shared
      // across modules, not a bug).
      scalars(state: ModuleState) {
        const { lab, rot, terms } = sceneAt(state);
        return {
          rho: Math.hypot(lab.x, lab.y),
          speedRel: Math.hypot(rot.vx, rot.vy),
          aCoriolis: Math.hypot(terms.coriolis[0], terms.coriolis[1]),
          aCentrifugal: Math.hypot(terms.centrifugal[0], terms.centrifugal[1]),
          aRelative: Math.hypot(terms.relative[0], terms.relative[1]),
          residual: terms.residual,
        };
      },

      dispose() {
        discLab.dispose();
        markArrowLab.dispose();
        markDotLab.dispose();
        puckLab.dispose();
        puckLabelLab.dispose();
        velArrowLab.dispose();
        traceLab.dispose();
        discRot.dispose();
        markArrowRot.dispose();
        markDotRot.dispose();
        puckRot.dispose();
        puckLabelRot.dispose();
        velArrowRot.dispose();
        traceRot.dispose();
        centrifugalArrow.dispose();
        coriolisArrow.dispose();
        relativeArrow.dispose();
      },
    };
  },
};

export default module;
