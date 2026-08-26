import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParamPanel } from './index';
import type { ParamDef } from '@/modules/types';

const defs: ParamDef[] = [
  {
    kind: 'number',
    key: 'x',
    urlKey: 'x',
    label: 'X',
    min: 0,
    max: 10,
    step: 1,
    default: 5,
  },
  {
    kind: 'vector',
    key: 'a',
    urlKey: 'a',
    label: 'A',
    default: [0, 0, 0],
    range: 5,
    group: 'Vectors',
  },
  {
    kind: 'toggle',
    key: 'on',
    urlKey: 'on',
    label: 'On',
    default: true,
    group: 'Vectors',
  },
];

describe('ParamPanel', () => {
  it('dispatches every ParamDef kind to its matching control', () => {
    render(<ParamPanel defs={defs} values={{ x: 5, a: [1, 2, 3], on: true }} onChange={vi.fn()} />);
    expect(screen.getByRole('slider', { name: /X/ })).toBeInTheDocument();
    expect(screen.getByLabelText('A x')).toHaveValue(1);
    expect(screen.getByRole('checkbox', { name: 'On' })).toBeChecked();
  });

  it('groups params under a labelled fieldset, leaves ungrouped ones bare', () => {
    render(<ParamPanel defs={defs} values={{ x: 5, a: [0, 0, 0], on: true }} onChange={vi.fn()} />);
    expect(screen.getByText('Vectors')).toBeInTheDocument();
    const groups = document.querySelectorAll('.pv-param-group');
    expect(groups.length).toBe(2); // one ungrouped (X), one "Vectors" (a, on)
  });

  it('routes onChange(key, value) back through with the right key', async () => {
    const onChange = vi.fn();
    render(
      <ParamPanel defs={defs} values={{ x: 5, a: [0, 0, 0], on: false }} onChange={onChange} />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'On' }));
    expect(onChange).toHaveBeenCalledWith('on', true);
  });
});
