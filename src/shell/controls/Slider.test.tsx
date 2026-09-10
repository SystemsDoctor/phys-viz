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

  it('wraps the label in a Tooltip when help is given, and renders it plain otherwise', () => {
    const { rerender } = render(
      <Slider label="Damping" min={0} max={1} step={0.1} value={0.5} onChange={vi.fn()} />,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    rerender(
      <Slider
        label="Damping"
        help="Zero is undamped."
        min={0}
        max={1}
        step={0.1}
        value={0.5}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent('Zero is undamped.');
  });

  it('renders a KaTeX symbol next to the label when given, appended not replacing it', () => {
    const { container } = render(
      <Slider label="Mass" symbol="m" min={0} max={10} step={1} value={4} onChange={vi.fn()} />,
    );
    expect(screen.getByText('Mass')).toBeInTheDocument();
    expect(container.querySelector('.katex')).toBeInTheDocument();
  });

  it('wraps both the label and its symbol in one Tooltip when both are given', () => {
    render(
      <Slider
        label="Mass"
        symbol="m"
        help="Inertial mass of the block."
        min={0}
        max={10}
        step={1}
        value={4}
        onChange={vi.fn()}
      />,
    );
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Inertial mass of the block.');
    // The trigger (not the tooltip bubble) is what actually contains the
    // label text and the rendered symbol together.
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveTextContent('Mass');
    expect(trigger.querySelector('.katex')).toBeInTheDocument();
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
