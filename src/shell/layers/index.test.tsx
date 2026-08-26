import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayerManager } from './index';
import type { LayerDef } from '@/modules/types';

const defs: LayerDef[] = [
  { key: 'sum', urlKey: 'sum', label: 'Sum', default: false },
  { key: 'grid', urlKey: 'gr', label: 'Grid', default: true, group: 'Structure' },
  {
    key: 'answer',
    urlKey: 'ans',
    label: 'Answer',
    default: false,
    reveal: true,
    group: 'Structure',
  },
];

describe('LayerManager', () => {
  it('renders every layer as a checkbox outside predict mode, even reveal-tagged ones', () => {
    render(
      <LayerManager
        defs={defs}
        values={{ sum: false, grid: true, answer: false }}
        predictMode={false}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('checkbox', { name: 'Sum' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Answer' })).toBeInTheDocument();
  });

  it('groups layers under a labelled fieldset', () => {
    render(
      <LayerManager
        defs={defs}
        values={{ sum: false, grid: true, answer: false }}
        predictMode={false}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Structure')).toBeInTheDocument();
  });

  it('toggling a checkbox calls onChange(key, value)', async () => {
    const onChange = vi.fn();
    render(
      <LayerManager
        defs={defs}
        values={{ sum: false, grid: true, answer: false }}
        predictMode={false}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Sum' }));
    expect(onChange).toHaveBeenCalledWith('sum', true);
  });

  it('predict mode hides a reveal-tagged layer behind a Reveal button; non-reveal layers stay checkboxes', () => {
    render(
      <LayerManager
        defs={defs}
        values={{ sum: false, grid: true, answer: false }}
        predictMode={true}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole('checkbox', { name: 'Answer' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reveal: Answer/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Sum' })).toBeInTheDocument();
  });

  it('clicking Reveal turns the layer on and switches it to a normal checkbox', async () => {
    const onChange = vi.fn();
    render(
      <LayerManager
        defs={defs}
        values={{ sum: false, grid: true, answer: false }}
        predictMode={true}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Reveal: Answer/ }));
    expect(onChange).toHaveBeenCalledWith('answer', true);
    expect(screen.getByRole('checkbox', { name: 'Answer' })).toBeInTheDocument();
  });
});
