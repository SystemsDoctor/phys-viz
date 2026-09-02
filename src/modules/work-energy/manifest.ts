import type { ModuleManifest } from '../types';

const manifest: ModuleManifest = {
  id: 'work-energy',
  title: 'Work & Energy',
  category: 'energy',
  blurb:
    'A mass on a frictionless spring drawn as a potential-energy landscape, with a total-energy plane marking the turning points.',
  tags: ['energy', 'work', 'oscillation', 'spring', 'conservation'],
  timeModel: 'parametric', // x(t) is closed-form SHM — no integration needed
  dimensions: 2,
  schemaVersion: 1,
  level: 'algebra-based',
};
export default manifest;
