/**
 * patch — translucent polygons. Cross-product parallelograms, swept
 * areas, flux elements. Needs correct double-sided transparency and
 * depth-write off. See ARCHITECTURE.md §8. TODO(M2): implement.
 */
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';

export interface PatchProps {
  group?: GroupHandle;
  points: (readonly [number, number, number])[];
  color?: string;
  opacity?: number;
}

export type PatchHandle = Handle<PatchProps>;

export function createPatch(_props: PatchProps, _host: SubstrateHost): PatchHandle {
  throw new Error('scene/glyphs/patch: not implemented (see M2 in ARCHITECTURE.md §20)');
}
