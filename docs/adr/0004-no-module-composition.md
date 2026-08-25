# 4. Modules stay leaves — no composition

Date: 2026-08-25

## Status

Accepted

Resolves the third open decision in ARCHITECTURE.md §23.

## Context

It is tempting to embed one module's display inside another — the
vector-algebra display inside the torque module, say — so that a
construction built once is reused. Composition is a real extensibility
multiplier.

It is also a large change to the contract in §10: nested modules mean
nested param namespaces, nested `urlKey` collisions, nested layer trees,
ambiguous ownership of `t` and of the timeline, and a `dispose()` order
that has to be correct across the tree. Every one of those lands in the
one interface the whole project depends on staying stable.

Nothing built or planned needs it yet. The library has three module
folders, none of them finished.

## Decision

**Modules are leaves.** No module may reference or embed another module,
and the layer boundary in §6 continues to forbid module-to-module
imports outright — including via a relative path.

This is deferred, not rejected. We revisit when **both** conditions in
§23 hold: at least eight modules exist, *and* the demand is demonstrated
by a concrete case where two modules would otherwise duplicate a
non-trivial construction.

## Consequences

- Shared visual constructions are shared by moving them **down**, not
  sideways: a repeated arrangement of glyphs becomes a new glyph in
  Layer 1, and repeated arithmetic becomes a function in the kernel.
  Every module then gets it for free, which is the §22 rule already.
- Some duplication across modules is accepted deliberately. Two modules
  each drawing their own axes-plus-vector setup is cheaper than a
  composition contract.
- The ESLint boundary for `src/modules/**` must actually block
  `@/modules/*` and relative escapes, which it does not today. That hole
  is tracked as **M0-9** and is what makes this decision enforceable
  rather than advisory.
- Revisiting is a contract change, so it is a `MODULE_CONTRACT_VERSION`
  bump and a new ADR superseding this one.
