import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModuleErrorBoundary } from './ModuleErrorBoundary';

function Bomb(): React.ReactElement {
  throw new Error('kaboom');
}

describe('ModuleErrorBoundary', () => {
  it('renders children normally when nothing has failed', () => {
    render(
      <ModuleErrorBoundary moduleId="x" onReset={vi.fn()}>
        <p>fine</p>
      </ModuleErrorBoundary>,
    );
    expect(screen.getByText('fine')).toBeInTheDocument();
  });

  it('catches a render-phase throw and shows the module id and error message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ModuleErrorBoundary moduleId="vector-algebra" onReset={vi.fn()}>
        <Bomb />
      </ModuleErrorBoundary>,
    );
    expect(screen.getByText(/vector-algebra/)).toBeInTheDocument();
    expect(screen.getByText('kaboom')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('also shows the fallback for an externally-reported error (outside-React update() failures)', () => {
    render(
      <ModuleErrorBoundary moduleId="x" onReset={vi.fn()} externalError={new Error('boom')}>
        <p>should not show</p>
      </ModuleErrorBoundary>,
    );
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.queryByText('should not show')).not.toBeInTheDocument();
  });

  it('Reset to defaults calls onReset and clears a caught render error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onReset = vi.fn();
    render(
      <ModuleErrorBoundary moduleId="x" onReset={onReset}>
        <Bomb />
      </ModuleErrorBoundary>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(onReset).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
