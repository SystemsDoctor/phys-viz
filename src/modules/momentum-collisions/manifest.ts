import type { ModuleManifest } from '../types';

const manifest: ModuleManifest = {
  id: 'momentum-collisions',
  title: 'Momentum & Collisions',
  category: 'momentum',
  blurb:
    'Two carts collide head-on along a line — a restitution slider spans perfectly elastic to perfectly inelastic, with a center-of-mass frame toggle.',
  tags: ['momentum', 'collision', 'elastic', 'inelastic', 'center-of-mass', 'conservation'],
  timeModel: 'parametric', // closed-form piecewise-linear kinematics — no integration needed
  dimensions: 2,
  schemaVersion: 1,
  level: 'algebra-based',
};
export default manifest;
