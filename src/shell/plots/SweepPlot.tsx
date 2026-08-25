/**
 * Sweep plot — pick a parameter, sweep it across its range, evaluate a
 * declared scalar at each value, plot the curve. One generic feature
 * that serves resonance response curves, effective-potential curves,
 * and (per §22) a ship's GZ righting-arm curve. Built once here; never
 * rebuilt in a module. TODO(M3): implement.
 */
import React from 'react';
import type { ParamDef, ScalarDef } from '@/modules/types';

export function SweepPlot(_props: {
  sweepParam: ParamDef;
  scalar: ScalarDef;
  evaluate: (paramValue: number) => number;
  samples?: number;
}): React.ReactElement {
  throw new Error('shell/plots/SweepPlot: not implemented (see M3 in ARCHITECTURE.md §20)');
}
