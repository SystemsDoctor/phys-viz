/**
 * field — vector field glyph grids. INSTANCED: one draw call for
 * thousands of arrows (Performance budget, §17: draw calls <= 200).
 * Supports magnitude->length, magnitude->colour, or normalized modes.
 * See ARCHITECTURE.md §8. TODO(M2): implement.
 */
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';

export type FieldMode = 'length' | 'color' | 'normalized';

export interface FieldProps {
  group?: GroupHandle;
  sample: (p: [number, number, number]) => [number, number, number];
  gridBounds: { min: [number, number, number]; max: [number, number, number] };
  gridResolution: [number, number, number];
  mode?: FieldMode;
}

export type FieldHandle = Handle<FieldProps>;

export function createField(_props: FieldProps, _host: SubstrateHost): FieldHandle {
  throw new Error('scene/glyphs/field: not implemented (see M2 in ARCHITECTURE.md §20)');
}
