/**
 * shell/readouts — a live table of module-declared scalars with units,
 * formatted by kernel/units. In presenter mode this can be pinned as a
 * large overlay (ARCHITECTURE.md §9, §16).
 *
 * Every readout value must also be available as selectable text, not
 * only as a canvas pixel (§16 accessibility requirement).
 *
 * TODO(M3): implement.
 */
import React from 'react';
import type { ScalarDef } from '@/modules/types';

export function ReadoutTable(_props: {
  defs: ScalarDef[];
  values: Record<string, number>;
  pinned?: boolean;
}): React.ReactElement {
  throw new Error('shell/readouts: not implemented (see M3 in ARCHITECTURE.md §20)');
}
