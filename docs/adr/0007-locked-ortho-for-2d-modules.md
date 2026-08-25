# 7. 2D modules use a locked orthographic 3D camera with a release-rotation toggle

Date: 2026-08-25

## Status

Accepted

Resolves the sixth open decision in ARCHITECTURE.md §23.

## Context

A module declares `dimensions: 2 | 3 | 'both'` (§10). A genuinely 2D
renderer for the 2D cases would mean a second rendering path, a second
set of glyph implementations, and a second place every future glyph has
to be added — against the whole premise of §6, where one glyph set
serves every module forever.

The alternative is to keep the single three.js path and simply constrain
the camera: orthographic projection, locked to the plane. Orthographic
is already the required default for any module about components,
projections, or angles (§8), so a 2D module is close to that case
already.

## Decision

`dimensions: 2` modules render with the **existing** orthographic 3D
camera, **locked** to the plane — no orbit. There is no second renderer.

Every such module also exposes a **"release rotation"** toggle. Releasing
rotation lets the student tip the scene and see that the 2D diagram is a
slice of a 3D situation. This is not a fallback affordance for power
users; it is pedagogy, and it is why the locked-ortho approach is better
here rather than merely cheaper.

## Consequences

- One renderer, one glyph set, one camera implementation. A new glyph is
  written once and works in 2D and 3D modules alike.
- The release-rotation toggle is a **shell** feature driven by the
  manifest's `dimensions` field, not something a module implements. A 2D
  module author writes nothing to get it, consistent with §9.
- Re-locking must return to the exact original view, not merely a nearby
  one, or the affordance becomes a way to knock a lecture demo askew —
  the recoverability need in §1. Snap back through the same ~400 ms eased
  transition as the camera presets (§8), respecting
  `prefers-reduced-motion`.
- Rotation state belongs in the serialized camera (§14), so a bookmarked
  link restores whether rotation was released. A locked 2D module's
  default camera encoding stays short.
- Pan and zoom remain available while locked. Only orbit is suppressed.
- A module that would be actively misleading when tipped — where the
  third dimension is not merely unused but meaningless — is the case
  that would justify suppressing the toggle. Handle that with a manifest
  opt-out if it ever actually arises; do not add the field speculatively.
