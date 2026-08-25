/**
 * modules — LAYER 3. One folder per visualization.
 *
 * May import kernel and modules/types ONLY. Must NOT import `three`,
 * `react`, `shell`, or other modules (ARCHITECTURE.md §6). This barrel
 * re-exports only the contract and the registry — never a concrete
 * module implementation — so that shell code importing from
 * `@/modules` cannot accidentally reach around the registry.
 */
export * from './types';
export * from './registry';
