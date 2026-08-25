/**
 * surface — parametric surfaces, (u,v) => Vec3, plus optional scalar
 * colouring. Supports wireframe overlay and a clipping plane.
 * See ARCHITECTURE.md §8.
 *
 * `resolution` defines the mesh TOPOLOGY (vertex/index counts) and is
 * fixed at creation — changing it via `set()` has no effect. Everything
 * else (`parametric`, `colorField`, `wireframe`, `clipPlane`) can change
 * on every `set()` call. No `onFrame` work is needed: unlike a screen-
 * space glyph, a filled surface has a real world-space size, and
 * clipping/colouring don't depend on the camera.
 */
import * as THREE from 'three';
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';

export interface SurfaceProps {
  group?: GroupHandle;
  parametric: (u: number, v: number) => [number, number, number];
  uRange: [number, number];
  vRange: [number, number];
  resolution?: [number, number];
  colorField?: (u: number, v: number) => number;
  wireframe?: boolean;
  clipPlane?: { point: [number, number, number]; normal: [number, number, number] };
}

export type SurfaceHandle = Handle<SurfaceProps>;

const DEFAULT_RESOLUTION: [number, number] = [24, 24];
const LOW_COLOR = new THREE.Color(0x0072b2);
const HIGH_COLOR = new THREE.Color(0xd55e00);
const scratchColor = new THREE.Color();
const scratchNormal = new THREE.Vector3();
const scratchPlanePoint = new THREE.Vector3();

export function createSurface(props: SurfaceProps, host: SubstrateHost): SurfaceHandle {
  const parent = host.resolveGroup(props.group);
  const [uSegments, vSegments] = props.resolution ?? DEFAULT_RESOLUTION;
  const vertexCountU = uSegments + 1;
  const vertexCountV = vSegments + 1;
  const vertexCount = vertexCountU * vertexCountV;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3).fill(1);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const indices: number[] = [];
  for (let vi = 0; vi < vSegments; vi++) {
    for (let ui = 0; ui < uSegments; ui++) {
      const a = vi * vertexCountU + ui;
      const b = a + 1;
      const c = a + vertexCountU;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  geometry.setIndex(indices);

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  parent.add(mesh);
  const unTheme = host.registerThemedMaterial(material, 'fill');

  const wireGeometry = new THREE.WireframeGeometry(geometry);
  const wireMaterial = new THREE.LineBasicMaterial({ color: 0x12161d });
  const wireframeLines = new THREE.LineSegments(wireGeometry, wireMaterial);
  wireframeLines.visible = false;
  parent.add(wireframeLines);
  const unWireTheme = host.registerThemedMaterial(wireMaterial, 'line');

  let clipPlaneObj: THREE.Plane | null = null;

  function applyProps(p: SurfaceProps): void {
    let minScalar = Infinity;
    let maxScalar = -Infinity;
    const scalars: number[] = p.colorField ? new Array(vertexCount) : [];

    for (let vi = 0; vi < vertexCountV; vi++) {
      const v = p.vRange[0] + ((p.vRange[1] - p.vRange[0]) * vi) / vSegments;
      for (let ui = 0; ui < vertexCountU; ui++) {
        const u = p.uRange[0] + ((p.uRange[1] - p.uRange[0]) * ui) / uSegments;
        const index = vi * vertexCountU + ui;
        const [x, y, z] = p.parametric(u, v);
        positions[index * 3] = x;
        positions[index * 3 + 1] = y;
        positions[index * 3 + 2] = z;
        if (p.colorField) {
          const s = p.colorField(u, v);
          scalars[index] = s;
          if (s < minScalar) minScalar = s;
          if (s > maxScalar) maxScalar = s;
        }
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    if (p.colorField) {
      const range = maxScalar - minScalar;
      for (let i = 0; i < vertexCount; i++) {
        const t = range > 1e-12 ? (scalars[i] - minScalar) / range : 0.5;
        scratchColor.copy(LOW_COLOR).lerp(HIGH_COLOR, t);
        colors[i * 3] = scratchColor.r;
        colors[i * 3 + 1] = scratchColor.g;
        colors[i * 3 + 2] = scratchColor.b;
      }
    } else {
      colors.fill(1);
    }
    geometry.attributes.color.needsUpdate = true;

    wireframeLines.visible = !!p.wireframe;
    if (p.wireframe) {
      const rebuilt = new THREE.WireframeGeometry(geometry);
      wireframeLines.geometry.dispose();
      wireframeLines.geometry = rebuilt;
    }

    if (p.clipPlane) {
      if (!clipPlaneObj) clipPlaneObj = new THREE.Plane();
      scratchNormal.set(...p.clipPlane.normal);
      scratchPlanePoint.set(...p.clipPlane.point);
      clipPlaneObj.setFromNormalAndCoplanarPoint(scratchNormal, scratchPlanePoint);
      material.clippingPlanes = [clipPlaneObj];
    } else {
      material.clippingPlanes = [];
    }
  }

  let current: SurfaceProps = { ...props };
  applyProps(current);

  return {
    set(next) {
      current = { ...current, ...next };
      applyProps(current);
    },
    visible(show) {
      mesh.visible = show;
      wireframeLines.visible = show && !!current.wireframe;
    },
    dispose() {
      unTheme();
      unWireTheme();
      parent.remove(mesh);
      parent.remove(wireframeLines);
      geometry.dispose();
      material.dispose();
      wireGeometry.dispose();
      wireMaterial.dispose();
    },
  };
}
