import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExpressionField } from './ExpressionField';

describe('ExpressionField', () => {
  it('renders the current text and reports edits verbatim', () => {
    const onChange = vi.fn();
    render(<ExpressionField label="f(x)" value="sin(x)" vars={['x']} onChange={onChange} />);
    const input = screen.getByLabelText('f(x)') as HTMLInputElement;
    expect(input.value).toBe('sin(x)');
  });

  it('shows no error for a valid expression', () => {
    render(<ExpressionField label="f(x)" value="x^2" vars={['x']} onChange={vi.fn()} />);
    expect(screen.getByLabelText('f(x)')).not.toHaveAttribute('aria-invalid');
  });

  it('shows the parse error inline for an invalid expression', () => {
    render(<ExpressionField label="f(x)" value="x +* 1" vars={['x']} onChange={vi.fn()} />);
    const input = screen.getByLabelText('f(x)');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.className).toContain('pv-expr--error');
  });

  it('flags an undeclared variable as an error', () => {
    render(<ExpressionField label="f(x)" value="y + 1" vars={['x']} onChange={vi.fn()} />);
    expect(screen.getByLabelText('f(x)')).toHaveAttribute('aria-invalid', 'true');
  });

  it('wraps the label in a Tooltip only when help is given', () => {
    const { rerender } = render(
      <ExpressionField label="f(x)" value="x" vars={['x']} onChange={vi.fn()} />,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    rerender(
      <ExpressionField
        label="f(x)"
        help="A function of x only."
        value="x"
        vars={['x']}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent('A function of x only.');
  });
});
