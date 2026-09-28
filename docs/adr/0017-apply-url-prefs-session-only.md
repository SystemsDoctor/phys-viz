# 17. Apply URL-encoded display prefs for the session, never persist them

Date: 2026-09-28

## Status

Accepted

## Context

`up=`/`th=`/`pj=`/`gr=`/`gxy=`/`gxz=`/`gyz=` (ADR 0009/§13's "prefs
piggyback on the query string") are encoded by `encodeState` and
correctly decoded by `decodeState` into `DecodedState.prefs` — but
`ModuleView.tsx`'s hydrate effect never read `decoded.prefs` at all
(`hydrate({ moduleId, params, layers, time, camera, ui })`, no `prefs`
key), and `store.ts`'s `hydrate()` explicitly preserves whatever is
already in the store (`prefs: get().prefs, ...state`) when the caller
doesn't supply one. A student opening a z-up demo link built for them
by an instructor silently got their own saved y-up preference instead
(2026-09-23 audit, X-34).

`prefs` already has one persistence path: the settings panel calls
`savePrefs()` to write to `localStorage` (`prefsStorage.ts`), and
`App.tsx` loads that saved profile into the store once at startup,
before any module mounts. `decoded.prefs` from `decodeState`, however,
is always a FULLY resolved object — every field either the URL's value
or `DEFAULT_PREFS`, per §14's "decode returns every field resolved, not
just the delta" contract (the same shape `params`/`layers`/`camera`
already use). Wiring that object into `hydrate()` verbatim would mean
any bookmark with even one prefs key present (e.g. just `pj=1` for a
projector-mode demo) would silently snap every OTHER prefs field —
theme, up-axis, grid visibility — back to `DEFAULT_PREFS`, overwriting
a viewer's own saved profile for fields the link author never touched.

## Decision

1. **Apply URL prefs for the session only.** `decodeState` now also
   returns `DecodedState.prefsPresent` — a `Record<keyof
AppState['prefs'], boolean>` recording which of the seven prefs keys
   were actually present in the URL (as opposed to `prefs` itself,
   which is always fully resolved). A new pure helper,
   `applyUrlPrefs(current, decoded)` in `ModuleView.tsx`, merges only
   the PRESENT fields from `decoded.prefs` onto the viewer's current
   store prefs (`current` — the saved profile, or an earlier session
   override), returning `undefined` when the URL specified none at all.
   `ModuleView`'s hydrate effect passes the result as `hydrate({ ...,
prefs: prefsOverride })` only when it's defined; when the URL has no
   prefs keys, `hydrate()`'s existing `prefs: get().prefs, ...state`
   fallback keeps working exactly as before.
2. **Never call `savePrefs`/write to `localStorage` from this path.**
   A URL-carried preference is a property of the LINK, not the viewer —
   writing it into the persisted profile would make a one-time shared
   demo link permanently change a viewer's own settings the next time
   they open an unrelated module, creating a second, conflicting source
   of truth for "what theme/up-axis is this viewer's default."
3. **Absent fields fall through to the current store value, never to
   `DEFAULT_PREFS`.** This is the reason `prefsPresent` exists as a
   separate field rather than reusing `decoded.prefs` directly — a
   present-vs-default distinction `decodeState`'s existing "fully
   resolved" contract for params/layers/camera doesn't need, because
   those are always fully re-seeded on module mount, while prefs are
   explicitly meant to persist across mounts.

## Consequences

- A bookmarked link now actually reproduces its author's up-axis,
  theme, projector mode, and grid visibility for whoever opens it, for
  that session, without permanently changing their saved profile.
- `decodeState`'s contract for `prefs` itself is unchanged (still
  fully resolved, still round-trips through `encodeState` exactly as
  ADR 0009/§13 describe) — only the new `prefsPresent` field is
  additive, so no existing caller of `decodeState` needs to change.
- Reloading the SAME bookmarked URL, or navigating to a different
  module without a URL override, does not re-apply the override a
  second time from anywhere new — it's just whatever's already in the
  store, consistent with how `hydrate()` already treated prefs before
  this fix for the "URL has no prefs" case.
- No `MODULE_CONTRACT_VERSION`/`types.ts` change — this is a
  shell/URL-decoding-layer fix, the same shape as ADR 0015/0016.
