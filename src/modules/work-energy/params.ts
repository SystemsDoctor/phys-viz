// Declare params and layers as DATA — the shell builds the entire
// control panel and layer checklist from these arrays. Zero UI code.
// See ARCHITECTURE.md §9 ("Auto-generated controls") and §10.
import type { ParamDef, LayerDef, ScalarDef } from '../types';
import type { Dimension } from '@/kernel/units';
import { MASS, LENGTH, VELOCITY, ENERGY, TIME } from '@/kernel/units';

// Spring constant, N/m = kg·s⁻². Not one of kernel/units' named
// exports (PHYSICS_CONVENTIONS.md: "only write a literal Dimension
// tuple for a quantity not in that list") — [M, L, T, Θ, I, N, J].
const SPRING_CONSTANT: Dimension = [1, 0, -2, 0, 0, 0, 0];

export const params: ParamDef[] = [
  {
    kind: 'number',
    key: 'mass',
    urlKey: 'm',
    label: 'Mass',
    symbol: 'm',
    min: 0.2,
    max: 5,
    step: 0.1,
    default: 1,
    unit: MASS,
  },
  {
    kind: 'number',
    key: 'k',
    urlKey: 'k',
    label: 'Spring constant',
    symbol: 'k',
    min: 1,
    max: 40,
    step: 0.5,
    default: 10,
    unit: SPRING_CONSTANT,
  },
  {
    kind: 'number',
    key: 'amplitude',
    urlKey: 'A',
    label: 'Amplitude',
    symbol: 'A',
    min: 0.2,
    max: 3,
    step: 0.1,
    default: 1.5,
    unit: LENGTH,
  },
];

export const layers: LayerDef[] = [
  { key: 'landscape', urlKey: 'lnd', label: 'Potential landscape', default: true },
  { key: 'particle', urlKey: 'ptc', label: 'Oscillating mass', default: true },
];

export const scalars: ScalarDef[] = [
  {
    key: 'PE',
    label: 'Potential energy',
    symbol: 'U',
    unit: ENERGY,
    readout: true,
    plottable: true,
  },
  { key: 'KE', label: 'Kinetic energy', symbol: 'K', unit: ENERGY, readout: true, plottable: true },
  { key: 'E', label: 'Total energy', symbol: 'E', unit: ENERGY, readout: true, plottable: true },
  {
    key: 'speed',
    label: 'Speed',
    symbol: '|v|',
    unit: VELOCITY,
    readout: true,
    plottable: true,
  },
  { key: 'period', label: 'Period', symbol: 'T', unit: TIME, readout: true, plottable: false },
  {
    key: 'turningPoint',
    label: 'Turning point',
    symbol: 'x_{max}',
    unit: LENGTH,
    readout: true,
    plottable: false,
  },
];
