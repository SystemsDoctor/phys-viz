# 15. Clamp and NaN-guard decoded URL param values

Date: 2026-09-14

## Status

Accepted

## Context

`src/shell/state/urlCodec.ts`'s `decodeParamValue` did raw `Number(raw)`
for every `number`/`angle`/vector-component value read from a
bookmark's query string, with no clamping to the param's own declared
`min`/`max`/`range` and no `NaN`/finite check anywhere in the
decode → store → module pipeline (TASKS.md X-20, discovered during the
`momentum-collisions`/`work-energy` code-review pass, but a pre-existing
gap affecting every registered module — a bookmark is a documented,
shipped feature per ARCHITECTURE.md §14, so a hand-edited or truncated
link is a legitimate input, not a contrived one).

Concretely reachable today: `#/m/momentum-collisions?m1=0&m2=0` makes
every downstream scalar `NaN` via `0/0`; `#/m/work-energy?m=0` makes
`omega=Infinity` and every subsequent ball position `NaN` via an
`Infinity*0`-shaped computation. Neither module is at fault — both
trust their `update()`/`scalars()` inputs, correctly, per CLAUDE.md's
"don't validate against scenarios that can't happen via the normal UI
path" (a `Slider` can't produce these values; a hand-edited URL can).
The fix belongs at the one place state actually crosses from untrusted
(a URL string) to trusted (`AppState`), not inside every module.

Three policies were on the table: (a) clamp silently to
`[min, max]`/`[-range, range]`, non-finite falls back to the param's
own default; (b) reject the whole param and fall back to its default
even when merely out-of-declared-range (i.e. don't clamp, only rescue
non-finite values); (c) reject the entire URL state on any single bad
field and fall back to full module defaults, surfacing the same
non-blocking `role="status"` notice `runMigrations`' failure path
already uses (M3-22).

## Decision

**(a): clamp finite-but-out-of-range values, fall back to the
per-field default for anything non-finite.** `decodeParamValue`
(`urlCodec.ts`) now routes every `number`/`angle`/vector-component
value through a new `clampDecodedNumber(value, fallback, min?, max?)`:
`!Number.isFinite(value)` (`NaN`, `+/-Infinity`, including the "empty
or non-numeric query param" case where `Number('')`/`Number('abc')`
already produce these) returns `fallback` — the param's own declared
`default` (or the matching component of a vector's `default` tuple);
otherwise the value is clamped into `[min, max]` (or `[-range, range]`
for a vector component) when those bounds are declared.

Chosen over (b)/(c) because it's the least surprising outcome relative
to a mechanism every viewer already understands: dragging a `Slider`
past its own end pins at the end rather than rejecting the drag or
resetting the whole panel. A bookmark restoring "the nearest valid
state" for one field reads the same way, and unlike (c) it doesn't
throw away the OTHER, perfectly valid fields in the same URL over one
bad one. (b) was rejected specifically because it would leave a
value that's finite but wildly out of a param's declared range (e.g. a
future edit narrows a `min`/`max` and an old bookmark now falls outside
it) live in the scene indefinitely, which is exactly the kind of "silent
NaN four steps downstream" failure mode this ADR exists to close off,
just moved one step later.

## Consequences

- Scoped to `number`, `angle`, and each `vector` component — the three
  `ParamDef` kinds whose decode path is a bare `Number(...)`. `select`
  and `toggle` can't produce a non-finite value from `decodeParamValue`
  as written (`toggle` is a strict `'1'` string-equality check; `select`
  is decoded as a plain string, validated or not against `options`
  elsewhere) and `expression` is a string handed to `kernel/expr`,
  whose own parser already has typed error handling — none of those
  needed this fix, so none were touched.
- A hand-edited URL with a garbage numeric value now silently restores
  to that field's default (or the nearest declared bound) instead of
  propagating `NaN`/`Infinity` into a module's `update()`/`scalars()` —
  no visible error, no console warning, consistent with `runMigrations`'
  own "never an error, just resolve to a working state" precedent
  (M3-22) for a different kind of malformed bookmark.
- No `MODULE_CONTRACT_VERSION` bump: `types.ts` is unchanged, this is
  purely a shell-layer decode fix.
- A later contributor narrowing a param's `min`/`max` should expect old
  bookmarks with an out-of-new-range value to now clamp to the new
  bound rather than restore their original number — an intentional,
  documented consequence of this decision, not a regression to chase.
