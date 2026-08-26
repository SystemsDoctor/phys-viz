# 10. `stepDt`: a module-overridable fixed timestep for `stepped` modules

Date: 2026-08-26

## Status

Accepted

Resolves C-1 (TASKS.md), the `stepped` dt contract gap.

## Context

§12 says: "The shell drives `step` with a fixed `dt` (default 1/240 s,
module-overridable)." Nothing in `ModuleManifest` or `PhysicsModule`
(`src/modules/types.ts`) could express that override, and
`src/shell/timeline/driver.ts`'s `FIXED_DT = 1/240` was a hardcoded
module-level constant with no plumbing for a per-module value at all.

M5 (`rotational-dynamics`) is the first module to actually declare
`timeModel: 'stepped'`, so this is the first point at which the gap is
more than theoretical — and TASKS.md's own M5-8 says M5 is exactly
where a contract defect like this gets fixed, not later, once more
modules depend on the existing shape.

## Decision

Add an optional `stepDt?: number` to `ModuleManifest`. `driver.ts`'s
`FixedStepAccumulator` and `SteppedScrubber` each take an optional
constructor `dt` (defaulting to the existing `FIXED_DT`) instead of
reading the module-level constant internally. `ModuleView.tsx` resolves
`module.manifest.stepDt ?? FIXED_DT` once per mount and passes it into
both. `MODULE_CONTRACT_VERSION` bumps 1 → 2 to record the shape change,
per that constant's own stated bump policy.

`rotational-dynamics` itself does not set `stepDt` — the default
1/240 s is already fine for its one `stepped` sub-demonstration
(Dzhanibekov tumbling). The mechanism ships exercised by driver-level
tests with a non-default value, not by any shipped module needing one
yet.

## Consequences

- **Additive only.** `stepDt` is optional; every existing manifest
  (all of which omit it) compiles and behaves byte-identically —
  `?? FIXED_DT` resolves to exactly the prior hardcoded value. This is
  why bumping `MODULE_CONTRACT_VERSION` here is still consistent with
  §20's M5 acceptance criterion, "shipping both required zero breaking
  changes to `types.ts`": _breaking_ means an existing module stops
  compiling or changes behavior; an optional field a module can ignore
  does neither. The version bump is a paper-trail signal for future
  contract readers, not a claim that this change broke anything — worth
  stating explicitly since the two facts look contradictory at a
  glance.
- A module needing sub-frame-accurate steps can now ask for a smaller
  `stepDt`. `MAX_FASTFORWARD_STEPS` (20,000) is expressed in steps, not
  seconds, so a smaller `stepDt` shrinks the maximum reachable scrub
  time (`20,000 × stepDt`) — worth a callout in `MODULE_AUTHORING.md`
  once M6 writes it.
- `stepDt` is inert for `static`/`parametric` modules — no runtime
  validation needed, the same convention as `defaultView` being
  meaningful only for some modules.
- The new contract assertion ("stepped modules implement `step()` and
  `reset()`") closes a related, previously-silent gap: `step?`/`reset?`
  were optional on `ModuleInstance` for every `timeModel`, so a
  `stepped` module that forgot to implement them was unenforced until
  now.
