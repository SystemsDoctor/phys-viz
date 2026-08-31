// Declare params and layers as DATA — the shell builds the entire
// control panel and layer checklist from these arrays. Zero UI code.
// See ARCHITECTURE.md §9 ("Auto-generated controls") and §10.
import type { ParamDef, LayerDef, ScalarDef } from '../types';
import { LENGTH, VELOCITY, ACCEL } from '@/kernel/units';

export const params: ParamDef[] = [
  {
    kind: 'number',
    key: 'speed',
    urlKey: 'v0',
    label: 'Launch speed',
    symbol: 'v_0',
    min: 1,
    max: 30,
    step: 0.5,
    default: 12,
    unit: VELOCITY,
  },
  {
    kind: 'angle',
    key: 'angle',
    urlKey: 'ang',
    label: 'Launch angle',
    symbol: '\\theta',
    default: Math.PI / 4,
    min: 0,
    max: Math.PI / 2,
  },
  {
    kind: 'number',
    key: 'g',
    urlKey: 'g',
    label: 'Gravity strength',
    symbol: 'g',
    min: 1,
    max: 20,
    step: 0.1,
    default: 9.8,
    unit: ACCEL,
  },
];

export const layers: LayerDef[] = [
  { key: 'projectile', urlKey: 'proj', label: 'Projectile', default: true },
  { key: 'trace', urlKey: 'trc', label: 'Trajectory trace', default: true },
];

export const scalars: ScalarDef[] = [
  { key: 'range', label: 'Range', symbol: 'R', unit: LENGTH, readout: true, plottable: true },
  {
    key: 'maxHeight',
    label: 'Max height',
    symbol: 'H',
    unit: LENGTH,
    readout: true,
    plottable: true,
  },
];
