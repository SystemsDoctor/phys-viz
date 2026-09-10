import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

describe('Select', () => {
  it('renders every option and reports the selected value', async () => {
    const onChange = vi.fn();
    render(
      <Select
        label="Sum construction"
        value="tip"
        options={[
          { value: 'tip', label: 'Head to tail' },
          { value: 'para', label: 'Parallelogram' },
        ]}
        onChange={onChange}
      />,
    );
    const select = screen.getByLabelText('Sum construction');
    expect(screen.getByRole('option', { name: 'Head to tail' })).toBeInTheDocument();
    await userEvent.selectOptions(select, 'para');
    expect(onChange).toHaveBeenCalledWith('para');
  });

  it('wraps the label in a Tooltip only when help is given', () => {
    const { rerender } = render(
      <Select label="Style" value="a" options={[{ value: 'a', label: 'A' }]} onChange={vi.fn()} />,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    rerender(
      <Select
        label="Style"
        help="Only affects the drawn line."
        value="a"
        options={[{ value: 'a', label: 'A' }]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent('Only affects the drawn line.');
  });

  it('renders a KaTeX symbol next to the label when given', () => {
    const { container } = render(
      <Select
        label="Style"
        symbol="\phi"
        value="a"
        options={[{ value: 'a', label: 'A' }]}
        onChange={vi.fn()}
      />,
    );
    expect(container.querySelector('.katex')).toBeInTheDocument();
  });
});
