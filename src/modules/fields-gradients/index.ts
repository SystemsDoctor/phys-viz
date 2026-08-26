/**
 * fields-gradients (ARCHITECTURE.md M5, TASKS.md M5-3/M5-4). Six
 * sub-demonstrations sharing one manifest: a heightmap with banded
 * level curves, gradient perpendicularity, a directional-derivative
 * slider, shrinking-box divergence (both the limit definition and the
 * theorem), a draggable curl paddlewheel, and flux through a
 * continuously user-shaped surface with Stokes' theorem.
 *
 * `timeModel: 'parametric'`: every panel except the curl paddlewheel is
 * a pure function of params alone (would prefer `static` in isolation),
 * but the paddlewheel's spin RATE visibly encoding curl magnitude is a
 * genuine, freely-scrubbable use of `t` — worth keeping since `t` is
 * free once anything wants it (§12).
 *
 * Two independently-authored fields (deliberately NOT F = grad(f): curl
 * of a gradient is always zero, which would leave the paddlewheel dead)
 * are compiled fresh each call via kernel/expr, mirroring the pattern
 * already shipped in control-showcase — never cached, never evaluated
 * inside a sampling loop.
 *
 * Note what is absent: no React, no three.js, no CSS, no event
 * handlers, no URL code, no plotting, no layer `if` statements, no
 * registry edit, no route registration.
 */
import type { PhysicsModule, ModuleState } from '../types';
import type { SceneContext } from '@/scene/SceneContext';
import { compileExpr, isExprError } from '@/kernel/expr';
import { grad, div, curl, lineIntegral, surfaceFlux, volumeIntegral, surfacePartials } from '@/kernel/calculus';
import type { VectorField } from '@/kernel/calculus';
import { add, cross, dot, scale, norm, normalize } from '@/kernel/math';
import type { Vec3 as V3 } from '@/kernel/math';
import manifest from './manifest';
import { params, layers, scalars } from './params';

function mut3(v: V3): [number, number, number] {
  return [v[0], v[1], v[2]];
}

function buildScalarField2D(src: string): (x: number, y: number) => number {
  const compiled = compileExpr(src, ['x', 'y']);
  if (isExprError(compiled)) return () => 0;
  return (x, y) => compiled({ x, y });
}

function buildVectorField(fx: string, fy: string, fz: string): VectorField {
  const cx = compileExpr(fx, ['x', 'y', 'z']);
  const cy = compileExpr(fy, ['x', 'y', 'z']);
  const cz = compileExpr(fz, ['x', 'y', 'z']);
  return (p: V3): V3 => {
    const vars = { x: p[0], y: p[1], z: p[2] };
    return [
      isExprError(cx) ? 0 : cx(vars),
      isExprError(cy) ? 0 : cy(vars),
      isExprError(cz) ? 0 : cz(vars),
    ];
  };
}

const BANDS = 8;
function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Cube face parametrizations, each verified to produce an OUTWARD normal via ∂u×∂v (checked analytically and re-confirmed by the divergence-theorem golden test in module.test.ts). */
function cubeFaces(center: V3, h: number): ((u: number, v: number) => V3)[] {
  const [cx, cy, cz] = center;
  return [
    (u, v) => [cx + h, cy + h * (2 * u - 1), cz + h * (2 * v - 1)], // +x
    (u, v) => [cx - h, cy + h * (2 * v - 1), cz + h * (2 * u - 1)], // -x
    (u, v) => [cx + h * (2 * v - 1), cy + h, cz + h * (2 * u - 1)], // +y
    (u, v) => [cx + h * (2 * u - 1), cy - h, cz + h * (2 * v - 1)], // -y
    (u, v) => [cx + h * (2 * u - 1), cy + h * (2 * v - 1), cz + h], // +z
    (u, v) => [cx + h * (2 * v - 1), cy + h * (2 * u - 1), cz - h], // -z
  ];
}

const SPIN_GAIN = 2;

const module: PhysicsModule = {
  manifest,
  params,
  layers,
  scalars,

  defaultView: { preset: 'iso', projection: 'persp' },

  create(ctx: SceneContext) {
    const gHeightmap = ctx.group('heightmap');
    const gProbeGrad = ctx.group('probeGradient');
    const gGradField = ctx.group('gradientField');
    const gDirDeriv = ctx.group('directionalDerivative');
    const gDivBox = ctx.group('divergenceBox');
    const gCurl = ctx.group('curlPaddlewheel');
    const gFluxCap = ctx.group('fluxCap');

    const heightmapSurface = ctx.surface({
      group: gHeightmap,
      parametric: () => [0, 0, 0],
      uRange: [-1, 1],
      vRange: [-1, 1],
      resolution: [40, 40],
    });

    const probeGradArrow = ctx.arrow({
      group: gProbeGrad,
      color: ctx.palette.field,
      label: '\\nabla f',
      from: [0, 0, 0],
      to: [0, 0, 0],
    });
    const probeTangentPath = ctx.path({ group: gProbeGrad, color: ctx.palette.construction, points: [] });
    const probePoint = ctx.point({ group: gProbeGrad, position: [0, 0, 0], color: ctx.palette.field, sizePx: 8 });

    const gradFieldGlyph = ctx.field({
      group: gGradField,
      sample: () => [0, 1, 0],
      gridBounds: { min: [-1, -1, 0], max: [1, 1, 0] },
      gridResolution: [9, 9, 1],
      mode: 'length',
    });

    const dirDerivUArrow = ctx.arrow({
      group: gDirDeriv,
      color: ctx.palette.construction,
      label: '\\hat{u}',
      from: [0, 0, 0],
      to: [0, 0, 0],
    });
    const dirDerivProjArrow = ctx.arrow({
      group: gDirDeriv,
      color: ctx.palette.field,
      dashed: true,
      label: 'D_{\\hat u}f',
      from: [0, 0, 0],
      to: [0, 0, 0],
    });

    const divBoxFaces = Array.from({ length: 6 }, () =>
      ctx.surface({
        group: gDivBox,
        parametric: () => [0, 0, 0],
        uRange: [0, 1],
        vRange: [0, 1],
        resolution: [6, 6],
      }),
    );

    const curlAxisArrow = ctx.arrow({
      group: gCurl,
      color: ctx.palette.angular,
      doubleHead: true,
      label: '\\nabla\\times\\vec F',
      from: [0, 0, 0],
      to: [0, 0, 0],
    });
    const curlSpinArc = ctx.curvedArrow({
      group: gCurl,
      color: ctx.palette.angular,
      center: [0, 0, 0],
      axis: [0, 0, 1],
      radius: 0.4,
      startAngle: 0,
      endAngle: 4.71238898,
    });

    const fluxCapSurface = ctx.surface({
      group: gFluxCap,
      parametric: () => [0, 0, 0],
      uRange: [0, 1],
      vRange: [0, 1],
      resolution: [24, 24],
    });
    const fluxCapBoundary = ctx.path({ group: gFluxCap, color: ctx.palette.construction, points: [] });

    return {
      update(s: ModuleState) {
        const domain = s.params.domain as number;
        const f2 = buildScalarField2D(s.params.f as string);
        const F = buildVectorField(s.params.Fx as string, s.params.Fy as string, s.params.Fz as string);

        // Heightmap: banded colorField IS the level-curve mechanism —
        // no separate contour-tracing algorithm needed.
        const HEIGHT_SAMPLE = 20;
        let fMin = Infinity;
        let fMax = -Infinity;
        for (let i = 0; i <= HEIGHT_SAMPLE; i++) {
          for (let j = 0; j <= HEIGHT_SAMPLE; j++) {
            const x = -domain + (2 * domain * i) / HEIGHT_SAMPLE;
            const y = -domain + (2 * domain * j) / HEIGHT_SAMPLE;
            const v = f2(x, y);
            if (v < fMin) fMin = v;
            if (v > fMax) fMax = v;
          }
        }
        const fRange = fMax - fMin;
        heightmapSurface.set({
          parametric: (u, v) => mut3([u, v, f2(u, v)]),
          uRange: [-domain, domain],
          vRange: [-domain, domain],
          colorField: (u, v) =>
            fRange > 1e-9 ? Math.floor(clamp01((f2(u, v) - fMin) / fRange) * BANDS) / BANDS : 0.5,
        });

        // Probe gradient
        const px = s.params.px as number;
        const py = s.params.py as number;
        const f3: (p: V3) => number = (p) => f2(p[0], p[1]);
        const g = grad(f3, [px, py, 0]);
        const probeZ = f2(px, py);
        const probePos: V3 = [px, py, probeZ];
        const gradMag = Math.hypot(g[0], g[1]);
        probeGradArrow.set({ from: probePos, to: add(probePos, [g[0], g[1], 0]) });
        const tangentDir: V3 =
          gradMag > 1e-9 ? [-g[1] / gradMag, g[0] / gradMag, 0] : [1, 0, 0];
        probeTangentPath.set({
          points: [mut3(add(probePos, scale(tangentDir, -0.6))), mut3(add(probePos, scale(tangentDir, 0.6)))],
        });
        probePoint.set({ position: mut3(probePos) });

        // Gradient field over the whole domain, flattened onto a plane
        // just below the surface's own height range.
        const baseZ = fMin - 0.5;
        gradFieldGlyph.set({
          sample: (p) => {
            const gp = grad(f3, [p[0], p[1], 0]);
            return mut3([gp[0], gp[1], 0]);
          },
          gridBounds: { min: [-domain, -domain, baseZ], max: [domain, domain, baseZ] },
          gridResolution: [9, 9, 1],
        });

        // Directional derivative
        const theta = s.params.theta as number;
        const uHat: V3 = [Math.cos(theta), Math.sin(theta), 0];
        const dirDeriv = g[0] * uHat[0] + g[1] * uHat[1];
        dirDerivUArrow.set({ from: probePos, to: add(probePos, uHat) });
        dirDerivProjArrow.set({ from: probePos, to: add(probePos, scale(uHat, dirDeriv)) });

        // Shrinking-box divergence
        const boxCenter = s.params.boxCenter as V3;
        const boxHalfSize = s.params.boxHalfSize as number;
        const faces = cubeFaces(boxCenter, boxHalfSize);
        faces.forEach((faceSurf, i) => {
          divBoxFaces[i].set({
            parametric: (u, v) => mut3(faceSurf(u, v)),
            colorField: (u, v) => {
              const [dSdu, dSdv] = surfacePartials(faceSurf, u, v);
              const normal = normalize(cross(dSdu, dSdv));
              return dot(F(faceSurf(u, v)), normal);
            },
          });
        });
        // Curl paddlewheel — zero pointer code: curlProbe is a plain
        // draggable vector param the shell already wires up (M3-6).
        const curlProbe = s.params.curlProbe as V3;
        const curlVec = curl(F, curlProbe);
        const curlMag = norm(curlVec);
        curlAxisArrow.set({ from: curlProbe, to: add(curlProbe, curlVec) });
        const curlAxis: V3 = curlMag > 1e-9 ? normalize(curlVec) : [0, 0, 1];
        const phase = (s.t * SPIN_GAIN * curlMag) % (2 * Math.PI);
        curlSpinArc.set({ center: mut3(curlProbe), axis: mut3(curlAxis), startAngle: phase, endAngle: phase + 1.5 * Math.PI });

        // Flux through a continuously user-shaped surface (capDepth=0 is
        // a flat disk; the fixed boundary circle never moves).
        const capCenter = s.params.capCenter as V3;
        const capRadius = s.params.capRadius as number;
        const capDepth = s.params.capDepth as number;
        const capSurf = (u: number, v: number): V3 => [
          capCenter[0] + capRadius * u * Math.cos(2 * Math.PI * v),
          capCenter[1] + capRadius * u * Math.sin(2 * Math.PI * v),
          capCenter[2] - capDepth * (1 - u * u),
        ];
        const boundary = (t: number): V3 => [
          capCenter[0] + capRadius * Math.cos(2 * Math.PI * t),
          capCenter[1] + capRadius * Math.sin(2 * Math.PI * t),
          capCenter[2],
        ];
        fluxCapSurface.set({ parametric: (u, v) => mut3(capSurf(u, v)) });
        const BOUNDARY_SEGMENTS = 48;
        const boundaryPts: [number, number, number][] = [];
        for (let i = 0; i <= BOUNDARY_SEGMENTS; i++) boundaryPts.push(mut3(boundary(i / BOUNDARY_SEGMENTS)));
        fluxCapBoundary.set({ points: boundaryPts });
      },

      scalars(s: ModuleState) {
        const f2 = buildScalarField2D(s.params.f as string);
        const F = buildVectorField(s.params.Fx as string, s.params.Fy as string, s.params.Fz as string);
        // Rounded defensively: a hand-edited/decoded URL could carry a
        // non-integer n, and every quadrature call below sizes an array
        // by n (or n*n) — never trust it to already be a whole number.
        const n = Math.max(1, Math.round(s.params.n as number));

        const px = s.params.px as number;
        const py = s.params.py as number;
        const f3: (p: V3) => number = (p) => f2(p[0], p[1]);
        const g = grad(f3, [px, py, 0]);
        const gradMag = Math.hypot(g[0], g[1]);
        const theta = s.params.theta as number;
        const dirDeriv = g[0] * Math.cos(theta) + g[1] * Math.sin(theta);

        const boxCenter = s.params.boxCenter as V3;
        const boxHalfSize = s.params.boxHalfSize as number;
        const faces = cubeFaces(boxCenter, boxHalfSize);
        let fluxThroughBox = 0;
        for (const faceSurf of faces) fluxThroughBox += surfaceFlux(F, faceSurf, n, n).value;
        const divAtBox = div(F, boxCenter);
        const divVolumeIntegral = volumeIntegral(
          (p) => div(F, p),
          {
            min: [boxCenter[0] - boxHalfSize, boxCenter[1] - boxHalfSize, boxCenter[2] - boxHalfSize],
            max: [boxCenter[0] + boxHalfSize, boxCenter[1] + boxHalfSize, boxCenter[2] + boxHalfSize],
          },
          n,
        ).value;
        const fluxOverVolume = fluxThroughBox / (8 * boxHalfSize ** 3);

        const curlProbe = s.params.curlProbe as V3;
        const curlVec = curl(F, curlProbe);

        const capCenter = s.params.capCenter as V3;
        const capRadius = s.params.capRadius as number;
        const capDepth = s.params.capDepth as number;
        const capSurf = (u: number, v: number): V3 => [
          capCenter[0] + capRadius * u * Math.cos(2 * Math.PI * v),
          capCenter[1] + capRadius * u * Math.sin(2 * Math.PI * v),
          capCenter[2] - capDepth * (1 - u * u),
        ];
        const boundary = (t: number): V3 => [
          capCenter[0] + capRadius * Math.cos(2 * Math.PI * t),
          capCenter[1] + capRadius * Math.sin(2 * Math.PI * t),
          capCenter[2],
        ];
        const circulation = lineIntegral(F, boundary, n).value;
        const curlFluxThroughCap = surfaceFlux((p) => curl(F, p), capSurf, n, n).value;

        return {
          gradMag,
          dirDeriv,
          divAtBox,
          fluxThroughBox,
          fluxOverVolume,
          divVolumeIntegral,
          divergenceGap: Math.abs(fluxThroughBox - divVolumeIntegral),
          curlMag: norm(curlVec),
          circulation,
          curlFluxThroughCap,
          stokesGap: Math.abs(circulation - curlFluxThroughCap),
        };
      },

      dispose() {
        [
          heightmapSurface,
          probeGradArrow,
          probeTangentPath,
          probePoint,
          gradFieldGlyph,
          dirDerivUArrow,
          dirDerivProjArrow,
          ...divBoxFaces,
          curlAxisArrow,
          curlSpinArc,
          fluxCapSurface,
          fluxCapBoundary,
        ].forEach((h) => h.dispose());
      },
    };
  },
};

export default module;
