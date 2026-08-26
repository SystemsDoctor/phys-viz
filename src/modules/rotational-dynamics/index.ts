/**
 * rotational-dynamics (ARCHITECTURE.md M5, TASKS.md M5-1/M5-2). Seven
 * layer-gated sub-demonstrations sharing one manifest. `timeModel:
 * 'stepped'` is used ONLY because a torque-free asymmetric top's
 * tumbling (the Dzhanibekov effect) has no closed form — every other
 * panel is a pure function of (params, t) and would prefer `parametric`
 * in isolation, but the contract allows one timeModel per manifest and
 * TASKS.md scopes all seven sub-topics into this one module id. The
 * accepted trade-off: reverse is greyed out for the whole module (§12),
 * even for the six panels that could otherwise support it.
 *
 * Note what is absent: no React, no three.js, no CSS, no event
 * handlers, no URL code, no plotting, no layer `if` statements, no
 * registry edit, no route registration.
 */
import type { PhysicsModule, ModuleState } from '../types';
import type { SceneContext } from '@/scene/SceneContext';
import {
  add,
  sub,
  cross,
  dot,
  scale,
  norm,
  normalize,
  negate,
  fromAxisAngle,
  normalizeQuat,
  identityQuat,
  fromMatrix,
  fromColumns3,
  determinantMat3,
  rotateVec3,
  transformMat3,
  eigenSymmetric3,
} from '@/kernel/math';
import type { Vec3 as V3, Quat } from '@/kernel/math';
import { boxInertia, discInertia, parallelAxis as parallelAxisTensor } from '@/kernel/inertia';
import { eulerRHS, quatDerivative } from '@/kernel/rigidBody';
import { rk4 } from '@/kernel/ode';
import manifest from './manifest';
import { params, layers, scalars } from './params';

const ORIGIN: V3 = [0, 0, 0];
const X_HAT: V3 = [1, 0, 0];
const Y_HAT: V3 = [0, 1, 0];
const G = 9.8; // local gravitational constant for the precession/rolling demos

function mut3(v: V3): [number, number, number] {
  return [v[0], v[1], v[2]];
}
function mutQ(q: Quat): [number, number, number, number] {
  return [q[0], q[1], q[2], q[3]];
}

/** Rotation taking unit vector `from` to unit vector `to` (shortest arc). */
function quatFromTo(from: V3, to: V3): Quat {
  const f = normalize(from);
  const t = normalize(to);
  const d = Math.max(-1, Math.min(1, dot(f, t)));
  if (d > 1 - 1e-9) return identityQuat();
  if (d < -1 + 1e-9) {
    let axis = cross(f, X_HAT);
    if (norm(axis) < 1e-9) axis = cross(f, Y_HAT);
    return fromAxisAngle(normalize(axis), Math.PI);
  }
  return fromAxisAngle(normalize(cross(f, t)), Math.acos(d));
}

const module: PhysicsModule = {
  manifest,
  params,
  layers,
  scalars,

  defaultView: { preset: 'iso', projection: 'persp' },

  create(ctx: SceneContext) {
    const upVec: V3 = ctx.up === 'y' ? Y_HAT : [0, 0, 1];
    const horizAxis: V3 = X_HAT; // perpendicular to both up conventions
    const rollDir: V3 = X_HAT;

    const gTorque = ctx.group('torque');
    const gParallelAxis = ctx.group('parallelAxis');
    const gAngularMomentum = ctx.group('angularMomentum');
    const gInertiaEllipsoid = ctx.group('inertiaEllipsoid');
    const gPrecession = ctx.group('precession');
    const gRolling = ctx.group('rolling');
    const gTumbling = ctx.group('tumbling');

    // ---- Torque: tau = r x F, moment arm, sense arc ----
    const rArrow = ctx.arrow({
      group: gTorque,
      color: ctx.palette.position,
      label: '\\vec{r}',
      from: ORIGIN,
      to: ORIGIN,
    });
    const fArrow = ctx.arrow({
      group: gTorque,
      color: ctx.palette.force,
      label: '\\vec{F}',
      from: ORIGIN,
      to: ORIGIN,
    });
    const tauArrow = ctx.arrow({
      group: gTorque,
      color: ctx.palette.force,
      doubleHead: true,
      label: '\\vec\\tau',
      from: ORIGIN,
      to: ORIGIN,
    });
    const momentArmLine = ctx.dimensionLine({
      group: gTorque,
      from: ORIGIN,
      to: ORIGIN,
      dashed: true,
      label: 'd',
    });
    const torqueSenseArc = ctx.curvedArrow({
      group: gTorque,
      color: ctx.palette.force,
      center: [0, 0, 0],
      axis: [0, 0, 1],
      radius: 0.5,
      startAngle: 0,
      endAngle: 4.71238898,
    });

    // ---- Parallel axis: I_offset = I_cm + m d_perp^2 ----
    const paBox = ctx.body({
      group: gParallelAxis,
      kind: 'box',
      position: [0, 0, 0],
      color: ctx.palette.construction,
    });
    const paCmAxis = ctx.path({
      group: gParallelAxis,
      color: ctx.palette.construction,
      points: [],
    });
    const paOffsetAxis = ctx.path({
      group: gParallelAxis,
      color: ctx.palette.angular,
      points: [],
    });
    const paOffsetArrow = ctx.arrow({
      group: gParallelAxis,
      color: ctx.palette.construction,
      dashed: true,
      label: '\\vec{d}_{cm}',
      from: ORIGIN,
      to: ORIGIN,
    });

    // ---- L vs omega (non-principal axis) ----
    const amBox = ctx.body({
      group: gAngularMomentum,
      kind: 'box',
      position: [0, 0, 0],
      color: ctx.palette.construction,
    });
    const omegaArrow = ctx.arrow({
      group: gAngularMomentum,
      color: ctx.palette.angular,
      doubleHead: true,
      dashed: true,
      label: '\\vec\\omega',
      from: ORIGIN,
      to: ORIGIN,
    });
    const lArrow = ctx.arrow({
      group: gAngularMomentum,
      color: ctx.palette.angular,
      doubleHead: true,
      label: '\\vec{L}',
      from: ORIGIN,
      to: ORIGIN,
    });
    const lOmegaAngleArc = ctx.arc({
      group: gAngularMomentum,
      color: ctx.palette.construction,
      label: '\\theta',
      from: X_HAT,
      to: X_HAT,
      radius: 1.0,
    });

    // ---- Inertia ellipsoid ----
    const ellBox = ctx.body({
      group: gInertiaEllipsoid,
      kind: 'box',
      position: [0, 0, 0],
      color: ctx.palette.construction,
    });
    const principalFrame = ctx.frame({
      group: gInertiaEllipsoid,
      origin: [0, 0, 0],
      orientation: [0, 0, 0, 1],
      scale: 1.2,
    });
    const ellipsoid = ctx.body({
      group: gInertiaEllipsoid,
      kind: 'sphere',
      position: [0, 0, 0],
      color: ctx.palette.angular,
    });

    // ---- Precession & nutation (fast top) ----
    const pivotArm = ctx.path({ group: gPrecession, color: ctx.palette.construction, points: [] });
    const flywheel = ctx.body({
      group: gPrecession,
      kind: 'disc',
      position: [0, 0, 0],
      color: ctx.palette.energy,
    });
    const spinArrow = ctx.arrow({
      group: gPrecession,
      color: ctx.palette.angular,
      doubleHead: true,
      from: ORIGIN,
      to: ORIGIN,
    });
    const precessionArc = ctx.curvedArrow({
      group: gPrecession,
      color: ctx.palette.construction,
      center: [0, 0, 0],
      axis: mut3(upVec),
      radius: 0.5,
      startAngle: 0,
      endAngle: 4.71238898,
    });
    const axisTrace = ctx.path({
      group: gPrecession,
      color: ctx.palette.energy,
      points: [],
      persistence: 200,
    });

    // ---- Rolling: instantaneous axis & cycloid trace ----
    const rollWheel = ctx.body({
      group: gRolling,
      kind: 'disc',
      position: [0, 0, 0],
      orientation: mutQ(quatFromTo(Y_HAT, normalize(cross(upVec, rollDir)))),
      color: ctx.palette.construction,
    });
    const instAxisPoint = ctx.point({
      group: gRolling,
      position: [0, 0, 0],
      color: ctx.palette.force,
      sizePx: 10,
    });
    const cmVelocityArrow = ctx.arrow({
      group: gRolling,
      color: ctx.palette.velocity,
      label: '\\vec{v}',
      from: ORIGIN,
      to: ORIGIN,
    });
    const rimTrace = ctx.path({
      group: gRolling,
      color: ctx.palette.angular,
      points: [],
      persistence: 200,
    });

    // ---- Dzhanibekov effect (tumbling) — the one genuinely stepped panel ----
    const tumblingBox = ctx.body({
      group: gTumbling,
      kind: 'box',
      position: [0, 0, 0],
      color: ctx.palette.construction,
    });
    const tumbleOmegaArrow = ctx.arrow({
      group: gTumbling,
      color: ctx.palette.angular,
      doubleHead: true,
      label: '\\vec\\omega',
      from: ORIGIN,
      to: ORIGIN,
    });
    const tumbleFrame = ctx.frame({
      group: gTumbling,
      origin: [0, 0, 0],
      orientation: [0, 0, 0, 1],
      scale: 1.4,
    });

    // Tumbling state: genuinely path-dependent (Euler's equations for a
    // torque-free asymmetric top have no closed form), so it lives here
    // as closure state advanced only by step()/reset() — exactly what
    // `stepped` exists for. Scratch buffers are hoisted and reused so
    // step()'s own per-call arithmetic allocates no Float64Array.
    let dzQ: Quat = identityQuat();
    let dzOmega: V3 = [0, 0, 0];
    let dzInertiaDiag: V3 = [1, 1, 1];
    const packedScratch = new Float64Array(7);
    const derivScratch = new Float64Array(7);

    function tumbleDeriv(y: Float64Array): Float64Array {
      const q: Quat = [y[0], y[1], y[2], y[3]];
      const omega: V3 = [y[4], y[5], y[6]];
      const dq = quatDerivative(q, omega);
      const domega = eulerRHS(omega, dzInertiaDiag);
      derivScratch[0] = dq[0];
      derivScratch[1] = dq[1];
      derivScratch[2] = dq[2];
      derivScratch[3] = dq[3];
      derivScratch[4] = domega[0];
      derivScratch[5] = domega[1];
      derivScratch[6] = domega[2];
      return derivScratch;
    }

    return {
      update(s: ModuleState) {
        const boxSize = s.params.boxSize as V3;
        const boxMass = s.params.boxMass as number;

        // Torque
        const r = s.params.armVector as V3;
        const F = s.params.forceVector as V3;
        rArrow.set({ from: ORIGIN, to: r });
        fArrow.set({ from: r, to: add(r, F) });
        const tau = cross(r, F);
        tauArrow.set({ from: ORIGIN, to: tau });
        const fNorm = norm(F);
        const foot: V3 = fNorm > 1e-9 ? sub(r, scale(F, dot(r, F) / (fNorm * fNorm))) : ORIGIN;
        momentArmLine.set({ from: ORIGIN, to: foot });
        const tauMag = norm(tau);
        torqueSenseArc.visible(tauMag > 1e-9);
        if (tauMag > 1e-9) torqueSenseArc.set({ axis: mut3(normalize(tau)) });

        // Parallel axis
        const paOffset = s.params.paOffset as V3;
        const axisHalfLen = 3;
        paBox.set({ scale: mut3(boxSize) });
        paCmAxis.set({
          points: [mut3(scale(upVec, -axisHalfLen)), mut3(scale(upVec, axisHalfLen))],
        });
        paOffsetAxis.set({
          points: [
            mut3(add(paOffset, scale(upVec, -axisHalfLen))),
            mut3(add(paOffset, scale(upVec, axisHalfLen))),
          ],
        });
        paOffsetArrow.set({ from: ORIGIN, to: paOffset });

        // L vs omega
        const omega = s.params.omegaVector as V3;
        const boxI = boxInertia(boxMass, boxSize);
        const L = transformMat3(boxI, omega);
        amBox.set({ scale: mut3(boxSize) });
        omegaArrow.set({ from: ORIGIN, to: omega });
        lArrow.set({ from: ORIGIN, to: L });
        lOmegaAngleArc.set({
          from: norm(omega) > 1e-9 ? omega : X_HAT,
          to: norm(L) > 1e-9 ? L : X_HAT,
          radius: 1.0,
        });

        // Inertia ellipsoid
        const eig = eigenSymmetric3(boxI);
        let basis = fromColumns3(eig.vectors[0], eig.vectors[1], eig.vectors[2]);
        if (determinantMat3(basis) < 0)
          basis = fromColumns3(eig.vectors[0], eig.vectors[1], negate(eig.vectors[2]));
        const principalQ = fromMatrix(basis);
        const ELLIPSOID_SCALE = 1.4; // display-only normalization, not physical
        ellBox.set({ scale: mut3(boxSize) });
        principalFrame.set({ orientation: mutQ(principalQ) });
        ellipsoid.set({
          orientation: mutQ(principalQ),
          scale: [
            ELLIPSOID_SCALE / Math.sqrt(eig.values[0]),
            ELLIPSOID_SCALE / Math.sqrt(eig.values[1]),
            ELLIPSOID_SCALE / Math.sqrt(eig.values[2]),
          ],
        });

        // Precession & nutation
        const topSpinRate = s.params.topSpinRate as number;
        const topTiltAngle = s.params.topTiltAngle as number;
        const topArmLength = s.params.topArmLength as number;
        const topRadius = s.params.topRadius as number;
        const topMass = s.params.topMass as number;
        const flywheelI = discInertia(topMass, topRadius);
        const I3 = flywheelI[8]; // axial, unaffected by an axial offset
        const I1 = parallelAxisTensor(flywheelI, topMass, [0, 0, topArmLength])[0];
        const precessionRate = (topMass * G * topArmLength) / (I3 * topSpinRate);
        const nutationOmega = (I3 * topSpinRate) / I1;
        const nutationAmplitude = 0.15 * topTiltAngle; // illustrative, not a literal released-from-rest amplitude
        function topDirectionAt(t: number): V3 {
          const theta = topTiltAngle - nutationAmplitude * (1 - Math.cos(nutationOmega * t));
          const phi = precessionRate * t;
          const tilted = rotateVec3(fromAxisAngle(horizAxis, theta), upVec);
          return rotateVec3(fromAxisAngle(upVec, phi), tilted);
        }
        const topDir = topDirectionAt(s.t);
        const flywheelPos = scale(topDir, topArmLength);
        pivotArm.set({ points: [mut3(ORIGIN), mut3(flywheelPos)] });
        flywheel.set({ position: mut3(flywheelPos), orientation: mutQ(quatFromTo(Y_HAT, topDir)) });
        spinArrow.set({ from: flywheelPos, to: add(flywheelPos, scale(topDir, 0.6)) });
        const precessionRadius = topArmLength * Math.sin(topTiltAngle);
        precessionArc.set({ radius: Math.max(0.05, precessionRadius) });
        const TRACE_POINTS = 60;
        const traceDt = (2 * Math.PI) / Math.abs(precessionRate) / 30;
        const tracePts: [number, number, number][] = [];
        for (let i = TRACE_POINTS - 1; i >= 0; i--) {
          const ti = s.t - i * traceDt;
          if (ti < 0) continue;
          tracePts.push(mut3(scale(topDirectionAt(ti), topArmLength)));
        }
        axisTrace.set({ points: tracePts });

        // Rolling
        const rollRadius = s.params.rollRadius as number;
        const rollOmega = s.params.rollOmega as number;
        const v = rollOmega * rollRadius;
        const center = add(scale(rollDir, v * s.t), scale(upVec, rollRadius));
        rollWheel.set({ position: mut3(center) });
        const contact = sub(center, scale(upVec, rollRadius));
        instAxisPoint.set({ position: mut3(contact) });
        cmVelocityArrow.set({ from: center, to: add(center, scale(rollDir, v)) });
        const ROLL_TRACE_POINTS = 80;
        const rollTraceDt = (2 * Math.PI) / Math.max(rollOmega, 1e-6) / 20;
        const rollPts: [number, number, number][] = [];
        for (let i = ROLL_TRACE_POINTS - 1; i >= 0; i--) {
          const ti = s.t - i * rollTraceDt;
          if (ti < 0) continue;
          const c = add(scale(rollDir, v * ti), scale(upVec, rollRadius));
          const rim = add(
            c,
            add(
              scale(rollDir, rollRadius * Math.sin(rollOmega * ti)),
              scale(upVec, -rollRadius * Math.cos(rollOmega * ti)),
            ),
          );
          rollPts.push(mut3(rim));
        }
        rimTrace.set({ points: rollPts });

        // Dzhanibekov tumbling (reads closure state set by step()/reset())
        tumblingBox.set({ orientation: mutQ(dzQ), scale: mut3(boxSize) });
        const omegaWorld = rotateVec3(dzQ, dzOmega);
        tumbleOmegaArrow.set({ from: ORIGIN, to: omegaWorld });
        tumbleFrame.set({ orientation: mutQ(dzQ) });
      },

      scalars(s: ModuleState) {
        const boxSize = s.params.boxSize as V3;
        const boxMass = s.params.boxMass as number;
        const r = s.params.armVector as V3;
        const F = s.params.forceVector as V3;
        const tau = cross(r, F);
        const fNorm = norm(F);
        const momentArm = fNorm > 1e-9 ? norm(sub(r, scale(F, dot(r, F) / (fNorm * fNorm)))) : 0;

        const paOffset = s.params.paOffset as V3;
        const boxI = boxInertia(boxMass, boxSize);
        const parallelAxisI = parallelAxisTensor(boxI, boxMass, paOffset)[8];

        const omega = s.params.omegaVector as V3;
        const L = transformMat3(boxI, omega);
        const omegaN = norm(omega);
        const lN = norm(L);
        const angleLOmega =
          omegaN > 1e-9 && lN > 1e-9
            ? (Math.acos(Math.max(-1, Math.min(1, dot(omega, L) / (omegaN * lN)))) * 180) / Math.PI
            : 0;

        const eig = eigenSymmetric3(boxI);

        const topSpinRate = s.params.topSpinRate as number;
        const topArmLength = s.params.topArmLength as number;
        const topRadius = s.params.topRadius as number;
        const topMass = s.params.topMass as number;
        const flywheelI = discInertia(topMass, topRadius);
        const precessionRate = (topMass * G * topArmLength) / (flywheelI[8] * topSpinRate);

        const rollRadius = s.params.rollRadius as number;
        const rollOmega = s.params.rollOmega as number;

        const [w1, w2, w3] = dzOmega;
        const [i1, i2, i3] = dzInertiaDiag;
        const dzKineticEnergy = 0.5 * (i1 * w1 * w1 + i2 * w2 * w2 + i3 * w3 * w3);
        const dzAngularMomentumMag = Math.hypot(i1 * w1, i2 * w2, i3 * w3);

        return {
          torqueMag: norm(tau),
          momentArm,
          parallelAxisI,
          angleLOmega,
          I1: eig.values[0],
          I2: eig.values[1],
          I3: eig.values[2],
          precessionRate,
          rollingSpeed: rollOmega * rollRadius,
          dzKineticEnergy,
          dzAngularMomentumMag,
          dzOmegaIntermediate: w2,
        };
      },

      step(dt: number, state: ModuleState) {
        const boxSize = state.params.boxSize as V3;
        const boxMass = state.params.boxMass as number;
        const I = boxInertia(boxMass, boxSize);
        dzInertiaDiag = [I[0], I[4], I[8]];

        packedScratch[0] = dzQ[0];
        packedScratch[1] = dzQ[1];
        packedScratch[2] = dzQ[2];
        packedScratch[3] = dzQ[3];
        packedScratch[4] = dzOmega[0];
        packedScratch[5] = dzOmega[1];
        packedScratch[6] = dzOmega[2];
        const next = rk4(tumbleDeriv, packedScratch, 0, dt);
        dzQ = normalizeQuat([next[0], next[1], next[2], next[3]]);
        dzOmega = [next[4], next[5], next[6]];
      },

      reset(state: ModuleState) {
        const boxSize = state.params.boxSize as V3;
        const boxMass = state.params.boxMass as number;
        const I = boxInertia(boxMass, boxSize);
        dzInertiaDiag = [I[0], I[4], I[8]];
        const spin = state.params.dzSpin as number;
        const pert = state.params.dzPerturbation as number;
        dzQ = identityQuat();
        dzOmega = [spin * pert, spin, spin * pert * 0.7];
      },

      dispose() {
        [
          rArrow,
          fArrow,
          tauArrow,
          momentArmLine,
          torqueSenseArc,
          paBox,
          paCmAxis,
          paOffsetAxis,
          paOffsetArrow,
          amBox,
          omegaArrow,
          lArrow,
          lOmegaAngleArc,
          ellBox,
          principalFrame,
          ellipsoid,
          pivotArm,
          flywheel,
          spinArrow,
          precessionArc,
          axisTrace,
          rollWheel,
          instAxisPoint,
          cmVelocityArrow,
          rimTrace,
          tumblingBox,
          tumbleOmegaArrow,
          tumbleFrame,
        ].forEach((h) => h.dispose());
      },
    };
  },
};

export default module;
