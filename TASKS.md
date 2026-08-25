# Tasks

Working task list derived from the milestone plan in `docs/ARCHITECTURE.md`
§20, plus the recorded decisions (§23) and anticipated extensions (§22).
This file is the **execution tracker**; `ARCHITECTURE.md` remains the
binding source of truth for scope and acceptance criteria — if this file
and `ARCHITECTURE.md` disagree, `ARCHITECTURE.md` wins and this file is
wrong and should be fixed.

Every task carries a stable id (`M3-12`, `X-4`, …) so it can be cited in
commits, PRs, and `BLOCKED` reasons. Ids are append-only: when a task is
dropped, mark it and say why rather than renumbering the ones after it.

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
  to, as `READY` or `BLOCKED` as appropriate, with the next free id —
  don't let them evaporate into chat history.
- `IDEA` entries are promoted to `READY` explicitly when someone decides
  to schedule them, never worked ad hoc.
- Each milestone's **gate task** (`M*-G`) *is* the §20 acceptance
  criterion. It is the only task in the section whose `DONE` unblocks
  the next milestone.

---

## M0 — Scaffold and deploy

**Accept when:** a rotatable cube is live at
`https://<user>.github.io/phys-viz/`, CI is green, and a deliberate
cross-layer import (importing `three` from a file in `src/modules/`)
fails lint.

### Already in place

- [DONE] **M0-1** Vite + TS(`strict`) + React + three dependencies declared, path aliases configured (`vite.config.ts`)
- [DONE] **M0-2** ESLint layer-boundary rules configured for all four layers, `no-restricted-imports` overrides present for `kernel/`, `scene/`, `shell/`, `modules/` (`.eslintrc.cjs`)
- [DONE] **M0-3** Vitest configured, `test:unit` / `test:contract` script split (`package.json`)
- [DONE] **M0-4** Playwright config present (`playwright.config.ts`)
- [DONE] **M0-5** GitHub Actions workflows scaffolded (`.github/workflows/ci.yml`, `deploy.yml`)

### Toolchain gaps found on the second pass

- [READY] **M0-6** Install dependencies and run `npm run typecheck && npm run lint && npm run test:unit && npm run test:contract && npm run build` end to end at least once in this environment — never yet executed here, so none of the config above is actually verified
- [READY] **M0-7** Add `@vitest/coverage-v8` and a `test:coverage` script with a ≥90% line threshold scoped to `src/kernel/**`. M1's acceptance criterion is a coverage number and there is currently no coverage tooling at all (§18, §20 M1)
- [READY] **M0-8** Add `format:check` to `ci.yml`. The script exists in `package.json` but CI never runs it, so Prettier drift lands silently. Note it fails repo-wide today: files are checked out CRLF on Windows while Prettier defaults to `endOfLine: "lf"`, and the committed markdown tables aren't Prettier-shaped — so this needs `endOfLine: "auto"` (or a `.gitattributes` decision) plus one formatting sweep before it can gate anything
- [READY] **M0-9** Harden the ESLint module boundary — four real holes in `.eslintrc.cjs` today: (a) the `three` group is an exact match, so `three/examples/jsm/...` slips through every layer's ban (add `three/*`); (b) the `src/modules/**` override does not restrict `@/modules/*`, so one module can import another, which §6 forbids; (c) it does not restrict `@/scene/*`, so a module can import scene *runtime values*, not just the `SceneContext` type the §21 cookbook needs — allow the type-only import and ban the rest (pair with `@typescript-eslint/consistent-type-imports`); (d) alias-based patterns don't catch relative escapes (`../other-module/index`, `../../scene/...`) — add relative patterns too
- [READY] **M0-10** Self-host fonts: download IBM Plex Sans + IBM Plex Mono woff2 into `public/fonts/` and add the `@font-face` rules to `src/design/tokens.css` (§15, §19; `public/fonts/README.md` carries this as a TODO(M0)). A lecture hall behind a captive portal is exactly where a CDN font fails
- [READY] **M0-11** Verify the built `dist/` actually contains `.nojekyll` and that no emitted asset path begins with `_` in a way Pages would drop (§19)

### The acceptance work itself

- [READY] **M0-12** Implement a minimal `App.tsx` / `main.tsx` that renders a rotatable cube (currently `App.tsx` throws `not implemented`) — enough to satisfy M0's bar, not the full shell. Keep the cube in a throwaway file that M2's demo scene (M2-19) can replace
- [READY] **M0-13** Confirm a deliberate cross-layer import (e.g. `import * as THREE from 'three'` inside `src/modules/_template/`) fails `npm run lint`, then revert the deliberate violation. Repeat for each hole closed in M0-9 so the fix is proven, not assumed
- [READY] **M0-14** Push to GitHub, confirm `deploy.yml` publishes to Pages at the live URL, confirm `ci.yml` is green on the PR
- [READY] **M0-G** **Gate:** rotatable cube live at the Pages URL, CI green, cross-layer import fails lint. Do not start M1 until this is true

## M1 — Kernel

**Accept when:** ≥90% coverage and all golden-value physics tests pass.
No file under `src/kernel/` imports anything outside it.

All `BLOCKED` on **M0-G**.

- [BLOCKED: M0-G] **M1-1** `kernel/math` — Vec2/Vec3/Mat3/Mat4/Quat as plain typed structures with free functions, providing **both** allocating and in-place (`addInto(out, a, b)`) variants (`src/kernel/math/index.ts` stubs all throw)
- [BLOCKED: M0-G] **M1-2** `kernel/math` scratch pool — a pre-allocated ring of temporaries (`tmp.v3()`), documented loudly, with a test proving a hot path through it allocates nothing. GC pauses are visible as stutter on a projector (§7)
- [BLOCKED: M0-G] **M1-3** `kernel/math` quaternion path complete enough that no caller ever needs Euler storage — the rigid-body and gyroscope modules gimbal-lock otherwise (§7). Include quat↔matrix, slerp, `fromAxisAngle`
- [BLOCKED: M0-G] **M1-4** `kernel/frames` — Cartesian ↔ cylindrical ↔ spherical conversions **with Jacobians**, right-handed per ADR 0008: cylindrical `(r, θ, z)` with `θ` from `+x` toward `+y`, spherical `(r, θ, φ)` in the physics convention. The handedness fixes the sign of every off-diagonal Jacobian term
- [BLOCKED: M0-G] **M1-5** `kernel/frames` — `Frame` type (origin + orientation + optional ω and ω̇), `transformPoint`, `transformVector`
- [BLOCKED: M0-G] **M1-6** `kernel/frames` — `transformVelocity` / `transformAcceleration` exposing ω × r, 2ω × v (Coriolis) and ω × (ω × r) (centrifugal) as **separately retrievable components**, not just a sum. The non-inertial-frames module draws each term as its own arrow (§7)
- [BLOCKED: M0-G] **M1-7** `kernel/calculus` — `grad`/`div`/`curl` by central differences with an adaptive `h`
- [BLOCKED: M0-G] **M1-8** `kernel/calculus` — `lineIntegral`/`surfaceFlux`/`volumeIntegral` on **Gauss–Legendre** quadrature, not naive Riemann sums
- [BLOCKED: M0-G] **M1-9** `kernel/calculus` — every integral returns the value **and** the per-sample contributions, so the visualizer can shade an accumulating ribbon rather than just report a number (§7; consumed by M5-4)
- [BLOCKED: M0-G] **M1-10** `kernel/geometry` — signed polygon area and centroid (shoelace)
- [BLOCKED: M0-G] **M1-11** `kernel/geometry` — Sutherland–Hodgman clip of a polygon by a half-plane. Build early per §7 even though no M4/M5 module needs it: it is the foundation of every submerged-area / cross-section / cutaway module later (ship stability, buoyancy, beam sections). Cheap now, unblocking later
- [BLOCKED: M0-G] **M1-12** `kernel/geometry` — 2D convex hull, point-in-polygon, ray–plane and ray–sphere intersection (the last two feed M2 picking)
- [BLOCKED: M0-G] **M1-13** `kernel/ode` — `rk4`, `velocityVerlet` (symplectic; the default for anything conservative), `rkf45` (adaptive). All pure `(state, dt) => state` and allocating nothing — assert the zero-allocation property in a test
- [BLOCKED: M0-G] **M1-14** `kernel/ode` — event detection: root-find a scalar event function between steps (bisection is fine) for turning points, zero-crossings, and "hits the ground"
- [BLOCKED: M0-G] **M1-15** `kernel/ode` — a general scalar root-finder (Newton–Raphson with a bisection fallback). §12 assumes one exists ("a Kepler orbit via Newton–Raphson on Kepler's equation") and E-2's linkage solver reuses it. Not named in the §5 file list; put it in `ode/` and note the addition
- [BLOCKED: M0-G] **M1-16** `kernel/units` — `Quantity { value, dim }` over the `[M, L, T, Θ, I, N, J]` exponent tuple, with arithmetic that checks dimensions and throws on mismatch
- [BLOCKED: M0-G] **M1-17** `kernel/units` — formatting with SI prefixes and significant-figure control (this makes readouts and axis labels correct for free, §7). Output must be fixed-width so live readouts don't jitter as digits change, pairing with Plex Mono's tabular figures (§15)
- [BLOCKED: M0-G] **M1-18** `kernel/expr` — recursive-descent parser over the whitelisted grammar (numbers, named vars, `+ - * / ^`, parens, and exactly the function set in §7), compiling to a closure. **No `eval`, no `new Function`** — this is user-facing input on a public site
- [BLOCKED: M0-G] **M1-19** `kernel/expr` — typed errors with character offsets so `ExpressionField` can underline the problem (§7, §9)
- [BLOCKED: M0-G] **M1-20** `kernel` seeded PRNG. §12's determinism requirement permits module randomness only via "a seeded PRNG from the kernel, seeded from a serialized param", but §5 gives it no home. Add it (`kernel/random`, re-exported from `kernel/index.ts`) and record the §5 addition. Contract assertion 9's quasi-random parameter sampling also needs it
- [BLOCKED: M0-G] **M1-21** `kernel` inertia tensors for the schematic body set (box, sphere, cylinder, disc, rod) plus the parallel-axis theorem. §18's golden-value list names "the inertia tensor of a uniform cuboid", so this must exist in the kernel at M1 — and M5-1 needs it regardless
- [BLOCKED: M0-G] **M1-22** `kernel` symmetric 3×3 eigendecomposition. §22 states it is "already needed for the inertia tensor in M5" (inertia ellipsoid, principal axes) and it later unlocks Mohr's circle. Pure arithmetic; belongs here, not in a module
- [BLOCKED: M0-G] **M1-23** Golden-value physics tests, at minimum the four named in §18: period of a circular orbit, inertia tensor of a uniform cuboid, flux of a radial field through a sphere = 4π, curl of a rigid rotation field = 2ω. These catch the sign errors that eyeballing a pretty picture will not — and the curl test is a **handedness** test as much as a magnitude test, so it is what enforces ADR 0008 in the kernel
- [BLOCKED: M0-G] **M1-24** Wire the ≥90% coverage threshold into CI (depends on M0-7) so the M1 gate is machine-checked rather than asserted
- [BLOCKED: M0-G] **M1-25** Prove the purity half of the gate: no file under `src/kernel/` imports anything outside it, and `npm run lint` fails if one does (M0-9 closes the `three/*` hole that would otherwise let a violation pass)
- [BLOCKED: M0-G] **M1-G** **Gate:** ≥90% kernel coverage, all golden-value tests pass, kernel purity enforced by lint. Do not start M2 until this is true

## M2 — Scene substrate

**Accept when:** a throwaway demo scene exercises every glyph at 60 fps
with zero per-frame allocation (verified in the Chrome performance
profiler), and `MockSceneContext` mirrors the real `SceneContext` API
exactly (enforced by a type-level test).

All `BLOCKED` on **M1-G**.

- [BLOCKED: M1-G] **M2-1** `Viewport` — renderer, canvas, resize observer, and **exactly one** `requestAnimationFrame` loop for the whole app (§8)
- [BLOCKED: M1-G] **M2-2** `Viewport.renderOnDemand` — when time is paused and no parameter is changing, stop rendering entirely (battery, and it keeps fans quiet in a quiet lecture hall)
- [BLOCKED: M1-G] **M2-3** `camera/` — orbit/pan/zoom wrapping `OrbitControls`, never exposed to modules
- [BLOCKED: M1-G] **M2-4** `camera/` — orthographic ↔ perspective toggle, with ortho the default for any module about components, projections, or angles. Reading components off a perspective projection is misleading; this is a pedagogical requirement, not a preference (§8)
- [BLOCKED: M1-G] **M2-5** `camera/` — animated presets `+X`/`+Y`/`+Z`/iso/fit-to-content, ~400 ms with an ease so students keep their spatial bearings. Instant cuts are disorienting; honour `prefers-reduced-motion` by disabling the easing (§15). Preset definitions and the "iso" orientation follow the current up axis (ADR 0009), which defaults to `y`
- [BLOCKED: M1-G] **M2-6** `camera/` — camera state serializable to and restorable from the §14 compact encoding (`c=iso.o`, explicit angles once orbited), so a bookmarked demo restores the viewing angle
- [BLOCKED: M1-G] **M2-7** Glyph handle protocol — every glyph is a factory returning a handle with `set(props)` / `visible(bool)` / `dispose()` that mutates buffers in place and never rebuilds (`src/scene/glyphs/Handle.ts`; §3 principle 3, §8)
- [BLOCKED: M1-G] **M2-8** Glyphs, batch A (vectors and lines): `arrow` (cone head sized in **screen** space so short vectors still read as arrows; `doubleHead` for pseudovectors), `curvedArrow` (arc with a tangential head), `path` (fading tail with configurable persistence), `point` (screen-space constant size)
- [BLOCKED: M1-G] **M2-9** Glyphs, batch B (areas and volumes): `patch` (correct double-sided transparency, depth-write off), `surface` (`(u,v) => Vec3`, optional scalar colouring, wireframe overlay, **and the clipping plane §8 requires** — M2 scope, not deferred: it is what later makes cross-sections and E-1/E-6 cheap), `body` (box, sphere, cylinder, disc, rod, spring helix — low poly by design)
- [BLOCKED: M1-G] **M2-10** Glyphs, batch C (instruments): `arc` (optional midpoint label), `frame` (nestable triads so modules never do their own matrix bookkeeping), `axes` (**live** ticks whose labels reflect current world-unit spacing as you zoom), `graticule` (the §15 signature bezel: tick-marked scale rules along the viewport edges with live labels)
- [BLOCKED: M1-G] **M2-11** `field` glyph — **instanced**, one draw call for thousands of arrows, with magnitude→length, magnitude→colour, and normalized modes. The ≤200 draw-call budget (§17) depends on this being instanced
- [BLOCKED: M1-G] **M2-12** `annotate/` — `label({ latex, anchor, offset })` as a KaTeX-rendered **HTML overlay** (crisp at any zoom, selectable, accessible to screen readers), positioned by projecting the anchor each frame
- [BLOCKED: M1-G] **M2-13** `annotate/` — dimension lines, dashed projection drop-lines, leader lines
- [BLOCKED: M1-G] **M2-14** `theme/` — semantic palette (§15 tokens) → three materials, plus the projector variant (higher contrast, ~1.6× line weight, no subtle transparency) toggled at runtime. Modules only ever see `ctx.palette.*`, never a hex
- [BLOCKED: M1-G] **M2-15** Picking — ray-cast against registered draggable handles using `kernel/geometry`'s ray intersections (M1-12). Scene exposes the hit; the *shell* wires the drag to the param (M3-6). No mouse code in modules
- [BLOCKED: M1-G] **M2-21** Up-axis support in the scene layer per ADR 0009: `ctx.up` on `SceneContext` (and mirrored in `MockSceneContext`, M2-17/M2-18), the camera up vector and presets following it, and switching reorienting through the same ~400 ms eased transition as the presets rather than cutting — `prefers-reduced-motion` respected (§15)
- [BLOCKED: M1-G] **M2-16** Expand `SceneContext` to the full glyph set. It currently declares only `arrow`/`patch`/`arc` with the rest commented out — every glyph from M2-8/9/10/11 plus `label` needs a factory on the context, or modules cannot reach it
- [BLOCKED: M1-G] **M2-17** `MockSceneContext` real implementation (`src/modules/testing/MockSceneContext.ts` currently throws) — headless, no WebGL, no DOM, tallying handle creates/disposes (which is what makes contract assertion 4 possible) and recording handle property sets (assertions 5 and 5b)
- [BLOCKED: M1-G] **M2-18** Type-level test asserting `MockSceneContext` mirrors `SceneContext` **exactly**, in both directions, so a glyph added to one and forgotten in the other fails typecheck. This is half the M2 gate
- [BLOCKED: M1-G] **M2-19** Demo scene exercising **every** glyph (replaces M0-12's throwaway cube), profiled in the Chrome performance profiler for 60 fps and zero per-frame allocation. Record the profile result in the PR so the number is reviewable rather than folklore
- [BLOCKED: M1-G] **M2-20** Disposal discipline — creating and tearing down the demo scene repeatedly must not grow the WebGL context count or leak geometries/materials. Pairs with the E2E assertion in M4-8
- [BLOCKED: M1-G] **M2-G** **Gate:** demo scene exercises every glyph at 60 fps with zero per-frame allocation (profiler-verified), and the `MockSceneContext` mirror test passes. Do not start M3 until this is true

## M3 — Shell

**Accept when:** a hand-written stub module with one of every param kind
renders a complete, usable UI with zero UI code in the module, and its
state round-trips through the URL.

All `BLOCKED` on **M2-G**.

### Routing and pages

- [BLOCKED: M2-G] **M3-1** Hash routing (`#/m/<moduleId>`) — hand-rolled or `wouter`. Hash routing is the choice specifically so Pages needs no rewrite rules and no `404.html` hack (§4, §19)
- [BLOCKED: M2-G] **M3-2** Gallery route — cards built from the eagerly-loaded manifests, with search and filtering by category, level, and tags. Must not touch `loadModule`, so page-load cost stays O(1) in module count (§11)
- [BLOCKED: M2-G] **M3-3** Module view route — lazily `loadModule(id)`, mount the viewport and panels, and handle an unknown id without white-screening
- [BLOCKED: M2-G] **M3-4** About route, including the code-vs-content licence split (§19)

### Controls, layers, picking

- [BLOCKED: M2-G] **M3-5** Auto-generated controls for **every** `ParamDef` kind — number (including `logScale`), vector, toggle, select, expression, angle (`src/shell/params/`, `src/shell/controls/`, all currently stubs). A module author writes zero UI code (§9)
- [BLOCKED: M2-G] **M3-6** Drag-to-param wiring: a param declared `draggable` becomes draggable in the viewport via M2-15's picking, with the shell owning all pointer handling
- [BLOCKED: M2-G] **M3-7** Layer manager UI from `LayerDef[]`, grouped, driving scene group visibility so modules need no `if (layers.x)` branches (`src/shell/layers/`)
- [BLOCKED: M2-G] **M3-8** Layer toggle fade-in ~150 ms so students see *what* appeared; disabled under `prefers-reduced-motion` (§15)

### Time

- [BLOCKED: M2-G] **M3-9** Timeline UI: play / pause / step / scrub / speed / reverse (`src/shell/timeline/`)
- [BLOCKED: M2-G] **M3-10** Per-time-model behaviour (§12): `static` hides the timeline entirely; `parametric` scrubs, reverses, and jumps instantly; `stepped` gets the constrained path below
- [BLOCKED: M2-G] **M3-11** `stepped` driving: **fixed timestep only** (default 1/240 s) with an accumulator, so behaviour is identical regardless of frame rate. Variable-dt integration makes demos non-reproducible
- [BLOCKED: M2-G] **M3-12** `stepped` scrubbing: `reset()` then fast-forward, capped at **20,000 steps**, with a "fast-forwarding…" indicator and a clamp beyond the cap. Do not raise the cap — §12 is explicit that wanting to is the signal you are building a simulator
- [BLOCKED: M2-G] **M3-13** Chunk the fast-forward loop across animation frames rather than blocking. §12 names this a **shell obligation, not a module workaround**: 20,000 sequential `step()` calls without yielding can freeze the tab for seconds mid-scrub, mid-lecture
- [BLOCKED: M2-G] **M3-14** Reverse playback disabled for `stepped`, greyed out with a tooltip explaining why — honest, and itself a small lesson about irreversibility (§12)

### Data out: plots and readouts

- [BLOCKED: M2-G] **M3-15** Time-series plot (uPlot) — any declared scalar vs. time, **or vs. another declared scalar**, which gives phase-space portraits for free (§9)
- [BLOCKED: M2-G] **M3-16** Sweep plot — pick a param, sweep its range, evaluate a declared scalar at each value, plot the curve. One generic feature that serves resonance response curves, effective-potential curves, and later a ship's GZ righting-arm curve. Build it once here; never in a module (§9, §22)
- [BLOCKED: M2-G] **M3-17** Readouts table of declared scalars, formatted by `kernel/units` (M1-17), pinnable as a large overlay in presenter mode (`src/shell/readouts/`)

### State and URLs

- [BLOCKED: M2-G] **M3-18** Zustand store matching the §13 `AppState` shape, subscribed to **outside React** by the render loop, which calls `instance.update()` directly. React re-renders chrome only — never drive a 60 fps three.js loop through React state
- [BLOCKED: M2-G] **M3-19** URL codec (`src/shell/state/urlCodec.ts`, currently a stub) implementing §14 exactly: `v=` always present, params by `urlKey` with **defaults omitted**, `L=` as the differ-from-default layer keys with `-` prefix for off, `t=` at 2 dp omitted at 0, `c=` compact camera
- [BLOCKED: M2-G] **M3-20** `?z=<lz-string blob>` fallback when the encoded string exceeds 1800 characters (§14). Needs the `lz-string` dependency, which is **not currently in `package.json`** — add it
- [BLOCKED: M2-G] **M3-21** `migrations.ts` — `Record<moduleId, Record<fromVersion, (old) => new>>`. An old shared link from a previous semester must still work
- [BLOCKED: M2-G] **M3-22** Unmigratable-link path: load defaults and show a **non-blocking notice**, never an error (§14)
- [BLOCKED: M2-G] **M3-23** Camera URL sync **debounced** (~250 ms after the last `change`, or on `end`) while the in-memory `camera` field still updates every frame for the render loop to read. `OrbitControls` fires many `change` events per drag frame; undebounced writes spam browser history and visibly stall the render thread (§14 hardening note)
- [BLOCKED: M2-G] **M3-24** History discipline — decide and implement `replaceState` vs `pushState` per class of state change (param twiddling must not bury the back button), and record the choice in the codec's doc comment
- [BLOCKED: M2-G] **M3-25** "Copy link" as a first-class, always-visible control, not buried in a menu. §14: "This is the feature that gets the tool used"

### Explain, predict, present, protect

- [BLOCKED: M2-G] **M3-26** Explain panel rendering — **plain markdown**, per ADR 0002. Pick a small self-hosted markdown renderer (no CDN, §19), render `explain.md` with KaTeX for the math, and load the panel content per module without pulling it into the initial bundle
- [BLOCKED: M2-G] **M3-27** Predict mode — freeze time at t=0 and hide layers tagged `reveal: true` until the student commits and clicks. A shell feature, so every module gets predict-observe-explain for free (§9)
- [BLOCKED: M2-G] **M3-28** Presenter mode — hides gallery chrome, enlarges type ~1.5×, pins the readout overlay, applies projector tokens, suppresses tooltips and hover states a projected audience cannot see (§9, §16)
- [BLOCKED: M2-G] **M3-29** Keyboard map (§16): `Space`, `←/→`, `Shift+←/→`, `1–9`, `R`, `P`, `F`, `C`, `V` — plus the `?` overlay that displays it
- [BLOCKED: M2-G] **M3-30** `ModuleErrorBoundary` — catches module exceptions and renders a card naming the module, the error, and the failing parameter, with a "reset to defaults" button. The gallery stays usable (§3 principle 5, §9)
- [BLOCKED: M2-G] **M3-31** `dimensions: 2` handling per ADR 0007: the **existing** orthographic camera locked to the plane — no second renderer. Orbit suppressed; pan and zoom stay live. Driven off the manifest's `dimensions` field so a 2D module author writes nothing
- [BLOCKED: M2-G] **M3-40** "Release rotation" toggle for `dimensions: 2` modules (ADR 0007) — a shell affordance, not a module feature. Re-locking must return to the **exact** original view via the same ~400 ms eased transition as the camera presets (§1 recoverability; §15 `prefers-reduced-motion`), and released-rotation state belongs in the serialized camera (§14) so a bookmarked link restores it

### Accessibility and responsive layout

- [BLOCKED: M2-G] **M3-32** Canvas `aria-label` carrying a text description of the current scene, regenerated from module scalars — "vector a, magnitude 2.24, at 63 degrees from the x axis; cross product magnitude 3.00" (§16). See **C-2** for the open question of where the phrasing comes from
- [BLOCKED: M2-G] **M3-33** Full keyboard reachability with a visible focus ring that survives the design. Do not `outline: none` (§16)
- [BLOCKED: M2-G] **M3-34** Every readout value available as selectable text, not only as canvas pixels (§16)
- [BLOCKED: M2-G] **M3-35** Layout works at 320 px width — the per-module manual checklist (§18) asserts it, so the shell has to support it first

### The gate

- [BLOCKED: M2-G] **M3-36** Hand-written stub module exercising **one of every** `ParamDef` kind, every `LayerDef` feature (grouping, `reveal`), and both plot types. Decide and note whether it stays `_`-prefixed (out of the gallery glob) or becomes a permanent gallery fixture
- [BLOCKED: M2-G] **M3-37** Verify against that stub: a complete, usable UI with **zero** UI code in the module, and a full URL round-trip (encode → reload → identical state, including camera and layers)
- [BLOCKED: M2-G] **M3-38** Implement contract assertion 8 (URL round-trip) now that the codec exists, so every future module inherits the check
- [BLOCKED: M2-G] **M3-41** Global application settings menu (ADR 0009) — app-level, not attached to the viewport or a panel. Holds the **up-axis toggle** (`y`/`z`) and becomes the home for the other display preferences that would otherwise scatter: theme and projector mode. Add the `prefs` slice to the §13 store shape
- [BLOCKED: M2-G] **M3-42** Persist `prefs` locally across sessions (they are viewer preferences), **and** serialize them into the URL only when they differ from the default, per §14's omit-defaults rule — so a short link stays short but a demo prepared in z-up reproduces what the instructor saw
- [BLOCKED: M2-G] **M3-39** Per-`schemaVersion` migration tests in the shell's unit tests (ADR 0003). Contract assertion 8 only covers the *current* version — the contract suite cannot know last semester's schema, so an unmigratable old link is a defect no existing test would catch
- [BLOCKED: M2-G] **M3-G** **Gate:** the M3-36 stub renders a complete usable UI with zero module-side UI code, and round-trips through the URL. Do not start M4 until this is true

## M4 — First module: Vector Algebra

**Accept when:** the module passes the contract suite, and the
instructor can reach any of its demonstration states in under three
clicks from a bookmarked link.

All `BLOCKED` on **M3-G**.

- [BLOCKED: M3-G] **M4-1** Build `vector-algebra` per the §21 cookbook: 2D/3D toggle, draggable vectors, head-to-tail **and** parallelogram sums, component decomposition onto a rotatable basis, dot product with projection shadow and live cos θ, cross product with the parallelogram patch and a right-hand-rule animation, scalar triple product as a parallelepiped, direction cosines
- [BLOCKED: M3-G] **M4-2** `explain.md` for the module — what am I looking at, what should I notice, what is the equation (§9)
- [BLOCKED: M3-G] **M4-3** Implement the remaining contract assertions as real tests, replacing the `it.todo` placeholders in `tests/contract/modules.contract.test.ts`: 1 (manifest well-formed, `id` matches folder name), 2 (`urlKey`s unique and ≤4 chars), 3 (numeric defaults within `[min, max]`), 4 (zero undisposed handles), 5 (idempotence), 5b (determinism — catches `Date.now()`, unseeded `Math.random()`, captured mutable closures), 6 (`scalars()` purity), 7 (parametric history independence), 9 (no `NaN` across 100 quasi-random states, using M1-20's seeded PRNG), 10 (`explain.md` parses)
- [BLOCKED: M3-G] **M4-4** Contract suite green for `vector-algebra` — and confirm it required **no** module-specific test code to get that coverage, which is the entire point of §18
- [BLOCKED: M3-G] **M4-5** Enumerate the module's demonstration states explicitly as bookmarkable URLs, then verify each is reachable in **under three clicks** from a bookmarked link. If one isn't, the fix is usually a shell affordance, not a module workaround
- [BLOCKED: M3-G] **M4-6** **Projector test before M4 ships.** §15 makes this an explicit pre-M4 requirement: check the palette on an actual projector in a lit room, because a palette that sings on a laptop can vanish at 4000 lumens. Adjust the projector token overrides on what you actually see
- [BLOCKED: M3-G] **M4-7** Run the full per-module manual checklist (see **Definition of done, per module** below): projector, 320 px, `prefers-reduced-motion`, colour-blindness simulator
- [BLOCKED: M3-G] **M4-8** Implement the E2E smoke suite properly (`tests/e2e/smoke.spec.ts` is a single title check today): read module ids **dynamically** so the file never needs per-module edits, then for each — navigate to its route, wait for canvas, assert a non-blank render, assert no console errors, toggle every layer once, navigate away, assert the WebGL context count did not grow (§18)
- [BLOCKED: M3-G] **M4-10** Run the conformance assertions under **both** up-axis settings (ADR 0009). Cheap leverage: idempotence, NaN-freedom, and clean disposal must all hold in y-up and z-up, which is what catches a module that half-uses `ctx.up`
- [BLOCKED: M3-G] **M4-9** Verify the §17 performance budget for this module: `update()` ≤4 ms, ≤60,000 triangles, ≤200 draw calls, zero animation-loop allocations, per-module chunk ≤80 KB gzipped, initial JS ≤250 KB gzipped, gallery TTI ≤1.5 s
- [BLOCKED: M3-G] **M4-G** **Gate:** the contract suite passes and every demonstration state is ≤3 clicks from a bookmarked link. Do not start M5 until this is true

## M5 — Two dissimilar modules

**Accept when:** shipping both required zero breaking changes to
`types.ts`. If the contract had to change, fix it now before there are
20 modules depending on it.

The pair is chosen because they stress *different* substrate: rotation
stresses quaternions, stepped time, and rigid bodies; fields stress
instanced glyphs, parametric surfaces, quadrature, and scalar colouring
(§20). All `BLOCKED` on **M4-G**.

- [BLOCKED: M4-G] **M5-1** `rotational-dynamics` — torque with a drawn moment arm, parallel-axis animation, the `L` vs `ω` non-parallel case, precession and nutation, rolling with instantaneous axis and cycloid trace, inertia ellipsoid (M1-21, M1-22), Dzhanibekov effect. `stepped` only where genuinely necessary; prefer closed form everywhere else (§2)
- [BLOCKED: M4-G] **M5-2** `rotational-dynamics` — verify the `stepped` obligations hold in practice: fixed dt, cheap `step()`, a scrub that stays inside the 20,000-step cap without freezing the tab, reverse correctly greyed out (§12). This is the first real exercise of M3-11 … M3-14
- [BLOCKED: M4-G] **M5-3** `fields-gradients` — heightmap with level curves, gradient perpendicularity, directional-derivative slider, shrinking-box divergence, draggable curl paddlewheel
- [BLOCKED: M4-G] **M5-4** `fields-gradients` — flux through a **user-shaped** surface, with Stokes' theorem and the divergence theorem shown as two numbers converging. This is the payoff for M1-9's per-sample contributions and M2-9's scalar-coloured surface
- [BLOCKED: M4-G] **M5-5** `explain.md` for both modules
- [BLOCKED: M4-G] **M5-6** Both modules pass the contract suite and the E2E smoke suite and meet the §17 budget — the field module is the first real test of instanced glyphs against the 200-draw-call ceiling
- [BLOCKED: M4-G] **M5-7** Run the per-module manual checklist for both
- [BLOCKED: M4-G] **M5-8** Resolve **C-1**, the `stepped` dt contract gap: §12 says the fixed timestep is "module-overridable" but `types.ts` has nowhere to declare it. Add the field, bump `MODULE_CONTRACT_VERSION`, record the ADR. M5 is exactly where §20 says a contract defect gets fixed
- [BLOCKED: M4-G] **M5-G** **Gate:** confirm shipping both required **zero** breaking changes to `src/modules/types.ts`. If a change was needed, the contract was wrong — fix it here, bump `MODULE_CONTRACT_VERSION`, write the ADR, and sweep `src/modules/*`. Not later, when 20 modules depend on it

## M6 — Authoring path (the extensibility gate)

**Accept when:** a person who has never seen the codebase ships a
working, contract-passing module in under four hours using only
`MODULE_AUTHORING.md`. Do not skip this gate.

All `BLOCKED` on **M5-G**.

- [BLOCKED: M5-G] **M6-1** `_template/` module finished and genuinely copy-ready — compiles, passes the contract suite as-is, and demonstrates one of each common param kind without being cluttered
- [BLOCKED: M5-G] **M6-2** `docs/MODULE_AUTHORING.md` finished against the substrate as actually built. It currently describes an intended API; revisit every claim once M1–M5 exist, especially the glyph list and the scratch-pool guidance
- [BLOCKED: M5-G] **M6-3** `docs/PHYSICS_CONVENTIONS.md` finished. The "Handedness and sign conventions" `TODO` is now closed by ADR 0008 (right-handed everywhere); the up-axis convention is settled by ADR 0009 and recorded there too, so what remains for M6 is folding in the module-specific sign conventions M4/M5 actually established
- [BLOCKED: M5-G] **M6-4** `npm run new:module` working end to end (`scripts/new-module.mjs` exists but is entirely unverified): it must generate a folder that the registry glob picks up with **zero** edits elsewhere and that passes the contract suite immediately
- [BLOCKED: M5-G] **M6-5** Put the per-module manual checklist into `MODULE_AUTHORING.md` as a copy-pasteable block, so an author doesn't have to reconstruct it from §18
- [BLOCKED: M5-G] **M6-6** **Run the actual gate:** recruit an author with no prior exposure to the codebase, give them only `MODULE_AUTHORING.md`, time the attempt, and record what they got stuck on
- [BLOCKED: M5-G] **M6-7** If the gate fails, fix the substrate or the doc — not the author — and retest with someone else. Do not lower the bar; §20 is explicit that the failure is never theirs
- [BLOCKED: M5-G] **M6-G** **Gate:** a first-time author ships a working, contract-passing module in under four hours from the doc alone. Everything after this depends on the answer

## M6.5 — Post-gate platform features

Two features deliberately sequenced **after** the authoring gate, so
they are built against a substrate a stranger has already proven
authorable. Added to `ARCHITECTURE.md` §20 as milestone M6.5 when
ADR 0005 and ADR 0006 were accepted.

**Accept when:** the site loads and runs every module with the network
disabled — including a module never visited while online — and a GIF
exported from a module is byte-identical across two runs from the same
state, with the §15 semantic colours still distinguishable after palette
quantization.

All `BLOCKED` on **M6-G**.

### Offline support (ADR 0005)

- [BLOCKED: M6-G] **P-1** Service worker precaching the application shell: HTML, CSS, self-hosted fonts, KaTeX, and the `three` / `vendor` / `katex` chunks. Cache-first for hashed immutable assets
- [BLOCKED: M6-G] **P-2** Precache **every module chunk**, not just visited ones. This is the non-obvious half and it is required: §11 gives each module its own lazily-loaded chunk, so without explicit precaching "offline" would mean "offline for the one module you happened to open earlier"
- [BLOCKED: M6-G] **P-3** Update flow: version tied to the build, and a **non-blocking** "new version available — reload" notice. Never swap code under a live demo — an instructor mid-lecture must not have the page reload underneath them (§1, "no fiddling mid-lecture"). The reload is always the user's click
- [BLOCKED: M6-G] **P-4** Disable or scope the worker off in dev, or every developer eventually chases a phantom cached bundle
- [BLOCKED: M6-G] **P-5** Report **total precache size** as a CI-visible number. Precaching the whole library puts the §17 per-module chunk budget under real pressure as it grows: at 50 modules this is the difference between a 4 MB and a 20 MB warm cache
- [BLOCKED: M6-G] **P-6** Verify offline for real: load the site, disable the network, then open a module **never visited while online**, toggle its layers, and scrub its timeline. Also verify a stale worker cannot pin an old build — a fix nobody receives is the classic service-worker failure

### GIF export (ADR 0006)

- [BLOCKED: M6-G] **P-7** Small self-hosted pure-JS GIF encoder, loaded **on demand** so it never touches the initial bundle (§17: ≤250 KB gzipped). No CDN (§19)
- [BLOCKED: M6-G] **P-8** Deterministic frame capture from module **state**, not screen-recording: evaluate `update({t})` on a fixed time grid for `parametric` modules, and drive the shell's own fixed timestep for `stepped` ones, so an exported clip matches what the class saw. This only works because §12 forbids unseeded randomness and variable-dt integration
- [BLOCKED: M6-G] **P-9** Export bounds — duration, frame rate, pixel dimensions — with the estimated file size shown **before** encoding starts. GIF is palette-limited and a careless export is tens of megabytes
- [BLOCKED: M6-G] **P-10** Keep export off the hot path: frame capture is a deliberate user-initiated mode, and it is allowed to allocate because it is not playback. The §17 zero-allocation budget still applies to normal 60 fps rendering, and P-10 is done only when that is still true with the export code present
- [BLOCKED: M6-G] **P-11** Prefer the projector token variant for export, and check an exported GIF against the palette: the Okabe–Ito semantic colours must survive 256-colour quantization, because colour **is** data here (§15)
- [BLOCKED: M6-G] **P-12** Confirm **no** video path exists — no `MediaRecorder`, no WebM/MP4, no WASM encoder. ADR 0006 rejects video deliberately; this is a review check, not code
- [BLOCKED: M6-G] **P-G** **Gate:** every module runs with the network disabled (including one never visited online), and two exports from the same state are byte-identical with the palette intact

## X — Cross-cutting obligations

Specification requirements not owned by a single milestone. Each is
tagged with the milestone that must not ship without it.

- [DONE] **X-1** Repo-name discrepancy resolved in favour of **`phys-viz`** everywhere. `ARCHITECTURE.md` §5 (tree root), §14 (URL example), §19 (`base`), and §20 (M0 acceptance URL) now match the folder, `package.json` name, and the configured `base`. `base` must keep matching the Pages repo name exactly, including case, or every asset 404s. *(gated M0)*
- [READY] **X-2** Add the CC BY-SA 4.0 licence for module explanatory text and figures alongside the MIT code licence, and state the split in `README.md` and on the About route. §19 flags this as the thing that lets physics-education colleagues adopt and contribute, which is the realistic path to this outliving one semester. *(gates M0)*
- [BLOCKED: M3-G] **X-3** Enforce the §17 bundle budgets in CI where possible: initial JS (shell + scene + kernel) ≤250 KB gzipped, per-module chunk ≤80 KB gzipped. A small script over the Vite output that fails the build is enough — "check manually otherwise" is how budgets rot. *(gates M4)*
- [BLOCKED: M3-G] **X-4** Verify `manualChunks` actually produces the intended `three` / `vendor` / `katex` split, and that adding a module leaves the initial bundle unchanged. The O(1)-in-module-count claim in §11 is load-bearing for the entire growth plan. *(gates M4)*
- [BLOCKED: M2-G] **X-5** Honour `prefers-reduced-motion` everywhere motion exists: camera easing (M2-5) and layer fades (M3-8). §15 names exactly these two. *(gates M4)*
- [BLOCKED: M3-G] **X-6** Verify the projector token override works as a single class on `<html>`, covering contrast, ~1.6× line weight, larger labels, and disabled subtle transparency across **both** DOM chrome and scene materials (`src/design/projector.css` + M2-14). *(gates M4)*
- [READY] **X-7** Keep `README.md` current: live URL, what the project is, how to run it, where the docs are, how to contribute a module. It is the front door for the M6 author. *(gates M6)*
- [BLOCKED: M0-G] **X-8** Keep recording decisions as ADRs under `docs/adr/`, following `0001-record-architecture-decisions.md`. All of §23's questions are now written (0002–0009), including the up-axis question ADR 0008 exposed. The open queue is one ADR per module-specific sign convention as it arises, plus every future contract, URL-schema, or cross-module convention change. An accepted ADR is never edited — a change of course gets a new ADR that supersedes it. *(continuous)*
- [BLOCKED: M0-G] **X-9** Keep `AGENTS.md` and `CLAUDE.md` in step with the substrate as it lands — both currently describe stubs as though they were working APIs, and stale agent docs produce confidently wrong code. *(continuous)*

## Contract gaps — the spec requires it, `types.ts` cannot express it

Found on the second pass. Each needs a decision before the milestone
that depends on it, and each fix is a `MODULE_CONTRACT_VERSION` bump
plus an ADR (§10).

- [BLOCKED: M3-G] **C-1** **Module-overridable `stepped` dt.** §12: "The shell drives `step` with a fixed `dt` (default 1/240 s, module-overridable)". Nothing in `ModuleManifest` or `PhysicsModule` can express the override. Add it (e.g. `stepDt?: number`). Worked as M5-8; needed as soon as M3-11 exists
- [BLOCKED: M3-G] **C-2** **Scene description for accessibility.** M3-32's canvas `aria-label` is generated "from module scalars", but `ScalarDef` carries no hint about which scalars belong in a spoken description or how to phrase one. Either the shell composes it generically from `label` + `symbol` + `unit` (preferred — no contract change) or the contract needs a field. Decide before writing M3-32
- [BLOCKED: M3-G] **C-3** **Demonstration states.** M4-G's "under three clicks from a bookmarked link" is measured against a module's "demonstration states", which nothing declares. Confirm that layer toggles plus bookmarks suffice; if they don't, that is a contract addition, and §20 says fix it at M5, not later
- [BLOCKED: M0-G] **C-4** `MODULE_CONTRACT_VERSION` has no CI check — its own doc comment admits "a bump is a signal to manually sweep `src/modules/*`". Consider a cheap guard (a per-module marker, or a test that fails when the constant moves) so a bump cannot land silently

## Definition of done, per module

Reusable checklist. Every module — M4, M5, and each M7+ item — is done
when all of these are true. Copy it into the PR description.

1. `manifest.ts`, `params.ts`, `index.ts`, `explain.md` present; the folder name **is** the module id.
2. `npm run test:contract` green, with no module-specific test code needed to get there.
3. `module.test.ts` covers anything genuinely module-specific — typically a golden-value physics check.
4. `npm run typecheck && npm run lint && npm run test:unit && npm run build` green.
5. E2E smoke green for this module id, picked up dynamically with no test edits.
6. §17 budget met: `update()` ≤4 ms, ≤60k triangles, ≤200 draw calls, zero animation-loop allocations, chunk ≤80 KB gzipped.
7. Zero React / three.js / CSS / event-handler / URL / plotting code in the module, and no `if (layers.x)` branches (§21, "Note what is absent").
8. `timeModel` is the weakest one that works — `static` over `parametric` over `stepped` (§2, §12).
9. Colours come from `ctx.palette.*` and follow `PHYSICS_CONVENTIONS.md`; colour is never the only channel carrying information.
10. Manual checks: actual projector, 320 px width, `prefers-reduced-motion`, colour-blindness simulator (§18).

## M7+ — Library growth (ongoing)

Order per §20, roughly by pedagogical value per unit effort. Each is a
self-contained unit of work once M6 is accepted — suitable for a student
project or a summer contributor — and each is done per the checklist
above. M6.5 and M7+ are independent of each other; library growth need
not wait on the platform work, or vice versa.

- [IDEA] **M7-1** Work & Energy (potential surface + total-energy plane)
- [IDEA] **M7-2** Momentum & Collisions (CM-frame toggle; closed-form elastic collision formulae, **not** a solver — §2)
- [IDEA] **M7-3** Non-inertial Frames & Coriolis (the consumer of M1-6's separately retrievable ω × r / Coriolis / centrifugal terms)
- [IDEA] **M7-4** Oscillations (driven and damped steady state is `parametric`; keep it that way)
- [IDEA] **M7-5** Gravitation & Central Forces (Kepler via M1-15's root-finder, `parametric`)
- [IDEA] **M7-6** Kinematics
- [IDEA] **M7-7** Newton's Laws & FBDs
- [IDEA] **M7-8** Statics & Trusses
- [IDEA] **M7-9** Sandbox — the one module that uses `kernel/expr`, and the only expected `?z=` URL-compression case (M3-20)

## ADRs — §23's seven questions resolved (0002–0009), including the up axis they exposed

- [DONE] **ADR-1** → [`0002-markdown-for-explain-panels.md`](docs/adr/0002-markdown-for-explain-panels.md). **Plain markdown**, files named `explain.md`, KaTeX for the math; revisit only if an author demonstrates a panel genuinely better for an inline widget. Applied: the four stubs renamed, `_template`'s MDX-only `{/* … */}` comment converted to an HTML comment, and §5/§9/§18/§21, `MODULE_AUTHORING.md`, `LICENSE`, and the contract-test checklist updated. Unblocks **M3-26**
- [DONE] **ADR-2** → [`0003-migrate-urls-not-pinned-builds.md`](docs/adr/0003-migrate-urls-not-pinned-builds.md). **Migrate old URLs forward**; no pinned per-module builds. A `schemaVersion` bump now obliges a migration in the same change, migrations are append-only and kept indefinitely, and an unmigratable link loads defaults with a non-blocking notice. Confirms **M3-21**/**M3-22**, adds **M3-39**
- [DONE] **ADR-3** → [`0004-no-module-composition.md`](docs/adr/0004-no-module-composition.md). **No composition — modules stay leaves.** Deferred, not rejected: revisit when ≥8 modules exist *and* a concrete duplication case is demonstrated. Share capability downward (a new glyph, a kernel function), never sideways. Makes **M0-9**'s cross-module import ban load-bearing rather than advisory
- [DONE] **ADR-4** → [`0005-offline-via-service-worker.md`](docs/adr/0005-offline-via-service-worker.md). **Service worker, full offline**, precaching the shell *and every module chunk*, with a user-clicked update rather than a silent mid-lecture swap. Scheduled as **M6.5 / P-1 … P-6**
- [DONE] **ADR-5** → [`0006-gif-export-no-video.md`](docs/adr/0006-gif-export-no-video.md). **GIF export; no video** — no `MediaRecorder`, no WebM/MP4, no WASM encoder; frames rendered deterministically from module state. Scheduled as **M6.5 / P-7 … P-12**
- [DONE] **ADR-6** → [`0007-locked-ortho-for-2d-modules.md`](docs/adr/0007-locked-ortho-for-2d-modules.md). **Locked orthographic 3D for 2D modules**, one renderer, plus the release-rotation toggle. Unblocks **M3-31**, adds **M3-40**
- [DONE] **ADR-7** → [`0008-right-handed-coordinates.md`](docs/adr/0008-right-handed-coordinates.md). **All coordinate systems are right-handed**, everywhere: Cartesian (`x̂ × ŷ = ẑ`), polar/cylindrical `(r, θ, z)` with `θ` from `+x` toward `+y`, spherical `(r, θ, φ)` in the physics convention (`θ` polar from `+z`). Positive angles are counter-clockwise viewed from the positive side of the axis; pseudovectors (`ω`, `α`, `τ = r × F`, `L = r × p`) follow the right-hand rule and keep the `doubleHead` marking. Recorded in full in `PHYSICS_CONVENTIONS.md`, which closes that doc's live `TODO`. A module may **not** flip a sign locally to make a picture look nicer
- [DONE] **ADR-8** → [`0009-y-up-default-with-up-axis-toggle.md`](docs/adr/0009-y-up-default-with-up-axis-toggle.md). **y-up by default** (matches three.js; puts a 2D module's xy-plane straight on screen with `x` right, `y` up, composing with ADR 0007's locked ortho), **user-switchable to z-up** from a **global app settings menu**. The up axis is a scene-level convention exposed as **`ctx.up`**: the camera up vector, presets, and "iso" follow it, modules with a notion of vertical read it, orientation-free modules ignore it. Both conventions stay right-handed (ADR 0008). A `SceneContext` addition, **not** a `types.ts` change — no `MODULE_CONTRACT_VERSION` bump. Unblocks **M2-5**, adds **M2-21**, **M3-41**, **M3-42**, **M4-10**
- [IDEA] **ADR-10+** Module-specific sign conventions that handedness does not imply — the sign of a bending moment, the direction of positive heel angle. One ADR per non-obvious choice, written as it arises (see **M6-3**). The only open convention question left

## Anticipated extensions (§22) — substrate should not foreclose these; do not build yet

§22's own summary is worth keeping in view: three generic substrate
features — half-plane polygon clipping (M1-11), the Sweep Plot (M3-16),
and the retained-handle glyph set (M2-7 … M2-11) — unlock most of these.
The future modules turn out to be data and arithmetic, not new
architecture.

- [IDEA] **E-1** Ship stability (metacentre, GZ righting-arm curve, heel response, free-surface effect) — needs M1-11 + M3-16 + M2-9's clipping plane, all now scheduled in-milestone; the only genuinely new piece is a hull-lofting glyph from 2D stations
- [IDEA] **E-2** Mechanisms and linkages (four-bar, slider-crank, coupler curves) — one small kernel addition: planar Newton–Raphson on 2–3 unknowns (~40 lines) on top of M1-15. Path tracing is already covered by the `path` glyph's persistence tail
- [IDEA] **E-3** Gears and cams — involute and cycloid profile generators as pure functions in `kernel/geometry`; nothing new in the scene layer
- [IDEA] **E-4** Beam bending, shear and moment diagrams — Sweep Plot plus a deformation-parameterized `surface`; fully covered
- [IDEA] **E-5** Stress tensor / Mohr's circle — needs the symmetric 3×3 eigendecomposition already scheduled as M1-22, plus an ellipsoid glyph from M5's inertia ellipsoid
- [IDEA] **E-6** Fluid statics, buoyancy, centre of pressure — the same half-plane clip as E-1; covered by M1-11
- [IDEA] **E-7** Thermodynamic cycles — 2D PV/TS diagrams with a shaded enclosed area; purely a Sweep Plot variant
- [IDEA] **E-8** Waves, Lissajous, interference — parametric surfaces with time, the easiest case

**The rule for future work** (§22): when a proposed module needs a
capability that does not exist, ask whether it belongs in Layer 1 or 2 —
where every module gains it — rather than in the module. If it can only
live in the module, that is a signal: either the substrate has a gap
worth filling, or the module is drifting toward simulation.
