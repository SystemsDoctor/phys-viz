/**
 * GIF export panel (ADR 0006). Lives in ModuleView's aside, alongside
 * ExplainPanel/SweepPlot — needs the live module, its current
 * params/layers/camera/time, and the module's `stepDt`, all already
 * local to `ModuleViewInner`.
 *
 * The actual encoder (`./gif`) is imported ONLY inside the click handler
 * below — never at the top of this file — so it stays out of the
 * initial bundle (P-7) and this panel's own render never pays for it.
 */
import React from 'react';
import type { PhysicsModule } from '@/modules/types';
import type { CameraState } from '@/scene/camera';
import type { UpAxis } from '@/scene/SceneContext';
import { useAppStore } from '../state/store';

const MIN_DURATION_S = 1;
const MAX_DURATION_S = 20;
const MIN_FPS = 5;
const MAX_FPS = 24;
const MIN_DIM = 160;
const MAX_DIM = 960;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function GifExportPanel(props: {
  module: PhysicsModule;
  getCamera: () => CameraState;
  upAxis: UpAxis;
  showGrid: boolean;
  stepDt: number;
}): React.ReactElement {
  const { module, getCamera, upAxis, showGrid, stepDt } = props;
  const isStatic = module.manifest.timeModel === 'static';

  const [durationSeconds, setDurationSeconds] = React.useState(3);
  const [fps, setFps] = React.useState(12);
  const [width, setWidth] = React.useState(480);
  const [height, setHeight] = React.useState(270);
  const [status, setStatus] = React.useState<'idle' | 'capturing' | 'error'>('idle');
  const [error, setError] = React.useState<string | null>(null);

  // Mirrors capture.ts's estimateGifSize formula (upper bound: frames x
  // width x height, pre-LZW) — duplicated as a 2-line pure calculation
  // rather than dynamically importing the encoder chunk just to render a
  // live estimate as the user types, which would otherwise load that
  // chunk on every keystroke instead of only on "Export."
  const frameCount = isStatic ? 1 : Math.max(1, Math.round(durationSeconds * fps));
  const estimatedBytes = frameCount * width * height;

  async function handleExport(): Promise<void> {
    setStatus('capturing');
    setError(null);
    try {
      const { captureGif } = await import('./gif');
      const s = useAppStore.getState();
      const bytes = await captureGif({
        module,
        params: s.params,
        layers: s.layers,
        camera: getCamera(),
        upAxis,
        showGrid,
        stepDt,
        startT: s.time.t,
        durationSeconds,
        fps,
        width,
        height,
      });
      // `encodeGif` always returns a freshly-allocated Uint8Array (never
      // a view into a shared/larger buffer), so `.buffer` is safe to use
      // directly here — TS's ArrayBufferLike -> ArrayBuffer narrowing
      // for BlobPart just needs the explicit cast.
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${module.manifest.id}.gif`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  return (
    <details className="pv-gif-export">
      <summary>Export GIF</summary>
      <div className="pv-gif-export__body">
        <label className="pv-gif-export__row">
          <span>Duration (s)</span>
          <input
            type="number"
            min={MIN_DURATION_S}
            max={MAX_DURATION_S}
            step={1}
            disabled={isStatic}
            value={durationSeconds}
            onChange={(e) =>
              setDurationSeconds(clamp(Number(e.target.value), MIN_DURATION_S, MAX_DURATION_S))
            }
          />
        </label>
        <label className="pv-gif-export__row">
          <span>Frame rate (fps)</span>
          <input
            type="number"
            min={MIN_FPS}
            max={MAX_FPS}
            step={1}
            disabled={isStatic}
            value={fps}
            onChange={(e) => setFps(clamp(Number(e.target.value), MIN_FPS, MAX_FPS))}
          />
        </label>
        <label className="pv-gif-export__row">
          <span>Width (px)</span>
          <input
            type="number"
            min={MIN_DIM}
            max={MAX_DIM}
            step={10}
            value={width}
            onChange={(e) => setWidth(clamp(Number(e.target.value), MIN_DIM, MAX_DIM))}
          />
        </label>
        <label className="pv-gif-export__row">
          <span>Height (px)</span>
          <input
            type="number"
            min={MIN_DIM}
            max={MAX_DIM}
            step={10}
            value={height}
            onChange={(e) => setHeight(clamp(Number(e.target.value), MIN_DIM, MAX_DIM))}
          />
        </label>
        <p className="pv-gif-export__estimate">
          Estimated size (upper bound): {formatBytes(estimatedBytes)} · {frameCount} frame
          {frameCount === 1 ? '' : 's'}
        </p>
        <button
          type="button"
          disabled={status === 'capturing'}
          onClick={() => {
            void handleExport();
          }}
        >
          {status === 'capturing' ? 'Encoding…' : 'Export GIF'}
        </button>
        {status === 'error' && (
          <p className="pv-gif-export__error" role="alert">
            Export failed: {error}
          </p>
        )}
      </div>
    </details>
  );
}
