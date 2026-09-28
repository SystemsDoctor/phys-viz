# 18. Orientation-free "flat" modules embed their 2D plane through `ctx.up`

Date: 2026-09-28

## Status

Accepted

## Context

The GLOBAL "2D-only" camera lock (ADR 0011/0012) always calls
`goTo('+z')`. Under y-up (ADR 0009's default) that shows world x-y,
which is exactly the plane four modules hardcode for their flat,
non-gravitational content: `non-inertial-frames` (`toWorld(x, y) = [x,
y, 0]`), `gravitation` at `inclination = 0`, `control-showcase`, and
`vector-algebra`'s `planar` mode (`[v[0], v[1], 0]`). Under z-up,
`fromCanonical` (`scene/camera/index.ts:113-120`) instead maps that
same `+z` preset to world −y, so the 2D lock shows world x-z — and all
four modules' content, still drawn into world x-y, collapses to a
degenerate line along world y (the camera's new depth axis) when
viewed face-on. Logged as **X-42** in the 2026-09-23 audit; M7-1's note
had already spotted the same collapse in `projectile-motion` under
z-up without logging it (that module draws in the world x/up plane —
`launchVelocity`'s vertical component is along `ctx.up` already — so
it was unaffected and out of this ADR's scope).

None of these four modules has a notion of GRAVITATIONAL "vertical"
(PHYSICS_CONVENTIONS.md's guidance to ignore `ctx.up` is written for
exactly that case — a pendulum's string or a projectile's arc, which
truly has no meaning without knowing which way is down). But all four
still draw a FLAT 2D scene, and a flat scene has to live in SOME world
plane to be visible at all under the 2D lock — the fix is to choose
that plane from `ctx.up`, the same signal the camera itself already
uses, rather than a hardcoded axis.

## Decision

1. **Two new pure `kernel/frames` helpers**, `embedPlanar(up, x, y)`
   and `planarNormal(up)`: `embedPlanar` places a local flat `(x, y)`
   coordinate into world x-y when `up === 'y'` (unchanged from every
   module's pre-X-42 behavior) or world x-z when `up === 'z'`
   (`[x, 0, y]`) — exactly the plane `fromCanonical` puts the 2D-lock
   camera on. `planarNormal` returns the world axis normal to that same
   plane (world Z for y-up, world Y for z-up) — what a "spin in the
   page" rotation needs to be about. Both are pure functions of `up`
   alone (kernel's own `UpAxis = 'y' | 'z'`, structurally identical to
   `scene/SceneContext`'s, so no scene import is needed), living in
   `kernel/frames` since ARCHITECTURE.md §6 forbids a fifth
   "up-axis-aware geometry" home and this is squarely a frames concern.
2. **Each of the four modules reads `ctx.up` LIVE, every `update()` /
   `scalars()` call, never cached** — `ctx.up` is documented as a live
   getter (`scene/createSceneContext.ts`) specifically so a later
   up-axis switch (ADR 0011's live-prefs toggle) is visible on the next
   frame without remounting the module — and feeds it through
   `embedPlanar`/`planarNormal` wherever a local flat coordinate used
   to be written straight onto world `(x, y, 0)`:
   - `non-inertial-frames`: `toWorld(up, x, y)` replaces the hardcoded
     `[x, y, 0]`; the platform disc's fixed orientation is now
     recomputed from `up` every `update()` (identity under z-up, the
     previous 90°-about-X rotation under y-up) instead of frozen at
     `create()`.
   - `gravitation`: the un-rotated (pre-`omega`/`inclination`) orbit
     embeds via `embedPlanar`, and `omega`'s rotation is now about
     `planarNormal(up)` instead of a hardcoded world Z; `inclination`
     still rotates about the pinned line of nodes (world X) either
     way, unchanged, since a rotation about X mixes exactly the
     up/depth pair regardless of which one is "up."
   - `control-showcase`: the angle arc/point/trace (function of `theta`
     alone) and the "answer" sphere's offset from the geometry group
     embed via `embedPlanar`. The draggable `p` vector param itself is
     deliberately left untouched — its in-plane behavior already comes
     from `Viewport`/`ctx.draggable`'s own screen-facing-plane
     projection (`scene/createSceneContext.ts`), which already tracks
     the live camera correctly on its own; re-deriving it through
     `embedPlanar` as well would double-apply the mapping.
   - `vector-algebra`: `effective(v, planar, up)` now drops world Y
     under z-up (the 2D-lock camera's depth axis there) instead of
     always dropping world Z.
3. **`PHYSICS_CONVENTIONS.md`'s "a module with no notion of vertical
   ignores `ctx.up` entirely" guidance is narrowed**, not reversed: it
   describes modules with no flat plane to embed in the first place
   (e.g. `momentum-collisions`, whose 1D scenario needs no plane
   choice at all). A module that still draws something flat under the
   global 2D lock reads `ctx.up` for exactly that purpose, even with no
   gravitational "vertical" of its own.

## Consequences

- Every one of the four affected modules now renders correctly (not
  edge-on) under the 2D lock for BOTH up-axis settings, verified by a
  golden test per module (`module.test.ts`) that captures the actual
  `.set()` payload reaching a glyph under `ctx.up === 'z'` — confirmed
  to fail against the pre-fix code and pass against the fix.
- `non-inertial-frames`' platform disc orientation is now a per-frame
  `.set()` instead of a `create()`-time constant; still a single
  quaternion write, not a per-frame allocation, so this doesn't
  reintroduce the "never allocate geometry per frame" concern
  ARCHITECTURE.md §10's module contract guards against.
- `gravitation`'s `orbitAt`/`orbitPathPoints` gain a `up: UpAxis`
  parameter; both are module-internal (never exported), so this is not
  a public-surface change.
- No `MODULE_CONTRACT_VERSION`/`types.ts` change — every module still
  implements the same `create()`/`update()`/`scalars()`/`dispose()`
  shape; this is a rendering-correctness fix inside four modules plus
  two new pure `kernel/frames` exports, the same shape as ADR
  0015/0016/0017's shell/rendering-layer fixes.
