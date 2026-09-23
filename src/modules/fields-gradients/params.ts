import type { ParamDef, LayerDef, ScalarDef } from '../types';

export const params: ParamDef[] = [
  // Scalar heightmap f(x,y)
  {
    kind: 'expression',
    key: 'f',
    urlKey: 'f',
    label: 'f(x, y)',
    symbol: 'f(x,y)',
    vars: ['x', 'y'],
    default: 'sin(x) * cos(y)',
    group: 'Heightmap',
    forLayer: 'heightmap',
  },
  {
    kind: 'number',
    key: 'domain',
    urlKey: 'dom',
    label: 'Domain half-extent',
    default: 3,
    min: 1,
    max: 5,
    step: 0.5,
    group: 'Heightmap',
    forLayer: 'heightmap',
  },
  {
    kind: 'number',
    key: 'px',
    urlKey: 'px',
    label: 'Probe x',
    default: 1.2,
    min: -3,
    max: 3,
    step: 0.1,
    group: 'Heightmap',
  },
  {
    kind: 'number',
    key: 'py',
    urlKey: 'py',
    label: 'Probe y',
    default: -0.8,
    min: -3,
    max: 3,
    step: 0.1,
    group: 'Heightmap',
  },
  {
    kind: 'angle',
    key: 'theta',
    urlKey: 'dth', // X-30: was 'th', colliding with the shell's theme key
    label: 'Direction û',
    symbol: '\\theta',
    default: 0.4,
    forLayer: 'directionalDerivative',
  },

  // Vector field F(x,y,z) — deliberately NOT grad(f): curl of a gradient
  // is always zero, which would leave the curl paddlewheel dead.
  {
    kind: 'expression',
    key: 'Fx',
    urlKey: 'fx',
    label: 'Fx(x, y, z)',
    vars: ['x', 'y', 'z'],
    default: 'x*x - y',
    group: 'Vector field',
  },
  {
    kind: 'expression',
    key: 'Fy',
    urlKey: 'fy',
    label: 'Fy(x, y, z)',
    vars: ['x', 'y', 'z'],
    default: 'x + y*y',
    group: 'Vector field',
  },
  {
    kind: 'expression',
    key: 'Fz',
    urlKey: 'fz',
    label: 'Fz(x, y, z)',
    vars: ['x', 'y', 'z'],
    default: 'z',
    group: 'Vector field',
  },
  {
    kind: 'number',
    key: 'n',
    urlKey: 'n',
    label: 'Quadrature points',
    default: 4,
    min: 1,
    max: 16,
    step: 1,
    group: 'Vector field',
  },

  // Shrinking-box divergence
  {
    kind: 'vector',
    key: 'boxCenter',
    urlKey: 'bxc',
    label: 'Box center',
    default: [1.4, 1.0, 0.6],
    range: 3,
    draggable: true,
    forLayer: 'divergenceBox',
  },
  {
    kind: 'number',
    key: 'boxHalfSize',
    urlKey: 'bxs',
    label: 'Box half-size',
    default: 0.6,
    min: 0.05,
    max: 1.5,
    step: 0.01,
    logScale: true,
    forLayer: 'divergenceBox',
  },

  // Curl paddlewheel
  {
    kind: 'vector',
    key: 'curlProbe',
    urlKey: 'clp',
    label: 'Curl probe',
    default: [-1.4, -1.0, 0.6],
    range: 3,
    draggable: true,
    forLayer: 'curlPaddlewheel',
  },

  // Flux / Stokes — the "user-shaped surface"
  {
    kind: 'vector',
    key: 'capCenter',
    urlKey: 'cpc',
    label: 'Cap center',
    default: [-1.5, 1.5, 0.8],
    range: 3,
    draggable: true,
    forLayer: 'fluxCap',
  },
  {
    kind: 'number',
    key: 'capRadius',
    urlKey: 'cpr',
    label: 'Cap boundary radius',
    default: 1.1,
    min: 0.3,
    max: 2.5,
    step: 0.1,
    forLayer: 'fluxCap',
  },
  {
    kind: 'number',
    key: 'capDepth',
    urlKey: 'cpd',
    label: 'Cap depth (0 = flat disk)',
    default: 0.8,
    min: -1.5,
    max: 1.5,
    step: 0.05,
    forLayer: 'fluxCap',
  },
];

export const layers: LayerDef[] = [
  { key: 'heightmap', urlKey: 'hm', label: 'Heightmap (banded level curves)', default: true },
  { key: 'probeGradient', urlKey: 'pg', label: 'Gradient at the probe', default: true },
  { key: 'gradientField', urlKey: 'gf', label: 'Gradient field (whole domain)', default: false },
  { key: 'directionalDerivative', urlKey: 'dd', label: 'Directional derivative', default: false },
  { key: 'divergenceBox', urlKey: 'db', label: 'Shrinking-box divergence', default: true },
  { key: 'curlPaddlewheel', urlKey: 'cw', label: 'Curl paddlewheel', default: true },
  { key: 'fluxCap', urlKey: 'fc', label: 'Flux through a user-shaped surface', default: true },
];

export const scalars: ScalarDef[] = [
  {
    key: 'gradMag',
    label: '|∇f| at probe',
    symbol: '|\\nabla f|',
    readout: true,
    description:
      'How steeply the heightmap f rises at the probe point — the length of the gradient vector, largest where the surface is steepest.',
  },
  {
    key: 'dirDeriv',
    label: 'Directional derivative',
    symbol: 'D_{\\hat u}f',
    readout: true,
    plottable: true,
    description:
      'The rate f changes at the probe if you move in the chosen direction û — positive climbing, negative descending, zero along a level curve.',
  },
  {
    key: 'divAtBox',
    label: 'div F at box center',
    symbol: '\\nabla\\cdot\\vec F',
    readout: true,
    description:
      'How strongly the vector field F is expanding outward (source) or converging inward (sink) right at the box center.',
  },
  {
    key: 'fluxThroughBox',
    label: 'Flux through box',
    readout: true,
    description:
      'The net amount of the field F passing outward through all six faces of the box, summed together.',
  },
  {
    key: 'fluxOverVolume',
    label: 'Flux / volume',
    symbol: '\\Phi/V',
    readout: true,
    plottable: true,
    description:
      'The box’s outward flux divided by its volume — as the box shrinks this converges onto the divergence at its center, the limit definition of divergence.',
  },
  {
    key: 'divVolumeIntegral',
    label: '∫∫∫ div F dV',
    readout: true,
    description: 'The divergence of F summed (integrated) over the entire volume of the box.',
  },
  {
    key: 'divergenceGap',
    label: '|flux − ∫div F dV|',
    readout: true,
    plottable: true,
    description:
      'How much the box’s measured surface flux and its volume integral of divergence disagree — near zero confirms the divergence theorem numerically.',
  },
  {
    key: 'curlMag',
    label: '|curl F| at probe',
    symbol: '|\\nabla\\times\\vec F|',
    readout: true,
    description:
      'How strongly the field F rotates locally around the curl probe — the paddlewheel spins faster the larger this is.',
  },
  {
    key: 'circulation',
    label: 'Circulation ∮F·dl',
    readout: true,
    description:
      'The total push the field F gives something traveling once around the cap’s fixed boundary circle.',
  },
  {
    key: 'curlFluxThroughCap',
    label: '∫∫ (curl F)·dA',
    readout: true,
    description:
      'The curl of F summed (integrated) over the entire curved cap surface stretched across the boundary circle.',
  },
  {
    key: 'stokesGap',
    label: '|circulation − curl flux|',
    readout: true,
    plottable: true,
    description:
      'How much the boundary circulation and the cap’s curl flux disagree — near zero confirms Stokes’ theorem regardless of how the cap is bowled.',
  },
];
