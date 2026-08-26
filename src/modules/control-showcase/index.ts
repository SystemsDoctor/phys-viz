import type { PhysicsModule, ModuleState } from '../types';
import type { SceneContext } from '@/scene/SceneContext';
import { norm } from '@/kernel/math';
import { compileExpr, isExprError } from '@/kernel/expr';
import manifest from './manifest';
import { params, layers, scalars } from './params';

const module: PhysicsModule = {
  manifest,
  params,
  layers,
  scalars,

  defaultView: { preset: '+z', projection: 'ortho' },

  create(ctx: SceneContext) {
    const gGeometry = ctx.group('geometry');
    const gGrid = ctx.group('grid');
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

    const axes = ctx.axes({ group: gGrid, extent: 5 });

    const trace = ctx.path({ group: gTrace, color: ctx.palette.angular, points: [] });

    const answerBody = ctx.body({
      group: gAnswer,
      kind: 'sphere',
      position: [0, -3, 0],
      color: ctx.palette.energy,
    });
    const answerLabel = ctx.label({ latex: '', anchor: [0, -3.6, 0] });

    return {
      update(s: ModuleState) {
        const p = s.params.p as [number, number, number];
        const theta = s.params.theta as number;
        const k = s.params.k as number;
        const f = s.params.f as string;
        const mode = s.params.mode as string;
        const on = s.params.on as boolean;

        pArrow.set({ from: [0, 0, 0], to: p, doubleHead: mode === 'ray' });
        const anglePos: [number, number, number] = [Math.cos(theta) * 2, Math.sin(theta) * 2, 0];
        anglePoint.set({ position: anglePos });
        angleArc.set({ from: [1, 0, 0], to: [Math.cos(theta), Math.sin(theta), 0], radius: 1 });

        highlight.set({ position: p });
        highlight.visible(on);

        axes.visible(s.layers.grid ?? true);

        const traceOn = s.layers.trace ?? false;
        trace.visible(traceOn);
        if (traceOn) {
          const points: [number, number, number][] = [];
          const steps = 32;
          for (let i = 0; i <= steps; i++) {
            const a = (theta * i) / steps;
            points.push([Math.cos(a) * 2, Math.sin(a) * 2, 0]);
          }
          trace.set({ points });
        }

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
        [pArrow, anglePoint, angleArc, highlight, axes, trace, answerBody, answerLabel].forEach(
          (h) => h.dispose(),
        );
      },
    };
  },
};

export default module;
