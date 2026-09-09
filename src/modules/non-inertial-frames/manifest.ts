import type { ModuleManifest } from '../types';

const manifest: ModuleManifest = {
  id: 'non-inertial-frames',
  title: 'Non-Inertial Frames & Coriolis',
  category: 'dynamics',
  blurb:
    'A puck moves in a straight line under no real force at all — redraw the same motion from a spinning platform and watch the Coriolis and centrifugal terms appear.',
  tags: [
    'non-inertial frame',
    'rotating frame',
    'coriolis force',
    'centrifugal force',
    'fictitious force',
  ],
  timeModel: 'parametric', // r(t) is a pure closed-form function of t — no integration
  dimensions: 2,
  schemaVersion: 1,
  level: 'upper-division',
};
export default manifest;
