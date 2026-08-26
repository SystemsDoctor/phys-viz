// Renders a `kind: 'number'` ParamDef, including logScale support.
import React from 'react';

export interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  logScale?: boolean;
  onChange: (v: number) => void;
}

// logScale sliders map the underlying <input type="range"> to a
// continuous 0..1 position via log-interpolation between min/max
// (min must be > 0), rather than trying to reuse the linear `step` —
// a linear step size has no natural meaning on a log scale, so this
// control ignores it there and uses a fine-grained continuous range
// instead. Deliberate scope narrowing, not an oversight.
function toSliderT(value: number, min: number, max: number): number {
  return Math.log(value / min) / Math.log(max / min);
}
function fromSliderT(t: number, min: number, max: number): number {
  return min * Math.pow(max / min, t);
}

export function Slider(props: SliderProps): React.ReactElement {
  const { label, min, max, step, value, logScale, onChange } = props;
  const id = React.useId();

  if (logScale) {
    const t = toSliderT(value, min, max);
    return (
      <div className="pv-field">
        <label className="pv-field__label" htmlFor={id}>
          <span>{label}</span>
          <span className="pv-field__value">{value.toPrecision(3)}</span>
        </label>
        <input
          id={id}
          className="pv-slider"
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={Number.isFinite(t) ? t : 0}
          onChange={(e) => onChange(fromSliderT(Number(e.target.value), min, max))}
        />
      </div>
    );
  }

  return (
    <div className="pv-field">
      <label className="pv-field__label" htmlFor={id}>
        <span>{label}</span>
        <span className="pv-field__value">{value}</span>
      </label>
      <input
        id={id}
        className="pv-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
