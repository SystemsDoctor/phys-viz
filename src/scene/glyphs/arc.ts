/**
 * arc — angle annotations. With optional label at midpoint.
 * See ARCHITECTURE.md §8. TODO(M2): implement.
 */
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';

export interface ArcProps {
  group?: GroupHandle;
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  radius: number;
  color?: string;
  label?: string;
}

export type ArcHandle = Handle<ArcProps>;

export function createArc(_props: ArcProps, _host: SubstrateHost): ArcHandle {
  throw new Error('scene/glyphs/arc: not implemented (see M2 in ARCHITECTURE.md §20)');
}
