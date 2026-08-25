/**
 * arc — angle annotations. With optional label at midpoint.
 * See ARCHITECTURE.md §8. TODO(M2): implement.
 */
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';

export interface ArcProps {
  group?: GroupHandle;
  from: [number, number, number];
  to: [number, number, number];
  radius: number;
  color?: string;
  label?: string;
}

export type ArcHandle = Handle<ArcProps>;

export function createArc(_props: ArcProps): ArcHandle {
  throw new Error('scene/glyphs/arc: not implemented (see M2 in ARCHITECTURE.md §20)');
}
