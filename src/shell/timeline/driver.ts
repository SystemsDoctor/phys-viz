/**
 * shell/timeline/driver — the numeric machinery behind `stepped` time
 * (ARCHITECTURE.md §12). Deliberately separate from the React
 * <Timeline> component: this is pure state, driven once per rendered
 * frame by whoever owns the render loop (ModuleView), so it's directly
 * unit-testable without React or a real ModuleInstance.
 *
 * Two obligations §12 places on the SHELL, not the module:
 *  - Fixed timestep only (default 1/240s), accumulated — behaviour must
 *    be identical regardless of frame rate.
 *  - Scrubbing is reset() + fast-forward, capped at 20,000 steps, and
 *    the fast-forward loop must be CHUNKED across animation frames
 *    rather than blocking — a naive `for` loop calling an expensive
 *    step() 20,000 times synchronously can freeze the tab for seconds.
 */

export const FIXED_DT = 1 / 240;
export const MAX_FASTFORWARD_STEPS = 20_000;
/** How many fixed steps a single advance()/tick() call may take before yielding back to the next animation frame. Keeps a single frame's work bounded even if `step()` is not as cheap as §12 asks for. */
const MAX_STEPS_PER_FRAME = 240;

/**
 * Drives NORMAL playback (not scrubbing) for a `stepped` module: turns
 * a variable frame dt into a whole number of fixed-dt `step()` calls via
 * an accumulator, so two runs at different frame rates produce the same
 * sequence of step() calls. Reused across frames — construct once per
 * mounted module instance.
 */
export class FixedStepAccumulator {
  private acc = 0;

  /** Advances by `frameDt` seconds at `speed`x; calls `step(FIXED_DT)` once per whole fixed step consumed. Returns the number of steps taken (for tests/telemetry). */
  advance(frameDt: number, speed: number, step: (dt: number) => void): number {
    this.acc += frameDt * speed;
    let taken = 0;
    while (this.acc >= FIXED_DT && taken < MAX_STEPS_PER_FRAME) {
      step(FIXED_DT);
      this.acc -= FIXED_DT;
      taken++;
    }
    return taken;
  }

  reset(): void {
    this.acc = 0;
  }
}

export interface ScrubProgress {
  /** Steps completed so far this scrub. */
  stepsDone: number;
  /** t reached so far (stepsDone * FIXED_DT). */
  t: number;
  /** True once the target has been reached (or the 20,000-step cap forced an early stop). */
  finished: boolean;
  /** True if the cap, not the target, is why this scrub finished. */
  capped: boolean;
}

/**
 * Drives a `stepped` module's scrub-to-t: `reset()` once, then
 * fast-forward via repeated `step(FIXED_DT)` calls, chunked across
 * `tick()` calls so the caller's render loop stays responsive. Capped
 * at MAX_FASTFORWARD_STEPS — per §12, wanting to raise this cap is the
 * signal you're building a simulator, not a demo.
 */
export class SteppedScrubber {
  private stepsDone = 0;
  private targetSteps = 0;
  private capped = false;
  private active = false;

  /** Starts a new scrub toward `targetT`, calling `reset()` immediately. */
  begin(targetT: number, reset: () => void): void {
    reset();
    this.stepsDone = 0;
    const wanted = Math.max(0, Math.round(targetT / FIXED_DT));
    this.capped = wanted > MAX_FASTFORWARD_STEPS;
    this.targetSteps = Math.min(wanted, MAX_FASTFORWARD_STEPS);
    this.active = this.stepsDone < this.targetSteps;
  }

  get inProgress(): boolean {
    return this.active;
  }

  /** Takes up to one frame's worth of steps. Call every rendered frame while `inProgress`. */
  tick(step: (dt: number) => void): ScrubProgress {
    const remaining = this.targetSteps - this.stepsDone;
    const n = Math.min(remaining, MAX_STEPS_PER_FRAME);
    for (let i = 0; i < n; i++) {
      step(FIXED_DT);
      this.stepsDone++;
    }
    if (this.stepsDone >= this.targetSteps) this.active = false;
    return {
      stepsDone: this.stepsDone,
      t: this.stepsDone * FIXED_DT,
      finished: !this.active,
      capped: this.capped,
    };
  }
}
