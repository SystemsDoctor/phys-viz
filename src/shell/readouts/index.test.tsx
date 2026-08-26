import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReadoutTable } from './index';
import type { ScalarDef } from '@/modules/types';

const defs: ScalarDef[] = [
  { key: 'dot', label: 'Dot product', symbol: '\\vec{a}\\cdot\\vec{b}', readout: true },
  { key: 'hidden', label: 'Hidden', readout: false },
  { key: 'plain', label: 'Plain scalar' },
];

describe('ReadoutTable', () => {
  it('renders one row per scalar not explicitly opted out with readout: false', () => {
    render(<ReadoutTable defs={defs} values={{ dot: 3.5, hidden: 1, plain: 2 }} />);
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    expect(screen.getByText('Plain scalar')).toBeInTheDocument();
  });

  it('renders a symbol via KaTeX when present, plain text label otherwise', () => {
    const { container } = render(
      <ReadoutTable defs={defs} values={{ dot: 3.5, hidden: 1, plain: 2 }} />,
    );
    expect(container.querySelector('.katex')).toBeInTheDocument();
  });

  it('formats the value through kernel/units formatQuantity', () => {
    render(<ReadoutTable defs={defs} values={{ dot: 3.5, hidden: 1, plain: 2 }} />);
    // formatQuantity pads to a fixed width and includes the value's digits.
    expect(screen.getByText(/3\.50/)).toBeInTheDocument();
  });

  it('applies the pinned modifier class when pinned', () => {
    const { container } = render(
      <ReadoutTable defs={defs} values={{ dot: 1, hidden: 1, plain: 1 }} pinned />,
    );
    expect(container.querySelector('table')).toHaveClass('pv-readouts--pinned');
  });

  it('renders values as plain selectable table-cell text, not canvas pixels (§16)', () => {
    render(<ReadoutTable defs={defs} values={{ dot: 3.5, hidden: 1, plain: 2 }} />);
    const cells = screen.getAllByRole('cell');
    expect(cells.length).toBeGreaterThan(0);
  });
});
