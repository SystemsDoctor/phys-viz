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
  schemaVersion: 2, // X-30/ADR 0016: 'theta' param urlKey renamed to 'dth' (collided with the shell's theme key)
  level: 'calculus-based',
};
export default manifest;
