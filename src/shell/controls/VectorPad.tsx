// Renders a `kind: 'vector'` ParamDef. When `draggable`, coordinates
// with scene/ picking so the same param can also be dragged in 3D.
// TODO(M3): implement.
import React from 'react';

export function VectorPad(_props: {
  label: string;
  value: [number, number, number];
  range: number;
  onChange: (v: [number, number, number]) => void;
}): React.ReactElement {
  throw new Error('shell/controls/VectorPad: not implemented (see M3 in ARCHITECTURE.md §20)');
}
