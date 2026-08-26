import { describe, it, expect, vi } from 'vitest';
import { render, screen, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePresenterKeymap, KeymapOverlay } from './index';

describe('usePresenterKeymap', () => {
  it('calls the handler matching the pressed key', async () => {
    const playPause = vi.fn();
    renderHook(() => usePresenterKeymap({ ' ': playPause }));
    await userEvent.keyboard(' ');
    expect(playPause).toHaveBeenCalledTimes(1);
  });

  it('maps Shift+ArrowRight to its own distinct key, separate from plain ArrowRight', async () => {
    const step = vi.fn();
    const scrub = vi.fn();
    renderHook(() => usePresenterKeymap({ ArrowRight: step, 'Shift+ArrowRight': scrub }));
    await userEvent.keyboard('{ArrowRight}');
    expect(step).toHaveBeenCalledTimes(1);
    expect(scrub).not.toHaveBeenCalled();
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(scrub).toHaveBeenCalledTimes(1);
    expect(step).toHaveBeenCalledTimes(1); // unchanged
  });

  it('does not fire while focus is inside a text input', async () => {
    const handler = vi.fn();
    render(
      <>
        <input aria-label="typing target" />
      </>,
    );
    renderHook(() => usePresenterKeymap({ r: handler }));
    await userEvent.click(screen.getByLabelText('typing target'));
    await userEvent.keyboard('r');
    expect(handler).not.toHaveBeenCalled();
  });

  it('re-registering with new handlers uses the latest map', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ handlers }) => usePresenterKeymap(handlers), {
      initialProps: { handlers: { r: first } },
    });
    rerender({ handlers: { r: second } });
    await userEvent.keyboard('r');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('KeymapOverlay', () => {
  it('is hidden until "?" is pressed, then shows the reference table', async () => {
    render(<KeymapOverlay />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.keyboard('?');
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
    expect(screen.getByText('Play / pause')).toBeInTheDocument();
  });

  it('closes on Escape and via the Close button', async () => {
    render(<KeymapOverlay />);
    await userEvent.keyboard('?');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.keyboard('?');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('toggles off on a second "?" press', async () => {
    render(<KeymapOverlay />);
    await userEvent.keyboard('?');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('?');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
