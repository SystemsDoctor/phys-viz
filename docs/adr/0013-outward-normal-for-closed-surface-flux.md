# 13. Outward-normal convention for closed-surface flux parametrizations

Date: 2026-08-28

## Status

Accepted

Instance of the pattern ADR 0008 anticipated: "module-specific sign
conventions that are not implied by handedness ... are still
per-module choices, and each non-obvious one gets its own ADR as it
arises."

## Context

`fields-gradients` demonstrates the divergence theorem by computing
flux through a closed cube surface two ways — a surface integral over
six parametrized faces, and a volume integral of the divergence — and
checking they agree. The surface integral's sign depends entirely on
which way each face's normal points: `∮ F·dA` over an _inward_ normal
gives the negative of the correct flux, and the divergence theorem
would appear to fail.

Right-handedness (ADR 0008) fixes `x̂ × ŷ = ẑ` for the coordinate axes.
It says nothing about which order a surface parametrization `(u, v)`
should be written in — that choice is what fixes whether `∂S/∂u ×
∂S/∂v` points into or out of the volume. This is exactly the kind of
sign convention ADR 0008 flagged as "not implied by handedness" and
left for its own decision.

## Decision

**Every closed-surface parametrization used for a flux or
divergence-theorem demonstration must be ordered so that `∂S/∂u ×
∂S/∂v` points outward** from the enclosed volume, for every face.

`fields-gradients/index.ts`'s `cubeFaces()` is the reference
implementation — six faces, each `(u, v) => [...]` ordered by hand so
the cross product faces away from the cube's center:

```ts
function cubeFaces(center: V3, h: number): ((u: number, v: number) => V3)[] {
  const [cx, cy, cz] = center;
  return [
    (u, v) => [cx + h, cy + h * (2 * u - 1), cz + h * (2 * v - 1)], // +x
    (u, v) => [cx - h, cy + h * (2 * v - 1), cz + h * (2 * u - 1)], // -x
    (u, v) => [cx + h * (2 * v - 1), cy + h, cz + h * (2 * u - 1)], // +y
    (u, v) => [cx + h * (2 * u - 1), cy - h, cz + h * (2 * v - 1)], // -y
    (u, v) => [cx + h * (2 * u - 1), cy + h * (2 * v - 1), cz + h], // +z
    (u, v) => [cx + h * (2 * v - 1), cy + h * (2 * u - 1), cz - h], // -z
  ];
}
```

Note the `(u, v)` swap between opposing faces (e.g. `+x` reads
`(cy-term, cz-term)` in `(u, v)` order, `-x` reads `(cz-term,
cy-term)`) — that swap is what keeps the cross product outward on both
sides of the cube rather than flipping sign on one of them.

## Consequences

- A module adding its own closed-surface flux demonstration (a sphere,
  a cylinder cap, an arbitrary user-shaped enclosure) must apply the
  same rule: verify analytically that `∂S/∂u × ∂S/∂v` is outward for
  every patch, the way `cubeFaces()`'s inline comment records having
  done.
- The check is enforced by a golden test, not by the type system —
  `fields-gradients/module.test.ts` compares the surface-integral flux
  against the volume integral of the divergence and fails if they
  disagree by more than numerical tolerance. Any new closed-surface
  module should ship the equivalent golden test; there is no cheaper
  mechanical guard available for a per-parametrization geometric
  property like this.
- This convention only applies to **closed** surfaces used for a
  flux/divergence demonstration. An open surface (a cap, a patch with a
  boundary) has no "outward" — the normal direction there is just
  whichever the parametrization gives, and the module states it
  explicitly rather than inheriting this rule.
- Recorded in `docs/PHYSICS_CONVENTIONS.md`, which is the doc a module
  author actually reads; this ADR is the paper trail for _why_.
