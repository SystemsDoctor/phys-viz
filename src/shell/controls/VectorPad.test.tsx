import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VectorPad } from './VectorPad';

// A controlled wrapper matching how `shell/params/ParamControl` actually
// wires a module's `value`/`onChange` to the store: the parent owns the
// value and feeds the committed result straight back in, synchronously.
function ControlledVectorPad(props: {
  initial: [number, number, number];
  range: number;
}): React.ReactElement {
  const [value, setValue] = React.useState(props.initial);
  return <VectorPad label="a" value={value} range={props.range} onChange={setValue} />;
}

describe('VectorPad', () => {
  it('renders three numeric inputs for x/y/z', () => {
    render(<VectorPad label="a" value={[1, 2, 3]} range={5} onChange={vi.fn()} />);
    expect(screen.getByLabelText('a x')).toHaveValue(1);
    expect(screen.getByLabelText('a y')).toHaveValue(2);
    expect(screen.getByLabelText('a z')).toHaveValue(3);
  });

  it('editing one component only changes that component', () => {
    const onChange = vi.fn();
    render(<VectorPad label="a" value={[1, 2, 3]} range={5} onChange={onChange} />);
    const y = screen.getByLabelText('a y');
    fireEvent.change(y, { target: { value: '4' } });
    expect(onChange).toHaveBeenCalledWith([1, 4, 3]);
  });

  it('clamps a component to +/- range', () => {
    const onChange = vi.fn();
    render(<VectorPad label="a" value={[0, 0, 0]} range={5} onChange={onChange} />);
    const x = screen.getByLabelText('a x');
    fireEvent.change(x, { target: { value: '99' } });
    expect(onChange).toHaveBeenCalledWith([5, 0, 0]);
  });

  it('displays the clamped value, not the raw typed one, once a component is clamped', () => {
    // Regression: typing an out-of-range number used to commit the
    // clamped value while the input kept showing the unclamped text the
    // user typed, silently disagreeing with the value the module
    // actually receives. Uses the controlled wrapper (real store-backed
    // usage) rather than a fixed `value` prop, since a fixed prop can't
    // tell "the parent hasn't round-tripped the new value yet" apart
    // from "something external changed the value out from under us" —
    // exactly the ambiguity this component's resync check has to live
    // with.
    render(<ControlledVectorPad initial={[0, 0, 0]} range={5} />);
    const x = screen.getByLabelText('a x');
    fireEvent.change(x, { target: { value: '99' } });
    expect(x).toHaveValue(5);
  });

  it('wraps the label in a Tooltip only when help is given', () => {
    const { rerender } = render(
      <VectorPad label="a" value={[0, 0, 0]} range={5} onChange={vi.fn()} />,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    rerender(
      <VectorPad
        label="a"
        help="A world-space vector."
        value={[0, 0, 0]}
        range={5}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent('A world-space vector.');
  });

  it('renders a KaTeX symbol next to the label when given', () => {
    const { container } = render(
      <VectorPad label="a" symbol="\vec{a}" value={[0, 0, 0]} range={5} onChange={vi.fn()} />,
    );
    expect(container.querySelector('.katex')).toBeInTheDocument();
  });
});
