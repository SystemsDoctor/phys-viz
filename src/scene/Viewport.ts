/**
 * Viewport — owns the canvas, WebGLRenderer, resize observer, and the
 * SINGLE requestAnimationFrame loop for the whole app (ARCHITECTURE.md §8).
 *
 * Supports `renderOnDemand`: when time is paused and no parameter is
 * changing, stop rendering entirely (battery; keeps fans quiet in a
 * lecture hall). `requestRender()` marks the next frame dirty; camera
 * interaction (orbit/pan/zoom, presets, up-axis switches) marks it dirty
 * automatically via `camera.onChange`.
 *
 * Composition root for Layer 1: constructs the camera controller and the
 * SubstrateHost implementation glyphs/annotate factories need, then
 * builds `ctx` (the real SceneContext) from them. This is the only file
 * (besides glyphs/, camera/, annotate/, theme/) that imports `three`.
 *
 * Disposal ownership: a module's own `dispose()` is responsible for
 * disposing every handle IT created (per §3 principle 3/§18's contract).
 * `Viewport.dispose()` only tears down what Viewport itself allocated —
 * the renderer, the camera, the DOM overlay, and its own bookkeeping.
 */
import * as THREE from 'three';
import { raySphereIntersect } from '@/kernel/geometry';
import { createCameraController } from './camera';
import type { CameraController } from './camera';
import { createSceneContext } from './createSceneContext';
import type { SceneContext, GroupHandle, UpAxis } from './SceneContext';
import type { SubstrateHost, FrameInfo, PickTarget } from './internal/SubstrateHost';
import { worldUnitsPerPixel } from './internal/screenSpace';
import { getProjectorAdjustments } from './theme';

export interface ViewportOptions {
  canvas: HTMLCanvasElement;
  renderOnDemand?: boolean;
  upAxis?: UpAxis;
  projectorMode?: boolean;
  reducedMotion?: boolean;
}

export interface PickHit {
  paramKey: string;
  point: readonly [number, number, number];
  distance: number;
}

interface MaterialBase {
  opacity: number;
  linewidth: number;
}

export class Viewport {
  readonly ctx: SceneContext;
  readonly camera: CameraController;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly groups = new Map<string, THREE.Group>();
  private readonly frameListeners = new Set<(info: FrameInfo) => void>();
  private readonly themedMaterials: { line: Set<THREE.Material>; fill: Set<THREE.Material> } = {
    line: new Set(),
    fill: new Set(),
  };
  private readonly materialBase = new WeakMap<THREE.Material, MaterialBase>();
  private readonly pickTargets = new Set<PickTarget>();
  private readonly overlayEl: HTMLDivElement;
  private readonly resizeObserver: ResizeObserver;
  private readonly cameraChangeUnsub: () => void;
  private readonly canvas: HTMLCanvasElement;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pickScratchVec3 = new THREE.Vector3();
  private readonly pickScratchVec2 = new THREE.Vector2();

  private readonly renderOnDemand: boolean;
  private dirty = true;
  private projectorModeOn: boolean;
  private width = 1;
  private height = 1;
  private frameId = 0;
  private lastFrameTimeMs = 0;
  private disposed = false;
  private readonly onWindowChange = (): void => this.syncOverlayRect();

  constructor(options: ViewportOptions) {
    this.canvas = options.canvas;
    this.renderOnDemand = options.renderOnDemand ?? false;
    this.projectorModeOn = options.projectorMode ?? false;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Required for the `surface` glyph's clipPlane (§8) to take effect.
    this.renderer.localClippingEnabled = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xeceef2);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(3, 4, 5);
    this.scene.add(keyLight);

    this.camera = createCameraController({
      canvas: this.canvas,
      upAxis: options.upAxis ?? 'y',
      reducedMotion: options.reducedMotion ?? false,
    });
    this.cameraChangeUnsub = this.camera.onChange(() => this.requestRender());

    this.overlayEl = document.createElement('div');
    this.overlayEl.style.position = 'fixed';
    this.overlayEl.style.pointerEvents = 'none';
    this.overlayEl.style.overflow = 'visible';
    this.overlayEl.style.left = '0';
    this.overlayEl.style.top = '0';
    document.body.appendChild(this.overlayEl);
    window.addEventListener('resize', this.onWindowChange);
    window.addEventListener('scroll', this.onWindowChange, true);
    this.syncOverlayRect();

    const host: SubstrateHost = {
      resolveGroup: (group) => this.resolveGroup(group),
      onFrame: (listener) => {
        this.frameListeners.add(listener);
        return () => this.frameListeners.delete(listener);
      },
      overlayEl: this.overlayEl,
      registerThemedMaterial: (material, kind) => this.registerThemedMaterial(material, kind),
      registerPickTarget: (target) => {
        this.pickTargets.add(target);
        return () => this.pickTargets.delete(target);
      },
      upAxis: () => this.camera.getUpAxis(),
      projector: () => getProjectorAdjustments(this.projectorModeOn),
    };

    this.ctx = createSceneContext(host);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.canvas);
    this.handleResize();

    this.frameId = requestAnimationFrame(this.tick);
  }

  requestRender(): void {
    this.dirty = true;
  }

  setProjectorMode(on: boolean): void {
    this.projectorModeOn = on;
    for (const kind of ['line', 'fill'] as const) {
      for (const material of this.themedMaterials[kind])
        this.applyProjectorToMaterial(material, kind);
    }
    this.requestRender();
  }

  /** Ray-cast against every visible registered draggable target. `x`/`y` are CSS pixels, canvas-relative. */
  pick(x: number, y: number): PickHit | null {
    this.pickScratchVec2.set((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pickScratchVec2, this.camera.object);
    const origin: readonly [number, number, number] = [
      this.raycaster.ray.origin.x,
      this.raycaster.ray.origin.y,
      this.raycaster.ray.origin.z,
    ];
    const direction: readonly [number, number, number] = [
      this.raycaster.ray.direction.x,
      this.raycaster.ray.direction.y,
      this.raycaster.ray.direction.z,
    ];

    let best: PickHit | null = null;
    let bestDistance = Infinity;
    for (const target of this.pickTargets) {
      if (!target.isVisible()) continue;
      const point = target.getPoint();
      this.pickScratchVec3.set(point[0], point[1], point[2]);
      const distanceToPoint = this.raycaster.ray.origin.distanceTo(this.pickScratchVec3);
      const worldRadius =
        target.radiusPx * worldUnitsPerPixel(this.camera.object, distanceToPoint, this.height);
      const hit = raySphereIntersect(origin, direction, point, worldRadius);
      if (!hit) continue;
      const dx = hit[0] - origin[0];
      const dy = hit[1] - origin[1];
      const dz = hit[2] - origin[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { paramKey: target.paramKey, point, distance };
      }
    }
    return best;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.cameraChangeUnsub();
    this.camera.dispose();
    window.removeEventListener('resize', this.onWindowChange);
    window.removeEventListener('scroll', this.onWindowChange, true);
    this.overlayEl.remove();
    this.renderer.dispose();
  }

  /* ------------------------------- internals ------------------------------- */

  private resolveGroup(group?: GroupHandle): THREE.Object3D {
    if (!group) return this.scene;
    let existing = this.groups.get(group.id);
    if (!existing) {
      existing = new THREE.Group();
      existing.name = group.id;
      this.scene.add(existing);
      this.groups.set(group.id, existing);
    }
    return existing;
  }

  private registerThemedMaterial(material: THREE.Material, kind: 'line' | 'fill'): () => void {
    const withLinewidth = material as THREE.Material & { linewidth?: number };
    this.materialBase.set(material, {
      opacity: material.opacity,
      linewidth: withLinewidth.linewidth ?? 1,
    });
    this.themedMaterials[kind].add(material);
    this.applyProjectorToMaterial(material, kind);
    return () => this.themedMaterials[kind].delete(material);
  }

  private applyProjectorToMaterial(material: THREE.Material, kind: 'line' | 'fill'): void {
    const base = this.materialBase.get(material);
    if (!base) return;
    const adjustments = getProjectorAdjustments(this.projectorModeOn);
    if (kind === 'line') {
      // Note: WebGL's gl.lineWidth is unsupported (clamped to 1px) in
      // most desktop browser/GPU combinations regardless of this value —
      // a three.js/WebGL platform limitation, not something fixable
      // here. Setting it is still correct; it takes effect wherever the
      // platform honours it (e.g. some non-ANGLE GPUs, Firefox).
      (material as THREE.Material & { linewidth: number }).linewidth =
        base.linewidth * adjustments.lineWidthMultiplier;
    }
    if (base.opacity < 1) {
      material.opacity = Math.max(base.opacity, adjustments.minOpacity);
      material.transparent = true;
    }
    material.needsUpdate = true;
  }

  private syncOverlayRect(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.overlayEl.style.left = `${rect.left}px`;
    this.overlayEl.style.top = `${rect.top}px`;
    this.overlayEl.style.width = `${rect.width}px`;
    this.overlayEl.style.height = `${rect.height}px`;
  }

  private handleResize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0) return;
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.camera.resize(width, height);
    this.syncOverlayRect();
    this.requestRender();
  }

  private readonly tick = (nowMs: number): void => {
    this.camera.update();
    const shouldRender = !this.renderOnDemand || this.dirty;
    if (shouldRender) {
      const dt = this.lastFrameTimeMs ? (nowMs - this.lastFrameTimeMs) / 1000 : 0;
      const info: FrameInfo = {
        camera: this.camera.object,
        rendererWidth: this.width,
        rendererHeight: this.height,
        upAxis: this.camera.getUpAxis(),
        dt,
      };
      for (const listener of this.frameListeners) listener(info);
      this.renderer.render(this.scene, this.camera.object);
      this.dirty = false;
      this.lastFrameTimeMs = nowMs;
    }
    this.frameId = requestAnimationFrame(this.tick);
  };
}
