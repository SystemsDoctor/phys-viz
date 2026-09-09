// Renders a `kind: 'select'` ParamDef.
import React from 'react';
import { Tooltip } from '../Tooltip';

export interface SelectProps {
  label: string;
  help?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}

export function Select(props: SelectProps): React.ReactElement {
  const { label, help, value, options, onChange } = props;
  const id = React.useId();
  return (
    <div className="pv-field">
      <label className="pv-field__label" htmlFor={id}>
        {help ? <Tooltip text={help}>{label}</Tooltip> : label}
      </label>
      <select
        id={id}
        className="pv-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
