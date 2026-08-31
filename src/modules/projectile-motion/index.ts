// A point mass launched from the origin with a given speed and angle,
// under gravity, no air resistance. `timeModel: 'parametric'` — position
// is a pure closed-form function of t, so update() never integrates
// anything; it just evaluates x(t)/y(t) at whatever t the shell hands it
// (ARCHITECTURE.md §2, §12).
import type { PhysicsModule, ModuleState } from '../types';
import type { SceneContext } from '@/scene/SceneContext';
import manifest from './manifest';
import { params, layers, scalars } from './params';

type V3 = [number, number, number];

const ORIGIN: V3 = [0, 0, 0];
const X_HAT: V3 = [1, 0, 0];
const Y_HAT: V3 = [0, 1, 0];
const Z_HAT: V3 = [0, 0, 1];

// Number of samples used to draw the trace from t=0 to the current t.
// Fixed and small enough to stay cheap every frame; recomputed from
// scratch each update() (never accumulated) so idempotence holds.
const TRACE_SAMPLES = 64;

/** In-plane (horizontal, vertical) position at time t. Closed form. */
function positionAt(t: number, speed: number, angle: number, g: number) {
  return {
    x: speed * Math.cos(angle) * t,
    y: speed * Math.sin(angle) * t - 0.5 * g * t * t,
  };
}

/**
 * Time at which y(t) returns to 0. Clamped to 0 for a launch angle that
 * never leaves the ground (angle <= 0), so the marker simply sits at the
 * origin instead of tunnelling below y = 0.
 */
function timeOfFlight(speed: number, angle: number, g: number): number {
  return Math.max(0, (2 * speed * Math.sin(angle)) / g);
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
    // "Which axis is up." horizAxis is perpendicular to both up
    // conventions, same idiom as rotational-dynamics.
    const upVec: V3 = ctx.up === 'y' ? Y_HAT : Z_HAT;
    const horizAxis: V3 = X_HAT;

    const toWorld = (x: number, y: number): V3 => [
      horizAxis[0] * x + upVec[0] * y,
      horizAxis[1] * x + upVec[1] * y,
      horizAxis[2] * x + upVec[2] * y,
    ];

    const gProjectile = ctx.group('projectile');
    const gTrace = ctx.group('trace');

    const body = ctx.point({
      group: gProjectile,
      color: ctx.palette.position,
      position: ORIGIN,
      sizePx: 12,
    });
    const tag = ctx.label({ latex: '\\vec{r}(t)', anchor: ORIGIN, offset: [0, -18] });

    const trace = ctx.path({
      group: gTrace,
      color: ctx.palette.position,
      points: [ORIGIN],
    });

    return {
      update(state: ModuleState) {
        const speed = state.params.speed as number;
        const angle = state.params.angle as number;
        const g = state.params.g as number;
        const projectileOn = state.layers.projectile ?? true;
        const traceOn = state.layers.trace ?? true;

        // Clamp to the flight duration so the marker rests at the
        // landing point instead of tunnelling underground once the
        // shell's global t runs past touchdown.
        const flight = timeOfFlight(speed, angle, g);
        const t = Math.min(Math.max(state.t, 0), flight);

        const { x, y } = positionAt(t, speed, angle, g);
        const pos = toWorld(x, y);

        body.set({ position: pos });
        body.visible(projectileOn);

        tag.set({ anchor: pos });
        tag.visible(projectileOn);

        trace.visible(traceOn);
        if (traceOn) {
          const points: V3[] = [];
          for (let i = 0; i <= TRACE_SAMPLES; i++) {
            const ti = (t * i) / TRACE_SAMPLES;
            const p = positionAt(ti, speed, angle, g);
            points.push(toWorld(p.x, p.y));
          }
          trace.set({ points });
        }
      },

      scalars(state: ModuleState) {
        const speed = state.params.speed as number;
        const angle = state.params.angle as number;
        const g = state.params.g as number;
        return {
          range: (speed * speed * Math.sin(2 * angle)) / g,
          maxHeight: (speed * speed * Math.sin(angle) * Math.sin(angle)) / (2 * g),
        };
      },

      dispose() {
        body.dispose();
        tag.dispose();
        trace.dispose();
      },
    };
  },
};

export default module;
