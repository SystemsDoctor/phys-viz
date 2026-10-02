# 20. Migrate scene line-drawing glyphs to Line2/LineMaterial

Date: 2026-09-28

## Status

Accepted — complete (all line-drawing glyphs migrated; see Addendum)

## Context

Every line-drawing glyph in `src/scene/glyphs/` (and `annotate/dimensionLine`)
builds a `THREE.Line`/`THREE.LineSegments` with `LineBasicMaterial`/
`LineDashedMaterial`. `gl.lineWidth` — the only way that material family
can render wider than 1px — is clamped to 1px by ANGLE on Chrome/Edge/
Firefox on Windows regardless of the value set, a well-known WebGL/ANGLE
platform limitation. `Viewport.setProjectorMode`'s `lineWidthMultiplier`
(`scene/theme`'s `getProjectorAdjustments`, 1.6x) writes a `linewidth`
JS property that therefore has no visible effect on the affected
platforms — projector mode never actually thickens a line. Logged as
**X-49** in the 2026-09-23 audit, which named `three/examples/jsm/lines`'
`Line2`/`LineMaterial` (no new dependency — already present in the
project's pinned `three` version) as the fix.

## Decision

1. **Migrate glyph by glyph, one commit per glyph or small group**,
   each with its own verify-fail-then-pass proof and a full green local
   sweep — explicitly sanctioned by the audit note itself, since this
   touches every line-drawing glyph in the scene layer (arrow shafts,
   `path`, `curvedArrow`, `dimensionLine`, `axes`, grid planes,
   `arc`, `frame`, `surface`'s wireframe). **This ADR covers the first
   slice: `arrow`'s shaft** (this repo's single most-used line-drawing
   glyph — every module that draws a vector uses it). The remaining
   glyphs are still `THREE.Line`/`LineBasicMaterial` as of this ADR;
   TASKS.md's X-49 entry tracks exactly which are done.
2. **`LineGeometry`/`LineMaterial`/`Line2`, `worldUnits: false`**
   (pixel screen-space width, matching what "projector mode thickens
   lines" has always meant pedagogically) replace
   `BufferGeometry`/`LineDashedMaterial`/`THREE.Line`. `LineMaterial`'s
   `linewidth`/`opacity` are real property getters/setters backed by
   shader uniforms (`LineMaterial.js`'s `get`/`set linewidth`), so
   `Viewport.registerThemedMaterial`/`applyProjectorToMaterial`'s
   EXISTING generic mechanism (reads/writes `material.linewidth`, no
   type-specific code) needed **no changes at all** — it was already
   written generically enough; it just had nothing that actually
   listened before.
3. **`LineMaterial.resolution` is set every frame** (`shaftMaterial.
resolution.set(info.rendererWidth, info.rendererHeight)`, inside the
   glyph's existing `onFrame` callback — no allocation, `FrameInfo`
   already carries the renderer size every frame) rather than wired
   through a separate resize hook. `LineMaterial` renders GARBAGE
   (effectively zero width, confirmed empirically) if `resolution`
   isn't kept in sync with the actual canvas size — this is the most
   common Line2 integration mistake per the three.js examples/issues,
   and is why the fix is verified with a REAL rendered-pixel e2e check,
   not just a unit test of the material's own properties.
4. **`LineMaterial.dashed` is a real boolean toggle**, unlike
   `LineDashedMaterial` (no "solid" mode at all — `arrow.ts` used to
   fake one with a dash length of `1e6`, longer than any real shaft).
   `arrow`'s `dashed` prop now sets it directly; `shaft.
computeLineDistances()` (which allocates a fresh buffer every call —
   three.js's own implementation, not something this file can avoid) is
   now only called when `dashed` is actually true, instead of every
   frame regardless.
5. **In-place position updates where the point count is fixed.**
   `LineGeometry.setPositions()` always allocates a fresh
   `InstancedInterleavedBuffer` plus new attribute wrapper objects (three
   .js's own implementation) — acceptable once at construction, but
   `arrow`'s shaft moves every frame. Since a shaft is always exactly 2
   points, `rawPositionBuffer`/`markPositionBufferDirty` (new helpers in
   `arrow.ts`) write directly into the already-allocated interleaved
   buffer's typed array instead of calling `setPositions()` again every
   frame, avoiding the per-frame allocation entirely — consistent with
   `kernel/math`'s scratch-pool doc comment on GC stutter being visible
   on a projector. Glyphs with a variable point count (`path`,
   `curvedArrow`, orbit outlines, …) don't have this option — when
   they're migrated, they'll call `setPositions()` per frame like the
   standard three.js Line2 usage pattern, accepting that allocation as
   unavoidable through the public API.

## Consequences

- Projector mode now ACTUALLY thickens an arrow's shaft — verified by
  an e2e test (`tests/e2e/smoke.spec.ts`, "X-49") that counts how many
  rendered canvas pixels match the shaft's exact flat colour with vs.
  without `?pj=1`, confirmed to fail against the pre-fix code (both
  counts identical, 324 = 324 — literally zero effect) and pass against
  the fix (a reliable >15% increase). Getting this measurement to be
  reliably sensitive took real trial and error, recorded here for the
  next session: (a) a fragment-only URL change (`#/m/x?pj=1` vs.
  `#/m/x`) does NOT force a full page reload in a browser — same-
  document fragment navigation — so a second `page.goto()` to a
  same-route, different-query URL does NOT actually re-run the app's
  `[module]`-keyed hydrate effect; the test must `page.reload()` after
  the second `goto()` to get a genuine fresh mount; (b) at the
  originally-chosen 1.5px default shaft width, a 1.6x multiplier (2.4px)
  is real but too close to sub-pixel to reliably show up in a strict
  exact-colour pixel count against anti-aliased edges — raised the
  default to 3px (still a thin, schematic line) specifically so the
  effect is robustly measurable, not just theoretically present.
- `arrow.test.ts`'s `instanceof THREE.Mesh` filters (used to find the
  cone head, distinguishing it from the shaft) now ALSO match the
  shaft, since `Line2` extends `LineSegments2` extends `THREE.Mesh` —
  switched to an exact-constructor check (`c.constructor ===
THREE.Mesh`) instead. Every other glyph's tests that get migrated will
  need the same check if they use the same `instanceof Mesh` pattern to
  find a non-line child.
- `Viewport.ts`/`scene/theme`'s projector mechanism itself needed ZERO
  changes — confirming the audit's own read that this was purely a
  "the underlying primitive can't actually do this" problem, not a
  wiring problem.
- No `MODULE_CONTRACT_VERSION`/`types.ts` change — modules never
  construct glyphs directly; this is entirely inside `src/scene/glyphs/`.
- Bundle size: `three/examples/jsm/lines/{Line2,LineGeometry,
LineMaterial}.js` adds to the initial JS chunk (`arrow` is used by
  most modules, so its import graph is not deferred) — `check:budget`
  still passes after this first glyph's migration; a future session
  should re-check the budget as more glyphs migrate, since each pulls
  in the same already-imported line classes (no additional bundle cost
  per additional glyph, since they're the same modules).

## Addendum: completion (2026-10-02)

Every remaining glyph was migrated one commit each, in this order: `path`,
`curvedArrow`, `dimensionLine`, `axes`, `gridPlane`, `frame`, `arc`,
`surface`'s wireframe. A `grep` of `src/` for `THREE.Line`/`LineSegments`/
`LineBasicMaterial`/`LineDashedMaterial` constructions now finds only
comments. What the later slices added to the pattern above:

- **Shared helpers** (`src/scene/internal/line2.ts`): `rawPositionBuffer`/
  `rawColorBuffer`, their `mark…Dirty` partners and `setPolylineVertex`
  (a polyline vertex is the START of segment record `i` and the END of
  record `i - 1`). They accept `LineSegmentsGeometry` (the base of
  `LineGeometry`). `arrow.ts` now imports them instead of defining its own.
- **§5 refined — variable counts don't need per-frame `setPositions()`
  either.** `path`, the `axes` ticks, the `gridPlane` lines and the
  `surface` wireframe allocate their instance buffers ONCE at a fixed
  capacity and carry the live count in `geometry.instanceCount`, so even
  the variable-length glyphs allocate nothing per `set()`/rebuild.
  Capacity-padded geometries set `frustumCulled = false` where the
  one-time bounding sphere would be wrong (`path`).
- **Disconnected segments use `LineSegments2` + `LineSegmentsGeometry`**
  (whose buffer is already one start/end record per segment); connected
  polylines use `Line2` + `LineGeometry`. Both are `THREE.Mesh`
  subclasses, so every test that looked a line up with `instanceof
THREE.Line`/`LineSegments`/`Mesh` now matches by exact constructor.
- **Per-vertex colour** (`path`'s fade) works with `LineMaterial
{ vertexColors: true }` via `setColors()`/`rawColorBuffer`.
- **Translucency survives**: `gridPlane` keeps `transparent` +
  `opacity: 0.5` on its `LineMaterial`, so `Viewport`'s opacity-floor path
  still applies to it. (The separate `patch` opacity-floor bug is X-61.)
- **Widths** (screen-space px; the projector multiplier is 1.6x): arrow
  3, `dimensionLine` 3, `curvedArrow` 3, `frame` 3, `path` 2.5, axes 2 /
  ticks 1.5, `arc` 2, `gridPlane` 1.5, wireframe 1.5. A 2px first attempt
  at `dimensionLine` was too close to sub-pixel to measure — same lesson
  as the arrow's 1.5px.
- **Every slice has a real-render proof** (`tests/e2e/smoke.spec.ts`,
  `X-49: …`), via the shared `countMatchingPixels` helper (colour
  tolerance, optional clip rect, optional invert), each shown to fail
  against the pre-fix glyph and pass after. `surface`'s wireframe is drawn
  by no real module, so its proof runs in the dev demo scene, which now
  sets `wireframe: true` on its surface and honours a dev-only
  `#/_dev/demo-scene?pj=1` (documented in `demoScene.ts`; the route is
  unlisted and is not part of the shell/URL contract). `perf.spec.ts`
  (heap growth/frame rate on that scene) still passes.
- `check:budget` still passes: all slices share the same already-bundled
  `three/examples/jsm/lines` modules.
