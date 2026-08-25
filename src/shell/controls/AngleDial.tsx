// Renders a `kind: 'angle'` ParamDef as a 2D dial. TODO(M3): implement.
import React from 'react';

export function AngleDial(_props: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}): React.ReactElement {
  throw new Error('shell/controls/AngleDial: not implemented (see M3 in ARCHITECTURE.md §20)');
}
