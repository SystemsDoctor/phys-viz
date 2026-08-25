# Agent guidance — PhysViz

This file orients any AI coding agent (or human) working in this repo.
It is a summary; the binding source of truth is **`docs/ARCHITECTURE.md`**
— when anything here conflicts with it, ARCHITECTURE.md wins. Read
ARCHITECTURE.md §1–§5 in full before making non-trivial changes; they
are short and everything else derives from them.

## What this is

A static, client-only site (GitHub Pages) providing a library of
interactive, rotatable, toggleable physics visualizations for
undergraduate mechanics and engineering courses. No backend, no
database, no accounts, no analytics. All state lives in the URL or in
memory.

## The one rule that overrides your instincts as a coding agent

**This is a visualizer, not a simulation engine** (ARCHITECTURE.md §2 —
"the Visualizer Doctrine"). Concretely:

- Prefer closed-form math over numerical integration. If a system's
  state at time `t` can be written down, write it down.
- Numerical integration (`kernel/ode`) is a constrained fallback for a
  short, explicit list of modules — not a default reach.
- No collision detection, no constraint solver, no general rigid-body
  physics engine. Closed-form outcomes only (e.g. elastic collision
  formulae).
- No meshes over a few thousand triangles, no imported CAD, no PBR.
  Geometry is schematic.
- No backend, no database, no accounts, no analytics.
- No general-purpose scripting for end users — the constrained
  expression parser in `kernel/expr` (no `eval`, no `new Function`) is
  the ceiling.

If a task seems to require any of the above, stop and re-read §2 before
proceeding — the fix is almost always "this belongs in a different,
simpler shape," not "add the missing capability."

## Layer boundaries (mechanically enforced — do not work around them)

```
src/kernel/**   pure computation. No DOM, no three, no React, no module imports.
src/scene/**    the ONLY place `three` is imported. May use kernel. No React, no shell, no modules.
src/shell/**    app chrome, React. May use kernel, scene, modules/types, modules/registry. Never a concrete module.
src/modules/**  one folder per visualization. May use kernel and modules/types ONLY.
                Must NOT import `three`, `react`, `shell`, or another module.
```

This is enforced by `.eslintrc.cjs` (`no-restricted-imports` per
directory). **The rule that matters most: modules cannot import
`three`.** If a module needs a visual primitive that doesn't exist yet,
add a glyph to `src/scene/glyphs/` — where every future module gets it
for free — rather than reaching around the boundary. Run `npm run lint`
before considering any change to `src/modules/**` or `src/scene/**`
done; a passing lint run is what actually proves the boundary held.

## The module contract

`src/modules/types.ts` is the single most important interface in the
project (ARCHITECTURE.md §10) — treat changes to it as breaking and
record them as an ADR in `docs/adr/`. A module author writes a
`manifest.ts` (data), a `params.ts` (data: `ParamDef[]`, `LayerDef[]`,
`ScalarDef[]`), and an `index.ts` with `create()`/`update()`/`scalars()`/
`dispose()` — no React, no CSS, no URL handling, no plotting code. To
add a new module: `npm run new:module -- <kebab-case-id>`, then follow
`docs/MODULE_AUTHORING.md` end to end. To add a *capability* that every
module can use, change `src/scene/glyphs/`, `src/shell/controls/`, or
`src/shell/plots/` instead of special-casing one module.

Key invariants a module's `update(state)` must hold, because the
contract test (`tests/contract/`) checks them and CI will fail
otherwise:
- **Idempotent**: same `state` in -> same scene out, regardless of call
  history. No `if (firstRender)` branches.
- Builds handles once in `create()`, only calls `.set()` in `update()` —
  never allocates geometry per frame or per call.
- `scalars(state)` is pure: no side effects on the scene, same input ->
  same output.

## Commands

```
npm run dev            # local dev server
npm run typecheck      # tsc -b --noEmit, strict
npm run lint           # eslint, including the layer-boundary rules
npm run test:unit      # kernel + shell unit tests (Vitest)
npm run test:contract  # runs EVERY registered module through the conformance suite
npm run test:e2e       # Playwright smoke tests
npm run build          # production build (must succeed with base: '/phys-viz/' in vite.config.ts)
npm run new:module -- <id>   # scaffold a new module from src/modules/_template
```

Before treating a change as finished, run `typecheck`, `lint`, and the
relevant test suite(s) — CI (`.github/workflows/ci.yml`) runs all of
them plus `build` on every PR and every one must pass to merge.

## Conventions worth knowing before you write code

- TypeScript `strict: true`, non-negotiable (ARCHITECTURE.md §4).
- Orientation is **always** a quaternion, never Euler angles.
- Colour is data: use `ctx.palette.<name>` from `src/design/tokens.css`,
  never a raw hex — see `docs/PHYSICS_CONVENTIONS.md` for what each
  semantic colour means. The mapping is binding across every module.
- No `Math.random()` in module code without a seeded PRNG from the
  kernel — a bookmarked demo must render identically every time
  (ARCHITECTURE.md §12, "Determinism requirement").
- Hash routing only (`#/m/<id>`) — GitHub Pages has no server rewrite,
  and `base` in `vite.config.ts` must match the deployed repo name
  exactly.

## Where things are

See `docs/ARCHITECTURE.md` §5 for the full annotated tree. Short version:
`src/kernel` (Layer 0, pure math/physics), `src/scene` (Layer 1,
three.js), `src/shell` (Layer 2, React chrome), `src/modules` (Layer 3,
one folder per visualization; `_template/` is the copy-me starting
point), `src/design/tokens.css` (colour + type source of truth),
`tests/contract` (the suite every module must pass), `docs/` (this
project's real documentation — read before asking).

## Task tracking — `TASKS.md`

`TASKS.md` at the repo root is the execution tracker for the milestone
plan in ARCHITECTURE.md §20 (plus §22/§23 backlog items). Before
starting non-trivial work, check it for the relevant task instead of
re-deriving scope from the milestone list. Every task carries one status:

- `READY` — unblocked, may be started.
- `DONE` — acceptance criterion actually verified (tests run, lint run,
  page loaded) — not merely "code exists."
- `BLOCKED` — cannot start yet; the blocking reason is stated inline.
  Milestones are ordered and gated on purpose (§20: "do not start M2
  work before M1's acceptance criterion is met"). Do not start a
  `BLOCKED` task to get ahead — if it turns out to actually be
  unblocked, flip its status and say why in the same change.
- `IDEA` — captured but not scheduled; promote to `READY` only when
  explicitly pulled onto the active milestone.

When you finish a task, verify its acceptance criterion and mark it
`DONE` in the same change — don't leave it stale for a later pass. When
you discover new work mid-task, add it to `TASKS.md` under the owning
milestone with the correct status rather than letting it live only in
chat history.

## Current state of the codebase

This scaffold matches the repository layout in ARCHITECTURE.md §5 but
implements almost nothing yet — most functions intentionally
`throw new Error('not implemented (see M<N> in ARCHITECTURE.md §20)')`.
Work through the milestones in §20 **in order**; do not start M2 work
before M1's acceptance criterion is met, etc. M0 (scaffold + a
rotatable cube deployed, with the lint boundary rule proven to fail on a
deliberate violation) is the immediate next milestone.
