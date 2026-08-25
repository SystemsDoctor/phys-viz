// M5 module (ARCHITECTURE.md §20). Stresses instanced glyphs, parametric
// surfaces, quadrature, and scalar colouring.
import type { ModuleManifest } from '../types';

const manifest: ModuleManifest = {
  id: 'fields-gradients',
  title: 'Fields, Gradients & Flux',
  category: 'fields',
  blurb: 'Gradient, divergence, curl, and flux through a user-shaped surface.',
  tags: ['gradient', 'divergence', 'curl', 'flux', 'Stokes theorem'],
  timeModel: 'parametric',
  dimensions: 3,
  schemaVersion: 1,
  level: 'calculus-based',
};
export default manifest;
