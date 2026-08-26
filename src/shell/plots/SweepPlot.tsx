/**
 * Sweep plot — pick a parameter, sweep it across its range, evaluate a
 * declared scalar at each value, plot the curve. One generic feature
 * that serves resonance response curves, effective-potential curves,
 * and (per §22) a ship's GZ righting-arm curve. Built once here; never
 * rebuilt in a module.
 *
 * Reuses TimeSeriesPlot's uPlot wrapper for the actual rendering — a
 * sweep plot is just a series where x is the swept param's value
 * instead of time.
 */
import React from 'react';
import type { ParamDef, ScalarDef } from '@/modules/types';
import { TimeSeriesPlot } from './TimeSeriesPlot';

export interface SweepPlotProps {
  sweepParam: ParamDef;
  scalar: ScalarDef;
  evaluate: (paramValue: number) => number;
  samples?: number;
}

function sweepRange(def: ParamDef): { min: number; max: number } {
  if (def.kind === 'number' || def.kind === 'angle') {
    if (def.min === undefined || def.max === undefined) {
      throw new Error(
        `shell/plots/SweepPlot: param "${def.key}" (kind "${def.kind}") has no min/max to sweep across`,
      );
    }
    return { min: def.min, max: def.max };
  }
  throw new Error(
    `shell/plots/SweepPlot: cannot sweep a "${def.kind}" param ("${def.key}") — only "number" and "angle" params have a numeric range`,
  );
}

export function SweepPlot(props: SweepPlotProps): React.ReactElement {
  const { sweepParam, scalar, evaluate, samples = 100 } = props;
  const { min, max } = sweepRange(sweepParam);

  const series = React.useMemo(() => {
    const n = Math.max(2, samples);
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const x = min + ((max - min) * i) / (n - 1);
      points.push({ x, y: evaluate(x) });
    }
    return points;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max, samples, evaluate]);

  return <TimeSeriesPlot series={series} xLabel={sweepParam.label} yLabel={scalar.label} />;
}
