import { describe, it, expect } from 'vitest';
import { createGraticule } from './graticule';
import { createFakeHost } from '../internal/fakeHost.test-utils';

function visibleTickCount(overlayEl: HTMLElement): number {
  return Array.from(overlayEl.querySelectorAll('div')).filter(
    (el) => (el as HTMLElement).style.display !== 'none',
  ).length;
}

describe('createGraticule', () => {
  it('renders tick elements into the overlay after a frame tick', () => {
    const host = createFakeHost();
    const handle = createGraticule({ viewportSize: [800, 600] }, host);
    host.fireFrame({ rendererWidth: 800, rendererHeight: 600 });
    expect(visibleTickCount(host.overlayEl)).toBeGreaterThan(0);
    handle.dispose();
  });

  it('hides all ticks when made invisible', () => {
    const host = createFakeHost();
    const handle = createGraticule({ viewportSize: [800, 600] }, host);
    host.fireFrame({ rendererWidth: 800, rendererHeight: 600 });
    handle.visible(false);
    host.fireFrame({ rendererWidth: 800, rendererHeight: 600 });
    expect(visibleTickCount(host.overlayEl)).toBe(0);
    handle.dispose();
  });

  it('respects an explicit worldUnitsPerTick override', () => {
    const host = createFakeHost();
    const handle = createGraticule({ viewportSize: [800, 600], worldUnitsPerTick: 1 }, host);
    host.fireFrame({ rendererWidth: 800, rendererHeight: 600 });
    const label = host.overlayEl.querySelector('div[style*="bottom"]') as HTMLElement | null;
    expect(label).not.toBeNull();
    handle.dispose();
  });

  it('dispose removes its container from the overlay', () => {
    const host = createFakeHost();
    const handle = createGraticule({ viewportSize: [800, 600] }, host);
    handle.dispose();
    expect(host.overlayEl.children.length).toBe(0);
  });
});
