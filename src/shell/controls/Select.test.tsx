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
});
