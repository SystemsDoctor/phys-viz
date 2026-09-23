import type { ModuleManifest } from '../types';

const manifest: ModuleManifest = {
  id: 'vector-algebra',
  title: 'Vector Algebra',
  category: 'vectors',
  blurb: 'Sums, projections, dot and cross products in 2D and 3D.',
  tags: ['vectors', 'dot product', 'cross product', 'components'],
  timeModel: 'static',
  dimensions: 'both',
  schemaVersion: 2, // X-30/ADR 0016: 'c' param urlKey renamed to 'vc' (collided with the shell's camera key)
  level: 'algebra-based',
};
export default manifest;
