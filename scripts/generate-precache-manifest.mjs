#!/usr/bin/env node
/**
 * Post-build step for offline support (ADR 0005, TASKS.md P-1/P-2/P-5).
 *
 * Reads dist/.vite/manifest.json — the same file scripts/check-bundle-budget.mjs
 * reads — and, rather than walking the import graph, precaches EVERY file
 * referenced anywhere in it. That's deliberately simpler than a recursive
 * static+dynamic-imports walk and equally correct: the manifest only ever
 * contains files this build actually produced, so sweeping all of it
 * trivially includes every module's lazy chunk (§11) and every module's
 * explain.md chunk, not just the ones something happens to statically
 * import.
 *
 * Then string-replaces the two placeholders src/sw.ts declares into the
 * already-built dist/sw.js (emitted by `tsc -p tsconfig.sw.json`, which
 * must run before this script — see package.json's `build` script), and
 * prints the total precache size so it's visible in CI's Build step log
 * (P-5) without a separate CI step.
 */
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, '..');
const distDir = path.join(root, 'dist');
const manifestPath = path.join(distDir, '.vite', 'manifest.json');
const swPath = path.join(distDir, 'sw.js');

// Must match vite.config.ts's `base` exactly (see that file's own comment
// about why: GitHub Pages project-site path, case-sensitive).
const BASE = '/phys-viz/';

if (!existsSync(manifestPath)) {
  console.error(`Manifest not found at ${manifestPath} — run "npm run build" first.`);
  process.exit(1);
}
if (!existsSync(swPath)) {
  console.error(
    `${swPath} not found — the "tsc -p tsconfig.sw.json" build step must run before this script.`,
  );
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

const relPaths = new Set();
relPaths.add('index.html');
for (const entry of Object.values(manifest)) {
  if (entry.file) relPaths.add(entry.file);
  for (const css of entry.css ?? []) relPaths.add(css);
  for (const asset of entry.assets ?? []) relPaths.add(asset);
}

// Only the actual font files are needed offline — public/fonts/ also
// carries README.md/LICENSE-OFL.txt, which the app never fetches at runtime.
const FONT_EXTENSIONS = new Set(['.woff', '.woff2', '.ttf']);

function walkFonts(dir, base) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, name.name);
    const rel = path.posix.join(base, name.name);
    if (name.isDirectory()) walkFonts(abs, rel);
    else if (FONT_EXTENSIONS.has(path.extname(name.name))) relPaths.add(rel);
  }
}
walkFonts(path.join(distDir, 'fonts'), 'fonts');

const urls = [BASE, ...Array.from(relPaths, (p) => BASE + p)].sort();

const version = crypto.createHash('sha256').update(urls.join('\n')).digest('hex').slice(0, 12);

let sw = readFileSync(swPath, 'utf-8');
const versionToken = '__PV_SW_VERSION__';
const urlsToken = "['__PV_PRECACHE_URLS__']";
if (!sw.includes(versionToken) || !sw.includes(urlsToken)) {
  console.error('dist/sw.js is missing the expected placeholders — did src/sw.ts change shape?');
  process.exit(1);
}
sw = sw.replace(versionToken, version).replace(urlsToken, JSON.stringify(urls));
writeFileSync(swPath, sw);

let totalBytes = 0;
for (const url of urls) {
  const rel = url.startsWith(BASE) ? url.slice(BASE.length) : url;
  const abs = path.join(distDir, rel || 'index.html');
  if (existsSync(abs)) totalBytes += statSync(abs).size;
}

console.log(`Service worker: ${urls.length} URLs precached, version ${version}`);
console.log(
  `Total precache size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB (on-disk, uncompressed)`,
);
