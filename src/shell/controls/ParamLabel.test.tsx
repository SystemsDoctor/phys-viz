import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ParamLabel } from './ParamLabel';

describe('ParamLabel', () => {
  it('renders just the label when neither symbol nor help is given', () => {
    const { container } = render(<ParamLabel label="Mass" />);
    expect(screen.getByText('Mass')).toBeInTheDocument();
    expect(container.querySelector('.katex')).not.toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('appends a KaTeX symbol next to the label, not replacing it', () => {
    const { container } = render(<ParamLabel label="Mass" symbol="m" />);
    expect(screen.getByText('Mass')).toBeInTheDocument();
    expect(container.querySelector('.katex')).toBeInTheDocument();
    // No Tooltip wrapper when help is absent, even with a symbol present.
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('wraps the label alone in a Tooltip when only help is given', () => {
    render(<ParamLabel label="Mass" help="Inertial mass." />);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Inertial mass.');
    expect(screen.getByRole('button')).toHaveTextContent('Mass');
  });

  it('wraps label and symbol together in one Tooltip when both are given', () => {
    const { container } = render(<ParamLabel label="Mass" symbol="m" help="Inertial mass." />);
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveTextContent('Mass');
    expect(trigger.querySelector('.katex')).toBeInTheDocument();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Inertial mass.');
    // Exactly one tooltip trigger/bubble pair, not one per piece of content.
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(container.querySelectorAll('.katex')).toHaveLength(1);
  });
});
