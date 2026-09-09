// Declare params and layers as DATA — the shell builds the entire
// control panel and layer checklist from these arrays. Zero UI code.
// See ARCHITECTURE.md §9 ("Auto-generated controls") and §10.
import type { ParamDef, LayerDef, ScalarDef } from '../types';
import { ANGULAR_VELOCITY, VELOCITY, LENGTH, ACCEL } from '@/kernel/units';

export const params: ParamDef[] = [
  {
    kind: 'number',
    key: 'omega',
    urlKey: 'om',
    label: 'Frame angular velocity',
    symbol: '\\omega',
    min: -3,
    max: 3,
    step: 0.05,
    default: 1.2,
    unit: ANGULAR_VELOCITY,
    help: 'Positive is counter-clockwise (ADR 0008). Zero collapses the rotating frame onto the lab frame exactly — a good sanity check.',
  },
  {
    kind: 'number',
    key: 'speed',
    urlKey: 'spd',
    label: 'Puck speed',
    symbol: 'v_0',
    min: 0.3,
    max: 3,
    step: 0.1,
    default: 1,
    unit: VELOCITY,
    help: 'Constant — no real force acts on the puck at all.',
  },
  {
    kind: 'angle',
    key: 'launchAngle',
    urlKey: 'ang',
    label: 'Launch direction',
    symbol: '\\theta_0',
    default: 0.2,
  },
  {
    kind: 'number',
    key: 'x0',
    urlKey: 'x0',
    label: 'Start position, x',
    symbol: 'x_0',
    min: -3,
    max: 3,
    step: 0.1,
    default: -2.2,
    unit: LENGTH,
  },
  {
    kind: 'number',
    key: 'y0',
    urlKey: 'y0',
    label: 'Start position, y',
    symbol: 'y_0',
    min: -3,
    max: 3,
    step: 0.1,
    default: 0.6,
    unit: LENGTH,
  },
];

export const layers: LayerDef[] = [
  {
    key: 'labFrame',
    urlKey: 'lab',
    label: 'Lab frame (platform spins)',
    default: true,
    exclusiveGroup: 'view',
  },
  {
    key: 'rotFrame',
    urlKey: 'rot',
    label: 'Rotating frame (fictitious terms)',
    default: false,
    exclusiveGroup: 'view',
  },
  { key: 'trace', urlKey: 'trc', label: 'Trajectory trace', default: true },
];

export const scalars: ScalarDef[] = [
  {
    key: 'rho',
    label: 'Distance from axis',
    symbol: '\\rho',
    unit: LENGTH,
    readout: true,
    plottable: true,
  },
  {
    key: 'speedRel',
    label: 'Speed, rotating frame',
    symbol: "|v'|",
    unit: VELOCITY,
    readout: true,
    plottable: true,
  },
  {
    key: 'aCoriolis',
    label: 'Coriolis acceleration',
    symbol: 'a_{Cor}',
    unit: ACCEL,
    readout: true,
    plottable: true,
  },
  {
    key: 'aCentrifugal',
    label: 'Centrifugal acceleration',
    symbol: 'a_{cf}',
    unit: ACCEL,
    readout: true,
    plottable: true,
  },
  {
    key: 'aRelative',
    label: 'Observed (relative) acceleration',
    symbol: "a'",
    unit: ACCEL,
    readout: true,
    plottable: true,
  },
  {
    key: 'residual',
    label: 'Consistency check (should be ≈0)',
    symbol: '|\\Sigma \\vec{a}|',
    unit: ACCEL,
    readout: true,
    plottable: false,
  },
];
