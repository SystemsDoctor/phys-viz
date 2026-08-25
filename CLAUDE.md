# CLAUDE.md

Guidance for Claude Code (and other Claude-based agents) working in
this repository. **`AGENTS.md`** in this same directory has the full
brief — read it first; this file only adds Claude-specific notes on top
of it. `docs/ARCHITECTURE.md` is the binding source of truth for both.

## Read this before doing anything else

1. `AGENTS.md` — the condensed brief: the Visualizer Doctrine, the layer
   boundaries, the module contract, and the commands you'll need.
2. `docs/ARCHITECTURE.md` §1–§5 — the doctrine in full. If anything in
   `AGENTS.md`, this file, or your own instincts conflicts with
   ARCHITECTURE.md, ARCHITECTURE.md wins.
3. `docs/MODULE_AUTHORING.md` — if the task is "add a module."
4. `docs/PHYSICS_CONVENTIONS.md` — if the task touches colour, sign
   conventions, or notation.

## Working in this repo

- Prefer the smallest change that satisfies the current milestone in
  ARCHITECTURE.md §20 over a larger "while I'm in here" refactor. The
  milestones are ordered and gated for a reason (§20: "Do not proceed
  until [the acceptance criterion] is met").
- When a change touches `src/kernel/**`, `src/scene/**`, `src/shell/**`,
  or `src/modules/**`, run `npm run lint` before calling the work done —
  the layer boundaries in `.eslintrc.cjs` are the actual mechanism that
  keeps this codebase extensible (ARCHITECTURE.md §3, principle 1: "Layers
  are one-directional... Enforced by lint rule, not by good intentions").
  A change that passes review by eye but fails lint is not finished.
- When a change touches or adds a module under `src/modules/<id>/`, run
  `npm run test:contract` — it auto-discovers the module via the
  registry glob and runs the full conformance suite in
  ARCHITECTURE.md §18. Don't hand-write equivalent test code; that
  suite is designed to make module-specific tests unnecessary.
- If you're implementing a stub that currently
  `throw new Error('not implemented ...')`, check the referenced
  milestone in ARCHITECTURE.md §20 for that piece's acceptance
  criterion, and implement to that bar — not more, not less. This
  project explicitly rejects gold-plating in the direction of a
  simulation engine (§2); it's equally happy to reject an implementation
  that doesn't yet meet §20's stated bar.
- Prefer editing an existing stub file's signature-compatible body over
  inventing a new file or a parallel abstraction — the file layout in
  `docs/ARCHITECTURE.md` §5 is intentional and other tooling (the
  registry glob in §11, the ESLint overrides) depends on paths matching
  it exactly.
- Do not add a dependency that ARCHITECTURE.md §4 explicitly rejected
  (react-three-fiber, a physics engine, Tailwind, Next.js/SSR) without
  first raising it with the user — those were deliberate calls, not
  oversights, and reversing one is worth an ADR in `docs/adr/`.

## Verifying your own work

Before reporting a change as complete, run what's relevant to what you
touched: `npm run typecheck`, `npm run lint`, `npm run test:unit`,
`npm run test:contract`, `npm run build`. CI runs all of them on every
PR; there's no reason to let the user discover a failure that a decent
local sweep would have caught first.
