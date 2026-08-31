// Renders a `kind: 'angle'` ParamDef as a 2D dial. Drag the needle, or
// focus it and use arrow keys (role="slider", full keyboard reachability
// per ARCHITECTURE.md §16).
import React from 'react';

export interface AngleDialProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}

const TWO_PI = Math.PI * 2;

function clampAngle(v: number, min?: number, max?: number): number {
  if (min === undefined || max === undefined) return v;
  return Math.min(max, Math.max(min, v));
}

export function AngleDial(props: AngleDialProps): React.ReactElement {
  const { label, value, min, max, onChange } = props;
  const faceRef = React.useRef<HTMLDivElement>(null);
  const id = React.useId();

  function angleFromPointer(clientX: number, clientY: number): number {
    const rect = faceRef.current?.getBoundingClientRect();
    if (!rect) return value;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // atan2(-dy, dx): 0 rad points right, increases counter-clockwise —
    // the conventional math-angle orientation students already know.
    const raw = Math.atan2(-(clientY - cy), clientX - cx);
    return clampAngle(raw, min, max);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>): void {
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(angleFromPointer(e.clientX, e.clientY));
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>): void {
    if (e.buttons === 0) return;
    onChange(angleFromPointer(e.clientX, e.clientY));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
    const step = e.shiftKey ? Math.PI / 12 : Math.PI / 60;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(clampAngle(value + step, min, max));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(clampAngle(value - step, min, max));
    }
  }

  const degrees = ((((value * 180) / Math.PI) % 360) + 360) % 360;

  return (
    <div className="pv-field">
      <label className="pv-field__label" id={id}>
        {label}
      </label>
      <div className="pv-angle-dial">
        <div
          ref={faceRef}
          className="pv-angle-dial__face"
          role="slider"
          tabIndex={0}
          aria-labelledby={id}
          aria-valuemin={min ?? 0}
          aria-valuemax={max ?? TWO_PI}
          aria-valuenow={value}
          aria-valuetext={`${degrees.toFixed(0)} degrees`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onKeyDown={onKeyDown}
        >
          <div className="pv-angle-dial__needle" style={{ transform: `rotate(${-value}rad)` }} />
        </div>
        <DegreesInput label={label} valueRad={value} min={min} max={max} onCommit={onChange} />
      </div>
    </div>
  );
}

// The dial is precise for a rough sweep but hard to land on an exact
// degree at 56px across — this gives the same value a text entry point.
// Keeps its own local text buffer, authoritative while the user is
// typing, same reasoning as VectorPad's AxisInput: a plain
// `value={degrees}` controlled input would clobber "-" or a trailing
// "." mid-edit and re-sync from the dial only when the angle changed
// for some OTHER reason (dragging, arrow keys, an external param
// change) — never in reaction to this input's own last commit.
function DegreesInput(props: {
  label: string;
  valueRad: number;
  min?: number;
  max?: number;
  onCommit: (rad: number) => void;
}): React.ReactElement {
  const { label, valueRad, min, max, onCommit } = props;
  const degrees = ((((valueRad * 180) / Math.PI) % 360) + 360) % 360;
  const [text, setText] = React.useState(() => degrees.toFixed(0));
  const lastCommitted = React.useRef(degrees);

  if (degrees !== lastCommitted.current) {
    lastCommitted.current = degrees;
    if (Number(text) !== degrees) setText(degrees.toFixed(0));
  }

  function handleChange(raw: string): void {
    setText(raw);
    const n = Number(raw);
    if (raw.trim() === '' || Number.isNaN(n)) return;
    const rad = clampAngle((n * Math.PI) / 180, min, max);
    lastCommitted.current = ((((rad * 180) / Math.PI) % 360) + 360) % 360;
    onCommit(rad);
  }

  return (
    <span className="pv-angle-dial__value">
      <input
        className="pv-angle-dial__input"
        type="number"
        step={1}
        aria-label={`${label} in degrees`}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
      />
      °
    </span>
  );
}
