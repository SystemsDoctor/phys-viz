# 14. `ScalarDef.description`: a required tooltip for every readout variable

Date: 2026-09-09

## Status

Accepted

## Context

User-reported confusion in the driven-damped-oscillations module: the
sidebar's readout table lists several scalars (`omega0`, `zeta`,
`amplitude`, `phaseLag`, `x`, `v`) by a short label/symbol only, with no
way for a student to check what a symbol like `\zeta` or `A(\Omega)`
actually refers to without leaving the app for `explain.md` or a
textbook.

§16 already anticipates this ("Presenter mode: ... suppresses tooltips
and hover states that a projected audience cannot see") but no tooltip
mechanism had ever actually been built — `ReadoutTable`
(`src/shell/readouts/index.tsx`) renders only `def.symbol`/`def.label`,
nothing else. A near-identical, already-dead precedent exists on the
params side: `ParamDef.help` (`types.ts`) is set by five modules but
never read anywhere in `src/shell` — logged separately as a follow-up
(TASKS.md) rather than fixed here, since it's a params-panel concern,
not a readout-table one, and this ADR is scoped to the latter.

## Decision

Add `ScalarDef.description?: string` (`types.ts`) — one plain-English
sentence a module author writes per declared scalar. `MODULE_CONTRACT_VERSION`
bumps 3 → 4 per that constant's own bump policy (additive/optional in
the type, so no existing module fails to compile).

Unlike the previous three additive fields (`stepDt`, `forLayer`,
`exclusiveGroup`), this one is NOT left as a quiet convenience a module
may or may not use: `tests/contract/modules.contract.test.ts` gets a new
assertion that every registered module's `readout !== false` scalars
all carry a non-empty `description`, so a new module (or an existing one
losing a description in a future edit) fails CI rather than shipping a
silently-worse tooltip experience. This is the same "mechanically
enforced, not just documented" posture the project already takes for
the layer-boundary lint rule and the rest of the contract suite
(ARCHITECTURE.md §3 principle 1). `docs/MODULE_AUTHORING.md` §4 and its
checklist are updated to state the requirement; `_template/params.ts`'s
scaffold scalar carries a placeholder `description` so `npm run
new:module` produces a passing contract suite out of the box.

UI: a new `Tooltip` component (`src/shell/Tooltip.tsx`) wraps a
readout's label in a focusable, unstyled `<button>` with
`aria-describedby` pointing at a sibling `role="tooltip"` bubble, shown
via plain CSS `:hover`/`:focus-visible` (no JS positioning library, no
new dependency — consistent with §4's "no CSS-in-JS" and the project's
general aversion to UI libraries). `ReadoutTable` renders the `Tooltip`
wrapper only when `def.description` is present, so a scalar lacking one
(there shouldn't be any once the contract check is green, but the
component stays defensive) degrades to today's plain label instead of
an empty/broken tooltip. `.pv-presenter .pv-tooltip__bubble { display:
none; }` in `shell.css` fulfills §16's existing "presenter mode
suppresses tooltips" line for the first time.

Every existing module's `ScalarDef[]` (`params.ts`) is backfilled with a
`description` in this same change, so the new contract assertion is
green from the moment it lands rather than red until a follow-up.

## Consequences

- **Additive only**, same reasoning as ADR 0010/0011: every existing
  module compiles and renders identically for a viewer whose module
  happened to ship without a description (none do, post-backfill, but
  the type doesn't forbid it) — no `description` means no tooltip
  wrapper, not a broken one.
- The contract suite's new assertion is the actual enforcement
  mechanism; the checklist entry in `MODULE_AUTHORING.md` documents it
  for a human skimming before running the suite, but CI is what
  actually blocks a regression.
- Tooltip text is plain text, not KaTeX/markdown — one sentence
  explaining a symbol in words, not a second rendering of the symbol
  itself. A module author writing `\zeta` as the symbol still writes
  "The damping ratio — how strongly velocity-proportional drag resists
  the motion; 1 is critical damping" as the description, not more LaTeX.
- `ParamDef.help` stays unwired — a related but distinct dead field,
  intentionally left to a follow-up rather than folded into this change
  (see TASKS.md).
