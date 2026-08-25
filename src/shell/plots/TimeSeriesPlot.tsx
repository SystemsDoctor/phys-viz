/**
 * Time series plot — any module-declared scalar vs. time, or vs. any
 * other declared scalar (phase-space portraits for free). uPlot wrapper
 * (ARCHITECTURE.md §9, §4 "do not reach for D3 or Chart.js").
 * TODO(M3): implement.
 */
import React from 'react';

export function TimeSeriesPlot(_props: {
  series: { x: number; y: number }[];
  xLabel: string;
  yLabel: string;
}): React.ReactElement {
  throw new Error('shell/plots/TimeSeriesPlot: not implemented (see M3 in ARCHITECTURE.md §20)');
}
