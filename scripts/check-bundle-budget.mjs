#!/usr/bin/env node
/**
 * Enforces the §17 bundle budgets against the real Vite build output
 * (ARCHITECTURE.md §17, TASKS.md X-3/X-4). Reads `dist/.vite/manifest.json`
 * (`build.manifest: true` in vite.config.ts) rather than parsing
 * filenames, because every module's own file is literally named
 * `index.ts` — the manifest is what actually distinguishes "the shell
 * entry" from "module N's lazy chunk" via each key's *source* path.
 *
 * Checks:
 *  - Initial JS ("shell + scene + kernel" per §17 — the project's own
 *    code, not the pinned third-party vendor/three/katex chunks the
 *    manualChunks split exists to keep separately inspectable) <= 250 KB
 *    gzipped.
 *  - Every `src/modules/<id>/index.ts` is reachable only via the entry's
 *    `dynamicImports`, never its static `imports` — the O(1)-in-module-
 *    count claim (§11) is exactly this: a module's code must never leak
 *    into the eagerly-loaded entry.
 *  - Each module's own chunk <= 80 KB gzipped.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, '..');
const distDir = path.join(root, 'dist');
const manifestPath = path.join(distDir, '.vite', 'manifest.json');

if (!existsSync(manifestPath)) {
  console.error(`Manifest not found at ${manifestPath} — run "npm run build" first.`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

const INITIAL_BUDGET_BYTES = 250 * 1024;
const MODULE_CHUNK_BUDGET_BYTES = 80 * 1024;

function gzipSize(relativeFile) {
  const bytes = readFileSync(path.join(distDir, relativeFile));
  return zlib.gzipSync(bytes, { level: 9 }).length;
}

function fmtKB(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry);
if (!entryKey) {
  console.error('No entry chunk found in the manifest.');
  process.exit(1);
}
const entry = manifest[entryKey];

let failed = false;

// --- Initial JS budget: the entry's own file only, not its vendor/three/
// katex imports — those are pinned third-party manualChunks reported
// separately below, per §17's literal wording ("shell + scene + kernel").
const entryGzip = gzipSize(entry.file);
console.log(`Initial JS (shell+scene+kernel entry, ${entry.file}): ${fmtKB(entryGzip)} gzipped`);
if (entryGzip > INITIAL_BUDGET_BYTES) {
  console.error(`  FAIL: exceeds the ${fmtKB(INITIAL_BUDGET_BYTES)} budget.`);
  failed = true;
}

// --- Third-party vendor chunks: reported for visibility, not gated —
// their size is a pinned dependency cost (three.js, katex), not
// engineering budget this project controls day to day.
for (const key of entry.imports ?? []) {
  const chunk = manifest[key];
  if (!chunk) continue;
  console.log(`  vendor chunk ${chunk.name ?? key} (${chunk.file}): ${fmtKB(gzipSize(chunk.file))} gzipped`);
}

// --- Per-module chunk budget + the O(1)-in-module-count check (X-4).
const moduleIndexKeys = Object.keys(manifest).filter((k) =>
  /^src\/modules\/[a-z][a-z0-9-]*\/index\.ts$/.test(k),
);

if (moduleIndexKeys.length === 0) {
  console.error('No module chunks found in the manifest — is the build output stale?');
  failed = true;
}

const staticallyImported = new Set(entry.imports ?? []);
for (const key of moduleIndexKeys) {
  const id = key.split('/')[2];
  const chunk = manifest[key];

  if (staticallyImported.has(key) || !(entry.dynamicImports ?? []).includes(key)) {
    console.error(
      `FAIL: ${id} (${key}) is not reachable only via the entry's dynamicImports — a module's code leaked into the eagerly-loaded bundle.`,
    );
    failed = true;
    continue;
  }

  const gzip = gzipSize(chunk.file);
  console.log(`Module chunk ${id} (${chunk.file}): ${fmtKB(gzip)} gzipped`);
  if (gzip > MODULE_CHUNK_BUDGET_BYTES) {
    console.error(`  FAIL: exceeds the ${fmtKB(MODULE_CHUNK_BUDGET_BYTES)} per-module budget.`);
    failed = true;
  }
}

if (failed) {
  console.error('\nBundle budget check failed.');
  process.exit(1);
} else {
  console.log('\nBundle budget check passed.');
}
