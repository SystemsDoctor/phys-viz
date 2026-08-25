# 9. y-up by default, with a user-switchable up axis

Date: 2026-08-25

## Status

Accepted

Resolves the question ADR 0008 deliberately left open: right-handedness
does not determine which axis is "up".

## Context

three.js defaults to y-up. Engineering drafting and much of 3D mechanics
use z-up. Both are right-handed, so ADR 0008 could not settle it, and it
has to be settled before M2 bakes orientation into the camera presets
and the "iso" view.

Picking one and forcing it on everyone is the wrong trade for this
audience. A dynamics instructor reads `+y` as up without thinking; a
statics or naval-architecture instructor reads `+z` as up without
thinking. The scene is the same scene either way — the disagreement is
about which axis a reader expects to see vertical.

## Decision

**y-up is the default**, matching three.js and putting a
`dimensions: 2` module's xy-plane directly on screen with `x` right and
`y` up — the conventional 2D plot orientation, which composes cleanly
with the locked-ortho decision in ADR 0007.

**The up axis is user-switchable** between y-up and z-up, via a toggle in
a **global application settings menu**. The menu is app-level, not
attached to the viewport or the plot panel, and becomes the home for the
other display preferences that would otherwise scatter (theme, projector
mode).

The up axis is a **scene-level convention**, exposed to modules as
`ctx.up` (a unit vector on `SceneContext`). Concretely:

- The camera's up vector follows the setting, as do the preset views and
  the "iso" orientation.
- A module with a notion of _vertical_ — gravity, a ground plane, a
  hanging pendulum — reads `ctx.up` instead of hardcoding `[0, 1, 0]`.
- A module with no notion of vertical — vector algebra, fields and
  gradients — ignores it entirely and is unaffected.
- Right-handedness (ADR 0008) holds in both modes. z-up is right-handed
  too; the handedness rules and the `(r, θ, z)` / `(r, θ, φ)` conventions
  are unchanged.

## Consequences

- `ctx.up` is an addition to `SceneContext`, **not** to
  `src/modules/types.ts`. It needs no `MODULE_CONTRACT_VERSION` bump, and
  it lands naturally in the M2 work that expands `SceneContext` to the
  full glyph set.
- Reading `ctx.up` is _data_, not UI code, so this does not weaken the
  §9 promise that a module author writes no UI. It is one line in the
  modules that care and absent in the ones that don't.
- The rejected alternative was to relabel axes — draw the same picture
  and call the vertical axis `z` in z-up mode. That breaks quietly: a
  module's own KaTeX labels and scalar names are authored strings, so a
  module reporting `v_y` would sit next to a triad labelled `z`. Silent
  inconsistency between the scene and the module's own words is worse
  than either convention.
- A module that hardcodes an up axis is not _broken_ under this decision —
  it simply ignores the setting and always draws vertical along `+y`.
  That is an acceptable failure mode for early modules, and worth calling
  out in `MODULE_AUTHORING.md` rather than enforcing mechanically.
- The contract suite gains cheap leverage here: every module should stay
  idempotent, NaN-free, and disposable under **both** settings. Running
  the existing conformance assertions twice, once per up axis, catches a
  module that half-uses `ctx.up`.
- Persistence: the setting is a viewer preference, so it persists locally
  across sessions. It is also serialized into the URL **when it differs
  from the default**, per §14's omit-defaults rule — so a short link
  stays short, but a demo prepared in z-up and handed to a class
  reproduces what the instructor actually saw.
- `prefers-reduced-motion` applies when switching: the reorientation uses
  the same ~400 ms eased camera transition as the presets (§8, §15), not
  an instant cut, so a student does not lose their bearings mid-lecture.
