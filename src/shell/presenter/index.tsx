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

/** Elements where a bare key (in particular Space/Enter) already has its
 * own native meaning that a global shortcut must not steal — X-36:
 * Space on a focused `<button>`/`<summary>` toggling playback instead
 * of activating it was a real keyboard-accessibility regression. A
 * slider (`<input type="range">`) is already covered by the plain
 * INPUT tag check below. */
function isNativelyInteractive(target: HTMLElement): boolean {
  if (/^(INPUT|SELECT|TEXTAREA|BUTTON|SUMMARY)$/.test(target.tagName)) return true;
  // `isContentEditable` is the standard check, but jsdom (this repo's
  // unit-test DOM) doesn't implement it — fall back to the raw
  // attribute too, so this is actually exercised by a unit test rather
  // than only ever verified by hand in a real browser.
  return target.isContentEditable || target.getAttribute('contenteditable') === 'true';
}

export function usePresenterKeymap(handlers: Record<string, () => void>): void {
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      // X-36: a modifier held down means the BROWSER's own shortcut is
      // what the user wants (Ctrl+R reload, Ctrl+C copy, Ctrl+F find),
      // not this app's single-letter one — bail before even checking
      // the target, so preventDefault() never fires either.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (target && isNativelyInteractive(target)) return;

      const arrowKey = e.shiftKey && e.key.startsWith('Arrow') ? `Shift+${e.key}` : e.key;
      // Single-character keys (letters, digits, space) match
      // case-insensitively — a shortcut is declared once, in lowercase,
      // and should still fire with Shift or Caps Lock held; multi-char
      // keys (`ArrowRight`, `Shift+ArrowRight`) are left as-is, since
      // Shift is already encoded there deliberately.
      const key = arrowKey.length === 1 ? arrowKey.toLowerCase() : arrowKey;
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
