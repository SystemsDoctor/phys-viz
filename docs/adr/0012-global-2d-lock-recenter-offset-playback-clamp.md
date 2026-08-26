# 12. Global 2D lock, camera state restore, pane-aware recenter, and playback clamping

Date: 2026-08-26

## Status

Accepted

Amends ADR 0011: its "Free rotation ... a no-op on any module that isn't
2D-locked" line is superseded by this ADR's global-lock decision below.

## Context

Testing ADR 0011's work surfaced four bugs:

1. **"Free rotation" did nothing outside `control-showcase`.** ADR 0011
   gated `Viewport.camera.setLockedToPlane`/projection changes on
   `module.manifest.dimensions === 2` — true to ADR 0007's original
   scope, but that meant `vector-algebra` (`dimensions: 'both'`),
   `rotational-dynamics`, and `fields-gradients` (`dimensions: 3`) never
   reacted to the setting at all, which reads as "the global setting
   does nothing" even though it worked for the one module that happened
   to declare `dimensions: 2`.
2. **Locking never had a correct angle to lock onto.** Auditing this,
   `ModuleView.tsx` never called `viewport.camera.setState(...)`
   anywhere — a fresh `Viewport` always starts at its own internal
   placeholder camera angle, never the module's declared `defaultView`
   (or a decoded URL's bookmarked orientation), despite §14's own
   documented promise ("a bookmarked demo restores the viewing angle").
   `setLockedToPlane` only freezes _wherever the camera currently is_ —
   locking without first positioning correctly would freeze on an
   arbitrary angle, not the module's own framing.
3. **Recenter didn't account for the overlay panel.** ADR 0011 made the
   control panel a floating overlay on the canvas's right side. The
   "Recenter view" button only reoriented the camera
   (`camera.goTo(defaultView.preset, ...)`), which centers content
   under a _symmetric_ frustum — i.e. in the full canvas — not in the
   region actually visible around the panel.
4. **Playback never stopped at the timeline's own end.** `Timeline`'s
   scrub slider renders `max={maxT}` (default 20s), but `ModuleView`'s
   play-loop advanced `t` with no upper (or lower, for reverse) bound at
   all — a bare `<input type="range" max>` only clamps where the thumb
   is _drawn_, not the underlying value, so playback ran forever past
   the visible end of the slider once started.

## Decision

### Global 2D lock (supersedes ADR 0011's dimensions-gated scope)

`ModuleView` now applies `camera.setLockedToPlane`/`camera.setProjection`
unconditionally, for every module, driven purely by `ui.rotationReleased`
— never gated on `manifest.dimensions`. Default (`rotationReleased:
false`): orbit locked, projection forced to `'ortho'`. Checking "Free
rotation": orbit unlocked, projection restored to the module's own
declared `defaultView.projection` (`'ortho'` if the module declared
none). `manifest.dimensions` keeps its other, narrower meaning (ADR
0007's plane-lock for genuinely 2D content, e.g. the aria-label / other
2D-specific affordances) — this ADR only changes what drives the camera
orbit-lock and projection, not `dimensions` itself.

### Camera state restore (closes a real pre-existing gap)

`ModuleView`'s Viewport-construction effect now calls
`viewport.camera.setState(useAppStore.getState().camera)` immediately
after constructing the `Viewport`, before applying the lock above — the
missing piece that made `state.camera` (computed by `defaultCameraFor`
or a decoded URL) actually reach the live camera. Without this, "lock to
a 2D view" would lock onto whatever angle the camera happened to start
at, not the module's own chosen framing.

### Pane-aware recenter

`CameraController` gains `setPaneOffset(width, height, occludedRightPx)`
— a `THREE.Camera.setViewOffset` "lens shift" (an asymmetric-frustum
technique, not a scene/target change) that shifts the rendered frame so
a point on the camera's forward axis lands `occludedRightPx` fewer
pixels from the canvas's own right edge than a symmetric frustum would
center it. `Viewport.centerInVisibleArea(occludedRightPx)` exposes this;
`ModuleView` computes `occludedRightPx` from the actual `getBoundingClientRect()`
of the canvas and the floating panel (0 when the panel is collapsed or
— detected by an actual vertical-overlap check, not a duplicated CSS
breakpoint constant — genuinely stacked below the canvas on the <640px
layout), and calls it: on mount, whenever the panel's collapsed state
toggles, and on every "Recenter view" click. Being a pure frustum shift,
it composes with any subsequent orbit/pan/zoom rather than fighting it;
it is not continuously re-applied on window resize (recenter is a
deliberate, on-demand framing action, not a live-tracking one — the
same treatment layout got in ADR 0011).

### Playback clamping

`Timeline`'s `DEFAULT_MAX_T = 20` is now exported and passed explicitly
into `<Timeline maxT={DEFAULT_MAX_T}>` from `ModuleView`, which is also
the single source of truth the play-loop clamps against: reaching
`DEFAULT_MAX_T` (forward) or `0` (reverse) stops playback
(`patchTime({t: bound, playing: false})`) instead of letting `t` grow
unbounded. `stepped` modules clamp only the upper bound (reverse is
already disabled for `stepped` in the UI, per §12).

## Consequences

- No `types.ts` contract change — every fix here is shell/scene-layer
  (`ModuleView.tsx`, `Viewport.ts`, `camera/index.ts`, `timeline/index.tsx`).
- A module's `defaultView.preset`/`projection` now means two things
  consistently: the initial camera angle (via the newly-wired
  `setState`) AND what "Free rotation" restores when checked.
- `dimensions: 2` no longer has any special camera-locking behavior of
  its own — every module locks the same way by default now. If a future
  module genuinely needs to START unlocked, that would need a new,
  explicit opt-out field; none of the four shipped modules need this
  today, so it isn't built.
- `capSurface`/`capBoundary` were extracted in `fields-gradients/index.ts`
  as a drive-by cleanup while reviewing the module for consistency with
  the others (matching the `cubeFaces` sharing pattern already used in
  the same file) — unrelated to the camera/timeline fixes above, but
  landed in the same change.
