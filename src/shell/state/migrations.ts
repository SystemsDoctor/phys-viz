/**
 * Schema migration (ARCHITECTURE.md §14, §23 open decision #2, ADR
 * 0003). An old shared link from a previous semester must still work;
 * a link that cannot be migrated loads defaults and shows a
 * non-blocking notice rather than erroring — `runMigrations` reports
 * that distinction explicitly (`migrated: true/false`) so the caller
 * (ModuleView) knows which path to take.
 *
 * A `Migration` operates on a flat `Record<key, value>` already keyed
 * by each param's CURRENT long `key` (not `urlKey`) — i.e. urlCodec's
 * `decodeState` has already resolved urlKey -> key using the module's
 * present-day param defs before a migration ever runs. This means a
 * migration can fix up a VALUE's meaning (e.g. a param that used to
 * store degrees and now stores radians) but not a urlKey RENAME itself
 * — renaming a urlKey is out of scope for the same reason a `key`
 * rename would be: both are assumed stable once shipped, the same
 * stability guarantee `ModuleManifest.id` already carries.
 */
export type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

export const migrations: Record<string, Record<number, Migration>> = {
  // 'vector-algebra': { 1: (old) => ({ ...old }) },
};

/**
 * Walks the migration chain from `fromVersion` to `toVersion`. Reports
 * success/failure explicitly rather than via a reference-equality check
 * against the input — a chain that succeeds for a few versions and then
 * hits a missing step is still an INCOMPLETE migration and must fall
 * back to defaults (§14), and reference equality alone can't tell that
 * apart from a chain that succeeded completely (both produce a new
 * object reference partway through).
 */
export function runMigrations(
  moduleId: string,
  fromVersion: number,
  toVersion: number,
  raw: Record<string, unknown>,
  table: Record<string, Record<number, Migration>> = migrations,
): { params: Record<string, unknown>; migrated: boolean } {
  const moduleTable = table[moduleId];
  let state = raw;
  for (let v = fromVersion; v < toVersion; v++) {
    const step = moduleTable?.[v];
    if (!step) return { params: raw, migrated: false }; // can't bridge the gap — caller falls back to defaults with a notice, per §14
    state = step(state);
  }
  return { params: state, migrated: true };
}
