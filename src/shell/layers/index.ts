/**
 * shell/layers — renders a module's LayerDef[] as a checklist, grouped.
 * This is the "click a toggle to add the cross product" interaction from
 * the original brief, and it is generic (ARCHITECTURE.md §9).
 *
 * Also implements Predict mode: freeze time at t=0 and hide layers
 * tagged `reveal: true` until the student clicks reveal. Modules opt in
 * merely by tagging a layer — no module code needed (§9 "Predict mode").
 *
 * TODO(M3): implement.
 */
import React from 'react';
import type { LayerDef } from '@/modules/types';

export function LayerManager(_props: {
  defs: LayerDef[];
  values: Record<string, boolean>;
  predictMode: boolean;
  onChange: (key: string, value: boolean) => void;
}): React.ReactElement {
  throw new Error('shell/layers: not implemented (see M3 in ARCHITECTURE.md §20)');
}
