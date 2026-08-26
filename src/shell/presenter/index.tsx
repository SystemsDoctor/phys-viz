/**
 * shell/presenter — keyboard map + the `?` reference overlay
 * (ARCHITECTURE.md §16). Presenter MODE's visual side (hide gallery
 * chrome, enlarge type ~1.5x, pin readouts, projector tokens, suppress
 * tooltips/hover) is plain CSS (`.pv-presenter` in shell.css), toggled
 * by the `P` key via ModuleView's `ui.presenterMode` store field — this
 * file is only the keyboard wiring and the `?` help overlay.
 *
 * `usePresenterKeymap` is deliberately generic: it computes a canonical
 * key string per keydown (`Shift+ArrowRight`, `r`, `1`, …) and calls
 * `handlers[thatString]?.()` — the caller decides which shortcuts it
 * actually wires up (a stepped module has no reverse key, for
 * instance), rather than this hook hardcoding module-specific behavior.
 */
import React from 'react';

export function usePresenterKeymap(handlers: Record<string, () => void>): void {
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      // Don't hijack typing in a text input, select, or the expression field.
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;

      const key = e.shiftKey && e.key.startsWith('Arrow') ? `Shift+${e.key}` : e.key;
      const handler = handlers[key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}

const KEYMAP_ROWS: [string, string][] = [
  ['Space', 'Play / pause'],
  ['← / →', 'Step back / forward'],
  ['Shift + ← / →', 'Scrub back / forward (bigger step)'],
  ['1–9', 'Toggle layer N'],
  ['R', 'Reset to defaults'],
  ['P', 'Presenter mode'],
  ['F', 'Fullscreen'],
  ['C', 'Copy link'],
  ['V', 'Cycle camera preset'],
  ['?', 'Show / hide this list'],
];

export function KeymapOverlay(): React.ReactElement | null {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
      if (e.key === '?') setOpen((v) => !v);
      else if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!open) return null;

  return (
    <div className="pv-keymap-overlay" role="dialog" aria-label="Keyboard shortcuts">
      <table>
        <tbody>
          {KEYMAP_ROWS.map(([keys, desc]) => (
            <tr key={keys}>
              <td className="pv-keymap-overlay__keys">{keys}</td>
              <td>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={() => setOpen(false)}>
        Close
      </button>
    </div>
  );
}
