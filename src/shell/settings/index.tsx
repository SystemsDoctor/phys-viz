/**
 * shell/settings — the global app-level settings menu (ADR 0009, §9).
 * Not attached to the viewport or a panel: holds the up-axis toggle
 * (y/z) and the other display preferences that would otherwise
 * scatter — theme and projector mode.
 *
 * Persisted locally (they're viewer preferences, not per-module state,
 * M3-42) via ./prefsStorage, and serialized into the URL only when they
 * differ from the default (urlCodec's up=/th=/pj=, already wired since
 * M3-19) — so a short link stays short, but a demo prepared in z-up
 * reproduces what the instructor saw.
 */
import React from 'react';
import { useAppStore } from '../state/store';
import type { AppState } from '../state/store';
import { savePrefs } from '../state/prefsStorage';

export function SettingsMenu(): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const prefs = useAppStore((s) => s.prefs);

  function patch(next: Partial<AppState['prefs']>): void {
    useAppStore.getState().patchPrefs(next);
    savePrefs(useAppStore.getState().prefs);
  }

  return (
    <div className="pv-settings">
      <button
        type="button"
        className="pv-settings__trigger"
        aria-expanded={open}
        aria-label="Display settings"
        onClick={() => setOpen((v) => !v)}
      >
        ⚙
      </button>
      {open && (
        <div className="pv-settings__menu" role="menu">
          <label className="pv-settings__row">
            <span>Up axis</span>
            <select
              value={prefs.upAxis}
              onChange={(e) => patch({ upAxis: e.target.value as 'y' | 'z' })}
            >
              <option value="y">Y-up</option>
              <option value="z">Z-up</option>
            </select>
          </label>
          <label className="pv-settings__row">
            <span>Theme</span>
            <select
              value={prefs.theme}
              onChange={(e) => patch({ theme: e.target.value as 'light' | 'dark' })}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="pv-settings__row">
            <span>Projector mode</span>
            <input
              type="checkbox"
              checked={prefs.projector}
              onChange={(e) => patch({ projector: e.target.checked })}
            />
          </label>
        </div>
      )}
    </div>
  );
}
