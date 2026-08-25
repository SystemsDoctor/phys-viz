/**
 * surface — parametric surfaces, (u,v) => Vec3, plus optional scalar
 * colouring. Supports wireframe overlay and a clipping plane.
 * See ARCHITECTURE.md §8. TODO(M2): implement.
 */
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';

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

export function createSurface(_props: SurfaceProps): SurfaceHandle {
  throw new Error('scene/glyphs/surface: not implemented (see M2 in ARCHITECTURE.md §20)');
}
