import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Router } from 'wouter';
import { ModuleView, applyUrlPrefs } from './ModuleView';
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
