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
        <span className="pv-angle-dial__value">{degrees.toFixed(0)}°</span>
      </div>
    </div>
  );
}
