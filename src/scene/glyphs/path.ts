/**
 * path — trajectories, field lines. Supports a fading tail with
 * configurable persistence. See ARCHITECTURE.md §8. TODO(M2): implement.
 */
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';

export interface PathProps {
  group?: GroupHandle;
  points: [number, number, number][];
  color?: string;
  persistence?: number;
}

export type PathHandle = Handle<PathProps>;

export function createPath(_props: PathProps): PathHandle {
  throw new Error('scene/glyphs/path: not implemented (see M2 in ARCHITECTURE.md §20)');
}
