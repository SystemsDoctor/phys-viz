/**
 * curvedArrow — rotation sense, torque. Arc with a tangential head.
 * See ARCHITECTURE.md §8. TODO(M2): implement.
 */
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';

export interface CurvedArrowProps {
  group?: GroupHandle;
  center: [number, number, number];
  axis: [number, number, number];
  radius: number;
  startAngle: number;
  endAngle: number;
  color?: string;
  label?: string;
}

export type CurvedArrowHandle = Handle<CurvedArrowProps>;

export function createCurvedArrow(_props: CurvedArrowProps): CurvedArrowHandle {
  throw new Error('scene/glyphs/curvedArrow: not implemented (see M2 in ARCHITECTURE.md §20)');
}
