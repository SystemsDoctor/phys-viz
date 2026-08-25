/**
 * A minimal fake SubstrateHost for unit-testing glyph factories without a
 * real WebGLRenderer (jsdom has no WebGL context at all — Playwright/a
 * real browser is required for that, see tests/e2e/). Every glyph
 * factory only needs plain THREE.Object3D-family objects (Group, Mesh,
 * Geometry, Material) to build/mutate, none of which need a GPU context;
 * only the actual `renderer.render()` call does. This lets us verify a
 * glyph's geometry/material logic directly and cheaply.
 *
 * Not a `*.test.ts` file itself (so it isn't collected as a test suite)
 * — imported BY glyph test files instead.
 */
import * as THREE from 'three';
import type { SubstrateHost, FrameInfo, PickTarget } from './SubstrateHost';

export interface FakeHost extends SubstrateHost {
  /** Manually invoke every registered onFrame listener, as Viewport's render loop would. */
  fireFrame(info?: Partial<FrameInfo>): void;
  readonly root: THREE.Scene;
  readonly registeredPickTargets: PickTarget[];
}

export function createFakeHost(): FakeHost {
  const root = new THREE.Scene();
  const groups = new Map<string, THREE.Group>();
  const listeners = new Set<(info: FrameInfo) => void>();
  const registeredPickTargets: PickTarget[] = [];
  const upAxisValue: 'y' | 'z' = 'y';

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);

  const host: FakeHost = {
    resolveGroup(group) {
      if (!group) return root;
      let g = groups.get(group.id);
      if (!g) {
        g = new THREE.Group();
        root.add(g);
        groups.set(group.id, g);
      }
      return g;
    },
    onFrame(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    overlayEl: document.createElement('div'),
    registerThemedMaterial() {
      return () => {};
    },
    registerPickTarget(target) {
      registeredPickTargets.push(target);
      return () => {
        const i = registeredPickTargets.indexOf(target);
        if (i >= 0) registeredPickTargets.splice(i, 1);
      };
    },
    upAxis: () => upAxisValue,
    projector: () => ({ lineWidthMultiplier: 1, minOpacity: 0 }),
    fireFrame(info) {
      const full: FrameInfo = {
        camera,
        rendererWidth: 800,
        rendererHeight: 600,
        upAxis: upAxisValue,
        dt: 1 / 60,
        ...info,
      };
      for (const listener of listeners) listener(full);
    },
    root,
    registeredPickTargets,
  };
  return host;
}
