import type { ModuleManifest } from '../types';

const manifest: ModuleManifest = {
  id: 'gravitation',
  title: 'Gravitation & Central Forces',
  category: 'gravitation',
  blurb:
    'A body orbiting a fixed central mass under an inverse-square force — a closed-form Kepler ellipse, no numerical integration.',
  tags: ['gravity', 'orbit', 'kepler', 'ellipse', 'central force', 'angular momentum'],
  timeModel: 'parametric', // position/velocity at time t are a closed form via the Kepler-equation solve (kernel/ode's findRoot) — no integration
  dimensions: 'both', // flat (inclination = 0) by default; a nonzero inclination tilts the orbital plane into 3D
  schemaVersion: 1,
  level: 'calculus-based',
};
export default manifest;
