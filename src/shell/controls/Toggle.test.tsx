import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('reflects the current value and reports the flip on click', async () => {
    const onChange = vi.fn();
    render(<Toggle label="Show axes" value={false} onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: 'Show axes' });
    expect(box).not.toBeChecked();
    await userEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
