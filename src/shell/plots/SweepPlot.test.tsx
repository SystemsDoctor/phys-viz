import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SweepPlot } from './SweepPlot';
import type { ParamDef, ScalarDef } from '@/modules/types';

const numberParam: ParamDef = {
  kind: 'number',
  key: 'k',
  urlKey: 'k',
  label: 'k',
  min: 0,
  max: 10,
  step: 0.1,
  default: 1,
};
const scalar: ScalarDef = { key: 'response', label: 'Response' };

describe('SweepPlot', () => {
  it('evaluates the scalar at `samples` points across the swept param range and renders', () => {
    let calls = 0;
    render(
      <SweepPlot
        sweepParam={numberParam}
        scalar={scalar}
        evaluate={(x) => {
          calls++;
          return x * 2;
        }}
        samples={10}
      />,
    );
    expect(calls).toBe(10);
  });

  it('samples the exact min and max endpoints', () => {
    const seen: number[] = [];
    render(
      <SweepPlot
        sweepParam={numberParam}
        scalar={scalar}
        evaluate={(x) => {
          seen.push(x);
          return 0;
        }}
        samples={5}
      />,
    );
    expect(seen[0]).toBe(0);
    expect(seen[seen.length - 1]).toBe(10);
  });

  it('renders with the swept param and scalar labels', () => {
    const { getByRole } = render(
      <SweepPlot sweepParam={numberParam} scalar={scalar} evaluate={() => 1} />,
    );
    expect(getByRole('img', { name: 'Response vs k' })).toBeInTheDocument();
  });

  it('throws a clear error when swept over a param kind with no numeric range', () => {
    const selectParam: ParamDef = {
      kind: 'select',
      key: 'mode',
      urlKey: 'md',
      label: 'Mode',
      options: [{ value: 'a', label: 'A' }],
      default: 'a',
    };
    expect(() =>
      render(<SweepPlot sweepParam={selectParam} scalar={scalar} evaluate={() => 1} />),
    ).toThrow(/cannot sweep/);
  });
});
