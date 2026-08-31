// Declare params and layers as DATA — the shell builds the entire
// control panel and layer checklist from these arrays. Zero UI code.
// See ARCHITECTURE.md §9 ("Auto-generated controls") and §10.
import type { ParamDef, LayerDef, ScalarDef } from '../types';

// One live example of each of the four param kinds most modules reach
// for. `expression`, `angle`, and `logScale` are real but rarer — see
// control-showcase for those.
export const params: ParamDef[] = [
  {
    kind: 'number',
    key: 'amplitude',
    urlKey: 'a',
    label: 'Amplitude',
    symbol: 'a',
    min: 0.5,
    max: 3,
    step: 0.1,
    default: 1.5,
  },
  {
    kind: 'vector',
    key: 'direction',
    urlKey: 'd',
    label: 'Direction',
    default: [1, 1, 0],
    range: 3,
  },
  { kind: 'toggle', key: 'showLabel', urlKey: 'lbl', label: 'Show label', default: true },
  {
    kind: 'select',
    key: 'style',
    urlKey: 'sty',
    label: 'Style',
    options: [
      { value: 'solid', label: 'Solid' },
      { value: 'dashed', label: 'Dashed' },
    ],
    default: 'solid',
  },
];

export const layers: LayerDef[] = [{ key: 'main', urlKey: 'm', label: 'Vector', default: true }];

export const scalars: ScalarDef[] = [
  { key: 'magnitude', label: 'Magnitude', symbol: '|v|', readout: true },
];
