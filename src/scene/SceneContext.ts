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
 *
 * TODO(M2): implement against the real glyph factories once they exist.
 */

import type { Palette } from './theme';
import type { ArrowHandle, ArrowProps } from './glyphs/arrow';
import type { PatchHandle, PatchProps } from './glyphs/patch';
import type { ArcHandle, ArcProps } from './glyphs/arc';
// Additional glyph handle/prop types are added here as glyphs/* are implemented.

export interface GroupHandle {
  readonly id: string;
}

export interface SceneContext {
  readonly palette: Palette;

  /**
   * A named, retained group of scene objects. Modules attach glyphs to a
   * group; the shell's layer manager toggles group visibility. Modules
   * never write `if (layers.x)` branches themselves (§9 "Layer manager").
   */
  group(name: string): GroupHandle;

  arrow(props: ArrowProps): ArrowHandle;
  patch(props: PatchProps): PatchHandle;
  arc(props: ArcProps): ArcHandle;
  // curvedArrow(props): CurvedArrowHandle;
  // path(props): PathHandle;
  // point(props): PointHandle;
  // surface(props): SurfaceHandle;
  // body(props): BodyHandle;
  // field(props): FieldHandle;
  // frame(props): FrameHandle;
  // axes(props): AxesHandle;
}
