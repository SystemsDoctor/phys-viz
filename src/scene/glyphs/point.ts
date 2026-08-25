/**
 * point — particles, markers. Screen-space constant size.
 * See ARCHITECTURE.md §8. TODO(M2): implement.
 */
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';

export interface PointProps {
  group?: GroupHandle;
  position: [number, number, number];
  color?: string;
  sizePx?: number;
}

export type PointHandle = Handle<PointProps>;

export function createPoint(_props: PointProps): PointHandle {
  throw new Error('scene/glyphs/point: not implemented (see M2 in ARCHITECTURE.md §20)');
}
