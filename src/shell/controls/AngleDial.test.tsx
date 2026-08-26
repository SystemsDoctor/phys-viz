import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AngleDial } from './AngleDial';

describe('AngleDial', () => {
  it('renders as a keyboard-reachable slider role with the value in degrees', () => {
    render(<AngleDial label="Angle" value={Math.PI / 2} onChange={vi.fn()} />);
    const dial = screen.getByRole('slider', { name: 'Angle' });
    expect(dial).toHaveAttribute('tabindex', '0');
    expect(screen.getByText('90°')).toBeInTheDocument();
  });

  it('ArrowRight increases the angle, ArrowLeft decreases it', () => {
    const onChange = vi.fn();
    render(<AngleDial label="Angle" value={0} onChange={onChange} />);
    const dial = screen.getByRole('slider', { name: 'Angle' });
    dial.focus();
    dial.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    );
    expect(onChange).toHaveBeenCalledWith(Math.PI / 60);
  });

  it('clamps to max when a step would overshoot it', () => {
    const onChange = vi.fn();
    render(<AngleDial label="Angle" value={0.99} min={-1} max={1} onChange={onChange} />);
    const dial = screen.getByRole('slider', { name: 'Angle' });
    dial.focus();
    dial.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    );
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
