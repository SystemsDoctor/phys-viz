// Renders a `kind: 'vector'` ParamDef as three numeric inputs. When
// `draggable`, the same param is also draggable in 3D via the viewport's
// picking (M2-15) — that wiring lives in ModuleView (M3-6), not here;
// both paths just write to the same store key, so they stay in sync.
import React from 'react';
import { ParamLabel } from './ParamLabel';

export interface VectorPadProps {
  label: string;
  symbol?: string;
  help?: string;
  value: [number, number, number];
  range: number;
  onChange: (v: [number, number, number]) => void;
}

const AXIS_LABELS = ['x', 'y', 'z'] as const;

// A plain `value={value[i]}` controlled input clobbers in-progress typing:
// typing just "-" parses to NaN, the caller bails without calling
// onChange, and React then re-renders the input back to its last
// committed number — visibly erasing the "-" the user just typed (same
// failure for a trailing "." or a briefly-empty field). Each axis instead
// keeps its own local text buffer, authoritative while the user is
// editing; it only re-syncs from the external `value` when that value
// changes for a reason other than this component's own last commit.
function AxisInput(props: {
  label: string;
  axis: (typeof AXIS_LABELS)[number];
  value: number;
  range: number;
  onCommit: (n: number) => void;
}): React.ReactElement {
  const { label, axis, value, range, onCommit } = props;
  const [text, setText] = React.useState(() => String(value));
  const lastCommitted = React.useRef(value);

  if (value !== lastCommitted.current) {
    lastCommitted.current = value;
    if (Number(text) !== value) setText(String(value));
  }

  function handleChange(raw: string): void {
    const n = Number(raw);
    if (raw.trim() === '' || Number.isNaN(n)) {
      // Genuinely in-progress typing (a bare "-", a trailing ".", an
      // emptied field) — keep showing exactly what was typed; there is
      // no committed number yet to reconcile against.
      setText(raw);
      return;
    }
    const clamped = Math.min(range, Math.max(-range, n));
    // Show the value that's actually being committed, not the raw typed
    // text — otherwise typing something outside +/-range commits the
    // clamped number while the box keeps displaying the unclamped one
    // forever (lastCommitted.current below already matches the prop on
    // its next render, so the box's resync-from-`value` check at the top
    // of this component never fires to correct it).
    setText(String(clamped));
    lastCommitted.current = clamped;
    onCommit(clamped);
  }

  return (
    <input
      className="pv-vector-pad__input"
      type="number"
      step={0.1}
      min={-range}
      max={range}
      aria-label={`${label} ${axis}`}
      value={text}
      onChange={(e) => handleChange(e.target.value)}
    />
  );
}

export function VectorPad(props: VectorPadProps): React.ReactElement {
  const { label, symbol, help, value, range, onChange } = props;
  const id = React.useId();

  function setComponent(index: 0 | 1 | 2, n: number): void {
    const next: [number, number, number] = [...value];
    next[index] = n;
    onChange(next);
  }

  return (
    <div className="pv-field">
      <span className="pv-field__label" id={id}>
        <ParamLabel label={label} symbol={symbol} help={help} />
      </span>
      <div className="pv-vector-pad" role="group" aria-labelledby={id}>
        {AXIS_LABELS.map((axis, i) => (
          <AxisInput
            key={axis}
            label={label}
            axis={axis}
            value={value[i]}
            range={range}
            onCommit={(n) => setComponent(i as 0 | 1 | 2, n)}
          />
        ))}
      </div>
    </div>
  );
}
