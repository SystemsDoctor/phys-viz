// Renders a `kind: 'expression'` ParamDef. Compiles via
// `@/kernel/expr#compileExpr` on every keystroke and shows the parse
// error (with its character offset) inline — never `eval`.
import React from 'react';
import { compileExpr, isExprError } from '@/kernel/expr';

export interface ExpressionFieldProps {
  label: string;
  value: string;
  vars: string[];
  onChange: (v: string) => void;
}

export function ExpressionField(props: ExpressionFieldProps): React.ReactElement {
  const { label, value, vars, onChange } = props;
  const id = React.useId();
  const result = compileExpr(value, vars);
  const error = isExprError(result) ? result : null;

  return (
    <div className="pv-field">
      <label className="pv-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={error ? 'pv-expr pv-expr--error' : 'pv-expr'}
        type="text"
        value={value}
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <div id={`${id}-error`} className="pv-expr__error">
          {value.slice(0, error.offset)}
          <u>{value[error.offset] ?? ' '}</u>
          {value.slice(error.offset + 1)}
          {'\n'}
          {error.message}
        </div>
      )}
    </div>
  );
}
