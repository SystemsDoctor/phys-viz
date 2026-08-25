# Physics conventions

Sign conventions, colour semantics, and notation that hold across every
module. These are load-bearing (ARCHITECTURE.md §3, principle 7: "Colour
is data") — a student who learns this language once in module 2 must be
able to rely on it in module 27.

## Colour semantics

Defined once in `src/design/tokens.css` and exposed to modules via
`ctx.palette.*` (never a raw hex). Okabe-Ito derived, colourblind-safe
(~8% of male students have some colour vision deficiency).

| Quantity | Token | Colour | Used for |
|---|---|---|---|
| Position | `--q-position` | blue (`#0072b2`) | position, displacement |
| Velocity | `--q-velocity` | green (`#009e73`) | velocity, momentum |
| Acceleration | `--q-accel` | vermilion (`#d55e00`) | acceleration |
| Force | `--q-force` | magenta (`#cc79a7`) | force, torque |
| Angular | `--q-angular` | violet (`#7a4fbf`) | omega, L, and other pseudovectors |
| Field | `--q-field` | sky (`#56b4e9`) | field vectors |
| Energy | `--q-energy` | amber (`#e69f00`) | energy, work |
| Construction | `--q-construction` | grey (`#7b8494`) | axes, projections, guides |

Red never means "velocity" in one module and "force" in another.

## Pseudovectors

Angular quantities (omega, torque, angular momentum) are drawn with the
`arrow` glyph's `doubleHead` option — a double cone head is the
project-wide convention for "this is a pseudovector, its sign depends on
a handedness choice," and is taught explicitly to students (§8).

## Handedness and sign conventions

**Every coordinate system in this project is right-handed** — every
module, every plot, every glyph (ADR 0008). This is the ordinary
undergraduate convention; it is written down because it must be uniform,
and because a left-handed slip is invisible in a screenshot.

| System | Convention |
|---|---|
| Cartesian | `x̂ × ŷ = ẑ` |
| Polar / cylindrical `(r, θ, z)` | `θ` measured from `+x` toward `+y`; `r̂ × θ̂ = ẑ` |
| Spherical `(r, θ, φ)` | Physics convention: `θ` is the polar angle from `+z`, `φ` the azimuth from `+x` in the xy-plane; `r̂ × θ̂ = φ̂` |

**Positive angles** are counter-clockwise viewed from the positive side
of the rotation axis — counter-clockwise on screen for a 2D scene in the
xy-plane.

**Pseudovectors follow the right-hand rule** and are drawn with
`doubleHead` (see above): `ω`, `α`, `τ = r × F`, `L = r × p`, `μ`.

A module may **not** flip a sign locally to make a picture look nicer. If
a quantity comes out pointing "the wrong way", it is pointing the right
way and the expectation was wrong — which is often precisely the lesson.

## Which axis is up

**`y` is up by default** (ADR 0009). The up axis is user-switchable to
`z` from the global settings menu; both conventions are right-handed, so
nothing above changes when it is switched.

A module with a notion of *vertical* — gravity, a ground plane, a hanging
pendulum — reads **`ctx.up`** rather than hardcoding `[0, 1, 0]`. A module
with no notion of vertical (vector algebra, fields and gradients) ignores
it entirely. Reading `ctx.up` is data, not UI code; it is one line in the
modules that care.

Hardcoding `+y` is not an error — such a module simply always draws
vertical along `+y` and ignores the setting — but prefer `ctx.up` unless
the module is genuinely orientation-free.

## Still open

**Module-specific sign conventions** not implied by handedness — the sign
of a bending moment, the direction of positive heel angle. Each
non-obvious one gets its own ADR in `docs/adr/` as it arises, and is
recorded here once decided.

## Notation in KaTeX labels

- Vectors: `\vec{a}`, not bold (`\mathbf{a}`) — keep every module
  consistent.
- Magnitude: `|\vec{a}|`.
- Unit vectors: `\hat{a}`.

## Units

All physical `ParamDef`s and `ScalarDef`s that carry units use
`kernel/units`' `Dimension` type so mismatches throw instead of silently
producing a wrong number on a projector (ARCHITECTURE.md §7).
