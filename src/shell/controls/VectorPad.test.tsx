import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VectorPad } from './VectorPad';

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
});
