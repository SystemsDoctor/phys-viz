/**
 * Local persistence for viewer display preferences (M3-42). Prefs are
 * per-viewer, not per-module or per-demo, so they live in localStorage
 * rather than the URL — the URL only carries them when they differ
 * from default (urlCodec's up=/th=/pj=), so a short link stays short.
 */
import type { AppState } from './store';
import { DEFAULT_PREFS } from './store';

const STORAGE_KEY = 'phys-viz:prefs';

export function loadPrefs(): AppState['prefs'] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<AppState['prefs']>;
    return {
      upAxis: parsed.upAxis === 'z' ? 'z' : DEFAULT_PREFS.upAxis,
      theme: parsed.theme === 'dark' ? 'dark' : DEFAULT_PREFS.theme,
      projector: parsed.projector === true,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: AppState['prefs']): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Private browsing / storage disabled — prefs just won't persist this session.
  }
}
