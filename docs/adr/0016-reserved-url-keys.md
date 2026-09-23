# 16. Reserve shell-level URL keys; enforce them in the contract suite

Date: 2026-09-23

## Status

Accepted

## Context

`encodeState`/`decodeState` (`urlCodec.ts`) share one flat
`URLSearchParams` between shell-owned keys (`v`, `z`, `L`, `t`, `c`,
`up`, `th`, `pj`, `gr`, `gxy`, `gxz`, `gyz`) and every module's own
`ParamDef`/`LayerDef` `urlKey`s. Nothing ever checked a module's
declared `urlKey`s against that shell list. The 2026-09-23 audit (TASKS
X-30) found two live collisions: `vector-algebra` and `oscillations`
both used `c` for an ordinary param (colliding with the camera key),
and `fields-gradients` and `control-showcase` both used `th` for an
angle param (colliding with the theme key). A bookmark with a
non-default camera/theme AND a non-default value for the colliding
param silently lost one of them — `query.set()` just overwrites — and
in the `c` case, the param's own numeric string got fed into
`decodeCamera` as if it were camera syntax. The contract suite's
existing "urlKeys unique, <=4 chars" check (`modules.contract.test.ts`)
only ever compared a module's keys against each other, never against
the shell's own reserved set, so this passed cleanly for four modules
in a row.

## Decision

1. **Publish the reserved list** as a single exported constant,
   `RESERVED_URL_KEYS`, in `urlCodec.ts` (the one file that already
   owns every shell-level key): `v z L t c up th pj gr gxy gxz gyz`.
2. **Enforce it in the contract suite** — every registered module's
   `params` AND `layers` `urlKey`s are checked against
   `RESERVED_URL_KEYS`, not just against each other. A module that
   collides fails `test:contract`, the same gate that already catches
   an in-module duplicate.
3. **Rename the four colliding keys** — the param's `key` (its
   long-form, stable identity used everywhere except the URL) is
   untouched; only `urlKey` changes:
   - `vector-algebra`'s vector `c` param: `c` -> `vc`
   - `oscillations`'s damping-coefficient `c` param: `c` -> `cd`
   - `fields-gradients`'s direction `theta` param: `th` -> `dth`
   - `control-showcase`'s angle `theta` param: `th` -> `ang`
4. **Bump each of those four modules' `schemaVersion`** by one, with
   **no accompanying migration function**. `migrations.ts`'s own
   documentation already states a `urlKey` rename is structurally out
   of scope for a `Migration` — a migration operates on the flat
   `Record<key, value>` `decodeState` has ALREADY resolved from
   `urlKey` to `key` using the module's PRESENT-day param defs, so by
   the time a migration would run, an old link's value under the old
   `urlKey` has already been lost (the new `urlKey` lookup returned
   `null`, so the param decoded to its default). There is nothing to
   migrate forward. The version bump's only job is to make
   `runMigrations` correctly report `migrated: false` for a link
   encoded at the old version, so it falls back to full module defaults
   with the existing non-blocking notice (ADR 0003), instead of
   silently loading a not-quite-right merge of "new schema, old
   camera/theme value in the wrong slot."

## Consequences

- An old bookmark for one of these four modules that used the
  colliding param now shows the "couldn't be fully updated" notice and
  loads defaults, same as any other unmigratable link. This is a
  regression in the narrow sense that the specific param's value is
  lost — but the alternative (silently corrupting the camera or theme
  read) was already broken, just invisibly. No link that worked
  correctly before this change works differently now: the collision
  meant `c=`/`th=` in that context was never reliably decodable to
  begin with.
- `RESERVED_URL_KEYS` is a closed, hand-maintained list — adding a new
  shell-level query key (rare; the last one was `gyz` for the
  per-plane grid) means adding it here too, or the contract suite won't
  catch a module that later picks the same short key.
- No `MODULE_CONTRACT_VERSION` bump: `types.ts` is unchanged, this is a
  URL-encoding-layer fix plus a per-module `schemaVersion` bump, the
  same shape ADR 0015 used for the NaN/clamp guard.
