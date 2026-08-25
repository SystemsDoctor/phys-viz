// Declare params and layers as DATA — the shell builds the entire
// control panel and layer checklist from these arrays. Zero UI code.
// See ARCHITECTURE.md §9 ("Auto-generated controls") and §10.
import type { ParamDef, LayerDef, ScalarDef } from '../types';

export const params: ParamDef[] = [
  // { kind: 'number', key: 'x', urlKey: 'x', label: 'X', symbol: 'x',
  //   min: -5, max: 5, step: 0.1, default: 1 },
];

export const layers: LayerDef[] = [
  // { key: 'main', urlKey: 'm', label: 'Main', default: true },
];

export const scalars: ScalarDef[] = [
  // { key: 'value', label: 'Value', symbol: 'v', readout: true },
];
