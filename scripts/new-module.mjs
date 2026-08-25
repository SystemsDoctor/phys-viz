#!/usr/bin/env node
/**
 * `npm run new:module -- my-module-id`
 *
 * Copies src/modules/_template/ to src/modules/<id>/ and rewrites the
 * placeholder id in manifest.ts. Part of the M6 "authoring path" gate
 * (ARCHITECTURE.md §20): a first-time module author should be able to
 * ship a working module in under four hours using only
 * docs/MODULE_AUTHORING.md and this generator.
 */
import { cpSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const id = process.argv[2];
if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error('Usage: npm run new:module -- <kebab-case-id>');
  process.exit(1);
}

const src = path.join(root, 'src/modules/_template');
const dest = path.join(root, 'src/modules', id);

if (existsSync(dest)) {
  console.error(`src/modules/${id} already exists.`);
  process.exit(1);
}

cpSync(src, dest, { recursive: true });

const manifestPath = path.join(dest, 'manifest.ts');
const manifest = readFileSync(manifestPath, 'utf8').replace("id: '_template'", `id: '${id}'`);
writeFileSync(manifestPath, manifest);

console.log(`Created src/modules/${id}/. Next: fill in manifest.ts, params.ts, and index.ts.`);
console.log('See docs/MODULE_AUTHORING.md.');
