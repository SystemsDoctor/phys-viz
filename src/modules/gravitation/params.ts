// Declare params and layers as DATA — the shell builds the entire
// control panel and layer checklist from these arrays. Zero UI code.
// See ARCHITECTURE.md §9 ("Auto-generated controls") and §10.
import type { ParamDef, LayerDef, ScalarDef } from '../types';
import type { Dimension } from '@/kernel/units';
import { LENGTH, VELOCITY, TIME, ACCEL, DIMENSIONLESS } from '@/kernel/units';

// mu = G*M, the "standard gravitational parameter" — L^3/T^2. Not one of
// kernel/units' named exports (PHYSICS_CONVENTIONS.md: "only write a
// literal Dimension tuple for a quantity not in that list").
const GRAV_PARAMETER: Dimension = [0, 3, -2, 0, 0, 0, 0];
// Specific (per-unit-mass) orbital energy — L^2/T^2. Lacks the mass
// factor a real ENERGY (kernel/units) carries, since this module treats
// the orbiting body as a test particle (restricted two-body problem, no
// mass param of its own) — see the module-level comment in index.ts.
const SPECIFIC_ENERGY: Dimension = [0, 2, -2, 0, 0, 0, 0];
// Specific angular momentum, r x v — L^2/T. Same test-particle rationale.
const SPECIFIC_ANGULAR_MOMENTUM: Dimension = [0, 2, -1, 0, 0, 0, 0];

export const params: ParamDef[] = [
  {
    kind: 'number',
    key: 'mu',
    urlKey: 'mu',
    label: 'Gravitational parameter',
    symbol: '\\mu',
    min: 1,
    max: 20,
    step: 0.5,
    default: 8,
    unit: GRAV_PARAMETER,
    help: 'Combines the central mass and the gravitational constant into one number (mu = GM) — the standard way orbital mechanics problems are parametrized, without needing a separate, awkwardly small G.',
  },
  {
    kind: 'number',
    key: 'a',
    urlKey: 'a',
    label: 'Semi-major axis',
    symbol: 'a',
    min: 1,
    max: 5,
    step: 0.1,
    default: 2,
    unit: LENGTH,
  },
  {
    kind: 'number',
    key: 'e',
    urlKey: 'e',
    label: 'Eccentricity',
    symbol: 'e',
    min: 0,
    max: 0.9,
    step: 0.05,
    default: 0.5,
    help: '0 is a perfect circle; closer to 1 stretches the ellipse further, moving the central mass away from the ellipse’s visual center toward one focus.',
  },
  {
    kind: 'angle',
    key: 'omega',
    urlKey: 'om',
    label: 'Argument of periapsis',
    symbol: '\\omega',
    default: 0,
    min: -Math.PI,
    max: Math.PI,
    help: 'Rotates the ellipse within its own orbital plane without changing its shape — periapsis (closest approach) points in this direction.',
  },
  {
    kind: 'angle',
    key: 'inclination',
    urlKey: 'inc',
    label: 'Inclination',
    symbol: 'i',
    default: 0,
    min: 0,
    max: Math.PI / 2,
    help: 'Tilts the orbital plane out of the reference x/y plane, about the line of nodes (the x-axis here) — 0 is flat, pi/2 is edge-on.',
  },
];

export const layers: LayerDef[] = [
  { key: 'orbit', urlKey: 'orb', label: 'Central mass, orbit & body', default: true },
  { key: 'vectors', urlKey: 'vec', label: 'Position, velocity & gravity vectors', default: true },
  {
    key: 'angularMomentum',
    urlKey: 'ang',
    label: 'Angular momentum (conserved)',
    default: false,
  },
];

export const scalars: ScalarDef[] = [
  {
    key: 'r',
    label: 'Distance',
    symbol: 'r',
    unit: LENGTH,
    readout: true,
    description:
      'The orbiting body’s distance from the central mass at the focus — shortest at periapsis, longest at apoapsis.',
  },
  {
    key: 'speed',
    label: 'Speed',
    symbol: 'v',
    unit: VELOCITY,
    readout: true,
    plottable: true,
    description:
      'The orbiting body’s instantaneous speed — fastest at periapsis, slowest at apoapsis. This is Kepler’s second law in action: with angular momentum conserved, the body must move faster when it is closer in.',
  },
  {
    key: 'trueAnomaly',
    label: 'True anomaly',
    symbol: '\\nu',
    unit: DIMENSIONLESS,
    readout: true,
    description:
      'The orbiting body’s angle from periapsis, measured at the focus, in radians — 0 at closest approach, pi at farthest.',
  },
  {
    key: 'period',
    label: 'Orbital period',
    symbol: 'T',
    unit: TIME,
    readout: true,
    description:
      'The time for one full orbit — Kepler’s third law, T = 2*pi*sqrt(a^3/mu). Depends only on the semi-major axis and the gravitational parameter, not on eccentricity.',
  },
  {
    key: 'specificEnergy',
    label: 'Specific orbital energy',
    symbol: '\\varepsilon',
    unit: SPECIFIC_ENERGY,
    readout: true,
    description:
      'The orbit’s total mechanical energy per unit mass (kinetic plus gravitational potential) — constant throughout the orbit even as kinetic and potential energy trade off against each other. Negative means the orbit is bound (a closed ellipse).',
  },
  {
    key: 'h',
    label: 'Specific angular momentum',
    symbol: 'h',
    unit: SPECIFIC_ANGULAR_MOMENTUM,
    readout: true,
    description:
      'The orbiting body’s angular momentum per unit mass, |r × v| — constant throughout the orbit. This conservation law is exactly why the body sweeps out equal areas in equal times.',
  },
  {
    key: 'accel',
    label: 'Gravitational acceleration',
    symbol: 'g',
    unit: ACCEL,
    readout: true,
    description:
      'The magnitude of the inverse-square gravitational pull toward the central mass at the body’s current distance, mu/r^2 — strongest at periapsis.',
  },
];
