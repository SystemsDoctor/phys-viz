import { describe, it, expect, beforeEach } from 'vitest';
import { loadPrefs, savePrefs } from './prefsStorage';
import { DEFAULT_PREFS } from './store';

beforeEach(() => {
  window.localStorage.clear();
});

describe('prefsStorage', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });

  it('round-trips a saved value', () => {
    savePrefs({ upAxis: 'z', theme: 'dark', projector: true });
    expect(loadPrefs()).toEqual({ upAxis: 'z', theme: 'dark', projector: true });
  });

  it('falls back to defaults for malformed stored JSON', () => {
    window.localStorage.setItem('phys-viz:prefs', 'not json');
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });

  it('falls back to defaults for individual fields with an unexpected value', () => {
    window.localStorage.setItem(
      'phys-viz:prefs',
      JSON.stringify({ upAxis: 'sideways', theme: 'purple', projector: 'yes' }),
    );
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });
});
