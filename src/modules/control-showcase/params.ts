import type { ParamDef, LayerDef, ScalarDef } from '../types';

export const params: ParamDef[] = [
  {
    kind: 'vector',
    key: 'p',
    urlKey: 'p',
    label: 'Point p',
    symbol: '\\vec{p}',
    default: [2, 1, 0],
    range: 5,
    draggable: true,
    group: 'Geometry',
  },
  {
    kind: 'angle',
    key: 'theta',
    urlKey: 'th',
    label: 'Angle',
    symbol: '\\theta',
    default: 0.6,
    group: 'Geometry',
  },
  {
    kind: 'number',
    key: 'k',
    urlKey: 'k',
    label: 'Stiffness k',
    symbol: 'k',
    min: 1,
    max: 1000,
    step: 1,
    default: 10,
    logScale: true,
    group: 'Function',
  },
  {
    kind: 'expression',
    key: 'f',
    urlKey: 'f',
    label: 'f(x)',
    symbol: 'f(x)',
    vars: ['x'],
    default: 'sin(x) * k',
    group: 'Function',
  },
  {
    kind: 'select',
    key: 'mode',
    urlKey: 'md',
    label: 'Display mode',
    options: [
      { value: 'point', label: 'Point' },
      { value: 'ray', label: 'Ray' },
    ],
    default: 'point',
    group: 'Function',
  },
  {
    kind: 'toggle',
    key: 'on',
    urlKey: 'on',
    label: 'Highlight',
    default: false,
    group: 'Function',
  },
  // ADR 0011 conformance example: only matters while the 'trace' layer
  // is checked, so the shell nests it under that layer's own disclosure
  // instead of the always-visible list.
  {
    kind: 'number',
    key: 'traceSteps',
    urlKey: 'trs',
    label: 'Trace resolution',
    default: 32,
    min: 4,
    max: 128,
    step: 1,
    forLayer: 'trace',
  },
];

export const layers: LayerDef[] = [
  { key: 'trace', urlKey: 'tr', label: 'Angle trace', default: false, group: 'Display' },
  {
    key: 'answer',
    urlKey: 'ans',
    label: 'Predicted magnitude',
    default: false,
    reveal: true,
    group: 'Predict',
  },
];

export const scalars: ScalarDef[] = [
  {
    key: 'magnitude',
    label: '|p|',
    symbol: '|\\vec{p}|',
    readout: true,
    plottable: true,
  },
  { key: 'fValue', label: 'f(k)', symbol: 'f(k)', readout: true, plottable: true },
];
