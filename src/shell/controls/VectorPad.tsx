// Renders a `kind: 'vector'` ParamDef as three numeric inputs. When
// `draggable`, the same param is also draggable in 3D via the viewport's
// picking (M2-15) — that wiring lives in ModuleView (M3-6), not here;
// both paths just write to the same store key, so they stay in sync.
import React from 'react';

export interface VectorPadProps {
  label: string;
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
    setText(raw);
    const n = Number(raw);
    if (raw.trim() === '' || Number.isNaN(n)) return;
    const clamped = Math.min(range, Math.max(-range, n));
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
  const { label, value, range, onChange } = props;
  const id = React.useId();

  function setComponent(index: 0 | 1 | 2, n: number): void {
    const next: [number, number, number] = [...value];
    next[index] = n;
    onChange(next);
  }

  return (
    <div className="pv-field">
      <span className="pv-field__label" id={id}>
        {label}
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
