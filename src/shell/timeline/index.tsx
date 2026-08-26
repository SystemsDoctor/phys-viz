/**
 * shell/timeline — play / pause / step / scrub / speed / reverse.
 * Behaviour depends on the module's TimeModel (ARCHITECTURE.md §9, §12):
 *
 *  - static:     hidden entirely (renders null).
 *  - parametric: scrub anywhere instantly, reverse works.
 *  - stepped:    reverse disabled (greyed out, with an explanatory
 *                tooltip — §12 is explicit this is honest, not a bug).
 *
 * This component is pure UI: every control just calls `onChange` with a
 * `time` patch. It does NOT itself know how to run a `stepped` module's
 * fixed-timestep accumulator or chunked fast-forward scrub — that's
 * `./driver.ts`'s job, driven by whoever owns the render loop
 * (ModuleView), which reacts to `t` changing by re-scrubbing for
 * `stepped` models. The "Step" button here is just `onChange({t: t +
 * stepSize})` — the same t-changed path scrubbing already goes through.
 */
import React from 'react';
import type { TimeModel } from '@/modules/types';

export interface TimelineProps {
  timeModel: TimeModel;
  t: number;
  playing: boolean;
  speed: number;
  direction: 1 | -1;
  /** Upper bound for the scrub slider. Not part of the module contract — a reasonable per-caller default; §12 has no notion of "duration" for a parametric/stepped model. */
  maxT?: number;
  /** Seconds the Step buttons move by. Default 0.1s — a stepped module still gets a whole number of fixed steps out of it, since ModuleView interprets any t change as reset()+fast-forward. */
  stepSize?: number;
  onChange: (
    patch: Partial<{ t: number; playing: boolean; speed: number; direction: 1 | -1 }>,
  ) => void;
}

const SPEEDS = [0.25, 0.5, 1, 2, 4];

/**
 * Shared with `ModuleView`'s own play/step-driving loop — that loop is
 * what must actually stop playback at this bound, not just this
 * component's slider (a bare `<input type="range" max={maxT}>` clamps
 * where the thumb is drawn but never stops the underlying value from
 * growing past it, so without ModuleView also clamping, `t` — and
 * playback — ran forever past the slider's visible end).
 */
export const DEFAULT_MAX_T = 20;

export function Timeline(props: TimelineProps): React.ReactElement | null {
  const { timeModel, t, playing, speed, direction, onChange } = props;
  const maxT = props.maxT ?? DEFAULT_MAX_T;
  const stepSize = props.stepSize ?? 0.1;

  if (timeModel === 'static') return null;

  const reverseDisabled = timeModel === 'stepped';

  return (
    <div className="pv-timeline">
      <div className="pv-timeline__transport">
        <button
          type="button"
          className="pv-timeline__btn"
          aria-label="Step back"
          onClick={() => onChange({ t: Math.max(0, t - stepSize) })}
        >
          ⏮
        </button>
        <button
          type="button"
          className="pv-timeline__btn"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={() => onChange({ playing: !playing })}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <button
          type="button"
          className="pv-timeline__btn"
          aria-label="Step forward"
          onClick={() => onChange({ t: Math.min(maxT, t + stepSize) })}
        >
          ⏭
        </button>
        <button
          type="button"
          className="pv-timeline__btn"
          aria-label="Reverse direction"
          aria-disabled={reverseDisabled}
          disabled={reverseDisabled}
          title={
            reverseDisabled
              ? 'Reverse is not available for a stepped simulation — it can only integrate forward (§12).'
              : undefined
          }
          onClick={() => onChange({ direction: direction === 1 ? -1 : 1 })}
        >
          {direction === 1 ? '⏵ fwd' : '⏴ rev'}
        </button>
        <label className="pv-timeline__speed">
          <span>Speed</span>
          <select value={speed} onChange={(e) => onChange({ speed: Number(e.target.value) })}>
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="pv-timeline__scrub">
        <input
          type="range"
          className="pv-slider"
          aria-label="Scrub time"
          min={0}
          max={maxT}
          step={stepSize}
          value={t}
          onChange={(e) => onChange({ t: Number(e.target.value) })}
        />
        <span className="pv-timeline__t">{t.toFixed(2)}s</span>
      </div>
    </div>
  );
}
