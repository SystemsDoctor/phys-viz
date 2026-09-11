import type { ParamDef, LayerDef, ScalarDef } from '../types';
import {
  MASS,
  LENGTH,
  VELOCITY,
  TORQUE,
  MOMENT_OF_INERTIA,
  ANGULAR_MOMENTUM,
  ANGULAR_VELOCITY,
  ENERGY,
} from '@/kernel/units';

export const params: ParamDef[] = [
  // Shared rigid body — reused by parallel-axis, L-vs-omega, the
  // inertia ellipsoid, and the Dzhanibekov tumbling panel. Three
  // distinct side lengths guarantee three distinct principal moments,
  // which is what makes the ellipsoid non-degenerate and gives the
  // tumbling case a genuine intermediate axis.
  {
    kind: 'vector',
    key: 'boxSize',
    urlKey: 'bx',
    label: 'Box size (a, b, c)',
    symbol: '\\vec{d}',
    default: [1, 1.6, 2.4],
    range: 3,
    group: 'Rigid body',
  },
  {
    kind: 'number',
    key: 'boxMass',
    urlKey: 'bm',
    label: 'Box mass',
    symbol: 'm',
    default: 1.5,
    min: 0.2,
    max: 5,
    step: 0.1,
    unit: MASS,
    group: 'Rigid body',
  },

  // Torque
  {
    kind: 'vector',
    key: 'armVector',
    urlKey: 'r',
    label: 'Lever arm r',
    symbol: '\\vec{r}',
    default: [1.2, 0, 0],
    range: 3,
    draggable: true,
    group: 'Torque',
    forLayer: 'torque',
  },
  {
    kind: 'vector',
    key: 'forceVector',
    urlKey: 'f',
    label: 'Force F',
    symbol: '\\vec{F}',
    default: [0, -1, 0.6],
    range: 3,
    draggable: true,
    group: 'Torque',
    forLayer: 'torque',
  },

  // Parallel axis
  {
    kind: 'vector',
    key: 'paOffset',
    urlKey: 'pao',
    label: 'Axis offset',
    symbol: '\\vec{d}_{cm}',
    default: [1.5, 0, 0],
    range: 3,
    draggable: true,
    group: 'Parallel axis',
    forLayer: 'parallelAxis',
  },

  // L vs omega
  {
    kind: 'vector',
    key: 'omegaVector',
    urlKey: 'om',
    label: 'Angular velocity ω',
    symbol: '\\vec{\\omega}',
    default: [0.3, 1, 0.2],
    range: 2,
    draggable: true,
    group: 'Angular momentum',
    forLayer: 'angularMomentum',
  },

  // Precession (fast top)
  {
    kind: 'number',
    key: 'topSpinRate',
    urlKey: 'tsr',
    label: 'Spin rate',
    symbol: '\\dot\\psi',
    default: 70,
    min: 20,
    max: 200,
    step: 1,
    group: 'Precession',
    forLayer: 'precession',
    help: 'Raised from this module’s earlier range so the default state is genuinely a "fast top" (spin dominates gravity) — the regime the nutation-coupling formulas below are actually derived for.',
  },
  {
    kind: 'angle',
    key: 'topTiltAngle',
    urlKey: 'tta',
    label: 'Tilt angle',
    symbol: '\\theta_0',
    default: 0.436,
    min: 0.09,
    max: 1.4,
    group: 'Precession',
    forLayer: 'precession',
  },
  {
    kind: 'angle',
    key: 'nutationAmplitude',
    urlKey: 'nta',
    label: 'Nutation amplitude',
    symbol: '\\Delta\\theta_1',
    default: 0.27,
    min: -0.3,
    max: 0.5,
    group: 'Precession',
    forLayer: 'precession',
    help: '0 isolates pure, wobble-free steady precession (no nutation at all). The default (~0.27) approximately reproduces the classic "released from rest" cusped trajectory at this panel’s other default values. Watch the "Nutation coupling ratio" readout as you raise it: <1 is a wavy (never-reversing) path, ≈1 is cusped, >1 is genuine looping.',
  },
  {
    kind: 'number',
    key: 'topArmLength',
    urlKey: 'tal',
    label: 'Arm length',
    symbol: '\\ell',
    default: 1.0,
    min: 0.3,
    max: 2,
    step: 0.1,
    unit: LENGTH,
    group: 'Precession',
    forLayer: 'precession',
  },
  {
    kind: 'number',
    key: 'topRadius',
    urlKey: 'tr',
    label: 'Flywheel radius',
    default: 0.4,
    min: 0.1,
    max: 1,
    step: 0.05,
    unit: LENGTH,
    group: 'Precession',
    forLayer: 'precession',
  },
  {
    kind: 'number',
    key: 'topMass',
    urlKey: 'tm',
    label: 'Flywheel mass',
    default: 1.0,
    min: 0.2,
    max: 3,
    step: 0.1,
    unit: MASS,
    group: 'Precession',
    forLayer: 'precession',
  },

  // Rolling
  {
    kind: 'number',
    key: 'rollRadius',
    urlKey: 'rr',
    label: 'Wheel radius',
    default: 0.5,
    min: 0.2,
    max: 1.2,
    step: 0.05,
    unit: LENGTH,
    group: 'Rolling',
    forLayer: 'rolling',
  },
  {
    kind: 'number',
    key: 'rollOmega',
    urlKey: 'rw',
    label: 'Angular speed',
    symbol: '\\omega',
    default: 3,
    min: 0.5,
    max: 10,
    step: 0.1,
    group: 'Rolling',
    forLayer: 'rolling',
  },

  // Dzhanibekov tumbling (the one genuinely `stepped` panel)
  {
    kind: 'number',
    key: 'dzSpin',
    urlKey: 'dzs',
    label: 'Initial spin',
    default: 8,
    min: 1,
    max: 20,
    step: 0.5,
    group: 'Tumbling (stepped)',
    forLayer: 'tumbling',
  },
  {
    kind: 'number',
    key: 'dzPerturbation',
    urlKey: 'dzp',
    label: 'Perturbation',
    default: 0.02,
    min: 0.001,
    max: 0.1,
    step: 0.001,
    logScale: true,
    group: 'Tumbling (stepped)',
    forLayer: 'tumbling',
  },
];

// All seven panels share one 3D scene but are independent, unrelated
// demonstrations — checking more than one at once produces the "mass of
// overlaid items that are unintelligible" failure mode (see ADR 0011),
// so they render as a mutually-exclusive radio set (`exclusiveGroup`)
// rather than independent checkboxes.
export const layers: LayerDef[] = [
  { key: 'torque', urlKey: 'trq', label: 'Torque = r × F', default: true, exclusiveGroup: 'panel' },
  {
    key: 'parallelAxis',
    urlKey: 'pax',
    label: 'Parallel-axis theorem',
    default: false,
    exclusiveGroup: 'panel',
  },
  {
    key: 'angularMomentum',
    urlKey: 'lw',
    label: 'L vs ω (non-parallel case)',
    default: false,
    exclusiveGroup: 'panel',
  },
  {
    key: 'inertiaEllipsoid',
    urlKey: 'ell',
    label: 'Inertia ellipsoid',
    default: false,
    exclusiveGroup: 'panel',
  },
  {
    key: 'precession',
    urlKey: 'prc',
    label: 'Precession & nutation (fast top)',
    default: false,
    exclusiveGroup: 'panel',
  },
  {
    key: 'rolling',
    urlKey: 'rol',
    label: 'Rolling: instantaneous axis & cycloid',
    default: false,
    exclusiveGroup: 'panel',
  },
  {
    key: 'tumbling',
    urlKey: 'tum',
    label: 'Dzhanibekov effect (tumbling)',
    default: false,
    exclusiveGroup: 'panel',
  },
];

export const scalars: ScalarDef[] = [
  {
    key: 'torqueMag',
    label: 'Torque magnitude',
    symbol: '|\\vec\\tau|',
    unit: TORQUE,
    readout: true,
    description:
      'How hard the applied force twists the body about the pivot — the strength of r × F.',
  },
  {
    key: 'momentArm',
    label: 'Moment arm',
    symbol: 'd',
    unit: LENGTH,
    readout: true,
    description:
      'The perpendicular distance from the pivot to the force’s line of action — torque equals force times this distance.',
  },
  {
    key: 'parallelAxisI',
    label: 'I about offset axis',
    symbol: 'I_{d}',
    unit: MOMENT_OF_INERTIA,
    readout: true,
    description:
      'The body’s moment of inertia about an axis offset from its center of mass — always larger than the moment about the parallel axis through the center of mass.',
  },
  {
    key: 'angleLOmega',
    label: 'Angle between L and ω',
    symbol: '\\angle(L,\\omega)',
    readout: true,
    description:
      'How far the angular momentum vector tips away from the spin axis when spinning about an axis that is not one of the body’s principal axes.',
  },
  {
    key: 'I1',
    label: 'Principal moment I₁',
    unit: MOMENT_OF_INERTIA,
    readout: true,
    description:
      'The smallest of the body’s three principal moments of inertia — resistance to rotation about the axis it spins most easily around.',
  },
  {
    key: 'I2',
    label: 'Principal moment I₂',
    unit: MOMENT_OF_INERTIA,
    readout: true,
    description:
      'The middle of the body’s three principal moments of inertia — rotation about this intermediate axis is the one that is dynamically unstable.',
  },
  {
    key: 'I3',
    label: 'Principal moment I₃',
    unit: MOMENT_OF_INERTIA,
    readout: true,
    description:
      'The largest of the body’s three principal moments of inertia — resistance to rotation about the axis it spins least easily around.',
  },
  {
    key: 'precessionRate',
    label: 'Precession rate (bare)',
    symbol: '\\Omega_p',
    unit: ANGULAR_VELOCITY,
    readout: true,
    description:
      'The idealized steady-precession rate a fast top would sweep around the vertical if gravity torque were balanced with no nutation at all.',
  },
  {
    key: 'precessionRateSecular',
    label: 'Precession rate (secular avg.)',
    symbol: '\\bar\\Omega_p',
    unit: ANGULAR_VELOCITY,
    readout: true,
    description:
      'The top’s actual time-averaged precession rate once the nutation wobble is correctly coupled into the motion, rather than the idealized bare rate.',
  },
  {
    key: 'nutationCouplingRatio',
    label: 'Nutation coupling ratio (<1 wavy, ≈1 cusped, >1 looping)',
    readout: true,
    description:
      'How large the nutation wobble is relative to the secular precession — below 1 the tip traces a wavy path, near 1 a cusped one, above 1 it loops as precession briefly reverses.',
  },
  {
    key: 'rollingSpeed',
    label: 'Rolling speed',
    symbol: 'v',
    unit: VELOCITY,
    readout: true,
    description:
      'The speed of the wheel’s center as it rolls without slipping, equal to its angular speed times its radius.',
  },
  {
    key: 'dzKineticEnergy',
    label: 'Kinetic energy (tumbling)',
    unit: ENERGY,
    readout: true,
    description:
      'The tumbling box’s rotational kinetic energy, conserved throughout the torque-free Dzhanibekov motion.',
  },
  {
    key: 'dzAngularMomentumMag',
    label: '|L| (tumbling)',
    unit: ANGULAR_MOMENTUM,
    readout: true,
    description:
      'The magnitude of the tumbling box’s angular momentum, conserved throughout the torque-free motion even as its direction in body coordinates wanders.',
  },
  {
    key: 'dzOmegaIntermediate',
    label: 'ω about intermediate axis',
    unit: ANGULAR_VELOCITY,
    readout: true,
    plottable: true,
    description:
      'The spin rate about the body’s intermediate-inertia axis — its growth and repeated flips are the signature of the unstable Dzhanibekov tumble.',
  },
];
