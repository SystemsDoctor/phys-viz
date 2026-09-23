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
    urlKey: 'cd', // X-30: was 'c', colliding with the shell's camera key
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
    description:
      'The frequency this mass-spring system would oscillate at on its own, undriven and undamped: sqrt(k/m).',
  },
  {
    key: 'zeta',
    label: 'Damping ratio',
    symbol: '\\zeta',
    unit: DIMENSIONLESS,
    readout: true,
    description:
      'How strongly velocity-proportional drag resists the motion, relative to critical damping — 1 is critically damped, below 1 the free system would oscillate.',
  },
  {
    key: 'amplitude',
    label: 'Steady-state amplitude',
    symbol: 'A(\\Omega)',
    unit: LENGTH,
    readout: true,
    description:
      'The peak displacement of the steady-state (long-after-transient) response at the current drive frequency — largest near resonance, where the drive frequency matches the natural frequency.',
  },
  {
    key: 'phaseLag',
    label: 'Phase lag',
    symbol: '\\delta',
    unit: DIMENSIONLESS,
    readout: true,
    description:
      'How far behind the driving force the mass’s motion lags, in radians — near 0 well below resonance, pi/2 at resonance, approaching pi well above it.',
  },
  {
    // The sole `plottable` scalar: ModuleView's generic sidebar time
    // series (§9) always plots the FIRST scalar flagged `plottable`, so
    // this is what actually appears there while the sim runs — it needs
    // to be genuinely time-varying. `x(t)` is the oscillator's position,
    // sinusoidal at the drive frequency; the four scalars above are
    // constants of the current param values (no visible trace against
    // time), which is why none of them carry `plottable` any more.
    key: 'x',
    label: 'Displacement',
    symbol: 'x(t)',
    unit: LENGTH,
    readout: true,
    plottable: true,
    description:
      'The mass’s current position, measured from equilibrium — this is what actually oscillates in time.',
  },
  {
    key: 'v',
    label: 'Velocity',
    symbol: 'v(t)',
    unit: VELOCITY,
    readout: true,
    description:
      'The mass’s current velocity — the time-derivative of displacement, 90 degrees out of phase with it.',
  },
];
