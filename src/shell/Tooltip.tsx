/**
 * Tooltip — a small, accessible hover/focus popover explaining what a
 * label refers to (ADR 0014, §16: "quickly check what a variable is
 * referring to"). CSS-only positioning (`shell.css`'s `.pv-tooltip*`
 * rules) via a focusable `<button>` trigger and a `role="tooltip"`
 * sibling shown on `:hover`/`:focus-visible` — no JS positioning
 * library, no new dependency. `aria-describedby` wires the two together
 * so a screen reader announces the tooltip text too, not just a visual
 * reader. Suppressed under presenter mode by `shell.css`
 * (`.pv-presenter .pv-tooltip__bubble`), not here — same split as every
 * other presenter-mode rule in this codebase.
 */
import React from 'react';

let nextId = 0;

export function Tooltip(props: { text: string; children: React.ReactNode }): React.ReactElement {
  const { text, children } = props;
  // One stable id per mounted instance — an index or the label text
  // itself could collide across a table of many rows.
  const id = React.useMemo(() => `pv-tooltip-${++nextId}`, []);

  return (
    <span className="pv-tooltip">
      <button type="button" className="pv-tooltip__trigger" aria-describedby={id}>
        {children}
      </button>
      <span role="tooltip" id={id} className="pv-tooltip__bubble">
        {text}
      </span>
    </span>
  );
}
