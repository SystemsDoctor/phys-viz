/**
 * SubstrateHost — the seam between glyph/annotate factories and the
 * real three.js internals (`Viewport` implements this; nothing outside
 * `src/scene/**` ever sees it, and it is never re-exported from
 * `scene/index.ts`).
 *
 * `SceneContext.ts` (the module-facing surface) must never leak a
 * `THREE.*` type into its own signatures. Every glyph/annotate factory
 * DOES need real access to the scene graph, the camera, and the DOM —
 * this interface is exactly that access, kept out of the public
 * contract. A glyph factory receives one of these as a second
 * parameter alongside its public `Props`.
 */
import type * as THREE from 'three';
import type { GroupHandle, UpAxis } from '../SceneContext';

export interface FrameInfo {
  camera: THREE.Camera;
  rendererWidth: number;
  rendererHeight: number;
  upAxis: UpAxis;
  /** Seconds since the previous RENDERED frame (not wall-clock — renderOnDemand skips frames). */
  dt: number;
}

export interface ProjectorAdjustments {
  lineWidthMultiplier: number;
  minOpacity: number;
}

export interface PickTarget {
  paramKey: string;
  getPoint(): readonly [number, number, number];
  radiusPx: number;
  isVisible(): boolean;
}

export interface SubstrateHost {
  /** Resolve a public, opaque GroupHandle to the real Object3D to attach to. */
  resolveGroup(group?: GroupHandle): THREE.Object3D;

  /**
   * Register a per-rendered-frame callback (screen-space sizing, live
   * ticks, label reprojection). Returns an unsubscribe — every glyph's
   * `dispose()` MUST call the unsubscribe it got at creation.
   */
  onFrame(listener: (info: FrameInfo) => void): () => void;

  /** DOM container, sized/positioned to track the canvas, for HTML overlays (labels, graticule). */
  readonly overlayEl: HTMLElement;

  /**
   * Register a material whose linewidth/opacity should track projector
   * mode. Applied immediately at the current setting; re-applied
   * whenever projector mode toggles. Returns an unregister.
   */
  registerThemedMaterial(material: THREE.Material, kind: 'line' | 'fill'): () => void;

  /** Register a pick/drag target (backs `ctx.draggable` / `Viewport.pick`). Returns an unregister. */
  registerPickTarget(target: PickTarget): () => void;

  /** Live — a module reading this after an up-axis switch must see the new value. */
  upAxis(): UpAxis;
  /** Live. */
  projector(): ProjectorAdjustments;
}
