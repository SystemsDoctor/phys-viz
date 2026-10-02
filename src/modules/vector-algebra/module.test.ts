import { describe, it, expect } from 'vitest';
import type { SceneContext } from '@/scene/SceneContext';
import module from './index';

// A minimal structural stand-in for SceneContext, built locally rather
// than importing MockSceneContext — modules may not import a sibling
// module (or `modules/testing`) via any path (ARCHITECTURE.md §6).
const noopHandle = { set: () => {}, visible: () => {}, dispose: () => {} };
const fakeCtx = new Proxy({} as SceneContext, {
  get(_target, prop) {
    if (prop === 'palette') return new Proxy({}, { get: () => '#000000' });
    if (prop === 'up') return 'y';
    if (prop === 'group') return (name: string) => ({ id: name });
    return () => noopHandle;
  },
});

describe(module.manifest.id, () => {
  it('has a manifest id matching its folder name', () => {
    expect(module.manifest.id).toBe('vector-algebra');
  });

  it('declares urlKeys that are unique and <= 4 characters', () => {
    const keys = module.params.map((p) => p.urlKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k.length).toBeLessThanOrEqual(4);
  });

  it('golden values: orthogonal unit vectors, a right-angle box', () => {
    const instance = module.create(fakeCtx);
    const s = instance.scalars({
      params: {
        a: [1, 0, 0],
        b: [0, 1, 0],
        c: [0, 0, 1],
        sumStyle: 'tip',
        planar: false,
        basisAngle: 0,
      },
      layers: {},
      t: 0,
    });

    expect(s.dot).toBeCloseTo(0, 12);
    expect(s.theta).toBeCloseTo(90, 12);
    expect(s.xmag).toBeCloseTo(1, 12); // |x^ x y^| = 1, and equals z^
    expect(s.volume).toBeCloseTo(1, 12); // unit cube
    expect(s.cosAlpha).toBeCloseTo(1, 12); // a = x^ itself
    expect(s.cosBeta).toBeCloseTo(0, 12);
    expect(s.cosGamma).toBeCloseTo(0, 12);
  });

  it('golden values: restricting to the xy-plane collapses the parallelepiped to zero volume', () => {
    const instance = module.create(fakeCtx);
    const s = instance.scalars({
      params: {
        a: [3, 1, 0],
        b: [1, 3, 1],
        c: [0, 0, 2],
        sumStyle: 'tip',
        planar: true,
        basisAngle: 0,
      },
      layers: {},
      t: 0,
    });

    // planar mode zeroes every vector's z-component before the triple
    // product, so three coplanar vectors span zero volume.
    expect(s.volume).toBeCloseTo(0, 12);
    expect(s.cosGamma).toBeCloseTo(0, 12);
  });

  // X-47 golden test: asserts what actually reaches the resultant
  // arrow's own .set() — a readout-only check can't see this, since
  // scalars() doesn't expose a+b at all. The bug: the arrow LABELED
  // "a+b" ran from a to a+b (length |b|, not the resultant) in 'tip'
  // mode, with no true resultant ever drawn from the origin.
  it('the resultant arrow always runs from the origin to a+b, in both sumStyle modes', () => {
    let capturedArrows: [number, number, number][] = [];
    const arrowCtx = new Proxy({} as SceneContext, {
      get(_target, prop) {
        if (prop === 'palette') return new Proxy({}, { get: () => '#000000' });
        if (prop === 'up') return 'y';
        if (prop === 'group') return (name: string) => ({ id: name });
        if (prop === 'arrow') {
          return (props: { label?: string; from: [number, number, number] }) => {
            const isResultant = props.label === '\\vec{a}+\\vec{b}';
            return {
              set: (next: { from?: [number, number, number]; to?: [number, number, number] }) => {
                if (isResultant && next.from && next.to) capturedArrows.push(next.from, next.to);
              },
              visible: () => {},
              dispose: () => {},
            };
          };
        }
        return () => noopHandle;
      },
    });

    const instance = module.create(arrowCtx);
    const a: [number, number, number] = [2, 1, 0];
    const b: [number, number, number] = [1, 3, 0];
    const expectedSum: [number, number, number] = [3, 4, 0];

    for (const sumStyle of ['tip', 'para']) {
      capturedArrows = [];
      instance.update({
        params: { a, b, c: [0, 0, 1], sumStyle, planar: false, basisAngle: 0 },
        layers: {},
        t: 0,
      });
      const [from, to] = capturedArrows;
      expect(from).toEqual([0, 0, 0]); // always from the origin — never from a
      expect(to).toEqual(expectedSum);
    }
  });

  // X-42 golden test: `planar` used to always drop world Z regardless of
  // `ctx.up`, collapsing to a degenerate line along world Y under z-up
  // (Y is the GLOBAL 2D-lock camera's depth axis there,
  // `scene/camera/index.ts`'s `fromCanonical`) instead of along the
  // camera's actual depth axis. Captures the resultant arrow's actual
  // `.set({to})` under z-up, same capture pattern as the test above.
  it('under z-up, `planar` drops world Y (the 2D-lock depth axis there), not world Z', () => {
    let capturedTo: [number, number, number] | null = null;
    const zUpCtx = new Proxy({} as SceneContext, {
      get(_target, prop) {
        if (prop === 'palette') return new Proxy({}, { get: () => '#000000' });
        if (prop === 'up') return 'z';
        if (prop === 'group') return (name: string) => ({ id: name });
        if (prop === 'arrow') {
          return (props: { label?: string }) => ({
            set: (next: { to?: [number, number, number] }) => {
              if (props.label === '\\vec{a}+\\vec{b}' && next.to) capturedTo = next.to;
            },
            visible: () => {},
            dispose: () => {},
          });
        }
        return () => noopHandle;
      },
    });

    const instance = module.create(zUpCtx);
    // a + b has a nonzero component along every world axis; planar mode
    // must zero exactly the one component (world Y, index 1) that's the
    // camera's depth axis under z-up.
    instance.update({
      params: {
        a: [1, 5, 2],
        b: [1, -1, 1],
        c: [0, 0, 1],
        sumStyle: 'tip',
        planar: true,
        basisAngle: 0,
      },
      layers: {},
      t: 0,
    });

    expect(capturedTo).toEqual([2, 0, 3]); // a+b = [2, 4, 3] with world Y zeroed
  });

  // X-51: theta and the direction cosines used to be NaN for a zero vector,
  // and for (anti)parallel vectors whose cosine rounds just outside [-1, 1].
  describe('degenerate vectors never produce NaN readouts (X-51)', () => {
    const scalarsFor = (a: [number, number, number], b: [number, number, number]) =>
      module.create(fakeCtx).scalars({
        params: {
          a,
          b,
          c: [0, 0, 1],
          sumStyle: 'tip',
          planar: false,
          basisAngle: 0,
        },
        layers: {},
        t: 0,
      });

    it('b = -0.5 a with a = [-0.5, 0, -3] (cos = -1.0000000000000004) reports theta = 180', () => {
      const a: [number, number, number] = [-0.5, 0, -3];
      const b: [number, number, number] = [0.25, -0, 1.5]; // exactly -0.5 * a
      // The reproduction from the audit: the raw cosine falls outside [-1, 1].
      const rawCos =
        (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b));
      expect(rawCos).toBeLessThan(-1);
      const s = scalarsFor(a, b);
      expect(Number.isNaN(s.theta)).toBe(false);
      expect(s.theta).toBeCloseTo(180, 9);
    });

    it('an exactly parallel pair whose cosine rounds above 1 reports theta = 0', () => {
      const s = scalarsFor([0.1, 0.2, 0.3], [0.3, 0.6, 0.9]);
      expect(Number.isNaN(s.theta)).toBe(false);
      expect(s.theta).toBeCloseTo(0, 6);
    });

    it('a = 0 gives finite theta and direction cosines (all zero / zero angle), not NaN', () => {
      const s = scalarsFor([0, 0, 0], [1, 2, 3]);
      for (const key of ['theta', 'cosAlpha', 'cosBeta', 'cosGamma'] as const) {
        expect(Number.isNaN(s[key])).toBe(false);
      }
      expect(s.cosAlpha).toBe(0);
      expect(s.cosBeta).toBe(0);
      expect(s.cosGamma).toBe(0);
    });

    it('b = 0 gives a finite theta too', () => {
      expect(Number.isNaN(scalarsFor([1, 2, 3], [0, 0, 0]).theta)).toBe(false);
    });
  });
});
