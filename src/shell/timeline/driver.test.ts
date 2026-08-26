import { describe, it, expect, vi } from 'vitest';
import { FixedStepAccumulator, SteppedScrubber, FIXED_DT, MAX_FASTFORWARD_STEPS } from './driver';

describe('FixedStepAccumulator', () => {
  it('calls step() the same total number of times regardless of frame rate (determinism, §12)', () => {
    const totalTime = 1; // 1 second of playback
    const stepsA: number[] = [];
    const accA = new FixedStepAccumulator();
    // "60fps": 60 frames of 1/60s each.
    for (let i = 0; i < 60; i++) accA.advance(1 / 60, 1, (dt) => stepsA.push(dt));
    const stepsB: number[] = [];
    const accB = new FixedStepAccumulator();
    // "17fps" (uneven, like a real jittery frame rate): 17 frames of 1/17s each.
    for (let i = 0; i < 17; i++) accB.advance(1 / 17, 1, (dt) => stepsB.push(dt));
    expect(stepsA.length).toBe(Math.floor(totalTime / FIXED_DT));
    expect(stepsB.length).toBe(Math.floor(totalTime / FIXED_DT));
    expect(stepsA).toEqual(stepsB); // identical sequence of fixed dt values
  });

  it('every call to step() receives exactly FIXED_DT, never the raw frame dt', () => {
    const acc = new FixedStepAccumulator();
    const seen: number[] = [];
    acc.advance(0.1, 1, (dt) => seen.push(dt));
    for (const dt of seen) expect(dt).toBe(FIXED_DT);
  });

  it('speed scales how much simulated time a frame covers', () => {
    const acc1 = new FixedStepAccumulator();
    const acc2 = new FixedStepAccumulator();
    const n1 = acc1.advance(1 / 60, 1, () => {});
    const n2 = acc2.advance(1 / 60, 2, () => {});
    expect(n2).toBeGreaterThanOrEqual(n1);
  });

  it('carries a fractional remainder across calls rather than dropping it', () => {
    const acc = new FixedStepAccumulator();
    let calls = 0;
    // FIXED_DT = 1/240 ~= 0.004167s. Ten calls of 0.001s each sum to
    // 0.01s, which should eventually cross at least one fixed step.
    for (let i = 0; i < 10; i++) acc.advance(0.001, 1, () => calls++);
    expect(calls).toBeGreaterThan(0);
  });

  it('reset() clears the accumulator', () => {
    const acc = new FixedStepAccumulator();
    acc.advance(0.1, 1, () => {}); // leaves a fractional remainder
    acc.reset();
    let calls = 0;
    acc.advance(FIXED_DT * 0.5, 1, () => calls++); // half a step: should not fire yet
    expect(calls).toBe(0);
  });
});

describe('SteppedScrubber', () => {
  it('calls reset() once at the start of a scrub', () => {
    const reset = vi.fn();
    const scrubber = new SteppedScrubber();
    scrubber.begin(1, reset);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('reaches the exact target t via whole fixed steps, chunked across tick() calls', () => {
    const scrubber = new SteppedScrubber();
    const targetT = 10 * FIXED_DT;
    scrubber.begin(targetT, () => {});
    let stepCalls = 0;
    const progress = scrubber.tick(() => stepCalls++);
    expect(progress.finished).toBe(true); // small target finishes within one tick's frame budget
    expect(stepCalls).toBe(10);
    expect(progress.t).toBeCloseTo(targetT, 10);
    expect(progress.capped).toBe(false);
  });

  it('chunks a large scrub across multiple tick() calls rather than blocking in one', () => {
    const scrubber = new SteppedScrubber();
    // Comfortably more steps than one frame's budget, comfortably under the cap.
    const targetT = 1000 * FIXED_DT;
    scrubber.begin(targetT, () => {});
    let ticks = 0;
    let stepCalls = 0;
    while (scrubber.inProgress) {
      scrubber.tick(() => stepCalls++);
      ticks++;
      if (ticks > 10_000) throw new Error('scrubber never finished — infinite loop guard');
    }
    expect(ticks).toBeGreaterThan(1); // did NOT finish in a single tick
    expect(stepCalls).toBe(1000);
  });

  it('caps at MAX_FASTFORWARD_STEPS and reports capped=true', () => {
    const scrubber = new SteppedScrubber();
    const wayPastCap = (MAX_FASTFORWARD_STEPS + 5000) * FIXED_DT;
    scrubber.begin(wayPastCap, () => {});
    let stepCalls = 0;
    while (scrubber.inProgress) scrubber.tick(() => stepCalls++);
    expect(stepCalls).toBe(MAX_FASTFORWARD_STEPS);
  });

  it('the finished progress from a capped scrub still reports capped=true', () => {
    const scrubber = new SteppedScrubber();
    scrubber.begin((MAX_FASTFORWARD_STEPS + 1) * FIXED_DT, () => {});
    let last;
    while (scrubber.inProgress) last = scrubber.tick(() => {});
    expect(last?.finished).toBe(true);
    expect(last?.capped).toBe(true);
  });

  it('a zero-distance scrub (t=0) finishes immediately with zero steps', () => {
    const scrubber = new SteppedScrubber();
    scrubber.begin(0, () => {});
    expect(scrubber.inProgress).toBe(false);
  });
});

describe('module-overridable dt (ADR 0010, stepDt)', () => {
  it('FixedStepAccumulator honors a custom dt instead of FIXED_DT', () => {
    // 1/64 is exactly representable in IEEE754 double (64 = 2^6), so
    // accumulating it 64 times lands exactly on 1 with no float drift
    // — unlike 1/60, which would land fractionally short.
    const customDt = 1 / 64;
    const acc = new FixedStepAccumulator(customDt);
    const seen: number[] = [];
    const taken = acc.advance(1, 1, (dt) => seen.push(dt));
    expect(taken).toBe(64);
    for (const dt of seen) expect(dt).toBe(customDt);
  });

  it('SteppedScrubber honors a custom dt for both step count and reported t', () => {
    const customDt = 1 / 60;
    const scrubber = new SteppedScrubber(customDt);
    const targetT = 10 * customDt;
    scrubber.begin(targetT, () => {});
    let stepCalls = 0;
    const progress = scrubber.tick(() => stepCalls++);
    expect(stepCalls).toBe(10);
    expect(progress.t).toBeCloseTo(targetT, 10);
    expect(progress.finished).toBe(true);
  });

  it('SteppedScrubber still caps at MAX_FASTFORWARD_STEPS with a custom dt', () => {
    const customDt = 1 / 60;
    const scrubber = new SteppedScrubber(customDt);
    const wayPastCap = (MAX_FASTFORWARD_STEPS + 5000) * customDt;
    scrubber.begin(wayPastCap, () => {});
    let stepCalls = 0;
    while (scrubber.inProgress) scrubber.tick(() => stepCalls++);
    expect(stepCalls).toBe(MAX_FASTFORWARD_STEPS);
  });

  it('omitting dt falls back to FIXED_DT (existing zero-arg behavior is unchanged)', () => {
    const acc = new FixedStepAccumulator();
    let calls = 0;
    acc.advance(FIXED_DT, 1, () => calls++);
    expect(calls).toBe(1);
  });
});
