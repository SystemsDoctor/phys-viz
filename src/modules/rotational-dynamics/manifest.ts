// M5 module (ARCHITECTURE.md §20). Stresses quaternions, stepped time,
// and rigid bodies — chosen deliberately to be dissimilar from
// vector-algebra so that shipping it and fields-gradients together
// proves the substrate needs zero breaking changes to types.ts.
import type { ModuleManifest } from '../types';

const manifest: ModuleManifest = {
  id: 'rotational-dynamics',
  title: 'Rotational Dynamics',
  category: 'rotation',
  blurb: 'Torque, angular momentum, precession, and rigid-body tumbling.',
  tags: ['torque', 'angular momentum', 'precession', 'nutation', 'inertia tensor'],
  timeModel: 'stepped', // non-principal-axis tumbling is not closed-form; see §12
  dimensions: 3,
  schemaVersion: 1,
  level: 'calculus-based',
};
export default manifest;
