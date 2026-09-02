// A mass on a frictionless spring, drawn as its own potential-energy
// diagram: U(x) = ½kx² as a ribbon `surface` (height = energy), a
// translucent `patch` "total-energy plane" at E = ½kA² marking the
// turning points x = ±A, and the mass itself riding the ribbon at
// (x(t), U(x(t))) with x(t) = A cos(ωt) — closed-form SHM, so
// `timeModel: 'parametric'` needs no integration (ARCHITECTURE.md §2,
// §12). KE = E − U(x) is drawn directly as the vertical gap between the
// mass and the plane.
//
// The scene is drawn in REDUCED coordinates, ξ = x/A (so ξ = cos(ωt)
// for the mass) and η = U/E = ξ² — algebraically independent of k, m,
// and A. This keeps the diagram framed identically at every parameter
// setting instead of the raw U(x) = ½kx² ribbon's height blowing up
// with k (physical Joules and physical metres have no shared visual
// scale to draw both axes "to scale" on one graph anyway; every other
// 2D-diagram module in this codebase picks its own visual scale the
// same way, e.g. fields-gradients' heightmap uses the raw field value
// as height with no unit conversion). `scalars()` below is untouched —
// readouts stay in real physical units throughout.
//
// Every glyph stays exactly in the canonical (x/up) plane — z = 0 in
// world space — rather than gaining a cosmetic depth extrusion: the
// "2D-only" locked orthographic view (checked by default for every
// module, ADR 0012) does not render `surface`/`patch` geometry that
// extends off that plane, even by a fraction of a world unit (confirmed
// empirically; likely a near-plane clipping edge case in
// src/scene/camera, flagged as X-18 in TASKS.md for someone to dig into
// — out of scope to chase down here). The ribbon's and plane's visible
// "thickness" comes from a small band in η instead, which stays on the
// canonical plane and is unaffected by the issue.
import type { PhysicsModule, ModuleState } from '../types';
import type { SceneContext } from '@/scene/SceneContext';
import manifest from './manifest';
import { params, layers, scalars } from './params';

type V3 = [number, number, number];

const X_HAT: V3 = [1, 0, 0];
const Y_HAT: V3 = [0, 1, 0];
const Z_HAT: V3 = [0, 0, 1];

// World units per unit of reduced coordinate (ξ horizontally, η
// vertically) — fixes the diagram's on-screen size regardless of the
// current mass/spring-constant/amplitude.
const PLOT_SCALE = 2;
// The ribbon is drawn a bit past the turning points (|ξ|=1) so the
// forbidden region (ribbon above the energy plane) is visible too.
const DOMAIN_XI = 1.4;
const RIBBON_HALF_THICKNESS = 0.035; // in η, painted-stroke width for the U(x) curve
const PLANE_HALF_THICKNESS = 0.04; // in η, painted-stroke width for the E line
const BALL_RADIUS = 0.1;
const VELOCITY_ARROW_MAX = 0.8;

/** Angular frequency, closed-form for a spring-mass system. */
function omegaOf(k: number, m: number): number {
  return Math.sqrt(k / m);
}

const module: PhysicsModule = {
  manifest,
  params,
  layers,
  scalars,

  defaultView: { preset: '+z', projection: 'ortho' },

  create(ctx: SceneContext) {
    // This module has no notion of gravitational "vertical" — the
    // up-axis choice instead picks which axis plots ENERGY (the
    // conventional "higher = more energy" reading), same idiom as
    // rotational-dynamics/projectile-motion's ctx.up handling.
    const upVec: V3 = ctx.up === 'y' ? Y_HAT : Z_HAT;
    const horizVec: V3 = X_HAT;

    const toWorld = (xi: number, eta: number): V3 => {
      const x = xi * PLOT_SCALE;
      const y = eta * PLOT_SCALE;
      return [
        horizVec[0] * x + upVec[0] * y,
        horizVec[1] * x + upVec[1] * y,
        horizVec[2] * x + upVec[2] * y,
      ];
    };

    const gLandscape = ctx.group('landscape');
    const gParticle = ctx.group('particle');

    // η = ξ² and the plane at η = 1 never depend on params/t/layers —
    // only the layer checkbox toggles their visibility — so their
    // geometry is passed once here rather than recomputed in update().
    const ribbon = ctx.surface({
      group: gLandscape,
      parametric: (xi, vv) => toWorld(xi, xi * xi + RIBBON_HALF_THICKNESS * (2 * vv - 1)),
      colorField: (xi) => xi * xi,
      uRange: [-DOMAIN_XI, DOMAIN_XI],
      vRange: [0, 1],
      resolution: [48, 4],
    });

    const energyPlane = ctx.patch({
      group: gLandscape,
      color: ctx.palette.energy,
      opacity: 0.35,
      points: [
        toWorld(-DOMAIN_XI, 1 - PLANE_HALF_THICKNESS),
        toWorld(DOMAIN_XI, 1 - PLANE_HALF_THICKNESS),
        toWorld(DOMAIN_XI, 1 + PLANE_HALF_THICKNESS),
        toWorld(-DOMAIN_XI, 1 + PLANE_HALF_THICKNESS),
      ],
    });

    const leftTurningPoint = ctx.point({
      group: gLandscape,
      color: ctx.palette.construction,
      position: toWorld(-1, 1),
      sizePx: 7,
    });
    const rightTurningPoint = ctx.point({
      group: gLandscape,
      color: ctx.palette.construction,
      position: toWorld(1, 1),
      sizePx: 7,
    });

    const ball = ctx.body({
      group: gParticle,
      kind: 'sphere',
      position: [0, 0, 0],
      scale: [BALL_RADIUS, BALL_RADIUS, BALL_RADIUS],
      color: ctx.palette.position,
    });
    const velocityArrow = ctx.arrow({
      group: gParticle,
      color: ctx.palette.velocity,
      label: '\\vec{v}',
      from: [0, 0, 0],
      to: [0, 0, 0],
    });
    const keBracket = ctx.dimensionLine({
      group: gParticle,
      from: [0, 0, 0],
      to: [0, 0, 0],
      dashed: true,
      label: 'K',
    });

    return {
      update(state: ModuleState) {
        const m = state.params.mass as number;
        const k = state.params.k as number;
        const landscapeOn = state.layers.landscape ?? true;
        const particleOn = state.layers.particle ?? true;

        const omega = omegaOf(k, m);
        // ξ = x/A = cos(ωt); η = U/E = ξ² — both independent of k/m/A.
        const xi = Math.cos(omega * state.t);
        const eta = xi * xi;
        const dxiDt = -Math.sin(omega * state.t); // d(x/A)/d(ωt), sign of velocity

        ribbon.visible(landscapeOn);
        energyPlane.visible(landscapeOn);
        leftTurningPoint.visible(landscapeOn);
        rightTurningPoint.visible(landscapeOn);

        const ballPos = toWorld(xi, eta);
        ball.set({ position: ballPos });
        ball.visible(particleOn);

        // |dξ/dt| is maximal (=1) at ξ=0 and zero at the turning
        // points — exactly the fraction of the physical max speed Aω.
        const arrowLen = Math.abs(dxiDt) * VELOCITY_ARROW_MAX;
        const dir = Math.sign(dxiDt);
        velocityArrow.set({ from: ballPos, to: toWorld(xi + dir * arrowLen, eta) });
        velocityArrow.visible(particleOn);

        keBracket.set({ from: ballPos, to: toWorld(xi, 1) });
        keBracket.visible(particleOn);
      },

      scalars(state: ModuleState) {
        const m = state.params.mass as number;
        const k = state.params.k as number;
        const A = state.params.amplitude as number;

        const omega = omegaOf(k, m);
        const E = 0.5 * k * A * A;
        const x = A * Math.cos(omega * state.t);
        const v = -A * omega * Math.sin(omega * state.t);
        const U = 0.5 * k * x * x;
        const KE = Math.max(0, E - U);

        return {
          PE: U,
          KE,
          E,
          speed: Math.abs(v),
          period: (2 * Math.PI) / omega,
          turningPoint: A,
        };
      },

      dispose() {
        ribbon.dispose();
        energyPlane.dispose();
        leftTurningPoint.dispose();
        rightTurningPoint.dispose();
        ball.dispose();
        velocityArrow.dispose();
        keBracket.dispose();
      },
    };
  },
};

export default module;
