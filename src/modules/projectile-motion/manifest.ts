import type { ModuleManifest } from '../types';

const manifest: ModuleManifest = {
  id: 'projectile-motion',
  title: 'Projectile Motion',
  category: 'kinematics',
  blurb: 'A point mass launched at an angle under gravity, with no air resistance — a closed-form trajectory.',
  tags: ['kinematics', 'gravity', 'trajectory'],
  timeModel: 'parametric', // position is a pure closed-form function of t — no integration needed
  dimensions: 2,
  schemaVersion: 1,
  level: 'algebra-based',
};
export default manifest;
