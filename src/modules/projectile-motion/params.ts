// Declare params and layers as DATA — the shell builds the entire
// control panel and layer checklist from these arrays. Zero UI code.
// See ARCHITECTURE.md §9 ("Auto-generated controls") and §10.
//
// `angleMode`/`vectorMode` are `LayerDef`s purely to get the shell's
// existing mutually-exclusive-radio rendering (ADR 0011's
// `exclusiveGroup`) for choosing how the launch is specified — a
// deliberate, minimal reuse of the layer-manager mechanism rather than a
// new `ParamDef` kind (MODULE_AUTHORING.md: a new control kind is a
// `shell/controls` change, not a module hack). `elevation`'s `urlKey`
// ('ang') is unchanged from this module's original single-angle
// `ParamDef` — same physical quantity, just renamed internally now that
// there's a second angle — so an old bookmarked link's `?ang=...` still
// lands on the right value with no `schemaVersion` bump or migration
// needed (MODULE_AUTHORING.md: bump only when a param's MEANING changes,
// not when a new, independently-defaulted param is added alongside it).
import type { ParamDef, LayerDef, ScalarDef } from '../types';
import { LENGTH, VELOCITY, ACCEL } from '@/kernel/units';

export const params: ParamDef[] = [
  {
    kind: 'vector',
    key: 'startPosition',
    urlKey: 'r0',
    label: 'Start position',
    symbol: '\\vec{r}_0',
    default: [0, 0, 0],
    range: 10,
    draggable: true,
    unit: LENGTH,
  },
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
    forLayer: 'angleMode',
  },
  {
    kind: 'angle',
    key: 'elevation',
    urlKey: 'ang',
    label: 'Elevation angle',
    symbol: '\\theta',
    default: Math.PI / 4,
    min: 0,
    max: Math.PI / 2,
    forLayer: 'angleMode',
    help: 'Angle above the horizontal plane.',
  },
  {
    kind: 'angle',
    key: 'azimuth',
    urlKey: 'azm',
    label: 'Azimuth angle',
    symbol: '\\phi',
    default: 0,
    forLayer: 'angleMode',
    help: 'Rotation of the launch direction within the horizontal plane, measured from the horizontal reference axis. Zero keeps the launch in the default 2D plane.',
  },
  {
    kind: 'vector',
    key: 'launchVelocity',
    urlKey: 'lv',
    label: 'Launch velocity',
    symbol: '\\vec{v}_0',
    default: [12 * Math.SQRT1_2, 12 * Math.SQRT1_2, 0],
    range: 30,
    unit: VELOCITY,
    forLayer: 'vectorMode',
    help: 'Direction AND magnitude of the launch, given directly — defaults to the same 2D (x,y) plane as the angle option (z = 0).',
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
  {
    key: 'angleMode',
    urlKey: 'amd',
    label: 'Angle + speed',
    default: true,
    exclusiveGroup: 'launchMode',
  },
  {
    key: 'vectorMode',
    urlKey: 'vmd',
    label: 'Velocity vector',
    default: false,
    exclusiveGroup: 'launchMode',
  },
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
