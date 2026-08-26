/**
 * The M3 gate stub (TASKS.md M3-36): one of every ParamDef kind, every
 * LayerDef feature (grouping, reveal), both plot types, and the 2D
 * lock (ADR 0007) — exercised so the shell substrate proves itself
 * against a real module before M4's flagship. NOT `_`-prefixed: it
 * needs to be reachable through the real registry/routing/URL codec
 * for M3-37's "complete usable UI, zero module code, full URL
 * round-trip" verification to mean anything, so it stays a permanent
 * gallery fixture (category: 'sandbox') rather than a hidden dev-only
 * route — a real, if deliberately unglamorous, demonstration of every
 * control kind in one place is useful in its own right.
 */
import type { ModuleManifest } from '../types';

const manifest: ModuleManifest = {
  id: 'control-showcase',
  title: 'Control Showcase',
  category: 'sandbox',
  blurb: 'Every param, layer, and plot kind the shell supports, in one module — a substrate test.',
  tags: ['sandbox', 'shell-test'],
  timeModel: 'parametric',
  dimensions: 2,
  schemaVersion: 1,
  level: 'algebra-based',
};
export default manifest;
