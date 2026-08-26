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

export function VectorPad(props: VectorPadProps): React.ReactElement {
  const { label, value, range, onChange } = props;
  const id = React.useId();

  function setComponent(index: 0 | 1 | 2, raw: string): void {
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    const next: [number, number, number] = [...value];
    next[index] = Math.min(range, Math.max(-range, n));
    onChange(next);
  }

  return (
    <div className="pv-field">
      <span className="pv-field__label" id={id}>
        {label}
      </span>
      <div className="pv-vector-pad" role="group" aria-labelledby={id}>
        {AXIS_LABELS.map((axis, i) => (
          <input
            key={axis}
            className="pv-vector-pad__input"
            type="number"
            step={0.1}
            min={-range}
            max={range}
            aria-label={`${label} ${axis}`}
            value={value[i]}
            onChange={(e) => setComponent(i as 0 | 1 | 2, e.target.value)}
          />
        ))}
      </div>
    </div>
  );
}
