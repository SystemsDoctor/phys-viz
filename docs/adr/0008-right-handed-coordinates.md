# 8. Right-handed coordinates everywhere

Date: 2026-08-25

## Status

Accepted

Resolves the handedness half of the seventh item in ARCHITECTURE.md §23
(the one `docs/PHYSICS_CONVENTIONS.md` carried as a `TODO`).

## Context

`PHYSICS_CONVENTIONS.md` exists because a student who learns a visual
language once in module 2 must be able to rely on it in module 27
(§3, principle 7). Handedness is the same kind of commitment as colour:
if the cross product points one way in one module and the other way in
another, the project has taught a student something false, and no test
would have caught it.

The kernel makes the choice load-bearing in several places at once:
`kernel/frames` converts Cartesian ↔ cylindrical ↔ spherical and returns
Jacobians (§7), `kernel/math` supplies `cross`, and the `arrow` glyph's
`doubleHead` already marks pseudovectors as quantities "whose sign
depends on a handedness choice" (§8) — which is only honest if the
choice is written down.

## Decision

**Every coordinate system in this project is right-handed**, in every
module, plot, and glyph. Specifically:

- **Cartesian:** `x̂ × ŷ = ẑ`.
- **Polar and cylindrical** `(r, θ, z)`: `θ` measured from `+x` toward
  `+y`; `r̂ × θ̂ = ẑ`.
- **Spherical** `(r, θ, φ)`: the **physics** convention — `θ` is the
  polar angle from `+z`, `φ` is the azimuth in the xy-plane from `+x`;
  `r̂ × θ̂ = φ̂`.
- **Positive angles** are counter-clockwise viewed from the positive side
  of the rotation axis. In a 2D scene in the xy-plane, that is
  counter-clockwise on screen.
- **Pseudovectors follow the right-hand rule** and are drawn with
  `doubleHead`: `ω`, `α`, `τ = r × F`, `L = r × p`, `μ`.

This is the ordinary convention in every undergraduate mechanics text.
It is recorded not because it is surprising but because it must be
uniform, and because a left-handed slip is invisible in a screenshot.

## Consequences

- `kernel/frames`' conversions and Jacobians are fixed by this, including
  the sign of every off-diagonal term. The golden-value test "curl of a
  rigid rotation field = 2ω" (§18) is a handedness test as much as a
  magnitude test, and will catch an inverted convention.
- A module may not flip a sign locally to make a picture look nicer. If a
  quantity comes out pointing "the wrong way," it is pointing the right
  way and the expectation was wrong — which is frequently the lesson.
- The `arc` glyph's sweep direction and the `axes`/`graticule` tick
  ordering follow from this and should be implemented once, in Layer 1,
  rather than argued about per module.
- **Still open, and deliberately not decided here: which axis is "up" in
  3D scenes.** Right-handedness does not settle it — three.js defaults to
  y-up, while engineering drafting and many 3D mechanics treatments use
  z-up, and both are right-handed. The choice affects every module's
  default camera, gravity's direction, and which plane a `dimensions: 2`
  module occupies, so it needs its own ADR before M2 fixes it in the
  camera presets. Note that y-up puts a 2D module's xy-plane directly on
  screen with `x` right and `y` up, which is the conventional orientation
  for a 2D plot, and composes cleanly with the locked-ortho decision in
  ADR 0007.
- Module-specific sign conventions that are *not* implied by handedness —
  the sign of a bending moment, the direction of positive heel angle —
  are still per-module choices, and each non-obvious one gets its own ADR
  as it arises. This ADR closes handedness, not every sign question.
