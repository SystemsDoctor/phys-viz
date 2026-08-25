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

TODO: record the project's conventions as they are decided — right-hand
rule for cross products and angular velocity (standard), positive angle
direction, sign of torque, and any module-specific exceptions. Record
each non-obvious choice as an ADR in `docs/adr/`.

## Notation in KaTeX labels

- Vectors: `\vec{a}`, not bold (`\mathbf{a}`) — keep every module
  consistent.
- Magnitude: `|\vec{a}|`.
- Unit vectors: `\hat{a}`.

## Units

All physical `ParamDef`s and `ScalarDef`s that carry units use
`kernel/units`' `Dimension` type so mismatches throw instead of silently
producing a wrong number on a projector (ARCHITECTURE.md §7).
