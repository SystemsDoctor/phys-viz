// Renders a `kind: 'number'` ParamDef, including logScale support.
// TODO(M3): implement.
import React from 'react';

export function Slider(_props: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  logScale?: boolean;
  onChange: (v: number) => void;
}): React.ReactElement {
  throw new Error('shell/controls/Slider: not implemented (see M3 in ARCHITECTURE.md §20)');
}
