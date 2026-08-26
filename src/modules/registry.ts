/**
 * Registry — zero-edit registration. Dropping a folder into
 * src/modules/ registers a module. Nothing else to edit.
 * See ARCHITECTURE.md §11.
 *
 * Folders prefixed with `_` (like `_template`) and the non-module
 * `testing/` folder are excluded by the glob pattern below, which only
 * matches directories starting with a lowercase letter AND containing
 * the required file.
 */
import type { ModuleManifest, PhysicsModule } from './types';

// Manifests: eagerly loaded. They are tiny data objects, and the gallery
// needs all of them to render cards, search, and filter.
const manifestModules = import.meta.glob<{ default: ModuleManifest }>('./[a-z]*/manifest.ts', {
  eager: true,
});

// Implementations: lazily loaded. Each becomes its own chunk, so the
// initial bundle never grows as the library does.
const implModules = import.meta.glob<{ default: PhysicsModule }>('./[a-z]*/index.ts');

// explain.md: lazily loaded as raw text, same reasoning as implModules
// — the explain panel content (§9) must not bloat the initial bundle.
// Optional per module (`readonly`/no-explain modules exist, e.g. during
// early development), so loadExplain resolves to null rather than
// throwing when a module has none.
const explainModules = import.meta.glob<string>('./[a-z]*/explain.md', {
  query: '?raw',
  import: 'default',
});

export const manifests: ModuleManifest[] = Object.values(manifestModules)
  .map((m) => m.default)
  .sort((a, b) => a.title.localeCompare(b.title));

export async function loadModule(id: string): Promise<PhysicsModule> {
  const entry = Object.entries(implModules).find(([path]) => path === `./${id}/index.ts`);
  if (!entry) throw new Error(`Unknown module: ${id}`);
  return (await entry[1]()).default;
}

export async function loadExplain(id: string): Promise<string | null> {
  const entry = Object.entries(explainModules).find(([path]) => path === `./${id}/explain.md`);
  if (!entry) return null;
  return await entry[1]();
}
