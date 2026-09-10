// Renders a `kind: 'select'` ParamDef.
import React from 'react';
import { ParamLabel } from './ParamLabel';

export interface SelectProps {
  label: string;
  symbol?: string;
  help?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}

export function Select(props: SelectProps): React.ReactElement {
  const { label, symbol, help, value, options, onChange } = props;
  const id = React.useId();
  return (
    <div className="pv-field">
      <label className="pv-field__label" htmlFor={id}>
        <ParamLabel label={label} symbol={symbol} help={help} />
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
