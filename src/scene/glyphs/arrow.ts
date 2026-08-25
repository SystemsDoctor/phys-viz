/**
 * arrow — vectors. Cone head sized in SCREEN space, not world space, so
 * short vectors still read as arrows. Optional double head for
 * pseudovectors (omega, tau, L) — a convention taught explicitly.
 * See ARCHITECTURE.md §8.
 *
 * TODO(M2): implement.
 */
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';

export interface ArrowProps {
  group?: GroupHandle;
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  color?: string;
  label?: string;
  dashed?: boolean;
  doubleHead?: boolean;
}

export type ArrowHandle = Handle<ArrowProps>;

export function createArrow(_props: ArrowProps): ArrowHandle {
  throw new Error('scene/glyphs/arrow: not implemented (see M2 in ARCHITECTURE.md §20)');
}
