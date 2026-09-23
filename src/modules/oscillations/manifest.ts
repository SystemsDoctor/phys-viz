import type { ModuleManifest } from '../types';

const manifest: ModuleManifest = {
  id: 'oscillations',
  title: 'Driven Damped Oscillations',
  category: 'oscillations',
  blurb:
    'A mass on a spring, driven by a sinusoidal force — sweep the drive frequency through resonance and watch the steady-state amplitude and phase lag respond.',
  tags: ['oscillation', 'resonance', 'damping', 'driven', 'phase lag', 'shm'],
  timeModel: 'parametric', // the steady-state response is a pure closed-form function of t — no integration
  dimensions: 2,
  schemaVersion: 2, // X-30/ADR 0016: 'c' param urlKey renamed to 'cd' (collided with the shell's camera key)
  level: 'calculus-based',
};
export default manifest;
