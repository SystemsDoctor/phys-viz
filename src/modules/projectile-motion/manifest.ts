import type { ModuleManifest } from '../types';

const manifest: ModuleManifest = {
  id: 'projectile-motion',
  title: 'Projectile Motion',
  category: 'kinematics',
  blurb:
    'A point mass launched under gravity, no air resistance — a closed-form 3D trajectory, defined by angle and speed or directly by a launch velocity vector.',
  tags: ['kinematics', 'gravity', 'trajectory', '3d', 'vector'],
  timeModel: 'parametric', // position is a pure closed-form function of t — no integration needed
  dimensions: 'both', // stays in the default 2D plane unless azimuth or the vector option takes it out
  schemaVersion: 1,
  level: 'algebra-based',
};
export default manifest;
