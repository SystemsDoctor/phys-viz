/**
 * shell/timeline — play / pause / step / scrub / speed / reverse.
 * Behaviour depends on the module's TimeModel (ARCHITECTURE.md §9, §12):
 *
 *  - static:     hidden entirely.
 *  - parametric: scrub anywhere instantly, reverse works, render on
 *                demand when paused.
 *  - stepped:    fixed timestep (default 1/240s) driven by the shell;
 *                scrubbing is reset() + fast-forward capped at 20,000
 *                steps; reverse is disabled with an explanatory tooltip.
 *
 * TODO(M3): implement.
 */
import React from 'react';
import type { TimeModel } from '@/modules/types';

export function Timeline(_props: {
  timeModel: TimeModel;
  t: number;
  playing: boolean;
  speed: number;
  direction: 1 | -1;
  onChange: (
    patch: Partial<{ t: number; playing: boolean; speed: number; direction: 1 | -1 }>,
  ) => void;
}): React.ReactElement {
  throw new Error('shell/timeline: not implemented (see M3 in ARCHITECTURE.md §20)');
}
