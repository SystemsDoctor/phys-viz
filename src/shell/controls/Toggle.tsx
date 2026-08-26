// Renders a `kind: 'toggle'` ParamDef, and layer checklist rows.
import React from 'react';

export interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle(props: ToggleProps): React.ReactElement {
  const { label, value, onChange } = props;
  const id = React.useId();
  return (
    <label className="pv-toggle" htmlFor={id}>
      <input
        id={id}
        className="pv-toggle__box"
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
