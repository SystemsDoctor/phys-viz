/**
 * URL serialization — the bookmarkable-demo feature (ARCHITECTURE.md
 * §14). Hash routing, so GitHub Pages needs no rewrite rules.
 *
 *   #/m/<moduleId>?v=1&a=1,2,0&b=0,3,1&L=xp,proj&t=2.40&c=iso.o
 *
 * Rules:
 *  - `v=` schema version, always present, drives migration.
 *  - Params use urlKey; omit any param AT ITS DEFAULT VALUE.
 *  - `L=` comma-separated layer urlKeys that differ from default,
 *    `-` prefix means "turned off".
 *  - `t=` time, 2dp, omitted when 0.
 *  - `c=` camera, compactly encoded (`iso.o` = isometric, orthographic).
 *  - If the encoded string exceeds 1800 characters, fall back to
 *    `?z=<lz-string compressed blob>`.
 *
 * TODO(M3): implement `encodeState` / `decodeState`, both pure and each
 * other's inverse (round-trip is assertion #8 of the contract suite, §18).
 */
import type { AppState } from './store';

export function encodeState(_state: AppState): string {
  throw new Error('shell/state/urlCodec: not implemented (see M3 in ARCHITECTURE.md §20)');
}

export function decodeState(_hash: string): Partial<AppState> {
  throw new Error('shell/state/urlCodec: not implemented (see M3 in ARCHITECTURE.md §20)');
}
