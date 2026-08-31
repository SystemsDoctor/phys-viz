/**
 * Deterministic frame capture (ADR 0006, P-8/P-9/P-10). Drives a module
 * from its own declared STATE on a fixed grid, never from screen
 * recording — this is only sound because §12 forbids unseeded randomness
 * and variable-dt integration.
 *
 * Builds a completely separate, off-screen `Viewport` + module instance
 * (never the live one `ModuleView` owns) so export can never affect the
 * 60 fps live render loop (P-10), and so its own render loop never races
 * the live one's async `requestAnimationFrame` ticks.
 */
import type { PhysicsModule, ModuleState } from '@/modules/types';
import type { ParamValue } from '../../state/store';
import { Viewport } from '@/scene/Viewport';
import type { UpAxis } from '@/scene/SceneContext';
import type { CameraState } from '@/scene/camera';
import { FixedStepAccumulator, SteppedScrubber } from '../../timeline/driver';
import { buildExportPalette, quantizeFrame } from './quantize';
import { encodeGif, type GifFrame } from './encoder';

export interface CaptureGifOptions {
  module: PhysicsModule;
  params: Record<string, ParamValue>;
  layers: Record<string, boolean>;
  camera: CameraState;
  upAxis: UpAxis;
  showGrid: boolean;
  stepDt: number;
  /** Export window: [startT, startT + durationSeconds). */
  startT: number;
  durationSeconds: number;
  fps: number;
  width: number;
  height: number;
}

/** Upper-bound estimate (pre-LZW indexed size) shown before encoding starts (P-9) — deliberately conservative rather than precise, since actual LZW compression on schematic line art varies with content. */
export function estimateGifSize(
  opts: Pick<CaptureGifOptions, 'durationSeconds' | 'fps' | 'width' | 'height' | 'module'>,
): number {
  const frameCount = frameCountFor(opts.module, opts.durationSeconds, opts.fps);
  return frameCount * opts.width * opts.height;
}

function frameCountFor(module: PhysicsModule, durationSeconds: number, fps: number): number {
  if (module.manifest.timeModel === 'static') return 1;
  return Math.max(1, Math.round(durationSeconds * fps));
}

export async function captureGif(opts: CaptureGifOptions): Promise<Uint8Array> {
  const { module } = opts;
  const frameCount = frameCountFor(module, opts.durationSeconds, opts.fps);
  const palette = buildExportPalette();

  const canvas = document.createElement('canvas');
  const viewport = new Viewport({
    canvas,
    upAxis: opts.upAxis,
    // ADR 0006: prefer the projector token variant for export (higher
    // contrast). reducedMotion: true so a captured frame is never mid-fade.
    projectorMode: true,
    reducedMotion: true,
    showGrid: opts.showGrid,
  });
  viewport.stopLoop();
  viewport.resizeTo(opts.width, opts.height);
  viewport.camera.setState(opts.camera);

  const readback = document.createElement('canvas');
  readback.width = opts.width;
  readback.height = opts.height;
  const readbackCtx = readback.getContext('2d', { willReadFrequently: true });
  if (!readbackCtx) throw new Error('captureGif: 2D canvas context unavailable');

  const instance = module.create(viewport.ctx);
  // Layer visibility is shell-owned (§9) and fixed for the whole export —
  // set once, matching what ModuleView's own "layer -> scene groups"
  // effect does for the live view.
  for (const layerDef of module.layers) {
    viewport.setGroupVisible(layerDef.key, opts.layers[layerDef.key] ?? layerDef.default);
  }

  const stateAt = (t: number): ModuleState => ({ params: opts.params, layers: opts.layers, t });

  let accumulator: FixedStepAccumulator | null = null;
  if (module.manifest.timeModel === 'stepped') {
    // Reset then fast-forward to the export's start time — the exact
    // mechanism ModuleView uses for scrubbing (SteppedScrubber), reused
    // unmodified so the exported clip matches what live scrubbing would
    // have produced at the same t.
    const scrubber = new SteppedScrubber(opts.stepDt);
    scrubber.begin(opts.startT, () => instance.reset?.(stateAt(0)));
    while (scrubber.inProgress) {
      scrubber.tick((dt) => instance.step?.(dt, stateAt(0)));
    }
    accumulator = new FixedStepAccumulator(opts.stepDt);
  }

  try {
    const frames: GifFrame[] = [];
    for (let i = 0; i < frameCount; i++) {
      const t = opts.startT + i / opts.fps;

      if (module.manifest.timeModel === 'stepped' && accumulator && i > 0) {
        // One accumulator.advance() per exported frame, using a
        // synthetic frameDt of 1/fps at speed 1 — exactly reproduces the
        // sequence of fixed-dt step() calls a live playback at this
        // exact frame rate would have produced (ModuleView's own
        // playback loop calls accumulator.advance(dt, speed, step) once
        // per rendered frame the same way).
        accumulator.advance(1 / opts.fps, 1, (dt) => instance.step?.(dt, stateAt(t)));
      }

      instance.update(stateAt(t));
      viewport.renderNow();
      readbackCtx.drawImage(canvas, 0, 0);
      const { data } = readbackCtx.getImageData(0, 0, opts.width, opts.height);
      frames.push({ indices: quantizeFrame(data, palette) });

      // Yield periodically so a longer export doesn't freeze the tab —
      // allowed to be slower than 60fps (P-10: this is not the hot path).
      if (i % 5 === 4) await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return encodeGif({
      width: opts.width,
      height: opts.height,
      palette,
      frames,
      frameDelaySeconds: 1 / opts.fps,
    });
  } finally {
    instance.dispose();
    viewport.dispose();
  }
}
