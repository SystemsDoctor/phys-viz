# 21. Playback clamps each frame's dt and drops the stepped backlog past the cap

Date: 2026-10-02

## Status

Accepted

## Context

`ModuleView`'s time-driving rAF loop fed the raw wall-clock delta
(`nowMs - lastMs`) to playback. A backgrounded tab stops delivering
animation frames, so the first frame after it resumes carries the whole
time it was hidden. Two consequences, logged as **X-50** in the
2026-09-23 audit:

- **Stepped modules.** `FixedStepAccumulator.advance` took at most
  `MAX_STEPS_PER_FRAME` (240) steps per call but KEPT the rest of the
  owed time, so every following frame also ran flat-out at the cap until
  the backlog drained — about a simulated second per rendered frame. The
  accumulator was also never reset on pause or scrub, so a stale
  remainder leaked into the next run.
- **Parametric modules** advanced `t` by the full gap in one frame.

## Decision

1. **`clampFrameDt(dt)`** (`shell/timeline/driver.ts`) bounds every
   frame's delta to `[0, MAX_FRAME_DT]`, `MAX_FRAME_DT = 0.1` s. Slower
   than 10 fps, playback slows down rather than lurching. Applied to both
   stepped and parametric playback in `ModuleView`'s tick.
2. **`FixedStepAccumulator.advance` drops its backlog when it hits the
   per-frame cap** with time still owed. With the clamp in place that
   only happens for a `speed` so high that one 0.1 s frame owes more
   than 240 fixed steps; dropping the excess (rather than carrying it
   forward) keeps a high speed from compounding into a permanent
   flat-out state. Below the cap the fractional remainder is still kept,
   so the §12 determinism guarantee (same step sequence at any frame
   rate) is unchanged for normal use.
3. **The accumulator is reset on pause and when a scrub begins**
   (`ModuleView`), so neither carries a remainder into the next run.

## Consequences

- Behaviour change visible to a user: after a long background, playback
  resumes from where it was instead of jumping to the end of the run.
- A playback speed whose 0.1 s frame owes more than 240 fixed steps now
  loses the excess instead of eventually "catching up". The shell's
  speeds (up to a few x) with the default 1/240 s step stay well inside
  the cap.
- No `MODULE_CONTRACT_VERSION` or `types.ts` change.
- Verified by `driver.test.ts` unit tests and an e2e that fast-forwards
  Playwright's fake clock 60 s while a stepped module plays
  (`smoke.spec.ts`, "X-50").
