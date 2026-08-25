/**
 * frame — nestable coordinate triads. Modules compose these rather than
 * doing their own matrix bookkeeping. See ARCHITECTURE.md §8.
 * TODO(M2): implement.
 */
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';

export interface FrameGlyphProps {
  group?: GroupHandle;
  origin: [number, number, number];
  orientation: [number, number, number, number]; // quaternion
  scale?: number;
  parent?: FrameGlyphHandle;
}

export type FrameGlyphHandle = Handle<FrameGlyphProps>;

export function createFrame(_props: FrameGlyphProps): FrameGlyphHandle {
  throw new Error('scene/glyphs/frame: not implemented (see M2 in ARCHITECTURE.md §20)');
}
