// Renders a `kind: 'select'` ParamDef. TODO(M3): implement.
import React from 'react';

export function Select(_props: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}): React.ReactElement {
  throw new Error('shell/controls/Select: not implemented (see M3 in ARCHITECTURE.md §20)');
}
