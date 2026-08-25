/**
 * axes — world axes with ticks. Ticks are live: labels reflect current
 * world-unit spacing as you zoom. See ARCHITECTURE.md §8.
 * TODO(M2): implement.
 */
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';

export interface AxesProps {
  group?: GroupHandle;
  extent?: number;
  showTicks?: boolean;
}

export type AxesHandle = Handle<AxesProps>;

export function createAxes(_props: AxesProps): AxesHandle {
  throw new Error('scene/glyphs/axes: not implemented (see M2 in ARCHITECTURE.md §20)');
}
