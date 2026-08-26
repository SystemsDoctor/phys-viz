import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TimeSeriesPlot } from './TimeSeriesPlot';

describe('TimeSeriesPlot', () => {
  it('mounts without throwing given a series', () => {
    render(
      <TimeSeriesPlot
        series={[
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ]}
        xLabel="t"
        yLabel="v"
      />,
    );
  });

  it('renders an accessible img role labelled with the axis names', () => {
    const { getByRole } = render(
      <TimeSeriesPlot series={[{ x: 0, y: 0 }]} xLabel="time" yLabel="speed" />,
    );
    expect(getByRole('img', { name: 'speed vs time' })).toBeInTheDocument();
  });

  it('re-rendering with a new series does not throw (imperative setData path)', () => {
    const { rerender } = render(<TimeSeriesPlot series={[{ x: 0, y: 0 }]} xLabel="t" yLabel="v" />);
    rerender(
      <TimeSeriesPlot
        series={[
          { x: 0, y: 0 },
          { x: 1, y: 2 },
          { x: 2, y: 4 },
        ]}
        xLabel="t"
        yLabel="v"
      />,
    );
  });

  it('unmounting disposes the uPlot instance without throwing', () => {
    const { unmount } = render(<TimeSeriesPlot series={[{ x: 0, y: 0 }]} xLabel="t" yLabel="v" />);
    unmount();
  });
});
