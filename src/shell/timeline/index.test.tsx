import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Timeline } from './index';

describe('Timeline', () => {
  it('renders nothing for a static time model', () => {
    const { container } = render(
      <Timeline
        timeModel="static"
        t={0}
        playing={false}
        speed={1}
        direction={1}
        onChange={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('play/pause button toggles playing', async () => {
    const onChange = vi.fn();
    render(
      <Timeline
        timeModel="parametric"
        t={0}
        playing={false}
        speed={1}
        direction={1}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(onChange).toHaveBeenCalledWith({ playing: true });
  });

  it('step forward/back move t by stepSize, clamped to [0, maxT]', async () => {
    const onChange = vi.fn();
    render(
      <Timeline
        timeModel="parametric"
        t={0}
        playing={false}
        speed={1}
        direction={1}
        stepSize={0.1}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Step back' }));
    expect(onChange).toHaveBeenCalledWith({ t: 0 }); // clamped at 0, not negative
    await userEvent.click(screen.getByRole('button', { name: 'Step forward' }));
    expect(onChange).toHaveBeenCalledWith({ t: 0.1 });
  });

  it('reset button sets t to 0 and is disabled when already at t=0', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <Timeline
        timeModel="parametric"
        t={0}
        playing={false}
        speed={1}
        direction={1}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('button', { name: 'Reset to start' })).toBeDisabled();

    rerender(
      <Timeline
        timeModel="parametric"
        t={5}
        playing={true}
        speed={1}
        direction={1}
        onChange={onChange}
      />,
    );
    const reset = screen.getByRole('button', { name: 'Reset to start' });
    expect(reset).not.toBeDisabled();
    await userEvent.click(reset);
    expect(onChange).toHaveBeenCalledWith({ t: 0 });
  });

  it('reverse is enabled for parametric and toggles direction', async () => {
    const onChange = vi.fn();
    render(
      <Timeline
        timeModel="parametric"
        t={0}
        playing={false}
        speed={1}
        direction={1}
        onChange={onChange}
      />,
    );
    const reverse = screen.getByRole('button', { name: 'Reverse direction' });
    expect(reverse).not.toBeDisabled();
    await userEvent.click(reverse);
    expect(onChange).toHaveBeenCalledWith({ direction: -1 });
  });

  it('reverse is disabled with a tooltip for stepped', () => {
    render(
      <Timeline
        timeModel="stepped"
        t={0}
        playing={false}
        speed={1}
        direction={1}
        onChange={vi.fn()}
      />,
    );
    const reverse = screen.getByRole('button', { name: 'Reverse direction' });
    expect(reverse).toBeDisabled();
    expect(reverse).toHaveAttribute('title');
  });

  it('the scrub slider reports t as a plain patch (ModuleView owns reset+fast-forward semantics)', () => {
    const onChange = vi.fn();
    render(
      <Timeline
        timeModel="parametric"
        t={0}
        playing={false}
        speed={1}
        direction={1}
        maxT={20}
        onChange={onChange}
      />,
    );
    const scrub = screen.getByRole('slider', { name: 'Scrub time' });
    fireEvent.change(scrub, { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith({ t: 5 });
  });

  it('speed select reports the chosen multiplier as a number', async () => {
    const onChange = vi.fn();
    render(
      <Timeline
        timeModel="parametric"
        t={0}
        playing={false}
        speed={1}
        direction={1}
        onChange={onChange}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText('Speed'), '2');
    expect(onChange).toHaveBeenCalledWith({ speed: 2 });
  });
});
