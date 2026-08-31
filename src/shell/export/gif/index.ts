/**
 * The dynamic-import entry point for GIF export (ADR 0006, P-7) — this
 * exact module path (`src/shell/export/gif/index.ts`) is what
 * `scripts/check-bundle-budget.mjs` looks up to enforce the ≤250 KB
 * gzipped budget, and what `GifExportPanel` dynamically `import()`s so
 * the encoder never touches the initial bundle.
 */
export { captureGif, estimateGifSize } from './capture';
export type { CaptureGifOptions } from './capture';
