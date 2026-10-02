/**
 * surface — parametric surfaces, (u,v) => Vec3, plus optional scalar
 * colouring. Supports wireframe overlay and a clipping plane.
 * See ARCHITECTURE.md §8.
 *
 * `resolution` defines the mesh TOPOLOGY (vertex/index counts) and is
 * fixed at creation — changing it via `set()` has no effect. Everything
 * else (`parametric`, `colorField`, `wireframe`, `clipPlane`) can change
 * on every `set()` call. The filled surface needs no `onFrame` work
 * (it has a real world-space size, and clipping/colouring don't depend
 * on the camera); only the wireframe overlay's `LineMaterial` needs the
 * renderer size every frame (X-49, ADR 0020).
 *
 * The wireframe is a `LineSegments2` (so projector mode can really
 * thicken it — `THREE.LineSegments` is clamped to 1px by ANGLE). Because
 * the topology is fixed, its edge list is computed ONCE at construction
 * and each `set()` only rewrites the edge endpoints in place — nothing
 * is rebuilt or reallocated per `set()`.
 */
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';
import { rawPositionBuffer, markPositionBufferDirty } from '../internal/line2';

export interface SurfaceProps {
  group?: GroupHandle;
  parametric: (u: number, v: number) => [number, number, number];
  uRange: [number, number];
  vRange: [number, number];
  resolution?: [number, number];
  colorField?: (u: number, v: number) => number;
  /**
   * Fixed `[low, high]` scalar range the colour ramp maps onto (values
   * outside are clamped). Omitted: the ramp spans this surface's OWN
   * min..max, so a surface with a uniform scalar always renders
   * mid-colour. Pass the same range to several surfaces to make their
   * colours comparable across surfaces (X-45).
   */
  colorRange?: [number, number];
  wireframe?: boolean;
  clipPlane?: { point: [number, number, number]; normal: [number, number, number] };
}

export type SurfaceHandle = Handle<SurfaceProps>;

// X-49: pixel screen-space width (see arrow.ts) — thin, since a dense mesh
// of thick lines would swamp the surface it annotates.
const WIREFRAME_LINE_WIDTH_PX = 1.5;
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

  // Unique triangle edges (a quad's two triangles share its diagonal; a
  // grid's interior edges are shared by neighbours), same set
  // `THREE.WireframeGeometry` would emit — as vertex-index pairs.
  const edgePairs: number[] = [];
  const seenEdges = new Set<number>();
  for (let t = 0; t < indices.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const i0 = indices[t + k];
      const i1 = indices[t + ((k + 1) % 3)];
      const lo = Math.min(i0, i1);
      const hi = Math.max(i0, i1);
      const key = lo * vertexCount + hi;
      if (seenEdges.has(key)) continue;
      seenEdges.add(key);
      edgePairs.push(i0, i1);
    }
  }
  const edgeCount = edgePairs.length / 2;

  const wireGeometry = new LineSegmentsGeometry();
  wireGeometry.setPositions(new Float32Array(edgeCount * 6));
  const wirePositions = rawPositionBuffer(wireGeometry);
  const wireMaterial = new LineMaterial({
    color: 0x12161d,
    linewidth: WIREFRAME_LINE_WIDTH_PX,
    worldUnits: false,
  });
  const wireframeLines = new LineSegments2(wireGeometry, wireMaterial);
  wireframeLines.visible = false;
  parent.add(wireframeLines);
  const unWireTheme = host.registerThemedMaterial(wireMaterial, 'line');
  const unFrame = host.onFrame((info) => {
    wireMaterial.resolution.set(info.rendererWidth, info.rendererHeight);
  });

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
      const lo = p.colorRange ? p.colorRange[0] : minScalar;
      const range = (p.colorRange ? p.colorRange[1] : maxScalar) - lo;
      for (let i = 0; i < vertexCount; i++) {
        const raw = range > 1e-12 ? (scalars[i] - lo) / range : 0.5;
        const t = raw < 0 ? 0 : raw > 1 ? 1 : raw;
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
      for (let e = 0; e < edgeCount; e++) {
        const a = edgePairs[e * 2] * 3;
        const b = edgePairs[e * 2 + 1] * 3;
        const o = e * 6;
        wirePositions[o] = positions[a];
        wirePositions[o + 1] = positions[a + 1];
        wirePositions[o + 2] = positions[a + 2];
        wirePositions[o + 3] = positions[b];
        wirePositions[o + 4] = positions[b + 1];
        wirePositions[o + 5] = positions[b + 2];
      }
      markPositionBufferDirty(wireGeometry);
      wireGeometry.computeBoundingSphere();
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
      unFrame();
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
