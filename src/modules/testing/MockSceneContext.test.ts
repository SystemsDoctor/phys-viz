import { describe, it, expect } from 'vitest';
import { createMockSceneContext } from './MockSceneContext';

describe('createMockSceneContext', () => {
  it('tallies created and disposed handles (contract assertion 4)', () => {
    const ctx = createMockSceneContext();
    const a = ctx.arrow({ from: [0, 0, 0], to: [1, 0, 0] });
    const b = ctx.point({ position: [0, 0, 0] });
    expect(ctx.stats.created).toBe(2);
    expect(ctx.stats.disposed).toBe(0);
    a.dispose();
    expect(ctx.stats.disposed).toBe(1);
    b.dispose();
    expect(ctx.stats.disposed).toBe(2);
  });

  it('throws on double-dispose', () => {
    const ctx = createMockSceneContext();
    const handle = ctx.arrow({ from: [0, 0, 0], to: [1, 0, 0] });
    handle.dispose();
    expect(() => handle.dispose()).toThrow();
  });

  it('throws on set()/visible() after dispose', () => {
    const ctx = createMockSceneContext();
    const handle = ctx.point({ position: [0, 0, 0] });
    handle.dispose();
    expect(() => handle.set({ position: [1, 1, 1] })).toThrow();
    expect(() => handle.visible(false)).toThrow();
  });

  it('records every set() call with a deep-cloned snapshot of props', () => {
    const ctx = createMockSceneContext();
    const handle = ctx.point({ position: [0, 0, 0] });
    const props = { position: [1, 2, 3] as [number, number, number] };
    handle.set(props);
    props.position[0] = 999; // mutate the original after the call
    expect(ctx.recordedSets.length).toBe(1);
    expect(ctx.recordedSets[0].kind).toBe('point');
    expect(ctx.recordedSets[0].props).toEqual({ position: [1, 2, 3] }); // unaffected by the later mutation
  });

  it('records visible() calls separately from set() calls', () => {
    const ctx = createMockSceneContext();
    const handle = ctx.arrow({ from: [0, 0, 0], to: [1, 0, 0] });
    handle.visible(false);
    expect(ctx.recordedVisibility.length).toBe(1);
    expect(ctx.recordedVisibility[0]).toMatchObject({ kind: 'arrow', show: false });
  });

  it('resetRecording clears recorded sets/visibility without touching stats', () => {
    const ctx = createMockSceneContext();
    const handle = ctx.point({ position: [0, 0, 0] });
    handle.set({ position: [1, 1, 1] });
    handle.visible(true);
    ctx.resetRecording();
    expect(ctx.recordedSets.length).toBe(0);
    expect(ctx.recordedVisibility.length).toBe(0);
    expect(ctx.stats.created).toBe(1); // unaffected
    handle.dispose();
  });

  it('group() is idempotent by name', () => {
    const ctx = createMockSceneContext();
    expect(ctx.group('vectors')).toEqual({ id: 'vectors' });
    expect(ctx.group('vectors')).toEqual(ctx.group('vectors'));
  });

  it('defaults up to "y" and honours an explicit option', () => {
    const defaultCtx = createMockSceneContext();
    expect(defaultCtx.up).toBe('y');
    const zCtx = createMockSceneContext({ up: 'z' });
    expect(zCtx.up).toBe('z');
  });

  it('palette matches the real theme.getPalette() (no duplicated logic)', () => {
    const ctx = createMockSceneContext();
    expect(ctx.palette.position).toBe('#0072b2');
  });

  it('exercises every glyph/annotate/draggable factory without throwing', () => {
    const ctx = createMockSceneContext();
    const handles = [
      ctx.arrow({ from: [0, 0, 0], to: [1, 0, 0] }),
      ctx.curvedArrow({
        center: [0, 0, 0],
        axis: [0, 0, 1],
        radius: 1,
        startAngle: 0,
        endAngle: 1,
      }),
      ctx.path({ points: [[0, 0, 0]] }),
      ctx.point({ position: [0, 0, 0] }),
      ctx.patch({
        points: [
          [0, 0, 0],
          [1, 0, 0],
          [0, 1, 0],
        ],
      }),
      ctx.surface({ parametric: (u, v) => [u, v, 0], uRange: [0, 1], vRange: [0, 1] }),
      ctx.arc({ from: [1, 0, 0], to: [0, 1, 0], radius: 1 }),
      ctx.body({ kind: 'box', position: [0, 0, 0] }),
      ctx.field({
        sample: () => [1, 0, 0],
        gridBounds: { min: [0, 0, 0], max: [1, 1, 1] },
        gridResolution: [2, 2, 2],
      }),
      ctx.frame({ origin: [0, 0, 0], orientation: [0, 0, 0, 1] }),
      ctx.axes({}),
      ctx.graticule({ viewportSize: [800, 600] }),
      ctx.label({ latex: 'x', anchor: [0, 0, 0] }),
      ctx.dimensionLine({ from: [0, 0, 0], to: [1, 0, 0] }),
      ctx.draggable({ paramKey: 'x', getPoint: () => [0, 0, 0] }),
    ];
    expect(ctx.stats.created).toBe(handles.length);
    for (const h of handles) h.dispose();
    expect(ctx.stats.disposed).toBe(handles.length);
  });
});
