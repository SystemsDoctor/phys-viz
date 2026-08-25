/**
 * body — schematic rigid bodies: box, sphere, cylinder, disc, rod,
 * spring helix. Low poly by design (Visualizer Doctrine, §2).
 * See ARCHITECTURE.md §8. TODO(M2): implement.
 */
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';

export type BodyKind = 'box' | 'sphere' | 'cylinder' | 'disc' | 'rod' | 'spring';

export interface BodyProps {
  group?: GroupHandle;
  kind: BodyKind;
  position: [number, number, number];
  orientation?: [number, number, number, number]; // quaternion
  scale?: [number, number, number];
  color?: string;
}

export type BodyHandle = Handle<BodyProps>;

export function createBody(_props: BodyProps): BodyHandle {
  throw new Error('scene/glyphs/body: not implemented (see M2 in ARCHITECTURE.md §20)');
}
