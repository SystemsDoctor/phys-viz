/**
 * demoScene — exercises every glyph, label, dimensionLine, and one
 * draggable target through the real SceneContext + Viewport. Replaces
 * demoCube.ts for the M2 acceptance criterion (ARCHITECTURE.md §20 M2:
 * "a throwaway demo scene exercises every glyph at 60 fps with zero
 * per-frame allocation"). This file is itself throwaway — M3's real
 * modules replace it as the app's actual content; it exists only to
 * give the profiler and the Playwright perf/dispose specs something
 * to point at.
 *
 * The update loop below mirrors how a real `ModuleInstance.update()`
 * is meant to look (§10): retained handles from `create()`-time,
 * `.set()` called every frame with freshly computed values. Per-frame
 * scratch tuples are pre-allocated and mutated in place so this loop
 * itself allocates nothing beyond the one small props object each
 * `.set()` call takes — the same shape every module author writes.
 */
import { Viewport } from './Viewport';

export function mountDemoScene(canvas: HTMLCanvasElement): () => void {
  const viewport = new Viewport({ canvas });
  const ctx = viewport.ctx;

  const vectors = ctx.group('vectors');
  const surfaces = ctx.group('surfaces');
  const bodies = ctx.group('bodies');
  const frames = ctx.group('frames');

  const arrow = ctx.arrow({
    group: vectors,
    from: [0, 0, 0],
    to: [1, 0, 0],
    color: '#0072b2',
    label: 'F',
  });
  const curvedArrow = ctx.curvedArrow({
    group: vectors,
    center: [0, 0, 0],
    axis: [0, 1, 0],
    radius: 1.2,
    startAngle: 0,
    endAngle: Math.PI / 2,
    color: '#d55e00',
  });
  const path = ctx.path({
    group: vectors,
    points: [
      [-1, 1, 0],
      [0, 1.2, 0],
      [1, 1, 0],
    ],
    color: '#009e73',
  });
  const point = ctx.point({
    group: vectors,
    position: [0, 1.5, 0],
    color: '#cc79a7',
    sizePx: 10,
  });
  const patch = ctx.patch({
    group: surfaces,
    points: [
      [-1, -1.5, -1],
      [1, -1.5, -1],
      [1, -1.5, 1],
      [-1, -1.5, 1],
    ],
    color: '#56b4e9',
    opacity: 0.4,
  });
  const surface = ctx.surface({
    group: surfaces,
    parametric: (u, v) => [u * 2 - 1, Math.sin(u * Math.PI) * 0.3, v * 2 - 1],
    uRange: [0, 1],
    vRange: [0, 1],
    resolution: [16, 16],
  });
  const arc = ctx.arc({
    group: vectors,
    from: [1, 0, 0],
    to: [0, 0, 1],
    radius: 1,
    color: '#e69f00',
  });
  const box = ctx.body({ group: bodies, kind: 'box', position: [-2, 0, 0], color: '#0072b2' });
  const sphere = ctx.body({
    group: bodies,
    kind: 'sphere',
    position: [-2, 1.5, 0],
    color: '#d55e00',
  });
  const field = ctx.field({
    group: vectors,
    sample: (p) => [-p[1], p[0], 0],
    gridBounds: { min: [-2, -2, -2], max: [2, 2, 2] },
    gridResolution: [3, 3, 3],
    mode: 'length',
  });
  const frame = ctx.frame({
    group: frames,
    origin: [2, 0, 0],
    orientation: [0, 0, 0, 1],
    scale: 0.8,
  });
  const axes = ctx.axes({ extent: 3 });
  const graticule = ctx.graticule({
    viewportSize: [canvas.clientWidth || 800, canvas.clientHeight || 600],
  });
  const label = ctx.label({ latex: 'v = \\omega \\times r', anchor: [0, 2, 0] });
  const dimensionLine = ctx.dimensionLine({
    from: [-1, -2, 0],
    to: [1, -2, 0],
    label: '2 m',
  });

  // Draggable target tracks `point`'s own anchor — the point glyph owns
  // the retained position; the draggable registration just exposes it
  // for picking (no mouse code here, per §8/M2-15 — that's M3-6's job).
  const pointPosition: [number, number, number] = [0, 1.5, 0];
  const draggable = ctx.draggable({
    paramKey: 'demo.point',
    getPoint: () => pointPosition,
  });

  const handles = [
    arrow,
    curvedArrow,
    path,
    point,
    patch,
    surface,
    arc,
    box,
    sphere,
    field,
    frame,
    axes,
    graticule,
    label,
    dimensionLine,
    draggable,
  ];

  // Pre-allocated scratch tuples mutated in place every frame — no
  // `.set()` call below allocates beyond its own small props object.
  const arrowTo: [number, number, number] = [1, 0, 0];
  const curvedArrowAngles = { startAngle: 0, endAngle: Math.PI / 2 };
  const boxOrientation: [number, number, number, number] = [0, 0, 0, 1];
  const frameOrientation: [number, number, number, number] = [0, 0, 0, 1];

  let frameId = 0;
  let startMs = 0;
  function tick(nowMs: number): void {
    if (!startMs) startMs = nowMs;
    const t = (nowMs - startMs) / 1000;

    const angle = t * 0.6;
    arrowTo[0] = Math.cos(angle);
    arrowTo[1] = Math.sin(angle) * 0.4;
    arrowTo[2] = Math.sin(angle);
    arrow.set({ to: arrowTo });

    curvedArrowAngles.startAngle = angle * 0.3;
    curvedArrowAngles.endAngle = curvedArrowAngles.startAngle + Math.PI / 2;
    curvedArrow.set(curvedArrowAngles);

    pointPosition[1] = 1.5 + Math.sin(angle) * 0.3;
    point.set({ position: pointPosition });

    const half = angle * 0.5;
    boxOrientation[0] = 0;
    boxOrientation[1] = Math.sin(half);
    boxOrientation[2] = 0;
    boxOrientation[3] = Math.cos(half);
    box.set({ orientation: boxOrientation });

    frameOrientation[0] = Math.sin(half) * 0.7;
    frameOrientation[1] = 0;
    frameOrientation[2] = 0;
    frameOrientation[3] = Math.cos(half);
    frame.set({ orientation: frameOrientation });

    frameId = requestAnimationFrame(tick);
  }
  frameId = requestAnimationFrame(tick);

  return function dispose(): void {
    cancelAnimationFrame(frameId);
    for (const handle of handles) handle.dispose();
    viewport.dispose();
  };
}
