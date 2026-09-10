/**
 * ParamLabel — the label content shared by every param control: plain
 * label text, an optional KaTeX `symbol` next to it (`ParamDef.symbol`,
 * `types.ts`), and an optional `Tooltip` (ADR 0014) wrapping both when
 * `help` is set. Centralizes how these three optional pieces compose
 * so the six control components don't each reinvent the layout — same
 * `.pv-field__symbol` class `shell.css` already carried for this,
 * unused until now.
 *
 * Deliberately appends the symbol next to the label rather than
 * replacing it the way `ReadoutTable` does for `ScalarDef.symbol`: a
 * readout is matched against a textbook formula, where the compact
 * symbol alone is the more useful name; a param control is something a
 * student directly manipulates, where the descriptive label (e.g.
 * "Mass") is what tells them what the slider they're dragging DOES —
 * the symbol there is a secondary hint for cross-referencing
 * `explain.md`'s equations, not a replacement for the label.
 */
import React from 'react';
import { MathSpan } from '../MathSpan';
import { Tooltip } from '../Tooltip';

export function ParamLabel(props: {
  label: string;
  symbol?: string;
  help?: string;
}): React.ReactElement {
  const { label, symbol, help } = props;
  const content = (
    <>
      {label}
      {symbol && (
        <>
          {' '}
          <MathSpan className="pv-field__symbol" latex={symbol} />
        </>
      )}
    </>
  );
  return help ? <Tooltip text={help}>{content}</Tooltip> : content;
}
