import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Slider } from './Slider';

describe('Slider', () => {
  it('renders label and current value, and reports linear changes verbatim', () => {
    const onChange = vi.fn();
    render(<Slider label="Speed" min={0} max={10} step={1} value={4} onChange={onChange} />);
    expect(screen.getByText('Speed')).toBeInTheDocument();
    const input = screen.getByRole('slider');
    fireEvent.change(input, { target: { value: '7' } });
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it('logScale maps the 0..1 slider position through log-interpolation between min/max', () => {
    const onChange = vi.fn();
    // value=10 renders at t=0.5 (log-midpoint of 1..100); move to t=1 (max)
    // so the DOM value actually changes and React's onChange fires.
    render(<Slider label="k" min={1} max={100} step={1} value={10} logScale onChange={onChange} />);
    const input = screen.getByRole('slider');
    fireEvent.change(input, { target: { value: '1' } });
    expect(onChange).toHaveBeenCalledWith(expect.closeTo(100, 5));
  });
});
