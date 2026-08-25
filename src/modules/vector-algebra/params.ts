import type { ParamDef, LayerDef, ScalarDef } from '../types';

export const params: ParamDef[] = [
  {
    kind: 'vector',
    key: 'a',
    urlKey: 'a',
    label: 'Vector a',
    symbol: '\\vec{a}',
    default: [3, 1, 0],
    range: 6,
    draggable: true,
  },
  {
    kind: 'vector',
    key: 'b',
    urlKey: 'b',
    label: 'Vector b',
    symbol: '\\vec{b}',
    default: [1, 3, 1],
    range: 6,
    draggable: true,
  },
  {
    kind: 'select',
    key: 'sumStyle',
    urlKey: 'ss',
    label: 'Sum construction',
    options: [
      { value: 'tip', label: 'Head to tail' },
      { value: 'para', label: 'Parallelogram' },
    ],
    default: 'tip',
    group: 'Addition',
  },
];

export const layers: LayerDef[] = [
  { key: 'sum', urlKey: 'sum', label: 'Sum a + b', default: false, group: 'Addition' },
  { key: 'comps', urlKey: 'cp', label: 'Components', default: false, group: 'Structure' },
  { key: 'proj', urlKey: 'pr', label: 'Projection of a on b', default: false, group: 'Products' },
  { key: 'xprod', urlKey: 'xp', label: 'Cross product a × b', default: false, group: 'Products' },
  { key: 'xarea', urlKey: 'xa', label: 'Parallelogram area', default: false, group: 'Products' },
];

export const scalars: ScalarDef[] = [
  { key: 'dot', label: 'a · b', symbol: '\\vec{a}\\cdot\\vec{b}', readout: true },
  { key: 'theta', label: 'Angle', symbol: '\\theta', readout: true },
  { key: 'xmag', label: '|a × b|', symbol: '|\\vec{a}\\times\\vec{b}|', readout: true },
];
