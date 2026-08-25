# Tasks

Working task list derived from the milestone plan in `docs/ARCHITECTURE.md`
§20, plus the open ADR decisions (§23) and anticipated extensions (§22).
This file is the **execution tracker**; `ARCHITECTURE.md` remains the
binding source of truth for scope and acceptance criteria — if this file
and `ARCHITECTURE.md` disagree, `ARCHITECTURE.md` wins and this file is
wrong and should be fixed.

## Status convention

| Status | Meaning |
|---|---|
| `READY` | Unblocked. Prerequisites are met and this can be started now. |
| `DONE` | The stated acceptance criterion is met and verified (not just "code written" — run the check). |
| `BLOCKED` | Cannot start yet. Reason stated inline (usually: an earlier milestone's acceptance criterion isn't met — milestones in §20 are ordered and gated on purpose). |
| `IDEA` | Not scheduled work. Captured so it isn't lost, but out of scope until explicitly pulled onto the active milestone. |

Rules for working this file:
- Do not start a `BLOCKED` task to "get ahead." The milestone order in
  §20 is deliberate (`AGENTS.md`: "do not start M2 work before M1's
  acceptance criterion is met, etc."). If a `BLOCKED` task turns out to
  be unblocked, flip its status and say why in the same change.
- A task moves to `DONE` only when its acceptance criterion has actually
  been exercised (tests run, lint run, page loaded) — not when the code
  merely exists. Mark `DONE` when the check has been run.
- New tasks discovered mid-work go in under the milestone they belong
  to, as `READY` or `BLOCKED` as appropriate — don't let them evaporate
  into chat history.
- `IDEA` entries are promoted to `READY` explicitly when someone decides
  to schedule them, never worked ad hoc.

---

## M0 — Scaffold and deploy

**Accept when:** a rotatable cube is live at
`https://<user>.github.io/phys-viz/`, CI is green, and a deliberate
cross-layer import (importing `three` from a file in `src/modules/`)
fails lint.

- [DONE] Vite + TS(`strict`) + React + three dependencies declared, path aliases configured (`vite.config.ts`)
- [DONE] ESLint layer-boundary rules configured for all four layers, `no-restricted-imports` overrides present for `kernel/`, `scene/`, `shell/`, `modules/` (`.eslintrc.cjs`)
- [DONE] Vitest configured, `test:unit` / `test:contract` script split (`package.json`)
- [DONE] Playwright config present (`playwright.config.ts`)
- [DONE] GitHub Actions workflows scaffolded (`.github/workflows/ci.yml`, `deploy.yml`)
- [READY] Install dependencies and run `npm run typecheck && npm run lint && npm run test:unit` end to end at least once in this environment — not yet executed here
- [READY] Implement a minimal `App.tsx` / `main.tsx` that renders a rotatable cube (currently `App.tsx` throws `not implemented`, see M3 note inline) — enough to satisfy M0's acceptance bar, not the full shell
- [READY] Confirm a deliberate cross-layer import (e.g. `import * as THREE from 'three'` inside `src/modules/_template/`) fails `npm run lint`, then revert the deliberate violation
- [READY] Push to GitHub, confirm `deploy.yml` publishes to Pages at the live URL, confirm `ci.yml` is green on the PR

## M1 — Kernel

**Accept when:** ≥90% coverage and all golden-value physics tests pass.
No file under `src/kernel/` imports anything outside it.

- [BLOCKED: M0 not accepted] `kernel/math` — Vec2/Vec3/Mat3/Mat4/Quat + scratch pool (`src/kernel/math/index.ts` stubs all throw `not implemented`)
- [BLOCKED: M0 not accepted] `kernel/frames` — coordinate conversions, `Frame` type, `transformVelocity`/`transformAcceleration` with separately retrievable Coriolis/centrifugal terms
- [BLOCKED: M0 not accepted] `kernel/calculus` — `grad`/`div`/`curl`, `lineIntegral`/`surfaceFlux`/`volumeIntegral` with per-sample contributions
- [BLOCKED: M0 not accepted] `kernel/geometry` — polygon area/centroid, Sutherland–Hodgman half-plane clip (build early per §7, unblocks ship-stability-class modules later), convex hull, point-in-polygon, ray intersections
- [BLOCKED: M0 not accepted] `kernel/ode` — `rk4`, `velocityVerlet`, `rkf45`, event detection
- [BLOCKED: M0 not accepted] `kernel/units` — `Quantity`/`Dimension` arithmetic with mismatch checks, SI formatting
- [BLOCKED: M0 not accepted] `kernel/expr` — whitelisted recursive-descent parser, no `eval`/`new Function`, typed errors with offsets
- [BLOCKED: M0 not accepted] Golden-value physics tests (orbit period, cuboid inertia tensor, flux of radial field = 4π, curl of rigid rotation = 2ω) and ≥90% coverage gate

## M2 — Scene substrate

**Accept when:** a throwaway demo scene exercises every glyph at 60 fps
with zero per-frame allocation (verified in the Chrome performance
profiler), and `MockSceneContext` mirrors the real `SceneContext` API
exactly (enforced by a type-level test).

- [BLOCKED: M1 not accepted] `Viewport` — renderer, canvas, resize, single `requestAnimationFrame` loop, `renderOnDemand`
- [BLOCKED: M1 not accepted] `camera/` — orbit/pan/zoom wrapper, ortho↔persp toggle, animated presets, camera state serializable
- [BLOCKED: M1 not accepted] `glyphs/` — arrow, curvedArrow, path, point, patch, surface, arc, body, field (instanced), frame, axes, graticule
- [BLOCKED: M1 not accepted] `annotate/` — KaTeX billboards, dimension lines, drop-lines, leader lines
- [BLOCKED: M1 not accepted] `theme/` — semantic palette → three materials, projector variant
- [BLOCKED: M1 not accepted] Picking — ray-cast against draggable-tagged params
- [BLOCKED: M1 not accepted] `MockSceneContext` real implementation (`src/modules/testing/MockSceneContext.ts` currently throws) + type-level test asserting it mirrors `SceneContext` exactly
- [BLOCKED: M1 not accepted] Demo scene exercising every glyph, profiled for 60 fps / zero allocation

## M3 — Shell

**Accept when:** a hand-written stub module with one of every param kind
renders a complete, usable UI with zero UI code in the module, and its
state round-trips through the URL.

- [BLOCKED: M2 not accepted] Auto-generated controls for every `ParamDef` kind (`src/shell/params/`, `src/shell/controls/`)
- [BLOCKED: M2 not accepted] Layer manager UI from `LayerDef[]` (`src/shell/layers/`)
- [BLOCKED: M2 not accepted] Timeline: play/pause/step/scrub/speed/reverse, per §12 time-model rules (`src/shell/timeline/`)
- [BLOCKED: M2 not accepted] Plot panel: time series + sweep plot, both generic (`src/shell/plots/`)
- [BLOCKED: M2 not accepted] Readouts table via `kernel/units` formatting (`src/shell/readouts/`)
- [BLOCKED: M2 not accepted] Zustand store wired outside React; URL codec + `migrations.ts` (`src/shell/state/` — `store.ts`, `urlCodec.ts` currently stub)
- [BLOCKED: M2 not accepted] Camera URL sync **debounced** (~250 ms after last `change`, or on `end`) — see hardening note in ARCHITECTURE.md §14
- [BLOCKED: M2 not accepted] `ModuleErrorBoundary` (`src/shell/errors/`)
- [BLOCKED: M2 not accepted] Presenter mode, predict mode, keyboard map (`src/shell/presenter/`)
- [BLOCKED: M2 not accepted] Stub module exercising every `ParamDef` kind; verify zero UI code in the module and full URL round-trip

## M4 — First module: Vector Algebra

**Accept when:** the module passes the contract suite, and the
instructor can reach any of its demonstration states in under three
clicks from a bookmarked link.

- [BLOCKED: M3 not accepted] Build `vector-algebra` per the cookbook in ARCHITECTURE.md §21 (2D/3D toggle, draggable vectors, sum constructions, projection, cross product + parallelogram + RHR animation, scalar triple product, direction cosines)
- [BLOCKED: M3 not accepted] Contract suite assertions actually implemented (currently `it.todo` placeholders in `tests/contract/modules.contract.test.ts`, including the determinism check 5b added in this pass) and passing for this module
- [BLOCKED: M3 not accepted] Verify 3-click reachability from a bookmarked link for each demonstration state

## M5 — Two dissimilar modules

**Accept when:** shipping both required zero breaking changes to
`types.ts`. If the contract had to change, fix it now before there are
20 modules depending on it.

- [BLOCKED: M4 not accepted] `rotational-dynamics` — torque/moment arm, parallel-axis, L vs ω non-parallel, precession/nutation, rolling + cycloid, inertia ellipsoid, Dzhanibekov effect (`stepped` where necessary)
- [BLOCKED: M4 not accepted] `fields-gradients` (flux) — heightmap + level curves, gradient perpendicularity, directional-derivative slider, shrinking-box divergence, draggable curl paddlewheel, flux through user-shaped surface, Stokes/divergence-theorem converging numbers
- [BLOCKED: M4 not accepted] Confirm zero breaking changes were needed to `src/modules/types.ts` (if a change was needed, resolve it here, not later — see `MODULE_CONTRACT_VERSION` in `types.ts` and record an ADR)

## M6 — Authoring path (the extensibility gate)

**Accept when:** a person who has never seen the codebase ships a
working, contract-passing module in under four hours using only
`MODULE_AUTHORING.md`. Do not skip this gate.

- [BLOCKED: M5 not accepted] `_template/` module finished and copy-ready
- [BLOCKED: M5 not accepted] `docs/MODULE_AUTHORING.md` finished (this pass added scratch-pool and `step()`-budget guidance; revisit once M1–M5 substrate exists)
- [BLOCKED: M5 not accepted] `docs/PHYSICS_CONVENTIONS.md` finished
- [BLOCKED: M5 not accepted] `npm run new:module` generator working end to end (`scripts/new-module.mjs` exists; verify against finished `_template/`)
- [BLOCKED: M5 not accepted] Run the actual gate: an author with no prior exposure to the codebase builds a module in <4 hours using only the doc. If they can't, fix the substrate/doc and retest — do not lower the bar.

## M7+ — Library growth (ongoing)

Order per §20, roughly by pedagogical value per unit effort. Each is a
self-contained unit of work once M6 is accepted.

- [IDEA] Work & Energy (potential surface + total-energy plane)
- [IDEA] Momentum & Collisions (CM-frame toggle)
- [IDEA] Non-inertial Frames & Coriolis
- [IDEA] Oscillations
- [IDEA] Gravitation & Central Forces
- [IDEA] Kinematics
- [IDEA] Newton's Laws & FBDs
- [IDEA] Statics & Trusses
- [IDEA] Sandbox

## Open ADRs (§23) — resolve as `docs/adr/NNNN-*.md` when decided

- [IDEA] MDX vs plain markdown for `explain.mdx` panels
- [IDEA] Module versioning/deprecation policy — URL migration vs. pinned old build
- [IDEA] Module composition (leaves-only today; defer until ≥8 modules exist and demand is demonstrated)
- [IDEA] Offline support via service worker (proposed: right after M6)
- [IDEA] GIF/video export (proposed: post-M6)
- [IDEA] `dimensions: 2` rendering: locked-ortho-3D with a "release rotation" affordance (proposed) vs. a genuine 2D renderer

## Anticipated extensions (§22) — substrate should not foreclose these; do not build yet

- [IDEA] Ship stability (metacentre, GZ curve) — ~80% covered by planned M1/M3 work (half-plane clip + sweep plot); needs a clipping-plane addition to `glyphs/surface` and a hull-lofting glyph
- [IDEA] Mechanisms & linkages (four-bar, slider-crank) — needs a small planar Newton–Raphson constraint solve (~40 lines) in `kernel`
- [IDEA] Gears and cams — involute/cycloid profile generators in `kernel/geometry`; fully covered otherwise
- [IDEA] Beam bending / shear & moment diagrams — Sweep Plot + deformation-parameterized `surface`; fully covered
- [IDEA] Stress tensor / Mohr's circle — symmetric 3×3 eigendecomposition (kernel) + ellipsoid glyph; covered by M5 work
- [IDEA] Fluid statics, buoyancy, centre of pressure — same half-plane clip as ship stability; covered by M1
- [IDEA] Thermodynamic cycles — 2D PV/TS diagrams, Sweep Plot variant; fully covered
- [IDEA] Waves, Lissajous, interference — parametric surfaces with time; fully covered
