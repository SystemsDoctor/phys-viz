/**
 * E2E perf (Playwright). ARCHITECTURE.md §20 M2 / TASKS.md M2-19.
 *
 * §20's own acceptance wording is "profiled in the Chrome performance
 * profiler for 60 fps and zero per-frame allocation" — a literal
 * DevTools Performance-panel recording, which is an interactive human
 * step (and the instruction to "record the profile result in the PR"
 * confirms it). No such profiler is scriptable here. What follows is
 * the closest automatable proxy: sample real rAF frame times and
 * `performance.memory.usedJSHeapSize` growth across a sustained window
 * of the demo scene's own update loop (src/scene/demoScene.ts), which
 * exercises exactly the same per-frame `.set()` + substrate `onFrame`
 * path a real module's `update()` would.
 *
 * Thresholds are deliberately looser than §17's literal 60fps target /
 * 30fps floor: CI runners commonly render WebGL in software
 * (SwiftShader) at a fraction of native GPU speed, and a strict 60fps
 * assertion here would be flaky on exactly the machines that can't
 * prove anything either way. The heap-growth assertion is the more
 * load-bearing one — it doesn't depend on rendering speed, only on
 * whether the update loop actually allocates net-new retained memory,
 * which is the real question §20 is asking. Log the raw numbers so a
 * human reviewing a run can see whether this machine is fast enough
 * for the fps figures to mean anything, per M2-19's "record the
 * number so it's reviewable rather than folklore" instruction.
 */
import { test, expect } from '@playwright/test';

test.use({
  launchOptions: {
    args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'],
  },
});

test('demo scene sustains a stable frame rate with no net per-frame heap growth', async ({
  page,
}) => {
  // /_dev/demo-scene: an unlisted route App.tsx keeps mounted
  // specifically so this M2-19 measurement stays valid now that `/` is
  // the real gallery (M3), not the throwaway demo scene. Hash routing —
  // no leading slash, so it joins onto baseURL's /phys-viz/ instead of
  // replacing it.
  await page.goto('#/_dev/demo-scene');
  await page.waitForSelector('canvas');
  // Let module loading, first layout, and JIT warm-up settle.
  await page.waitForTimeout(1000);

  const result = await page.evaluate(async () => {
    const w = window as unknown as { gc?: () => void };
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
    const gcIfAvailable = (): void => w.gc?.();

    const runFrames = (count: number): Promise<number[]> =>
      new Promise((resolve) => {
        const times: number[] = [];
        let last = performance.now();
        let n = 0;
        function step(now: number): void {
          times.push(now - last);
          last = now;
          n++;
          if (n < count) requestAnimationFrame(step);
          else resolve(times);
        }
        requestAnimationFrame(step);
      });

    // Warm up ~120 frames before sampling.
    await runFrames(120);

    gcIfAvailable();
    const heapBefore = perf.memory ? perf.memory.usedJSHeapSize : null;

    const frameTimes = await runFrames(300);

    gcIfAvailable();
    const heapAfter = perf.memory ? perf.memory.usedJSHeapSize : null;

    return { frameTimes, heapBefore, heapAfter };
  });

  // Drop the first sample — it spans the gap between the warm-up loop's
  // last frame and this window's first, an artifact of splitting the
  // two rAF loops in `evaluate`, not a real frame time.
  const samples = result.frameTimes.slice(1);
  const avgMs = samples.reduce((a, b) => a + b, 0) / samples.length;
  const worstMs = Math.max(...samples);
  const avgFps = 1000 / avgMs;
  const worstFps = 1000 / worstMs;

  console.log(
    `[perf] avg ${avgFps.toFixed(1)} fps (${avgMs.toFixed(2)} ms/frame), worst frame ${worstMs.toFixed(2)} ms (${worstFps.toFixed(1)} fps), n=${samples.length}`,
  );

  // A generous floor: catches a genuinely broken/hanging render loop
  // without being sensitive to CI's software-rendering speed. The
  // literal §17 60fps/30fps figures are the human profiler session's
  // job to confirm on real hardware.
  expect(avgFps).toBeGreaterThan(20);
  expect(worstFps).toBeGreaterThan(5);

  if (result.heapBefore !== null && result.heapAfter !== null) {
    const deltaMb = (result.heapAfter - result.heapBefore) / (1024 * 1024);
    console.log(`[perf] heap delta over ${samples.length} frames: ${deltaMb.toFixed(2)} MB`);
    // This is a steady-growth proxy for "zero per-frame allocation" in
    // the substrate's onFrame listeners and the demo's own update loop
    // — not a literal heap-snapshot diff, and generous enough to
    // absorb GC jitter. It pairs with a coding discipline (every
    // onFrame callback mutates pre-existing objects or kernel/math's
    // `tmp` pool only, never `new THREE.Vector3()` etc. inside it)
    // that code review, not this number, ultimately enforces.
    expect(deltaMb).toBeLessThan(5);
  } else {
    console.log('[perf] performance.memory unavailable — heap-growth check skipped');
  }
});
