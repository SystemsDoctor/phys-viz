/**
 * shell/presenter — presenter mode, keyboard map, fullscreen
 * (ARCHITECTURE.md §16).
 *
 * Full keyboard operation: Space play/pause, ←/→ step, Shift+←/→ scrub,
 * 1-9 toggle layers, R reset, P presenter mode, F fullscreen, C copy
 * link, V cycle camera presets. Displayed in a `?` overlay.
 *
 * Presenter mode hides gallery chrome, enlarges type ~1.5x, pins the
 * readout overlay, applies projector tokens, and suppresses tooltips
 * and hover states a projected audience cannot see.
 *
 * TODO(M3): implement.
 */
import React from 'react';

export function usePresenterKeymap(_handlers: Record<string, () => void>): void {
  throw new Error('shell/presenter: not implemented (see M3 in ARCHITECTURE.md §20)');
}

export function KeymapOverlay(): React.ReactElement {
  throw new Error('shell/presenter: not implemented (see M3 in ARCHITECTURE.md §20)');
}
