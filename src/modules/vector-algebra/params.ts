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
    kind: 'vector',
    key: 'c',
    urlKey: 'c',
    label: 'Vector c',
    symbol: '\\vec{c}',
    default: [0, 0, 2],
    range: 6,
    draggable: true,
    group: 'Triple product',
    // Only ever drawn once the 'triple' layer is checked (index.ts
    // attaches it to gTriple, hidden by default) — nest it under that
    // layer's disclosure rather than the always-visible list (ADR 0011).
    forLayer: 'triple',
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
    forLayer: 'sum',
  },
  {
    kind: 'toggle',
    key: 'planar',
    urlKey: 'pl',
    label: 'Restrict to xy-plane (2D)',
    default: false,
    group: 'Structure',
  },
  {
    kind: 'angle',
    key: 'basisAngle',
    urlKey: 'ba',
    label: 'Basis orientation',
    symbol: '\\phi',
    default: 0,
    group: 'Structure',
    forLayer: 'comps',
  },
];

export const layers: LayerDef[] = [
  { key: 'sum', urlKey: 'sum', label: 'Sum a + b', default: false, group: 'Addition' },
  {
    key: 'comps',
    urlKey: 'cp',
    label: 'Components on rotated basis',
    default: false,
    group: 'Structure',
  },
  {
    key: 'dircos',
    urlKey: 'dc',
    label: 'Direction cosines of a',
    default: false,
    group: 'Structure',
  },
  { key: 'proj', urlKey: 'pr', label: 'Projection of a on b', default: false, group: 'Products' },
  { key: 'xprod', urlKey: 'xp', label: 'Cross product a × b', default: false, group: 'Products' },
  { key: 'xarea', urlKey: 'xa', label: 'Parallelogram area', default: false, group: 'Products' },
  {
    key: 'triple',
    urlKey: 'tp',
    label: 'Scalar triple product (parallelepiped)',
    default: false,
    group: 'Products',
  },
];

export const scalars: ScalarDef[] = [
  { key: 'dot', label: 'a · b', symbol: '\\vec{a}\\cdot\\vec{b}', readout: true },
  { key: 'theta', label: 'Angle', symbol: '\\theta', readout: true },
  { key: 'xmag', label: '|a × b|', symbol: '|\\vec{a}\\times\\vec{b}|', readout: true },
  {
    key: 'volume',
    label: 'Triple product volume',
    symbol: '\\vec{a}\\cdot(\\vec{b}\\times\\vec{c})',
    readout: true,
  },
  { key: 'cosAlpha', label: 'Direction cosine (x)', symbol: '\\cos\\alpha', readout: true },
  { key: 'cosBeta', label: 'Direction cosine (y)', symbol: '\\cos\\beta', readout: true },
  { key: 'cosGamma', label: 'Direction cosine (z)', symbol: '\\cos\\gamma', readout: true },
];
