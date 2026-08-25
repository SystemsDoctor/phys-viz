/**
 * scene/camera — wraps OrbitControls. Never used directly by modules.
 * See ARCHITECTURE.md §8.
 *
 * - Orthographic <-> perspective toggle. Orthographic MUST be the default
 *   for any module about components, projections, or angles — reading a
 *   vector's components off a perspective projection is misleading. This
 *   is a pedagogical requirement, not a preference.
 * - Preset views: +X, +Y, +Z, isometric, "fit to content", each animated
 *   over ~400ms with an ease so students keep their spatial bearings.
 *   Instant camera cuts are disorienting.
 * - Camera state is part of serialized state (§14) so a bookmarked demo
 *   restores the viewing angle.
 *
 * TODO(M2): implement per ARCHITECTURE.md §8.
 */

export type CameraPreset = 'iso' | '+x' | '+y' | '+z' | 'fit';
export type Projection = 'ortho' | 'persp';

export interface CameraState {
  theta: number;
  phi: number;
  radius: number;
  target: [number, number, number];
  projection: Projection;
}

export interface CameraController {
  goTo(preset: CameraPreset, durationMs?: number): void;
  setProjection(projection: Projection): void;
  getState(): CameraState;
  setState(state: CameraState): void;
}

export function createCameraController(_canvas: HTMLCanvasElement): CameraController {
  throw new Error('scene/camera: not implemented (see M2 in ARCHITECTURE.md §20)');
}
