// Declare params and layers as DATA — the shell builds the entire
// control panel and layer checklist from these arrays. Zero UI code.
// See ARCHITECTURE.md §9 ("Auto-generated controls") and §10.
import type { ParamDef, LayerDef, ScalarDef } from '../types';
import type { Dimension } from '@/kernel/units';
import { MASS, FORCE, ANGULAR_VELOCITY, VELOCITY, LENGTH, DIMENSIONLESS } from '@/kernel/units';

// N/m = kg/s^2. Not one of kernel/units' named exports
// (PHYSICS_CONVENTIONS.md: "only write a literal Dimension tuple for a
// quantity not in that list") — [M, L, T, Θ, I, N, J].
const SPRING_CONSTANT: Dimension = [1, 0, -2, 0, 0, 0, 0];
// N·s/m = kg/s — viscous damping coefficient.
const DAMPING: Dimension = [1, 0, -1, 0, 0, 0, 0];

export const params: ParamDef[] = [
  {
    kind: 'number',
    key: 'm',
    urlKey: 'm',
    label: 'Mass',
    symbol: 'm',
    min: 0.3,
    max: 3,
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
    max: 20,
    step: 0.5,
    default: 9,
    unit: SPRING_CONSTANT,
  },
  {
    kind: 'number',
    key: 'c',
    urlKey: 'c',
    label: 'Damping coefficient',
    symbol: 'c',
    min: 0,
    max: 4,
    step: 0.05,
    default: 0.6,
    unit: DAMPING,
    help: 'Viscous damping — zero is undamped (resonance amplitude diverges as the drive frequency approaches the natural frequency).',
  },
  {
    kind: 'number',
    key: 'F0',
    urlKey: 'f0',
    label: 'Drive force amplitude',
    symbol: 'F_0',
    min: 0,
    max: 10,
    step: 0.2,
    default: 5,
    unit: FORCE,
  },
  {
    kind: 'number',
    key: 'omegaDrive',
    urlKey: 'od',
    label: 'Drive frequency',
    symbol: '\\Omega',
    min: 0.1,
    max: 6,
    step: 0.05,
    default: 3,
    unit: ANGULAR_VELOCITY,
    help: 'Sweep this through the natural frequency (readout below) to trace out a resonance curve — try the Sweep Plot.',
  },
];

export const layers: LayerDef[] = [
  { key: 'system', urlKey: 'sys', label: 'Mass, spring & velocity', default: true },
  { key: 'drive', urlKey: 'drv', label: 'Driving force', default: true },
];

export const scalars: ScalarDef[] = [
  {
    key: 'omega0',
    label: 'Natural frequency',
    symbol: '\\omega_0',
    unit: ANGULAR_VELOCITY,
    readout: true,
    plottable: true,
  },
  {
    key: 'zeta',
    label: 'Damping ratio',
    symbol: '\\zeta',
    unit: DIMENSIONLESS,
    readout: true,
    plottable: true,
  },
  {
    key: 'amplitude',
    label: 'Steady-state amplitude',
    symbol: 'A(\\Omega)',
    unit: LENGTH,
    readout: true,
    plottable: true,
  },
  {
    key: 'phaseLag',
    label: 'Phase lag',
    symbol: '\\delta',
    unit: DIMENSIONLESS,
    readout: true,
    plottable: true,
  },
  {
    key: 'x',
    label: 'Displacement',
    symbol: 'x(t)',
    unit: LENGTH,
    readout: true,
    plottable: true,
  },
  {
    key: 'v',
    label: 'Velocity',
    symbol: 'v(t)',
    unit: VELOCITY,
    readout: true,
    plottable: true,
  },
];
