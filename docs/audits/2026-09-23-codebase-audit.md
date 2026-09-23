# Codebase audit — 2026-09-23

A read-only audit of the whole tree at `bb62267` (just after the X-25 fix).
Nothing in `src/`, `tests/`, `scripts/` or config was changed. The only
edits in this change are this report and the new `X-26`…`X-59` entries in
`TASKS.md` (logged, not fixed).

## Method and how much to trust each finding

- **Orientation.** Read `AGENTS.md`, `ARCHITECTURE.md` §1–§5, all of
  `TASKS.md`, `MODULE_AUTHORING.md` and `PHYSICS_CONVENTIONS.md` first.
  Every item that `TASKS.md` already tracks was excluded, including X-1…X-25,
  the documented M2-2/M2-12/M2-15/M3-8 "verified by inspection" gaps, X-17's
  zero-area-triangle gotcha, and the E-1…E-8 extensions.
- **Coverage.** Five parallel sub-audits: modules in three groups, the scene
  layer, and shell + service worker + scripts. I did the ESLint, doctrine,
  dependency, coverage and docs passes myself.
- **Verification.** I re-checked every sub-audit finding recorded below
  against the code before writing it down. The tags mean:
  - **[V]** Verified: I read the code path myself, and where it says so,
    reproduced the result numerically or with a probe (scripts are in the
    session scratchpad, not the repo).
  - **[V-read]** Verified by reading code only. The mechanism is certain from
    the source, but I did not observe it in a rendered frame. This repo's
    browser pane doesn't composite reliably (see memory
    `project-browser-pane-no-compositing`), and I didn't run Playwright.
  - **[R]** Reported by a sub-audit and spot-checked, but not fully
    re-derived. Treat these as plausible, not proven.
- **What I did not do.** I rendered no module in a browser. I did no
  projector or colour-blindness-simulator pass on real output. I did not run
  the Playwright suite. See §8 for what that means for the manual-checklist
  claims.

### Baseline state (from `TASKS.md`, not contradicted here)

- M0–M6.5, UI-1/UI-2, X-1…X-25 (except the continuous X-8), C-1…C-5 and
  M7-1…M7-5 are `DONE`.
- M7-6…M7-9 and E-1…E-8 are `IDEA`. X-8 and ADR-10+ are standing `READY`
  items.
- Nothing is `BLOCKED`.
- `TASKS.md` has no milestone-status _table_. Status lives inline per task.
- Nothing below promotes an `IDEA`.

### Toolchain numbers measured in this audit

- **`npm run test:coverage` (kernel only):** 99.55% lines, 97.66%
  branches, 100% functions. Lowest are `kernel/units` at 97.27% and
  `kernel/expr` at 99.12%.
- **`npm run check:budget`:** passes.
  - Entry chunk: **74.12 KB** gz.
  - Separately reported: vendor 45.70, three 118.85, katex 75.28.
  - Module chunks: 1.35–5.33 KB.
  - GIF chunk: 2.05 KB.
- **Service worker precache:** 93 URLs, 2.31 MB (from the sub-audit's
  build).
- **Existing tests:** every module and scene test passes. The sub-audits
  re-ran `npx vitest run` on `src/modules/*`, `src/scene`, `src/design` and
  `src/shell`.

---

## 1. Doctrine compliance

**Clean. No findings.**

- `kernel/ode` is imported by exactly two modules:
  - `rotational-dynamics` uses `rk4`, only for the Dzhanibekov panel. That
    is non-principal-axis tumbling, which is on §2's allowed list.
  - `gravitation` uses `findRoot`, an algebraic root-solve for Kepler's
    equation, not integration.
- Every other module is closed-form (`static` or `parametric`).
- No rejected dependency is present: no react-three-fiber, no physics
  engine, no Tailwind, no Next/SSR, no `MediaRecorder` or video path.
- Geometry is schematic throughout. The largest meshes are the
  `fields-gradients` 41×41 heightmap and the TubeGeometry spring, both far
  under "a few thousand triangles".

## 2. Layer-boundary integrity

- **[V] Bug (high, latent). ESLint boundary holes.** Logged as **X-33**.
  - **Method.** I probed each rule by piping one-line files through
    `npx eslint --stdin --stdin-filename <path-in-layer>`, so no file was
    written.
  - **What is caught.** Each layer's positive controls fail lint as they
    should:
    - `three`, `three/examples/...` and `react/jsx-runtime`;
    - `@/modules/registry` and `@/modules/testing/*` from a module;
    - `import type` from `@/scene/Viewport` in a module;
    - `export * from 'three'`;
    - `require('three')`.
  - **Holes, rule by rule:**
    - **Barrel imports** (`.eslintrc.cjs:44-57, 69-72, 117-149`). The
      patterns are `@/scene/*` and similar, which never match the bare
      barrels `@/scene`, `@/shell` and `@/modules`. All three barrels exist
      (`src/scene/index.ts`, `src/shell/index.ts`, `src/modules/index.ts`).
      So a **module can `import { … } from '@/scene'`** and pull three.js in
      at runtime, which defeats §6's "rule that matters most". It can also
      import `@/shell`, or `@/modules` (whose registry glob loads every other
      module). The kernel can import all three barrels too.
    - **Relative escapes from kernel and scene** (`.eslintrc.cjs:39-78`).
      These overrides have no relative patterns at all:
      - `src/kernel/math/x.ts` → `'../../scene/Viewport'` and
        `'../../modules/registry'` both pass;
      - `src/scene/glyphs/x.ts` → `'../../shell/App'` and
        `'../../modules/vector-algebra/index'` both pass.
    - **Shell → concrete module** (`.eslintrc.cjs:87-92`). The ban names
      only `@/modules/*/index` and `@/modules/*/manifest`. So these all
      pass:
      - `@/modules/vector-algebra/params`;
      - `@/modules/vector-algebra` (a directory import);
      - `../../modules/vector-algebra/index`.
    - **Dynamic `import()`** is invisible to `no-restricted-imports` in
      every layer. `import('three')` and `import('../projectile-motion/index')`
      from a module both pass.
    - **`src/modules/testing/**` in shell.** Shell may import it. This is
      minor, but it is test scaffolding.
  - **Current exposure.** A grep of the tree finds no file exploiting any of
    these today, so the holes are latent.
  - **Recommendation.**
    - Add the bare barrels (`'@/scene'`, `'@/shell'`, `'@/modules'`) next to
      each `/*` pattern.
    - Add `../*`-style relative patterns to the kernel and scene overrides,
      as M0-9 did for modules.
    - Invert the shell rule: ban `@/modules/*` with
      `!@/modules/types`/`!@/modules/registry`, plus the relative form.
    - Add a `no-restricted-syntax` selector for
      `ImportExpression[source.value=/^(three|react|\.\.\/)/]` in kernel and
      modules.
    - Re-prove each hole with the stdin probe, as M0-13 did.

## 3. Physics correctness in untested code paths

This is the X-25 shape: tests cover `scalars()` and the moving body, and
nothing asserts what reaches a glyph's `.set()`. **All eleven module test
files check readout values only. None records or asserts a glyph prop,
except gravitation's new X-25 test.** Every finding in this section lives in
that gap.

### Bugs

- **[V] non-inertial-frames draws the fictitious accelerations reversed.**
  Severity high. Logged as **X-26**.
  - **Where.** `index.ts:212-218, 425-438`.
  - **What the code does.** `transformAcceleration` returns the transport
    terms `2ω×v′` and `ω×(ω×r′)`. The kernel's doc (`kernel/frames/index.ts:22-27`)
    says a caller wanting the fictitious force must negate these. The module
    never negates them, but labels the arrows `\vec a_{cf}` and
    `\vec a_{Cor}`.
  - **Effect.**
    - The "centrifugal" arrow points **toward** the axis (−ω²r′).
    - The Coriolis arrow is +2ω×v′.
    - explain.md contradicts itself. Lines 32–34 give `a_cf = −ω²r′,
pointing toward the axis`, which is wrong physics, and
      `a_Cor = −2ω×v′`, which is right but is not what's drawn.
    - The description at `params.ts:124` says "outward-pointing".
    - `module.test.ts:110` is named "points toward the axis" but checks
      magnitude only.
  - **What is fine.** Readouts are magnitudes. The dashed `a′` arrow is
    correct, and the sub-audit matched it against a finite difference to
    1e-7.
  - **Recommendation.**
    - Negate both terms before drawing them.
    - Redraw as `a_cf + a_Cor = a′` tip to tail (not a zero-sum triangle).
    - Fix explain.md and the test name.
    - Add direction tests: `dot(a_cf, r′) > 0`, and `a_Cor = −2ω×v′`.
- **[V] rotational-dynamics rolling trace is an upside-down cycloid.**
  Severity high. Logged as **X-27**.
  - **Where.** `index.ts:545-551`.
  - **What the code does.** `rim = c + R sin(ωt)·rollDir − R cos(ωt)·up`
    gives x = vt + R sin ωt.
  - **What's correct.** A wheel rolling toward +rollDir needs
    x = vt − R sin ωt. As written, the traced point moves at 2v at the
    contact point and at 0 at the top. The cusps land at the top, which
    contradicts explain.md's "contact point has zero velocity" and the
    instantaneous-axis marker drawn in the same panel.
  - **Recommendation.** Flip the sign of the `sin` term. Add a test that the
    trace's velocity at contact is zero.
- **[V] rotational-dynamics parallel-axis readout is about the wrong
  axis.** Severity high. Logged as **X-28**.
  - **Where.** The readout is `scalars()`'s `parallelAxisTensor(…)[8]`
    (I_zz). The drawn axes (`index.ts:442-450`) follow `upVec`, which is y
    by default.
  - **Evidence.** At the defaults (box [1, 1.6, 2.4], m 1.5, offset
    [1.5, 0, 0]):
    - about the drawn y-parallel axis, I = 0.845 + 1.5·1.5² = 4.22;
    - the readout shows 3.82 (I_zz + m d²). X-24's own live check recorded
      exactly "3.82 kg·m²".
    - It is only right when up = z. The golden test uses a cube, where
      I_yy = I_zz, so it can't catch this.
  - **Recommendation.** Compute `n̂ᵀ I n̂` with n̂ = `upVectorOf(ctx)`,
    read live, as X-22 requires. Test it with a non-cubic box.
- **[V] rotational-dynamics precession swing is 2× too large.** Severity
  med-high. Logged as **X-29**.
  - **Where.** `index.ts:149` sets
    `baseSwing = 2·Ω_p·sinθ₀/ωₙ`, which is used as Δ in
    `θ(t) = θ₀ + Δ(1 − cos ωₙt)` (`index.ts:500`).
  - **My independent derivation.** For a fast top released from rest,
    linearise both conservation laws in the code's own comment:
    - θ̇² = 2(Mgl/I₁) sinθ₀ ε − a²ε², with a = ωₙ;
    - so ε = ε_max(1 − cos ωₙt)/2, with ε_max = 2Ω_p sinθ₀/ωₙ;
    - the coefficient multiplying (1 − cos) should therefore be
      **Ω_p sinθ₀/ωₙ**;
    - and ⟨φ̇⟩ = Ω_p (Goldstein), not 2Ω_p.
  - **Effect.** The code's secular rate at k = 0 is C·Δ = 2Ω_p. That
    doubling is the "3.44 vs 1.75 rad/s" X-21 recorded as a physical
    effect. The X-21 cusp test still passes, because the ratio is exactly 1
    whenever k = 0, independent of Δ's scale.
  - **Corroboration [R].** The sub-audit also integrated the exact
    heavy-top equations. At Ω = 600 the exact maximum excursion is 0.00378
    versus the code's 0.00747, and the mean φ̇ is 0.2053 versus the code's
    0.408. Also [R]: at the default Ω = 70, Ω_p/ωₙ ≈ 0.33, so the "fast top"
    linearisation is marginal. The exact excursion there is about 0.8 rad.
  - **Recommendation.**
    - Drop the factor of 2.
    - Re-derive the `nutationAmplitude` default.
    - Add a regression test against a short RK4 of the exact equations at
      large Ω. That's a test-only use of `kernel/ode`, which is
      doctrine-compatible.
    - Reword the `topSpinRate` help text. Right now it is changelog prose
      and repeats the fast-top claim.
- **[V] oscillations spring inverts at the default parameters.** Severity
  medium. Logged as **X-39**.
  - **Where.** `index.ts:221, 235-241`: `springLength = 1.125 − x`.
  - **Evidence.** The defaults (m 1, k 9, Ω 3) sit exactly at resonance, so
    A = 5/1.8 = 2.78. The spring's `scale.y` then reaches −1.65, and the
    mass box rises to about 3.8, above the 2.4 anchor.
  - **Recommendation.** Move the default drive off resonance, and/or clamp
    the _drawn_ displacement to about 0.8 × rest length while the readouts
    keep the true x.
- **[V] rotational-dynamics disc bodies are never sized.** Severity
  medium. Logged as **X-44**.
  - **Where.** `index.ts:313-318, 343-349`.
  - **Evidence.** The disc geometry has radius 0.5 (`body.ts:41`), and no
    `scale` is ever passed.
    - The wheel matches `rollRadius` only at its default of 0.5. The range
      is 0.2–1.2, so at 1.2 the wheel floats off the contact point.
    - The flywheel ignores `topRadius` (default 0.4) entirely.
  - This is the same family as the M7-1/M7-2 sphere-diameter bug.
- **[V] fields-gradients divergence-box face colours lose their sign.**
  Severity medium. Logged as **X-45**.
  - **Where.** `index.ts:300-309`, with `surface.ts:108-114`.
  - **Mechanism.** Each face is a separate `surface`, and each normalises
    `colorField` to its own min..max. A face with uniform F·n always renders
    mid-colour, so outward, zero and inward flux are indistinguishable,
    which defeats the panel's purpose.
  - **Recommendation.** Give `surface` an optional fixed `colorRange`
    prop. That's a Layer 1 capability every module gets.
- **[V] vector-algebra's head-to-tail "a+b" arrow is really b shifted.**
  Severity medium. Logged as **X-47**.
  - **Where.** `index.ts:192`.
  - **Effect.** The arrow labelled `\vec a+\vec b` runs from a to a+b, so
    its length is |b|. No resultant is drawn from the origin. Parallelogram
    mode draws no sides.
  - The same code is the ARCHITECTURE.md §21 cookbook example, so it
    propagates.
- **[V] gravitation's gravity arrow overshoots the central mass.**
  Severity low-medium. Logged as **X-52**.
  - **Where.** `index.ts:256-260`, with length `0.15·μ/r²`.
  - **Evidence.** At the defaults, periapsis r = 1 and the arrow is 1.2
    long, so it passes through the focus at t = 0. At e = 0.9 it is about
    30 units long.
  - **Recommendation.** Use a saturating length, clamped below
    r − the central body's radius.
- **[V] rotational-dynamics Dzhanibekov panel assumes body-y is the
  intermediate axis.** Severity low-medium. Logged as **X-46**.
  - **Where.** `reset()` spins about body y (`index.ts:654`), and
    `dzOmegaIntermediate: w2` (`:624`).
  - **Effect.** `boxSize` is editable, and the defaults happen to make y
    intermediate. [1, 2.4, 1.6] makes the spin stable and the label false.
  - **Recommendation.** Choose the axis from the sorted principal moments.
- **[V] vector-algebra `theta` can be NaN.** Severity low. Logged as
  **X-51**.
  - **Where.** `index.ts:249` calls `Math.acos` unclamped.
  - **Evidence.** a = [−0.5, 0, −3] with b = −0.5a gives cos =
    −1.0000000000000004, so θ = NaN. I reproduced this.
  - a = 0 also makes θ and the direction cosines NaN. Both are reachable
    through VectorPad.
- **[V] work-energy still caches `ctx.up` in `create()`.** Severity
  medium. Logged as **X-32**.
  - This is an X-22 instance that X-22's close-out missed.
  - **Where.** `index.ts:80` computes `upVec` once. `toWorld` closes over
    it; the ribbon, energy plane and turning points (`:99-131`) are built
    once; and `update()` reuses the stale `toWorld`.
  - **Effect.** After a live up-axis switch, the diagram stays in the old
    plane.
  - The other modules checked out:
    - projectile-motion, oscillations and rotational-dynamics are fully
      live (verified by the sub-audits);
    - momentum-collisions and non-inertial-frames don't read `ctx.up`.
- **[V-read] Under z-up, "2D-only" shows the world x–z plane, so modules
  drawn in world x–y render edge-on.** Severity medium. Logged as **X-42**.
  - **Mechanism.** The lock always does `goTo('+z')`. Under z-up,
    `fromCanonical` (`camera/index.ts:118-120`) maps that to world −y. That
    is correct for the gravity modules (projectile, oscillations,
    work-energy), which draw in the x/up plane.
  - **Affected.** Modules that hardcode world x–y as their plane:
    - non-inertial-frames (`toWorld = [x, y, 0]`, disc axis fixed to +Z);
    - gravitation at inclination 0;
    - control-showcase;
    - vector-algebra's `planar` mode.
  - These collapse to a line. M7-1's note already observed this for
    projectile-motion under z-up, but it was never logged.
  - **Needs a decision.** Either map "the 2D plane" through `ctx.up` for
    orientation-free modules, or have the 2D lock look down up × x̂.
- **[V] Minor module-level bugs.** Logged together as **X-53**:
  - **non-inertial-frames platform mark freezes.** θ = ω·t uses the
    exit-clamped t (`index.ts:234-237`), so the platform mark stops turning
    when the puck exits.
  - **projectile-motion default launch vector under z-up.** The default
    `launchVelocity` [8.49, 8.49, 0] (`params.ts:74`) has zero vertical
    component under z-up, so vector mode freezes at t = 0.

### Checked and found correct

The sub-audits, re-spot-checked by me where marked, found these correct:

- **gravitation.** The orbit outline and `orbitAt` share one Rx(i)·Rz(ω)
  transform, so X-25 is fully fixed (not covered for ω, i ≠ 0 by any
  test). Also correct:
  - v tangent, with |v| equal to vis-viva;
  - h ∥ r×v, drawn doubleHead violet;
  - central mass at the focus.
- **oscillations.**
  - A, δ via atan2, x = A cos(Ωt − δ), v, F = F0 cos Ωt;
  - X-22 is complete.
- **work-energy.**
  - ball at (ξ, ξ²);
  - the K bracket spans exactly 1 − ξ²;
  - turning points at (±1, 1).
- **momentum-collisions.**
  - contact separation exactly r1 + r2;
  - the restitution formulas;
  - the CM-frame velocity correction.
- **projectile-motion.**
  - trajectory, launch arrow, azimuth handedness;
  - X-22 is complete.
- **vector-algebra.** Projection, cross-product curl sense, parallelepiped
  faces, direction-cosine arcs, basis decomposition.
- **fields-gradients.** ∇f ⟂ tangent, D_û f, curl spin sense, cap normal
  vs. boundary orientation.
- **rotational-dynamics.** τ arc sense, moment-arm foot, L = Iω,
  inertia-ellipsoid semi-axes ∝ 1/√Iᵢ.

### Tech debt and consistency

- **work-energy explain.md.** `explain.md:27-30` says raising Amplitude
  makes "the turning points move out". The scene is in reduced coordinates,
  so nothing on screen moves [V]. Rewrite it.
- **vector-algebra `theta` is reported in degrees** (`params.ts:115`).
  `PHYSICS_CONVENTIONS.md` says angle-valued scalars are radians. Pick one
  and document the exception.
- **gravitation explain.md** uses `M` for both the central mass and the
  mean anomaly [R]. `trueAnomaly` goes negative on the return half, which
  the description doesn't mention [R].
- **Palette tokens used against convention** [R]:
  - rotational-dynamics: flywheel and axis trace in `energy`, contact point
    in `force`, rim trace in `angular`;
  - control-showcase: `doubleHead` on a non-pseudovector "ray".
- **`topSpinRate`, `rollOmega` and `dzSpin` declare no `unit`** [R].

## 4. Test-coverage gaps

- **Kernel coverage (99.55%) is real, but it is the only coverage
  measured.** `vite.config.ts` scopes coverage to `src/kernel/**`. The
  modules, scene and shell, where every physics bug in §3 lives, have no
  coverage number at all.
- **Module tests check readouts, never pictures.** No module test builds a
  recording context and asserts glyph props (gravitation's X-25 test is the
  single exception). This is the systemic reason §3 exists.
- **Trivial module tests.**
  - **`_template/module.test.ts`** is named "matches its folder name" but
    only asserts `toBeTruthy()`. Every scaffolded module inherits it
    [V-read, via the sub-audit].
  - **`control-showcase/module.test.ts`** has declaration checks only,
    which is how X-40 (its default expression can't compile) slipped
    through.
  - **vector-algebra** has two golden cases, and no parallel-vector or
    zero-vector case.
- **The contract suite is weaker than its descriptions.** I verified each
  of these in `tests/contract/modules.contract.test.ts`:
  - **urlKey scope (`:112-117`).** The "urlKeys unique and ≤ 4 characters"
    check covers **params only**, but `MODULE_AUTHORING.md:280` says
    "params and layers". Nothing checks keys against the shell's reserved
    keys; that gap is why X-30 exists.
  - **Idempotence (`:159-176`).** State B differs from A only in `t`, so it
    is vacuous for `static` modules. `visible()` calls aren't compared.
  - **NaN sampling (`:239-262`).** It uses `Number.isNaN` only, so
    `Infinity` passes. It checks `scalars()` only (glyph props are never
    checked), always uses **default layers**, and never calls `step()`.
  - **Up-axis runs.** They build a fresh context per axis, so the X-22 bug
    class (caching `ctx.up` in `create()`) passes. X-32 is proof.
  - **Handle counts.** Nothing asserts that `stats.created` stays constant
    across repeated `update()` calls.
  - **Expression params.** Nothing checks that an expression param's
    `default` compiles against its declared `vars` (X-40).
- **Scene tests assert "doesn't throw" more than geometry.** Examples:
  - `arrow.test.ts:28` checks only `0 < x ≤ 2` for the head, which is why
    X-48 (the tip falls short of `to`) passes;
  - `curvedArrow.test.ts:34-35` enshrines an angle-0 reference of −y rather
    than +x [R];
  - the `field` test checks only for NaN, not the zero-magnitude arrow
    (X-57).
- **"Verified by inspection" items.** These are in `TASKS.md` for a
  _structural_ reason: `Viewport` cannot be constructed under jsdom (M2-2,
  M2-15, M2-20, M3-8). This audit found real bugs in exactly that
  structurally untested file, `Viewport.ts`:
  - X-31: `renderNow()` skips the frame listeners;
  - X-49: projector mode;
  - X-55: fade.

  That is evidence the jsdom limitation now costs more than a
  Playwright-level Viewport test would.

## 5. Documentation staleness

- **README.md.**
  - `README.md:90-92` says "**Five** modules are live today" and lists
    five. Ten are registered. [V]
  - `README.md:86` says "installable". There is no web-app manifest
    (`index.html` has no `rel="manifest"`, and `public/` holds only
    `fonts/`), so the site is offline-capable but not installable as a PWA.
    [V]
- **AGENTS.md.** "Current state" is accurate: 10 modules, correct ids,
  M0–M6.5 done.
- **control-showcase/explain.md:10** says to toggle "Reference grid". That
  layer was removed at UI-2, and the module's layers are `trace` and
  `answer` [V]. Logged as part of **X-40**.
- **Stale numbers and status text in `TASKS.md`** (not wrong decisions, so
  I left them unedited):
  - X-3/M4-9 quote a 67.83 KB entry chunk; it is now 74.12 KB.
  - The two QA-checkpoint entries (`TASKS.md:1220, 1646`) still say "X-17
    still `READY`", but X-17 is `DONE`.
  - X-21's "3.44 vs 1.75" is an artefact of X-29.
  - M7-4 says "`x`/`v` are both plottable"; only `x` is now.
- **`_template/manifest.ts:7`.** The `TODO: rename…` survives `new:module`
  id substitution, so every generated module ships a stale TODO [R].
  Otherwise there is no stub-era language: grep finds no "not implemented"
  or "coming soon" outside `_template`, and no TODO/FIXME in `src`.
- **The ARCHITECTURE.md §21 cookbook** carries the X-47 sum-arrow pattern.
  Fix the doc with the code.
- **MODULE_AUTHORING.md glyph table.** It doesn't state each `body` kind's
  unit geometry:
  - sphere: diameter 1;
  - box: unit cube;
  - cylinder, rod and spring: along local +y, length 1;
  - disc: normal +y, diameter 1.

  The sphere-halving bug (M7-1/M7-2 QA) and X-44 are the same author
  mistake twice.

## 6. Bundle budget and allocation discipline

- **Budget gate passes, but it is narrower than §17 reads.**
  - Only the entry chunk (74.12 KB) is gated.
  - `dist/index.html` **modulepreloads three and katex on every route,
    including the gallery.** So the JS a first visit actually downloads is
    about **314 KB gz**, over the 250 KB "initial JS" budget if that means
    what the browser loads. [V]
  - This is a doctrine question, not a bug. Either record in an ADR that
    pinned vendor chunks are exempt, or keep three and katex off the
    gallery route.
- **[V-read] ModuleView re-renders the whole panel every frame during
  playback.** Severity high. Logged as **X-41**.
  - **Where.** `const state = useAppStore()` (`ModuleView.tsx:734`)
    subscribes to the entire store, and `t` changes every frame.
  - **Effect.** Params, layers, timeline, readouts and both plots
    reconcile at 60 Hz.
  - **Estimate [R].** SweepPlot's `evaluate` prop is new each render, so it
    recomputes 100 `scalars()` calls per frame, roughly 100+ `scalars()`
    calls and thousands of short-lived objects per frame.
  - **Recommendation.** Use narrow selectors, a memoised `evaluate`, and
    about 10 Hz readout, series and aria-label updates.
- **Module `update()` allocations during playback.** Counts are [R] from
  the sub-audits; I spot-read the code shapes. All of these contradict DoD
  item 6 ("zero animation-loop allocations"):

  | Module              | Allocations per frame | Cause                                                                                                                                                                  |
  | ------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | gravitation         | ~1,450                | Rebuilds its 97-point orbit outline every frame (`index.ts:236`), although it depends only on (a, e, ω, i)                                                             |
  | projectile-motion   | ~350                  | 65-sample trace                                                                                                                                                        |
  | non-inertial-frames | ~250                  | Rotating trace                                                                                                                                                         |
  | fields-gradients    | —                     | `parametric` only so the paddlewheel can spin. Each frame it recompiles expressions, rebuilds the 1,681-vertex heightmap and six box faces, and resamples 81 gradients |
  | rotational-dynamics | —                     | 60+80 trace points, `eigenSymmetric3`, and `step()` allocations (contradicting its own comment at `:395`)                                                              |

  **Recommendation.** Memoise param-only geometry on a params fingerprint,
  and reuse the point buffers (`path` copies its input, so reusing one array
  is safe).

- **Small per-frame allocations in scene** [R]:
  - `FrameInfo` per tick;
  - label `{left, top}` objects;
  - `new THREE.Color` in `arrow.applyStaticProps` (`arrow.ts:75`, which I
    verified);
  - prop spreads on every `set()`.

  None matters alone, but together they mean the "zero allocation" claim
  isn't literally true anywhere.

## 7. Cross-module consistency

- **[V] URL keys collide with shell-reserved keys.** Severity high. Logged
  as **X-30**.
  - **Where.**
    - `vector-algebra/params.ts:27` and `oscillations/params.ts:43` use
      `urlKey: 'c'`, which is the camera (`urlCodec.ts:194`);
    - `fields-gradients/params.ts:53` and `control-showcase/params.ts:18`
      use `'th'`, which is the theme (`:197`).
  - **Mechanism.** Params and prefs share one `URLSearchParams`, and
    `set()` overwrites.
  - **Effect.** Any bookmark with a non-default camera and a non-default
    `c` param loses one of them. Decoding a `c` param also feeds its value
    into `decodeCamera`.
  - **Why the contract suite passes.** Its round-trip always uses the
    default camera and the light theme.
  - **Recommendation.**
    - Publish a reserved-key list (`v z L t c up th pj gr gxy gxz gyz`).
    - Enforce it in the contract suite, for params and layers.
    - Rename the four keys, with migrations per ADR 0003.
- **`ScalarDef.description` quality (ADR 0014 bar).** Mostly good. These
  weak ones just restate the symbol [V-read, quoted by the sub-audits]:
  - `fields-gradients` `divVolumeIntegral`, `curlFluxThroughCap` and
    `fluxThroughBox`;
  - `momentum-collisions` `p1` and `p2` ("…the product of its mass and
    velocity");
  - `non-inertial-frames` `rho`;
  - `vector-algebra` `theta` ("tip to tip through the origin" is
    misleading).
- **`help` overuse** (the MODULE_AUTHORING smell test).
  - projectile-motion sets `help` on 4 of 6 params. Elevation's help,
    "Angle above the horizontal plane", restates the label.
  - `topSpinRate`'s help is changelog prose.
- **urlKey length.** All ≤ 4 characters and unique within each module.
- **Raw hex.** None in any module.
- **Raw hex in shell and scene.** Outside `theme/` and `tokens.css`:
  - `TimeSeriesPlot.tsx:37` hardcodes `stroke: '#0072b2'`, position blue,
    for **whatever** scalar is plotted: speed, displacement, energy. That's
    a colour-semantics violation in the one place every module's data is
    plotted [V].
  - `export/gif/quantize.ts:28` duplicates the scene background `#eceef2`.
  - Duplicated ink and surface literals in glyphs (`0x12161d` ×5,
    `0xeceef2` ×2) aren't drift-guarded; `tokens.test.ts` compares only the
    eight `--q-*` tokens [R].

## 8. Accessibility and the manual checklist

What I actually verified versus what I took on faith:

| Check                                           | Verified in this audit                       | Status                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colour-blind safety                             | Yes, numerically, at palette level           | **Fails for one pair** (see below)                                                                                                                                                                                                                                                             |
| Dark theme and scene labels                     | Yes, by reading                              | **Broken** (X-38)                                                                                                                                                                                                                                                                              |
| Projector mode, scene half                      | Yes, by reading                              | **Mostly a no-op** (X-49)                                                                                                                                                                                                                                                                      |
| Reduced motion                                  | By reading                                   | Motion tokens drop to 0 ms; Viewport gets `reducedMotion` as a mount-time snapshot, with no change listener (acceptable)                                                                                                                                                                       |
| 320 px                                          | **No**                                       | Taken on faith from `TASKS.md`: e2e for vector-algebra, and hand checks for momentum-collisions, non-inertial-frames, oscillations, gravitation and projectile-motion. **Not claimed anywhere** for work-energy, rotational-dynamics or fields-gradients beyond the module-agnostic M3-35 test |
| Real projector hardware                         | No, and nobody ever has                      | Standing residual gap                                                                                                                                                                                                                                                                          |
| Colour-blindness _simulator_ on rendered frames | No, and no module's `TASKS` entry did either | Every entry argues from the palette, which this audit shows is not a sufficient argument                                                                                                                                                                                                       |

- **[V] `--q-angular` (#7a4fbf) vs `--q-position` (#0072b2) under
  deuteranopia.**
  - **Evidence.**
    - The sub-audit used Machado 2009 with CIEDE2000 and got ΔE00 **2.1**,
      the worst pair in the palette.
    - My independent check, Machado 2009 with CIE76, also ranks this pair
      worst: 46.2 → **7.6**.
    - Force vs construction grey is the next weakest (8.2 protan, 9.0
      deutan by my check).
  - **Why it matters.** `#7a4fbf` is not an Okabe–Ito colour. The
    "colourblind-safe" claim in `tokens.css` and `PHYSICS_CONVENTIONS.md`
    doesn't hold for this pair. `doubleHead` is a redundant channel for
    arrows, but not for angular-coloured paths and arcs.
  - **Recommendation.** An ADR choosing a violet that differs from position
    blue in lightness, plus a CVD ΔE floor in `tokens.test.ts`. This is a
    proposal because it changes a binding token.
- **[V-read] Dark theme makes scene labels unreadable.** Severity high.
  Logged as **X-38**.
  - **Mechanism.** The scene background is hardcoded `0xeceef2`
    (`Viewport.ts:133`). The label overlay has no class or colour
    (`htmlOverlay.ts:24-27`), so it inherits `body { color: var(--ink-0) }`,
    which is `#eef1f6` in dark mode.
  - **Effect.** Near-white labels on a near-white canvas. The sub-audit
    computed 1.03:1 [R].
- **[V-read] Projector mode barely changes the scene.** Severity medium.
  Logged as **X-49**.
  - **Line width.** Every line is `THREE.Line` with
    `LineBasicMaterial`/`LineDashedMaterial`. `linewidth > 1` is ignored
    under ANGLE, which covers Chrome, Edge and Firefox on Windows. So
    `lineWidthMultiplier: 1.6` (`Viewport.ts:486-504`) does nothing.
  - **Opacity floor.** The `minOpacity` floor is overwritten by `patch`'s
    own `applyProps` on every `set()` [R].
  - **Recommendation.** Use `Line2`/`LineMaterial` from `three/examples`,
    which adds no dependency.
- **[V] Keyboard map hijacks browser shortcuts.** Severity high. Logged as
  **X-36**.
  - **Where.** `presenter/index.tsx:18-27` checks `e.key` with no
    Ctrl/Meta/Alt test and calls `preventDefault()`.
  - **Effect.**
    - Ctrl+R resets params instead of reloading.
    - Ctrl+C overwrites the clipboard with the URL.
    - Ctrl+F toggles fullscreen instead of find.
    - Space on a focused `<button>` or `<summary>` toggles play instead of
      activating it [R], which is a keyboard-accessibility regression.
- **Other items [R].**
  - `--ink-2` (#7b8494) on the surfaces is 3.25–3.77:1, below AA for the
    `.pv-field__symbol` text.
  - The keymap overlay has `role="dialog"` with no focus handling.
  - Tooltips can't be dismissed with Escape (WCAG 1.4.13).

## 9. Dependency hygiene

- **`npm audit`: 7 findings (2 critical, 2 high, 3 moderate).** All are in
  dev tooling:
  - vitest 2.1.9 and @vitest/coverage-v8 (critical: UI-server file read);
  - vite 5.4.21 (high: dev-server path traversal);
  - esbuild, vite-node and @vitest/mocker (moderate);
  - js-yaml (high, transitive).

  None ships in `dist/`. The risk is to a developer running `npm run dev`
  on an untrusted network. The fix needs the Vite 5→8 and Vitest 2→5 major
  bumps. That's worth one scheduled upgrade task with its own verification
  sweep, not an `audit fix --force`.

- **`npm outdated`.** Everything is on its major line except intentional
  pins:
  - three 0.160 (latest 0.186);
  - React 18, zustand 4, ESLint 8 (EOL), typescript-eslint 7, TypeScript
    5.9 (7.0 available);
  - katex 0.16.47 (0.18.7).

  ESLint 8 is end-of-life, and a flat-config migration touches
  `.eslintrc.cjs`. Re-prove X-33's holes after any migration.

- **Unused.** `@types/lz-string` is redundant: lz-string 1.5 ships
  `typings/lz-string.d.ts`. Everything else is used. `jest-dom` is used via
  `tests/setup.ts`; `uplot` and `wouter` are imported.

## 10. Security

- **[V] URL decode guard (X-20) is incomplete.** Severity medium. Logged as
  **X-35**. By field in `urlCodec.ts`:
  - **`t=` (`:261-262`).** Raw `Number(t)`. NaN, negative and 1e308 all
    pass. With NaN, `t` stays NaN forever [R].
  - **`c=` (`:161-168`).** Components go through `Number` with
    `parts[i] ?? default`. NaN isn't nullish, so NaN and Infinity reach
    `camera.setState`; radius 0 passes too.
  - **`v=` (`:230-233`).** Unvalidated. `v=abc` (NaN) and `v=99` both skip
    migration and load as current. A link from a newer schema should get
    the notice.
  - **select (`:105-107`).** Values aren't checked against `options`.
  - **expression (`:105-107`).** It runs `decodeURIComponent` on an
    already-decoded `URLSearchParams.get()`. A bare `%` (`?f=50%`) throws
    `URIError` out of the seed effect, into the error boundary. X-20's note
    that expression input is covered by `kernel/expr`'s typed errors is
    wrong, because this throw happens first.
  - **`z=` (`:223-226`).** It decompresses with no size cap. The sub-audit
    measured an 8.3K-character payload inflating to 10M characters [R], a
    tab-freezing decompression bomb from a link.
  - **Recommendation.** Wrap the whole decode in try/catch and fall back to
    defaults with the migration notice. Clamp `t` to [0, `DEFAULT_MAX_T`].
    Run camera values through `clampDecodedNumber`. Treat a non-integer or
    future `v` as unmigratable. Validate select values. Drop the double
    decode (a link-format change, so it needs an ADR). Cap the `z=` blob and
    decompressed lengths.
- **[V] `kernel/expr` has no recursion-depth limit.** Severity
  low-medium. Logged as **X-43**.
  - **Evidence.** I bundled the kernel to the scratchpad and tested it:
    1,000 nested parentheses compile, and 3,000 throw
    `RangeError: Maximum call stack size exceeded`. `compileExpr` re-throws
    non-`ParseError`s.
  - **Current exposure.** Only control-showcase has an expression param
    today. It becomes important at M7-9 (Sandbox), which is URL-fed by
    design.
  - **Recommendation.** A depth counter raising a `ParseError`, plus a
    length cap.
- **KaTeX: safe.** All three call sites (MathSpan, explain, scene
  `htmlOverlay`) use `trust: false` (the default) and
  `throwOnError: false`. No URL-derived or user-typed string reaches any
  KaTeX input; the only dynamic latex is formatted numbers.
- **explain.md** (authoring-time only, low) [R]:
  - `out.replace(token, rendered)` uses a _string_ replacement, so a `$'`
    in KaTeX output splices in document text;
  - math inside code spans is rendered;
  - `marked` passes raw HTML through unsanitised.

  All of this is repo-authored content, so the risk comes only from a
  malicious PR. Use a replacer function, and consider a renderer hook that
  drops raw HTML.

- **Service worker: no cache-poisoning surface.** There is no `cache.put`.
  Only the precache list is ever stored, `cache.addAll` is atomic, and old
  caches are cleaned. Weaknesses [R]:
  - navigations have no `ignoreSearch` and no `index.html` fallback;
  - `VERSION` hashes only the URL list, so a `sw.ts`-only change doesn't
    bump the cache;
  - the update notice is missed if a worker is already `waiting` at load
    (`register.ts:43-55`, which I verified). Logged as **X-56**.

---

## Additional bugs found (logged to `TASKS.md`, all [V] or [V-read] except where noted)

- **X-31: GIF export draws no arrows, points or ticks.** Severity high.
  - `Viewport.renderNow()` (`Viewport.ts:229-233`) skips the
    `frameListeners` loop that only `tick()` runs (`:539`).
  - `arrow.ts:92-145` computes every shaft and head position, and
    `point.ts` every size, _only_ in `onFrame`. `capture.ts:71` calls
    `stopLoop()` immediately.
  - So every exported frame has unpositioned arrows. It is still
    byte-identical from run to run, which is why P-G passes: it checks
    determinism and the colour table, not content.
  - The off-screen Viewport's label overlay also lands on
    `document.body` [R].
- **X-34: URL prefs are decoded but never applied.**
  - `ModuleView.tsx:203-210` hydrates without `decoded.prefs`, and
    `store.hydrate` keeps `get().prefs`.
  - So `up=`, `th=`, `pj=`, `gr=` and `gxy=`/`gxz=`/`gyz=` are write-only.
    A z-up demo link opens y-up on a student's machine, which breaks ADR
    0009's "link reproduces the view".
- **X-37: unit prefixes are glued onto powered units.**
  `unitSymbol.ts:140-159`. I ran it:
  - 2000 m²/s → "2.00 km²/s" (that reads as 2×10⁶ m²/s);
  - 3.986e14 m³/s² → "399 Tm³/s²";
  - L⁻¹ → "2.00 m1/m".
  - This is reachable today: gravitation at μ = 1, a = 5 shows specific
    energy −0.1 m²/s² as **"−100 mm²/s²"**, which is 1000× off.
- **X-40: control-showcase fixture problems.**
  - The expression default `sin(x) * k` declares `vars: ['x']`, so it never
    compiles, and `fValue` is always 0 (`params.ts:43-44`).
  - explain.md names a removed layer.
- **X-48: arrow tip falls short of `to` by half a head length.**
  `ConeGeometry` is centred (`arrow.ts:41-43`) but positioned at
  `to − h·dir` (`:125`). A double head's tail misses `from` the same way.
- **X-50: stepped playback races after the tab is backgrounded.** The rAF
  `dt` is unclamped (`ModuleView.tsx:471`), and `FixedStepAccumulator`
  keeps its backlog past `MAX_STEPS_PER_FRAME` and is never reset on
  pause or scrub (`driver.ts:37-46`).
- **X-54: every `path` fades its first vertex toward the background, even
  without `persistence`.** `path.ts:72`. Two-point axis lines and closed
  outlines (gravitation's orbit, the fields-gradients cap boundary) render
  with an invisible end.
- **X-55: layer fade-in is a no-op for a layer shown before.**
  - `Viewport.ts:352` flips `transparent` without `needsUpdate`.
  - three r160 compiles `OPAQUE` (alpha forced to 1) from `transparent`
    into the program (`WebGLPrograms.js:248`, `opaque_fragment`). None of
    `WebGLRenderer`'s `needsProgramChange` checks look at `transparent`.
  - Verified by reading the three.js source; not observed rendered.
- **X-57: `field` glyph draws a +y arrow at zero-field samples.**
  `field.ts:93-97, 120-121`, where the minimum length is 0.15 × base.
- **X-58: `dimensionLine` and `surface`'s wireframe re-show themselves on
  `set()` after `visible(false)`.** Latent.
  - `dimensionLine.ts:77-78` unconditionally sets `line.visible = true` in
    `applyGeometry`.
  - `surface.ts:122` does the same for its wireframe lines.
  - No current module calls `.visible(false)` then `.set()` on either
    (work-energy sets then hides; rotational-dynamics never hides), so
    nothing shows the bug today.
- **X-59: ModuleView lifecycle races.**
  - The 420 ms 2D-lock `setTimeout` is never cleared
    (`ModuleView.tsx:443-446`), so toggling back within 420 ms re-locks,
    and after unmount it calls a disposed camera.
  - The time series appends a point on _every_ store change
    (`:339-345`), so a paused param drag floods it, and a reset makes x
    non-monotonic.

## Tech debt and proposals (not logged to `TASKS.md`)

1. **Glyph-output golden tests, systemically.**
   - Give `MockSceneContext` a small query API, e.g.
     `lastSet(handleKind, label?)`.
   - Add a `MODULE_AUTHORING.md` rule: every glyph whose geometry encodes a
     formula (a trace, an outline, a guide arrow) gets a golden test on its
     `.set()` output, not just on `scalars()`.
   - Twelve of this audit's bugs are exactly this shape.
2. **A stronger contract suite:**
   - random layers;
   - a random state B for idempotence;
   - `Number.isFinite` on recorded glyph props;
   - a live `ctx.up` switch inside one context (which would catch X-32);
   - handle-count stability;
   - reserved-key and layer-key checks;
   - expression defaults compile.

   Each is a few lines in the one file that "is the architecture" (§3.6).

3. **A Playwright-level `Viewport` harness.** It would exercise `pick()`,
   fades, `renderNow()` and projector mode through a real WebGL context.
   That replaces the "verified by inspection" category that hid X-31, X-49
   and X-55.
4. **Palette ADR** for `--q-angular`, plus a CVD ΔE floor in
   `tokens.test.ts`.
5. **Bundle-budget ADR.** Decide whether three and katex count toward the
   250 KB initial budget, or lazy-load them off the gallery.
6. **Graticule.** The §15 "signature element" is mounted only by
   `demoScene`, and its labels assume the world origin is at screen centre
   [R]. Either wire it into module views or retire it from §15.
7. **Scheduled dependency upgrade.** Vite 8 and Vitest 5 clear every audit
   finding. Also ESLint 9 flat config, re-proving X-33.
8. **Minor tech debt [R]:**
   - `surface` leaks its rebuilt `WireframeGeometry` (unused today);
   - `surface` triangle winding gives −(∂u×∂v) normals, the opposite of
     ADR 0013, hidden by `DoubleSide`;
   - `curvedArrow`'s angle-0 reference is −y, not +x;
   - `dimensionLine` offsets toward the camera in 2D views, and reads `up`
     once (latent);
   - ortho labels behind the camera still show;
   - `Viewport.dispose()` never calls `forceContextLoss()`;
   - `demoScene` ships in the production bundle;
   - `@types/lz-string` is redundant;
   - `_template`'s TODO survives scaffolding;
   - `_template` doesn't demonstrate a live `ctx.up` read.

---

## If you only do five things

1. **Fix the four wrong-on-screen physics bugs, then close the gap that
   hid them.** These are X-26 (reversed fictitious accelerations), X-27
   (upside-down cycloid), X-28 (parallel-axis readout about the wrong
   axis) and X-29 (precession 2×). Each one teaches a student something
   false. Then do proposal 1 (glyph-output golden tests), so the X-25 shape
   stops recurring.
2. **Fix GIF export (X-31).** Every exported GIF, the feature M6.5 exists
   for, is currently missing its arrows and points. It's a one-method fix
   plus a content assertion in `gif-export.spec.ts`.
3. **Make bookmark URLs trustworthy.** These are X-30 (key collisions: four
   modules), X-34 (prefs never applied) and X-35 (decode guard gaps).
   Bookmarks are the product's core promise (§1), and all three were
   invisible to a round-trip test that only ever used default camera and
   prefs.
4. **Close the ESLint barrel and relative holes (X-33).** Right now
   `import … from '@/scene'` inside a module passes lint, so "modules cannot
   import three" is enforced by convention, not by the rule §3.1 says it
   is.
5. **Legibility where the doctrine says it matters most.** These are the
   dark-theme labels (X-38), the no-op projector mode (X-49), the
   angular/position CVD collision (the palette ADR), and the per-frame
   whole-panel re-render (X-41), which is the stutter §2 warns about.
