/**
 * shell/params — reads a module's ParamDef[] and renders the control
 * panel. A module author writes zero UI code (ARCHITECTURE.md §9).
 * Adding a new *kind* of control (e.g. a 2D angle dial) is a shell
 * change here that every module can then use.
 *
 * TODO(M3): implement `<ParamControl />`, dispatching on `ParamDef.kind`
 * to the matching component in `@/shell/controls`.
 */
import React from 'react';
import type { ParamDef } from '@/modules/types';

export function ParamControl(_props: {
  def: ParamDef;
  value: unknown;
  onChange: (value: unknown) => void;
}): React.ReactElement {
  throw new Error('shell/params: not implemented (see M3 in ARCHITECTURE.md §20)');
}

export function ParamPanel(_props: {
  defs: ParamDef[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}): React.ReactElement {
  throw new Error('shell/params: not implemented (see M3 in ARCHITECTURE.md §20)');
}
