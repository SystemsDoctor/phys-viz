// Renders a `kind: 'toggle'` ParamDef, and layer checklist rows.
import React from 'react';
import { Tooltip } from '../Tooltip';

export interface ToggleProps {
  label: string;
  help?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle(props: ToggleProps): React.ReactElement {
  const { label, help, value, onChange } = props;
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
      <span>{help ? <Tooltip text={help}>{label}</Tooltip> : label}</span>
    </label>
  );
}
