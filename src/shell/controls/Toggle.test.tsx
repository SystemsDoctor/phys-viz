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

  it('renders a Tooltip next to the label when help is given, without double-toggling the checkbox on click', async () => {
    const onChange = vi.fn();
    render(<Toggle label="Show axes" help="Toggles the reference grid." value={false} onChange={onChange} />);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Toggles the reference grid.');

    // The Tooltip's own trigger button is nested inside this control's
    // <label> — clicking it must not ALSO fire the label's native
    // click-forwarding to the checkbox it wraps.
    await userEvent.click(screen.getByRole('button'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
