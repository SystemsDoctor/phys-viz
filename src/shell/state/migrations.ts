/**
 * Schema migration (ARCHITECTURE.md §14, §23 open decision #2). An old
 * shared link from a previous semester must still work; a link that
 * cannot be migrated loads defaults and shows a non-blocking notice
 * rather than erroring.
 *
 * TODO(M3): implement as modules gain schemaVersion bumps.
 */
export type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

export const migrations: Record<string, Record<number, Migration>> = {
  // 'vector-algebra': { 1: (old) => ({ ...old }) },
};
