import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AngleDial } from './AngleDial';

describe('AngleDial', () => {
  it('renders as a keyboard-reachable slider role with the value in degrees', () => {
    render(<AngleDial label="Angle" value={Math.PI / 2} onChange={vi.fn()} />);
    const dial = screen.getByRole('slider', { name: 'Angle' });
    expect(dial).toHaveAttribute('tabindex', '0');
    expect(screen.getByLabelText('Angle in degrees')).toHaveValue(90);
  });

  it('typing a degree value into the text entry commits the equivalent radian value', () => {
    const onChange = vi.fn();
    render(<AngleDial label="Angle" value={0} onChange={onChange} />);
    const input = screen.getByLabelText('Angle in degrees');
    fireEvent.change(input, { target: { value: '45' } });
    expect(onChange).toHaveBeenCalledWith(Math.PI / 4);
  });

  it('clamps a typed degree value to min/max, same as the dial', () => {
    const onChange = vi.fn();
    render(<AngleDial label="Angle" value={0} min={0} max={Math.PI / 2} onChange={onChange} />);
    const input = screen.getByLabelText('Angle in degrees');
    fireEvent.change(input, { target: { value: '180' } });
    expect(onChange).toHaveBeenCalledWith(Math.PI / 2);
  });

  it('does not call onChange while the text entry is empty or unparseable mid-edit', () => {
    const onChange = vi.fn();
    render(<AngleDial label="Angle" value={0} onChange={onChange} />);
    const input = screen.getByLabelText('Angle in degrees');
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue(null);
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
