import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createPatch } from './patch';
import { createFakeHost } from '../internal/fakeHost.test-utils';

function getMesh(host: ReturnType<typeof createFakeHost>): THREE.Mesh {
  return host.root.children[0] as THREE.Mesh;
}

/**
 * A fake host whose `registerThemedMaterial` behaves like the real
 * Viewport's: it records the material's CURRENT opacity as the base and
 * immediately applies the projector floor `max(base, minOpacity)`.
 * Returns the host plus a `setFloor` that re-applies it to everything
 * registered (a projector toggle).
 */
function createFloorHost(minOpacity: number) {
  const host = createFakeHost();
  const registered = new Map<THREE.Material, number>();
  let floor = minOpacity;
  const apply = (m: THREE.Material): void => {
    const base = registered.get(m) as number;
    if (base < 1) m.opacity = Math.max(base, floor);
  };
  host.registerThemedMaterial = (material) => {
    registered.set(material, material.opacity);
    apply(material);
    return () => registered.delete(material);
  };
  return {
    host,
    setFloor(next: number) {
      floor = next;
      for (const m of registered.keys()) apply(m);
    },
  };
}

describe('createPatch', () => {
  // X-61: applyProps ran `material.opacity = p.opacity ?? DEFAULT` after the
  // host had recorded the base and applied the projector floor, clobbering
  // it, and again on every set().
  it('keeps the projector opacity floor at creation (X-61)', () => {
    const { host } = createFloorHost(0.5);
    const handle = createPatch(
      {
        points: [
          [0, 0, 0],
          [1, 0, 0],
          [0, 1, 0],
        ],
        opacity: 0.18,
      },
      host,
    );
    const material = getMesh(host).material as THREE.MeshBasicMaterial;
    expect(material.opacity).toBe(0.5);
    handle.dispose();
  });

  it('keeps the floor across set() with the same or a different opacity (X-61)', () => {
    const { host } = createFloorHost(0.5);
    const tri = [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ] as const;
    const handle = createPatch({ points: [...tri], opacity: 0.18 }, host);
    const material = getMesh(host).material as THREE.MeshBasicMaterial;
    handle.set({
      points: [
        [0, 0, 0],
        [2, 0, 0],
        [0, 2, 0],
      ],
    });
    expect(material.opacity).toBe(0.5);
    handle.set({ opacity: 0.3 });
    expect(material.opacity).toBe(0.5);
    handle.set({ opacity: 0.8 }); // above the floor: the module's value wins
    expect(material.opacity).toBe(0.8);
    handle.set({ opacity: 0.1 }); // base must have been re-recorded
    expect(material.opacity).toBe(0.5);
    handle.dispose();
  });

  it('records the module opacity as the base, so toggling the floor off restores it (X-61)', () => {
    const { host, setFloor } = createFloorHost(0.5);
    const handle = createPatch(
      {
        points: [
          [0, 0, 0],
          [1, 0, 0],
          [0, 1, 0],
        ],
        opacity: 0.18,
      },
      host,
    );
    const material = getMesh(host).material as THREE.MeshBasicMaterial;
    setFloor(0);
    expect(material.opacity).toBe(0.18);
    setFloor(0.5);
    expect(material.opacity).toBe(0.5);
    handle.set({ opacity: 0.2 });
    setFloor(0);
    expect(material.opacity).toBe(0.2);
    handle.dispose();
  });

  it('fan-triangulates a quad into 2 triangles', () => {
    const host = createFakeHost();
    const handle = createPatch(
      {
        points: [
          [0, 0, 0],
          [1, 0, 0],
          [1, 1, 0],
          [0, 1, 0],
        ],
      },
      host,
    );
    const mesh = getMesh(host);
    expect(mesh.geometry.drawRange.count).toBe(6); // 2 triangles * 3 vertices
    handle.dispose();
  });

  it('a triangle produces exactly 1 triangle', () => {
    const host = createFakeHost();
    const handle = createPatch(
      {
        points: [
          [0, 0, 0],
          [1, 0, 0],
          [0, 1, 0],
        ],
      },
      host,
    );
    const mesh = getMesh(host);
    expect(mesh.geometry.drawRange.count).toBe(3);
    handle.dispose();
  });

  it('is double-sided and does not write depth (transparency correctness)', () => {
    const host = createFakeHost();
    const handle = createPatch(
      {
        points: [
          [0, 0, 0],
          [1, 0, 0],
          [0, 1, 0],
        ],
      },
      host,
    );
    const mesh = getMesh(host);
    const material = mesh.material as THREE.MeshBasicMaterial;
    expect(material.side).toBe(THREE.DoubleSide);
    expect(material.depthWrite).toBe(false);
    expect(material.transparent).toBe(true);
    handle.dispose();
  });

  it('degenerates to zero triangles for fewer than 3 points', () => {
    const host = createFakeHost();
    const handle = createPatch(
      {
        points: [
          [0, 0, 0],
          [1, 0, 0],
        ],
      },
      host,
    );
    const mesh = getMesh(host);
    expect(mesh.geometry.drawRange.count).toBe(0);
    handle.dispose();
  });

  it('dispose removes the mesh from its parent', () => {
    const host = createFakeHost();
    const handle = createPatch(
      {
        points: [
          [0, 0, 0],
          [1, 0, 0],
          [0, 1, 0],
        ],
      },
      host,
    );
    handle.dispose();
    expect(host.root.children.length).toBe(0);
  });
});
