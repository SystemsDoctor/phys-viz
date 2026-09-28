import type { PhysicsModule, ModuleState } from '../types';
import type { SceneContext } from '@/scene/SceneContext';
import { norm } from '@/kernel/math';
import { compileExpr, isExprError } from '@/kernel/expr';
import { embedPlanar } from '@/kernel/frames';
import manifest from './manifest';
import { params, layers, scalars } from './params';

// X-42: `theta`'s angle-arc/point/trace and the "answer" sphere's offset
// from the geometry group are all local FLAT (x, y) coordinates that used
// to be hardcoded straight onto world (x, y, 0) — correct only under
// y-up (ADR 0009's default), edge-on under z-up (the global 2D-lock
// camera then shows world x-z, per `scene/camera/index.ts`'s
// `fromCanonical`). `p` itself is left alone: it's a free, DRAGGABLE
// vector param whose in-plane behavior already comes from
// `Viewport`/`ctx.draggable`'s own screen-facing-plane projection
// (`scene/createSceneContext.ts`), which already tracks the live camera
// (and so the live up-axis) correctly on its own.

const module: PhysicsModule = {
  manifest,
  params,
  layers,
  scalars,

  defaultView: { preset: '+z', projection: 'ortho' },

  create(ctx: SceneContext) {
    const gGeometry = ctx.group('geometry');
    const gTrace = ctx.group('trace');
    const gAnswer = ctx.group('answer');

    const pArrow = ctx.arrow({
      group: gGeometry,
      color: ctx.palette.position,
      label: '\\vec{p}',
      from: [0, 0, 0],
      to: [0, 0, 0],
    });
    const anglePoint = ctx.point({
      group: gGeometry,
      color: ctx.palette.velocity,
      position: [0, 0, 0],
      sizePx: 8,
    });
    const angleArc = ctx.arc({
      group: gGeometry,
      color: ctx.palette.construction,
      label: '\\theta',
      from: [1, 0, 0],
      to: [1, 0, 0],
      radius: 1,
    });
    const highlight = ctx.point({
      group: gGeometry,
      color: ctx.palette.force,
      position: [0, 0, 0],
      sizePx: 16,
    });

    const trace = ctx.path({ group: gTrace, color: ctx.palette.angular, points: [] });

    const embedAt = (up: SceneContext['up'], x: number, y: number): [number, number, number] => {
      const [wx, wy, wz] = embedPlanar(up, x, y);
      return [wx, wy, wz];
    };

    const answerBody = ctx.body({
      group: gAnswer,
      kind: 'sphere',
      position: embedAt(ctx.up, 0, -3),
      color: ctx.palette.energy,
    });
    const answerLabel = ctx.label({ latex: '', anchor: embedAt(ctx.up, 0, -3.6) });

    return {
      update(s: ModuleState) {
        const p = s.params.p as [number, number, number];
        const theta = s.params.theta as number;
        const k = s.params.k as number;
        const f = s.params.f as string;
        const mode = s.params.mode as string;
        const on = s.params.on as boolean;

        // X-42: `ctx.up` is a LIVE getter — read it fresh every update()
        // so the embedded plane tracks a live up-axis switch (ADR 0011)
        // without remounting.
        const up = ctx.up;
        const embed = (x: number, y: number): [number, number, number] => embedAt(up, x, y);

        pArrow.set({ from: [0, 0, 0], to: p, doubleHead: mode === 'ray' });
        const anglePos = embed(Math.cos(theta) * 2, Math.sin(theta) * 2);
        anglePoint.set({ position: anglePos });
        angleArc.set({ from: embed(1, 0), to: embed(Math.cos(theta), Math.sin(theta)), radius: 1 });

        highlight.set({ position: p });
        highlight.visible(on);

        const traceOn = s.layers.trace ?? false;
        trace.visible(traceOn);
        if (traceOn) {
          const points: [number, number, number][] = [];
          const steps = Math.max(4, Math.round(s.params.traceSteps as number));
          for (let i = 0; i <= steps; i++) {
            const a = (theta * i) / steps;
            points.push(embed(Math.cos(a) * 2, Math.sin(a) * 2));
          }
          trace.set({ points });
        }

        answerBody.set({ position: embed(0, -3) });
        answerLabel.set({ anchor: embed(0, -3.6) });

        const magnitude = norm(p);

        const answerOn = s.layers.answer ?? false;
        answerBody.visible(answerOn);
        answerLabel.visible(answerOn);
        if (answerOn) {
          const r = Math.max(0.1, Math.min(2, magnitude / 3));
          answerBody.set({ scale: [r, r, r] });
          const compiled = compileExpr(f, ['x']);
          const fValue = isExprError(compiled) ? 0 : compiled({ x: k });
          answerLabel.set({
            latex: `|\\vec{p}| = ${magnitude.toFixed(2)},\\ f(k) = ${fValue.toFixed(2)}`,
          });
        }
      },

      scalars(s: ModuleState) {
        const p = s.params.p as [number, number, number];
        const k = s.params.k as number;
        const f = s.params.f as string;
        const compiled = compileExpr(f, ['x']);
        return {
          magnitude: norm(p),
          fValue: isExprError(compiled) ? 0 : compiled({ x: k }),
        };
      },

      dispose() {
        [pArrow, anglePoint, angleArc, highlight, trace, answerBody, answerLabel].forEach((h) =>
          h.dispose(),
        );
      },
    };
  },
};

export default module;
