/**
 * graticule — the instrument bezel (§15). Scale rules along viewport
 * edges. This is the project's signature visual element: it is what
 * makes the interface read as an instrument rather than a web app with a
 * 3D widget in it. Live labels reflect current world-unit spacing.
 * See ARCHITECTURE.md §8, §15. TODO(M2): implement.
 */
import type { Handle } from './Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';

export interface GraticuleProps {
  viewportSize: [number, number];
  worldUnitsPerTick?: number;
}

export type GraticuleHandle = Handle<GraticuleProps>;

export function createGraticule(_props: GraticuleProps, _host: SubstrateHost): GraticuleHandle {
  throw new Error('scene/glyphs/graticule: not implemented (see M2 in ARCHITECTURE.md §20)');
}
