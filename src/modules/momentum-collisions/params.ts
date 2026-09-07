// Declare params and layers as DATA — the shell builds the entire
// control panel and layer checklist from these arrays. Zero UI code.
// See ARCHITECTURE.md §9 ("Auto-generated controls") and §10.
import type { ParamDef, LayerDef, ScalarDef } from '../types';
import type { Dimension } from '@/kernel/units';
import { MASS, VELOCITY, ENERGY, DIMENSIONLESS } from '@/kernel/units';

// Linear momentum, kg·m·s⁻¹. Not one of kernel/units' named exports
// (PHYSICS_CONVENTIONS.md: "only write a literal Dimension tuple for a
// quantity not in that list") — [M, L, T, Θ, I, N, J].
const MOMENTUM: Dimension = [1, 1, -1, 0, 0, 0, 0];

export const params: ParamDef[] = [
  {
    kind: 'number',
    key: 'm1',
    urlKey: 'm1',
    label: 'Mass 1',
    symbol: 'm_1',
    min: 0.2,
    max: 5,
    step: 0.1,
    default: 1,
    unit: MASS,
  },
  {
    kind: 'number',
    key: 'm2',
    urlKey: 'm2',
    label: 'Mass 2',
    symbol: 'm_2',
    min: 0.2,
    max: 5,
    step: 0.1,
    default: 2,
    unit: MASS,
  },
  {
    kind: 'number',
    key: 'u1',
    urlKey: 'u1',
    label: 'Initial velocity 1',
    symbol: 'u_1',
    min: -6,
    max: 6,
    step: 0.1,
    default: 3,
    unit: VELOCITY,
  },
  {
    kind: 'number',
    key: 'u2',
    urlKey: 'u2',
    label: 'Initial velocity 2',
    symbol: 'u_2',
    min: -6,
    max: 6,
    step: 0.1,
    default: -1,
    unit: VELOCITY,
  },
  {
    kind: 'number',
    key: 'e',
    urlKey: 'e',
    label: 'Restitution coefficient',
    symbol: 'e',
    min: 0,
    max: 1,
    step: 0.05,
    default: 1,
    unit: DIMENSIONLESS,
    help: '1 = perfectly elastic (kinetic energy conserved); 0 = perfectly inelastic (carts stick together and move as one).',
  },
  {
    kind: 'toggle',
    key: 'cmFrame',
    urlKey: 'cm',
    label: 'View in center-of-mass frame',
    default: false,
    help: 'Redraws the same collision as seen by an observer moving with the (constant) center-of-mass velocity.',
  },
];

export const layers: LayerDef[] = [
  { key: 'carts', urlKey: 'crt', label: 'Carts & velocities', default: true },
  { key: 'cm', urlKey: 'cmk', label: 'Center of mass', default: true },
];

export const scalars: ScalarDef[] = [
  { key: 'v1', label: 'Velocity 1', symbol: 'v_1', unit: VELOCITY, readout: true, plottable: true },
  { key: 'v2', label: 'Velocity 2', symbol: 'v_2', unit: VELOCITY, readout: true, plottable: true },
  { key: 'p1', label: 'Momentum 1', symbol: 'p_1', unit: MOMENTUM, readout: true, plottable: true },
  { key: 'p2', label: 'Momentum 2', symbol: 'p_2', unit: MOMENTUM, readout: true, plottable: true },
  {
    key: 'pTotal',
    label: 'Total momentum',
    symbol: 'p_{total}',
    unit: MOMENTUM,
    readout: true,
    plottable: true,
  },
  {
    key: 'KE',
    label: 'Total kinetic energy',
    symbol: 'K',
    unit: ENERGY,
    readout: true,
    plottable: true,
  },
  {
    key: 'vcm',
    label: 'Center-of-mass velocity',
    symbol: 'v_{cm}',
    unit: VELOCITY,
    readout: true,
    plottable: false,
  },
];
