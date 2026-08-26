/**
 * Time series plot — any module-declared scalar vs. time, or vs. any
 * other declared scalar (phase-space portraits for free). uPlot wrapper
 * (ARCHITECTURE.md §9, §4 "do not reach for D3 or Chart.js").
 *
 * uPlot is constructed once (it owns a <canvas>, not something React
 * should re-render) and updated imperatively via setData/setSize —
 * the same "retained handle, mutate in place" discipline glyphs use.
 */
import React from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

export interface TimeSeriesPlotProps {
  series: { x: number; y: number }[];
  xLabel: string;
  yLabel: string;
}

function toAlignedData(series: { x: number; y: number }[]): uPlot.AlignedData {
  return [series.map((p) => p.x), series.map((p) => p.y)];
}

export function TimeSeriesPlot(props: TimeSeriesPlotProps): React.ReactElement {
  const { series, xLabel, yLabel } = props;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const plotRef = React.useRef<uPlot | null>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const opts: uPlot.Options = {
      width: container.clientWidth || 300,
      height: 200,
      scales: { x: { time: false } },
      series: [{ label: xLabel }, { label: yLabel, stroke: '#0072b2', width: 2 }],
      axes: [{ label: xLabel }, { label: yLabel }],
    };
    const plot = new uPlot(opts, toAlignedData(series), container);
    plotRef.current = plot;

    const resizeObserver = new ResizeObserver(() => {
      if (container.clientWidth > 0) plot.setSize({ width: container.clientWidth, height: 200 });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      plot.destroy();
      plotRef.current = null;
    };
    // Constructed once; xLabel/yLabel changes are rare (a module's own
    // label choice, not per-frame state) and aren't worth a full
    // rebuild — series updates below cover the actual per-frame path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    plotRef.current?.setData(toAlignedData(series));
  }, [series]);

  return (
    <div className="pv-plot" ref={containerRef} role="img" aria-label={`${yLabel} vs ${xLabel}`} />
  );
}
