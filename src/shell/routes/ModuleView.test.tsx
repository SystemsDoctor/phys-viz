import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Router } from 'wouter';
import {
  ModuleView,
  applyUrlPrefs,
  createPlaneLockController,
  appendSeriesPoint,
} from './ModuleView';
import { DEFAULT_APP_STATE } from '../state/store';
import type { DecodedState } from '../state/urlCodec';

const { loadModuleMock, loadExplainMock } = vi.hoisted(() => ({
  loadModuleMock: vi.fn(),
  loadExplainMock: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/modules/registry', () => ({ loadModule: loadModuleMock, loadExplain: loadExplainMock }));

function renderModuleView(moduleId: string): ReturnType<typeof render> {
  return render(
    <Router hook={() => [`/m/${moduleId}`, () => {}]}>
      <ModuleView moduleId={moduleId} />
    </Router>,
  );
}

afterEach(() => {
  loadModuleMock.mockReset();
});

describe('ModuleView', () => {
  it('shows a loading state before the module resolves', () => {
    loadModuleMock.mockReturnValue(new Promise(() => {})); // never resolves
    renderModuleView('vector-algebra');
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows a not-found card for an unknown module id, with a link back to the gallery', async () => {
    loadModuleMock.mockRejectedValue(new Error('Unknown module: nope'));
    renderModuleView('nope');
    await waitFor(() => expect(screen.getByText(/No module named/)).toBeInTheDocument());
    expect(screen.getByText('Back to the gallery')).toBeInTheDocument();
  });

  it('shows a load-error card (not a white screen) when loadModule rejects for another reason', async () => {
    loadModuleMock.mockRejectedValue(new Error('network fell over'));
    renderModuleView('vector-algebra');
    await waitFor(() => expect(screen.getByText(/Couldn't load/)).toBeInTheDocument());
    expect(screen.getByText(/network fell over/)).toBeInTheDocument();
  });

  it('re-triggers loading when moduleId changes', async () => {
    loadModuleMock.mockRejectedValue(new Error('Unknown module: a'));
    const { rerender } = render(
      <Router hook={() => ['/m/a', () => {}]}>
        <ModuleView moduleId="a" />
      </Router>,
    );
    await waitFor(() => expect(loadModuleMock).toHaveBeenCalledWith('a'));

    rerender(
      <Router hook={() => ['/m/b', () => {}]}>
        <ModuleView moduleId="b" />
      </Router>,
    );
    await waitFor(() => expect(loadModuleMock).toHaveBeenCalledWith('b'));
  });

  describe('applyUrlPrefs (X-34)', () => {
    // The saved/current session prefs a viewer already has in the
    // store before a bookmarked link is opened — deliberately NOT
    // DEFAULT_APP_STATE.prefs, so a bug that snaps absent fields back
    // to the module/URL default (instead of preserving them) shows up.
    const currentPrefs = {
      upAxis: 'z' as const,
      theme: 'dark' as const,
      projector: true,
      showGrid: false,
      gridPlaneXY: true,
      gridPlaneXZ: false,
      gridPlaneYZ: true,
    };

    function decodedWith(
      present: Partial<Record<keyof typeof currentPrefs, boolean>>,
    ): DecodedState {
      return {
        schemaVersion: 1,
        prefs: {
          upAxis: 'y',
          theme: 'light',
          projector: false,
          showGrid: true,
          gridPlaneXY: false,
          gridPlaneXZ: true,
          gridPlaneYZ: false,
        },
        prefsPresent: {
          upAxis: false,
          theme: false,
          projector: false,
          showGrid: false,
          gridPlaneXY: false,
          gridPlaneXZ: false,
          gridPlaneYZ: false,
          ...present,
        },
      };
    }

    it('applies only the URL-specified fields, session-only, over the current prefs', () => {
      // This is the exact data ModuleView passes to `hydrate({ prefs })`
      // — a bookmark with only `up=y&th=light` must flip JUST those two
      // fields, leaving projector/grid at whatever the viewer already had.
      const result = applyUrlPrefs(currentPrefs, decodedWith({ upAxis: true, theme: true }));
      expect(result).toEqual({
        ...currentPrefs,
        upAxis: 'y',
        theme: 'light',
      });
    });

    it('returns undefined (skip hydrate touching prefs at all) when the URL specifies no prefs', () => {
      expect(applyUrlPrefs(currentPrefs, decodedWith({}))).toBeUndefined();
      expect(applyUrlPrefs(DEFAULT_APP_STATE.prefs, { schemaVersion: 1 })).toBeUndefined();
    });

    it('never reaches back to DEFAULT_APP_STATE.prefs for a field the URL left unspecified', () => {
      const result = applyUrlPrefs(currentPrefs, decodedWith({ projector: true }));
      // projector flips to the URL's value; every other field must stay
      // exactly what the viewer already had — none of them may fall
      // back to DEFAULT_APP_STATE.prefs (which is upAxis 'y'/theme
      // 'light'/showGrid true/grids false, all different from
      // currentPrefs here).
      expect(result).toEqual({ ...currentPrefs, projector: false });
      expect(result).not.toEqual(DEFAULT_APP_STATE.prefs);
    });
  });
});

describe('createPlaneLockController (X-59)', () => {
  function harness() {
    const calls: string[] = [];
    const camera = {
      goTo: (...args: unknown[]) => calls.push(`goTo:${String(args[0])}`),
      setLockedToPlane: (locked: boolean) => calls.push(`lock:${locked}`),
      setProjection: (p: string) => calls.push(`proj:${p}`),
    };
    let nextId = 1;
    const pending = new Map<number, () => void>();
    const timers = {
      setTimeout: (fn: () => void) => {
        const id = nextId++;
        pending.set(id, fn);
        return id;
      },
      clearTimeout: (id: number) => {
        pending.delete(id);
      },
    };
    const fire = (): void => {
      const fns = [...pending.values()];
      pending.clear();
      for (const fn of fns) fn();
    };
    return { calls, camera, timers, pending, fire };
  }

  it('re-locking eases to +z immediately and freezes + goes orthographic only when the timer fires', () => {
    const h = harness();
    const c = createPlaneLockController(h.camera, 'persp', h.timers);
    c.set(true);
    expect(h.calls).toEqual(['goTo:+z']);
    h.fire();
    expect(h.calls).toEqual(['goTo:+z', 'lock:true', 'proj:ortho']);
  });

  it('toggling back to unlocked before the timer fires cancels the pending re-lock', () => {
    const h = harness();
    const c = createPlaneLockController(h.camera, 'persp', h.timers);
    c.set(true);
    c.set(false);
    h.fire(); // whatever is still pending fires now
    expect(h.calls).toEqual(['goTo:+z', 'lock:false', 'proj:persp']); // no stale lock:true afterwards
  });

  it('dispose() cancels a pending re-lock so nothing touches the camera after unmount', () => {
    const h = harness();
    const c = createPlaneLockController(h.camera, 'persp', h.timers);
    c.set(true);
    c.dispose();
    h.fire();
    expect(h.calls).toEqual(['goTo:+z']);
    expect(h.pending.size).toBe(0);
  });

  it('two quick re-locks leave only one lock timer, not two', () => {
    const h = harness();
    const c = createPlaneLockController(h.camera, 'persp', h.timers);
    c.set(true);
    c.set(true);
    expect(h.pending.size).toBe(1);
  });
});

describe('appendSeriesPoint (X-59)', () => {
  it('appends a point when t advances', () => {
    expect(appendSeriesPoint([{ x: 0, y: 1 }], { x: 1, y: 2 })).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 2 },
    ]);
  });

  it('replaces the last point instead of piling up duplicates when t is unchanged (a paused param drag)', () => {
    let series = [{ x: 1, y: 5 }];
    for (let i = 0; i < 50; i++) series = appendSeriesPoint(series, { x: 1, y: i });
    expect(series).toEqual([{ x: 1, y: 49 }]);
  });

  it('starts over when t goes back (reset / scrub back), so x stays monotonic', () => {
    const series = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ];
    expect(appendSeriesPoint(series, { x: 0.5, y: 9 })).toEqual([{ x: 0.5, y: 9 }]);
  });

  it('starts a series from nothing, and keeps only the newest 500 points', () => {
    expect(appendSeriesPoint([], { x: 0, y: 0 })).toEqual([{ x: 0, y: 0 }]);
    let series: { x: number; y: number }[] = [];
    for (let i = 0; i < 600; i++) series = appendSeriesPoint(series, { x: i, y: i });
    expect(series.length).toBe(500);
    expect(series[0].x).toBe(100);
    expect(series[499].x).toBe(599);
    // always strictly increasing
    for (let i = 1; i < series.length; i++) expect(series[i].x).toBeGreaterThan(series[i - 1].x);
  });
});
