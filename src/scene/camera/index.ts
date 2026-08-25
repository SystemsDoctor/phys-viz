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
 * - `y` is up by default (ADR 0009); user-switchable to `z`. Presets and
 *   "iso" are defined relative to the abstract up axis (a canonical
 *   Y-up frame, remapped into whichever axis is actually up), not a
 *   hardcoded world axis — see `toCanonical`/`fromCanonical` below.
 * - `dimensions: 2` modules lock orbit but keep pan/zoom (ADR 0007) via
 *   `setLockedToPlane`.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { UpAxis } from '../SceneContext';

export type CameraPreset = 'iso' | '+x' | '+y' | '+z' | 'fit';
export type Projection = 'ortho' | 'persp';

export interface CameraState {
  theta: number;
  phi: number;
  radius: number;
  target: [number, number, number];
  projection: Projection;
}

export interface Box3Like {
  center: readonly [number, number, number];
  radius: number;
}

export interface CameraControllerOptions {
  canvas: HTMLCanvasElement;
  upAxis?: UpAxis;
  reducedMotion?: boolean;
}

export interface CameraController {
  goTo(preset: CameraPreset, durationMs?: number, fitBounds?: Box3Like): void;
  setProjection(projection: Projection): void;
  setUpAxis(axis: UpAxis, animate?: boolean): void;
  getUpAxis(): UpAxis;
  setLockedToPlane(locked: boolean): void;
  getState(): CameraState;
  setState(state: CameraState): void;
  /** Internal-only: the currently active camera, for Viewport's render/pick use. */
  readonly object: THREE.Camera;
  resize(width: number, height: number): void;
  /** Advance in-flight tweens and tick OrbitControls. Call once per rendered frame. */
  update(): void;
  dispose(): void;
}

const DEFAULT_DURATION_MS = 400;
const NEAR = 0.01;
const FAR = 1000;
const FOV_DEG = 50;

function cubicEaseInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** World-frame vector -> canonical Y-up frame, given which axis is actually up. */
function toCanonical(v: THREE.Vector3, upAxis: UpAxis): THREE.Vector3 {
  return upAxis === 'y' ? v.clone() : new THREE.Vector3(v.x, v.z, -v.y);
}

/** Canonical Y-up frame -> world frame, given which axis is actually up. */
function fromCanonical(v: THREE.Vector3, upAxis: UpAxis): THREE.Vector3 {
  return upAxis === 'y' ? v.clone() : new THREE.Vector3(v.x, -v.z, v.y);
}

function presetDirectionCanonical(preset: 'iso' | '+x' | '+y' | '+z'): THREE.Vector3 {
  switch (preset) {
    case '+x':
      return new THREE.Vector3(1, 0, 0);
    case '+y':
      return new THREE.Vector3(0, 1, 0);
    case '+z':
      return new THREE.Vector3(0, 0, 1);
    case 'iso':
      return new THREE.Vector3(1, 1, 1).normalize();
  }
}

export function createCameraController(options: CameraControllerOptions): CameraController {
  const { canvas } = options;
  let upAxis: UpAxis = options.upAxis ?? 'y';
  const reducedMotion = options.reducedMotion ?? false;

  const perspCamera = new THREE.PerspectiveCamera(FOV_DEG, 1, NEAR, FAR);
  const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, NEAR, FAR);
  let projection: Projection = 'ortho';
  let activeCamera: THREE.Camera = orthoCamera;

  const target = new THREE.Vector3(0, 0, 0);
  let radius = 6;
  // theta/phi are spherical coordinates of the camera position relative
  // to `target`, in the CANONICAL (Y-up) frame — see toCanonical/fromCanonical.
  let theta = 0;
  let phi = 0;

  let width = 1;
  let height = 1;

  let controls: OrbitControls | null = null;

  function canonicalToWorldPosition(t: number, p: number, r: number): THREE.Vector3 {
    const canonical = new THREE.Vector3().setFromSpherical(new THREE.Spherical(r, p, t));
    return fromCanonical(canonical, upAxis).add(target);
  }

  function worldUpVector(): THREE.Vector3 {
    return fromCanonical(new THREE.Vector3(0, 1, 0), upAxis);
  }

  function applyOrthoFrustum(): void {
    const aspect = width / height || 1;
    const halfHeight = radius * Math.tan((FOV_DEG * Math.PI) / 360);
    const halfWidth = halfHeight * aspect;
    orthoCamera.left = -halfWidth;
    orthoCamera.right = halfWidth;
    orthoCamera.top = halfHeight;
    orthoCamera.bottom = -halfHeight;
    orthoCamera.updateProjectionMatrix();
  }

  function applyPerspAspect(): void {
    perspCamera.aspect = width / height || 1;
    perspCamera.updateProjectionMatrix();
  }

  function rebindControls(): void {
    controls?.dispose();
    controls = new OrbitControls(activeCamera, canvas);
    controls.target.copy(target);
    controls.enableDamping = false;
    controls.update();
  }

  function setCameraTransform(position: THREE.Vector3, up: THREE.Vector3): void {
    perspCamera.position.copy(position);
    orthoCamera.position.copy(position);
    perspCamera.up.copy(up);
    orthoCamera.up.copy(up);
    perspCamera.lookAt(target);
    orthoCamera.lookAt(target);
  }

  function syncFromState(): void {
    const position = canonicalToWorldPosition(theta, phi, radius);
    setCameraTransform(position, worldUpVector());
    applyOrthoFrustum();
    if (controls) controls.target.copy(target);
  }

  perspCamera.position.set(6, 6, 6);
  orthoCamera.position.set(6, 6, 6);
  syncFromState();
  rebindControls();

  /* ------------------------------- tween state ------------------------------- */
  let tween: {
    startMs: number;
    durationMs: number;
    posBefore: THREE.Vector3;
    upBefore: THREE.Vector3;
    posAfter: THREE.Vector3;
    upAfter: THREE.Vector3;
    onDone: () => void;
  } | null = null;

  function startTween(
    posAfter: THREE.Vector3,
    upAfter: THREE.Vector3,
    durationMs: number,
    onDone: () => void,
  ): void {
    const effectiveDuration = reducedMotion ? 0 : durationMs;
    if (effectiveDuration <= 0) {
      setCameraTransform(posAfter, upAfter);
      applyOrthoFrustum();
      onDone();
      return;
    }
    if (controls) controls.enabled = false;
    tween = {
      startMs: performance.now(),
      durationMs: effectiveDuration,
      posBefore: activeCamera.position.clone(),
      upBefore: activeCamera.up.clone(),
      posAfter,
      upAfter,
      onDone,
    };
  }

  function advanceTween(): void {
    if (!tween) return;
    const elapsed = performance.now() - tween.startMs;
    const t = cubicEaseInOut(Math.min(1, elapsed / tween.durationMs));
    const position = tween.posBefore.clone().lerp(tween.posAfter, t);
    const up = tween.upBefore.clone().lerp(tween.upAfter, t).normalize();
    setCameraTransform(position, up);
    applyOrthoFrustum();
    if (t >= 1) {
      tween.onDone();
      tween = null;
      if (controls) controls.enabled = true;
    }
  }

  return {
    get object() {
      return activeCamera;
    },

    goTo(preset, durationMs = DEFAULT_DURATION_MS, fitBounds) {
      if (preset === 'fit') {
        if (fitBounds) {
          target.set(fitBounds.center[0], fitBounds.center[1], fitBounds.center[2]);
          radius = fitBounds.radius * 2.2;
        }
        const posAfter = canonicalToWorldPosition(theta, phi, radius);
        startTween(posAfter, worldUpVector(), durationMs, () => {
          /* theta/phi unchanged; target/radius already committed above */
        });
        return;
      }
      const dirCanonical = presetDirectionCanonical(preset);
      const spherical = new THREE.Spherical().setFromVector3(dirCanonical);
      const nextTheta = spherical.theta;
      const nextPhi = spherical.phi;
      const posAfter = canonicalToWorldPosition(nextTheta, nextPhi, radius);
      startTween(posAfter, worldUpVector(), durationMs, () => {
        theta = nextTheta;
        phi = nextPhi;
      });
    },

    setProjection(next) {
      if (next === projection) return;
      projection = next;
      activeCamera = next === 'ortho' ? orthoCamera : perspCamera;
      applyPerspAspect();
      applyOrthoFrustum();
      rebindControls();
    },

    setUpAxis(axis, animate = true) {
      if (axis === upAxis) return;
      const posBefore = activeCamera.position.clone();
      const upBefore = activeCamera.up.clone();
      upAxis = axis;
      const posAfter = canonicalToWorldPosition(theta, phi, radius);
      const upAfter = worldUpVector();
      if (!animate || reducedMotion) {
        setCameraTransform(posAfter, upAfter);
        applyOrthoFrustum();
        rebindControls();
        return;
      }
      // Reuse the tween machinery directly (bypassing startTween's own
      // posBefore/upBefore capture, since upAxis has already changed above).
      tween = {
        startMs: performance.now(),
        durationMs: DEFAULT_DURATION_MS,
        posBefore,
        upBefore,
        posAfter,
        upAfter,
        onDone: () => rebindControls(),
      };
      if (controls) controls.enabled = false;
    },

    getUpAxis() {
      return upAxis;
    },

    setLockedToPlane(locked) {
      if (!controls) return;
      if (locked) {
        controls.enableRotate = false;
        controls.minPolarAngle = controls.getPolarAngle();
        controls.maxPolarAngle = controls.getPolarAngle();
        controls.minAzimuthAngle = controls.getAzimuthalAngle();
        controls.maxAzimuthAngle = controls.getAzimuthalAngle();
      } else {
        controls.enableRotate = true;
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI;
        controls.minAzimuthAngle = -Infinity;
        controls.maxAzimuthAngle = Infinity;
      }
    },

    getState() {
      return {
        theta,
        phi,
        radius,
        target: [target.x, target.y, target.z],
        projection,
      };
    },

    setState(state) {
      target.set(state.target[0], state.target[1], state.target[2]);
      radius = state.radius;
      theta = state.theta;
      phi = state.phi;
      if (state.projection !== projection) {
        projection = state.projection;
        activeCamera = projection === 'ortho' ? orthoCamera : perspCamera;
      }
      syncFromState();
      rebindControls();
    },

    resize(w, h) {
      width = w;
      height = h;
      applyPerspAspect();
      applyOrthoFrustum();
    },

    update() {
      if (tween) {
        advanceTween();
        return;
      }
      if (!controls) return;
      controls.update();
      // Pan moves controls.target directly; pull it back into our own
      // state so theta/phi/radius stay relative to the right point.
      target.copy(controls.target);
      // OrbitControls dollies (moves position) for a perspective camera
      // on scroll-zoom, but scales `.zoom` in place for an orthographic
      // one — position never changes for ortho. Fold either back into
      // one unified `radius` model immediately, so state serialization
      // (§14) never has to care which projection produced a zoom.
      if (projection === 'ortho' && orthoCamera.zoom !== 1) {
        radius /= orthoCamera.zoom;
        orthoCamera.zoom = 1;
      }
      const relative = toCanonical(activeCamera.position.clone().sub(target), upAxis);
      const spherical = new THREE.Spherical().setFromVector3(relative);
      theta = spherical.theta;
      phi = spherical.phi;
      if (projection === 'persp') radius = spherical.radius;
      applyOrthoFrustum();
    },

    dispose() {
      controls?.dispose();
      controls = null;
    },
  };
}
