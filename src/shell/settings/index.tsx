/**
 * shell/settings — the global app-level settings menu (ADR 0009, §9).
 * Not attached to the viewport or a panel: holds the up-axis toggle
 * (y/z) and the other display preferences that would otherwise
 * scatter — theme, projector mode, the reference grid, and the 2D-only
 * lock (ADR 0011/0012).
 *
 * "Reference grid" and "2D-only" used to be scattered per-module (a
 * local `grid` layer only `control-showcase` wired, and a "Release
 * rotation" button embedded in `ModuleView`'s panel) — both are
 * view-level concerns that apply the same way across every module, so
 * they belong here, next to up-axis/theme/projector, not re-invented
 * per module.
 *
 * "Reference grid" is a genuine persisted pref (`prefs.showGrid`,
 * same treatment as up-axis/theme/projector: persisted locally via
 * ./prefsStorage, M3-42, and serialized into the URL only when it
 * differs from default — urlCodec's gr=). "2D-only" is deliberately NOT
 * persisted/URL'd (`ui.lockTo2D`) — same transient-per-visit shape as
 * presenter/predict mode. Checked (the default, ADR 0012) restricts
 * EVERY module to a locked, orthographic x/y-plane view; unchecking it
 * releases full 3D orbit and the module's own declared projection.
 *
 * This component still never touches a `Viewport`/camera directly —
 * `ModuleView`'s own effects react to these store values exactly like
 * they already react to up-axis/projector, keeping this menu
 * module-agnostic per its own doc comment above.
 */
import React from 'react';
import { useAppStore } from '../state/store';
import type { AppState } from '../state/store';
import { savePrefs } from '../state/prefsStorage';

export function SettingsMenu(): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const prefs = useAppStore((s) => s.prefs);
  const lockTo2D = useAppStore((s) => s.ui.lockTo2D);

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
          <label className="pv-settings__row">
            <span>Reference grid</span>
            <input
              type="checkbox"
              checked={prefs.showGrid}
              onChange={(e) => patch({ showGrid: e.target.checked })}
            />
          </label>
          <label className="pv-settings__row">
            <span>2D-only</span>
            <input
              type="checkbox"
              checked={lockTo2D}
              onChange={(e) => useAppStore.getState().patchUi({ lockTo2D: e.target.checked })}
            />
          </label>
        </div>
      )}
    </div>
  );
}
