/**
 * SceneContext — the object handed to every module's `create(ctx)`.
 * See ARCHITECTURE.md §8 and the module contract in §10.
 *
 * This is the ENTIRE surface area a module author touches in Layer 1.
 * It must never leak a raw `THREE.*` type into its public signatures —
 * modules may not import `three` (enforced by the lint boundary, §6).
 *
 * `MockSceneContext` in `src/modules/testing/` must mirror this API
 * exactly (checked by a type-level test, per the M2 acceptance criterion
 * in §20).
 */

import type { Palette } from './theme';
import type { Handle } from './glyphs/Handle';
import type { ArrowHandle, ArrowProps } from './glyphs/arrow';
import type { CurvedArrowHandle, CurvedArrowProps } from './glyphs/curvedArrow';
import type { PathHandle, PathProps } from './glyphs/path';
import type { PointHandle, PointProps } from './glyphs/point';
import type { PatchHandle, PatchProps } from './glyphs/patch';
import type { SurfaceHandle, SurfaceProps } from './glyphs/surface';
import type { ArcHandle, ArcProps } from './glyphs/arc';
import type { BodyHandle, BodyProps } from './glyphs/body';
import type { FieldHandle, FieldProps } from './glyphs/field';
import type { FrameGlyphHandle, FrameGlyphProps } from './glyphs/frame';
import type { AxesHandle, AxesProps } from './glyphs/axes';
import type { GraticuleHandle, GraticuleProps } from './glyphs/graticule';
import type { LabelHandle, LabelProps } from './annotate/label';
import type { DimensionLineHandle, DimensionLineProps } from './annotate/dimensionLine';

/** ADR 0009 — the only camera-facing thing a module ever reads. */
export type UpAxis = 'y' | 'z';

export interface GroupHandle {
  readonly id: string;
}

/**
 * Declares a draggable pick target for an already-created glyph's
 * anchor point. Registration only — no pointer/mouse code here or in
 * any module; the shell (M3-6) owns pointer events and calls
 * `Viewport.pick()`.
 */
export interface DraggableProps {
  paramKey: string;
  getPoint(): readonly [number, number, number];
  group?: GroupHandle;
  /** Pick radius in screen pixels. Default 14. */
  radiusPx?: number;
}
export type DraggableHandle = Handle<DraggableProps>;

export interface SceneContext {
  readonly palette: Palette;
  /** Live — a later up-axis switch (M3's settings menu) must be visible on the next read. */
  readonly up: UpAxis;

  /**
   * A named, retained group of scene objects. Modules attach glyphs to a
   * group; the shell's layer manager toggles group visibility. Modules
   * never write `if (layers.x)` branches themselves (§9 "Layer manager").
   */
  group(name: string): GroupHandle;

  arrow(props: ArrowProps): ArrowHandle;
  curvedArrow(props: CurvedArrowProps): CurvedArrowHandle;
  path(props: PathProps): PathHandle;
  point(props: PointProps): PointHandle;
  patch(props: PatchProps): PatchHandle;
  surface(props: SurfaceProps): SurfaceHandle;
  arc(props: ArcProps): ArcHandle;
  body(props: BodyProps): BodyHandle;
  field(props: FieldProps): FieldHandle;
  frame(props: FrameGlyphProps): FrameGlyphHandle;
  axes(props: AxesProps): AxesHandle;
  graticule(props: GraticuleProps): GraticuleHandle;

  label(props: LabelProps): LabelHandle;
  dimensionLine(props: DimensionLineProps): DimensionLineHandle;

  draggable(props: DraggableProps): DraggableHandle;
}
