// Renders a `kind: 'expression'` ParamDef. Compiles via
// `@/kernel/expr#compileExpr` and underlines the offending character
// range on a parse error (ARCHITECTURE.md §7 kernel/expr). TODO(M3): implement.
import React from 'react';

export function ExpressionField(_props: {
  label: string;
  value: string;
  vars: string[];
  onChange: (v: string) => void;
}): React.ReactElement {
  throw new Error(
    'shell/controls/ExpressionField: not implemented (see M3 in ARCHITECTURE.md §20)',
  );
}
