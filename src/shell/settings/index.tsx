/**
 * shell/settings — the global app-level settings menu (ADR 0009, §9).
 * Not attached to the viewport or a panel: holds the up-axis toggle
 * (y/z) and the other display preferences that would otherwise
 * scatter — theme, projector mode, the reference grid, and free
 * rotation (ADR 0011).
 *
 * "Reference grid" and "Free rotation" used to be scattered per-module
 * (a local `grid` layer only `control-showcase` wired, and a
 * "Release rotation" button embedded in `ModuleView`'s panel) — both
 * are view-level concerns that apply the same way across every module,
 * so they belong here, next to up-axis/theme/projector, not re-invented
 * per module.
 *
 * "Reference grid" is a genuine persisted pref (`prefs.showGrid`,
 * same treatment as up-axis/theme/projector: persisted locally via
 * ./prefsStorage, M3-42, and serialized into the URL only when it
 * differs from default — urlCodec's gr=). "Free rotation" is
 * deliberately NOT persisted/URL'd (`ui.rotationReleased`) — same
 * transient-per-visit shape as presenter/predict mode — and is a no-op
 * on any module that isn't 2D-locked (`manifest.dimensions === 2`,
 * ADR 0007), same as toggling up-axis on a module that ignores it.
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
  const rotationReleased = useAppStore((s) => s.ui.rotationReleased);

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
            <span>Free rotation</span>
            <input
              type="checkbox"
              checked={rotationReleased}
              onChange={(e) =>
                useAppStore.getState().patchUi({ rotationReleased: e.target.checked })
              }
            />
          </label>
        </div>
      )}
    </div>
  );
}
