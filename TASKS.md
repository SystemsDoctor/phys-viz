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

| Status    | Meaning                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `READY`   | Unblocked. Prerequisites are met and this can be started now.                                                                                                 |
| `DONE`    | The stated acceptance criterion is met and verified (not just "code written" — run the check).                                                                |
| `BLOCKED` | Cannot start yet. Reason stated inline (usually: an earlier milestone's acceptance criterion isn't met — milestones in §20 are ordered and gated on purpose). |
| `IDEA`    | Not scheduled work. Captured so it isn't lost, but out of scope until explicitly pulled onto the active milestone.                                            |

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
- Each milestone's **gate task** (`M*-G`) _is_ the §20 acceptance
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

- [DONE] **M0-6** Install dependencies and run `npm run typecheck && npm run lint && npm run test:unit && npm run test:contract && npm run build` end to end at least once in this environment — never yet executed here, so none of the config above is actually verified. Ran `npm install` (committed `package-lock.json`); fixed six pre-existing type errors surfaced by the first real `typecheck` run (readonly `Vec3` tuples vs. mutable tuple props on `ArrowProps`/`ArcProps`/`PatchProps`, two unused-symbol errors, one error-boundary `render()` return type) so all five commands now pass clean
- [DONE] **M0-7** Add `@vitest/coverage-v8` and a `test:coverage` script with a ≥90% line threshold scoped to `src/kernel/**`. M1's acceptance criterion is a coverage number and there is currently no coverage tooling at all (§18, §20 M1). Added `coverage` config to `vite.config.ts` (provider `v8`, `include: ['src/kernel/**']`, 90% thresholds on lines/statements/functions/branches) and a `test:coverage` script; ran it and confirmed it reports and fails correctly against the still-unimplemented kernel (expected — M1 is where kernel tests bring it over threshold). Not wired into `ci.yml` yet; that's M1-24
- [DONE] **M0-8** Add `format:check` to `ci.yml`. The script exists in `package.json` but CI never runs it, so Prettier drift lands silently. Note it fails repo-wide today: files are checked out CRLF on Windows while Prettier defaults to `endOfLine: "lf"`, and the committed markdown tables aren't Prettier-shaped — so this needs `endOfLine: "auto"` (or a `.gitattributes` decision) plus one formatting sweep before it can gate anything. Chose the `.gitattributes` decision over `endOfLine: "auto"`: added `* text=auto eol=lf` (plus binary declarations for image/font formats ahead of M0-10) so the repo is LF regardless of a contributor's local `core.autocrlf` — this checkout had it `true`, which is the actual root cause. Ran `prettier --write .` for the one-time sweep (reformats the markdown tables and a couple of long lines); `format:check` now passes and is added as a CI step before typecheck
- [DONE] **M0-9** Harden the ESLint module boundary — four real holes in `.eslintrc.cjs` today: (a) the `three` group is an exact match, so `three/examples/jsm/...` slips through every layer's ban (add `three/*`); (b) the `src/modules/**` override does not restrict `@/modules/*`, so one module can import another, which §6 forbids; (c) it does not restrict `@/scene/*`, so a module can import scene _runtime values_, not just the `SceneContext` type the §21 cookbook needs — allow the type-only import and ban the rest (pair with `@typescript-eslint/consistent-type-imports`); (d) alias-based patterns don't catch relative escapes (`../other-module/index`, `../../scene/...`) — add relative patterns too. All four fixed: (a) added `three/*` everywhere `three` is banned (kernel, modules); (b) `@/modules/*` banned in the modules override except `!@/modules/types`; (c) switched the modules override to `@typescript-eslint/no-restricted-imports` (the base rule can't see import-kind) with `@/scene/*` banned except `!@/scene/SceneContext`, plus an `allowTypeImports: true` entry so only `import type ... from '@/scene/SceneContext'` survives, paired with `@typescript-eslint/consistent-type-imports: error` so a type-only usage can't be smuggled in as a plain import; (d) added `../*` (except `!../types`) and `../../scene/*` relative patterns. Verified against `node_modules/ignore`'s actual matching semantics before writing the patterns (confirmed a trailing `*` matches across `/`, unlike literal `.gitignore` single-segment semantics), then proved all four against a scratch file with one violation per hole (six errors, one per import) before deleting it — see M0-13 for the formal record
- [DONE] **M0-10** Self-host fonts: download IBM Plex Sans + IBM Plex Mono woff2 into `public/fonts/` and add the `@font-face` rules to `src/design/tokens.css` (§15, §19; `public/fonts/README.md` carries this as a TODO(M0)). A lecture hall behind a captive portal is exactly where a CDN font fails. Sourced the woff2 files (Latin subset, Sans 400/500/600, Mono 400/500) from the `@fontsource/*` npm packages — a straight repackaging of the upstream IBM/plex release — without adding either as a project dependency; copied the OFL-1.1 licence alongside them. `@font-face` `url()`s are root-absolute (`/phys-viz/fonts/...`) since Vite does not rewrite `public/`-sourced CSS `url()`s for a non-root `base` — confirmed the built CSS carries the literal path and `dist/fonts/` contains the files
- [DONE] **M0-11** Verify the built `dist/` actually contains `.nojekyll` and that no emitted asset path begins with `_` in a way Pages would drop (§19). Both confirmed after a clean build: `dist/.nojekyll` present, `find dist -type f` has no `_`-prefixed path

### The acceptance work itself

- [DONE] **M0-12** Implement a minimal `App.tsx` / `main.tsx` that renders a rotatable cube (currently `App.tsx` throws `not implemented`) — enough to satisfy M0's bar, not the full shell. Keep the cube in a throwaway file that M2's demo scene (M2-19) can replace. Added `src/scene/demoCube.ts` (raw three.js: `BoxGeometry`, `OrbitControls`, one `requestAnimationFrame` loop, disposed on cleanup) and pointed `App.tsx` at it via a bare `<canvas>` + `useEffect` — no shell architecture, no `three` import in `App.tsx` itself. One real bug caught in dev: a `position:fixed; inset:0` canvas is a _replaced element_ and does not stretch to fill without explicit `width/height: 100%` — CSS spec, not a Vite/three quirk. Verified via the dev server: all module/chunk requests 200, zero console errors, canvas resizes to the full viewport. Could not capture an actual pixel screenshot in this session's browser tool (the pane never composites here, so `requestAnimationFrame` never fires — confirmed via `document.visibilityState`); instead verified the exact scene-construction code renders correctly by manually invoking `renderer.render()` once outside the rAF loop and sampling pixels (background `#eceef2` and lit shades of the cube's `#0072b2`, 9 distinct colors) — a real user's foregrounded tab does not have this restriction. Flagging this limitation rather than claiming a visual check I didn't get
- [DONE] **M0-13** Confirm a deliberate cross-layer import (e.g. `import * as THREE from 'three'` inside `src/modules/_template/`) fails `npm run lint`, then revert the deliberate violation. Repeat for each hole closed in M0-9 so the fix is proven, not assumed. Done as part of M0-9: a scratch file in `src/modules/_template/` with one violation per hole (`three/examples/jsm/...`, alias and relative cross-module imports, a value import of `@/scene/SceneContext`, a relative escape into `scene/glyphs/`) produced six lint errors, one per import; file deleted after, `npm run lint` confirmed clean again
- [DONE] **M0-14** Push to GitHub, confirm `deploy.yml` publishes to Pages at the live URL, confirm `ci.yml` is green on the PR. Pushed; found both workflows `disabled_manually` on GitHub (from the pre-lockfile pushes that failed instantly at `npm ci`), re-enabled them (`gh workflow enable`), pushed again to exercise them for real. `ci.yml` green end to end (format check through E2E smoke). `deploy.yml` initially failed at `actions/deploy-pages` with `404 — Ensure GitHub Pages has been enabled`; asked the repo owner to flip Settings → Pages → Source → GitHub Actions rather than attempting it myself, per this file's own note. Once done, reran the deploy job (`gh run rerun`) and it succeeded — `https://systemsdoctor.github.io/phys-viz/` returns 200, and loading it in a browser shows a mounted React root with a `<canvas>` holding a live WebGL context and zero console errors
- [DONE] **M0-G** **Gate:** rotatable cube live at the Pages URL, CI green, cross-layer import fails lint. Do not start M1 until this is true. All three confirmed: the live Pages URL serves the app with a WebGL canvas mounted (M0-14); `ci.yml` green on `main` (M0-14); the deliberate-violation scratch file failed lint on all four M0-9 holes, then was reverted (M0-9/M0-13). **M1 is unblocked.**

## M1 — Kernel

**Accept when:** ≥90% coverage and all golden-value physics tests pass.
No file under `src/kernel/` imports anything outside it.

M1-G is now met — see below. Every task on this milestone is `DONE`.

- [DONE] **M1-1** `kernel/math` — Vec2/Vec3/Mat3/Mat4/Quat as plain typed structures with free functions, providing **both** allocating and in-place (`addInto(out, a, b)`) variants (`src/kernel/math/index.ts` stubs all throw). None of Vec2/Mat3/Mat4/Quat had function stubs at all (only the type aliases) — implemented the full set (identity/multiply/transpose/determinant/invert for Mat3+Mat4, the full quat suite below). 100% line coverage
- [DONE] **M1-2** `kernel/math` scratch pool — a pre-allocated ring of temporaries (`tmp.v3()`), documented loudly, with a test proving a hot path through it allocates nothing. GC pauses are visible as stutter on a projector (§7). True ring buffers (64 slots each for `v2`/`v3`); tested by object-identity after a full ring cycle rather than a GC-timing-flaky heap check
- [DONE] **M1-3** `kernel/math` quaternion path complete enough that no caller ever needs Euler storage — the rigid-body and gyroscope modules gimbal-lock otherwise (§7). Include quat↔matrix, slerp, `fromAxisAngle`. Also: `multiplyQuat`, `conjugate`, `inverseQuat`, `rotateVec3` (optimized sandwich, no full matrix build). `fromMatrix` via Shepperd's method, all four branches exercised by round-tripping 180° rotations about each axis
- [DONE] **M1-4** `kernel/frames` — Cartesian ↔ cylindrical ↔ spherical conversions **with Jacobians**, right-handed per ADR 0008. None of this existed in the stub. Verified right-handed (`r̂ × θ̂ = ẑ`/`φ̂`) and every Jacobian cross-checked against central-difference numerical differentiation of the corresponding conversion function, independent of the closed-form derivation
- [DONE] **M1-5** `kernel/frames` — `Frame` type, `transformPoint`, `transformVector`. `Frame` = local→parent rigid transform
- [DONE] **M1-6** `kernel/frames` — `transformVelocity`/`transformAcceleration` with all four terms separately retrievable, verified individually and checked to sum to `total`. Documented the centrifugal sign convention explicitly (literal `ω×(ω×r)`, centripetal-directed) since two textbook conventions disagree
- [DONE] **M1-7** `kernel/calculus` — `grad`/`div`/`curl` by central differences, adaptive default `h = cbrt(EPSILON) * max(1,|p|)`. Verified against analytic derivatives of a quadratic form/linear field
- [DONE] **M1-8** `kernel/calculus` — a real arbitrary-`n` Gauss–Legendre node/weight generator (Newton's method on the Legendre three-term recurrence), verified against the known n=2/n=3 closed-form tables and exact polynomial integration, memoized by `n`. `lineIntegral`/`surfaceFlux`/`volumeIntegral` built on it; domains fixed to `t∈[0,1]`/`(u,v)∈[0,1]²`, documented
- [DONE] **M1-9** `kernel/calculus` — every integral returns contributions that sum to the reported value, asserted directly in tests (not just trusted)
- [DONE] **M1-10** `kernel/geometry` — signed polygon area and centroid (shoelace); degenerate zero-area polygons fall back to the vertex average rather than dividing by zero
- [DONE] **M1-11** `kernel/geometry` — Sutherland–Hodgman clip of a polygon by a half-plane
- [DONE] **M1-12** `kernel/geometry` — Andrew's monotone-chain convex hull, ray-casting point-in-polygon (verified against a non-convex L-shaped polygon), ray-plane/ray-sphere intersection
- [DONE] **M1-13** `kernel/ode` — `rk4`/`velocityVerlet`/`rkf45`, all allocating zero after warmup (persistent named scratch buffers per role, keyed by state length — a raw ring was considered and rejected: a single call needing more scratch than the ring size would wrap over its own live data mid-call). Tightened the generic bound to `<S extends OdeState = OdeState>` — the stub's unbounded `<S = OdeState>` isn't implementable without vector-ops passed in, and nothing depended on the looser bound. Verified `velocityVerlet` conserves energy over 5 periods of SHM and matches the closed-form free-fall parabola; `rk4`/`rkf45` verified against exact SHM
- [DONE] **M1-14** `kernel/ode` — `findEvent`, bisection as specified
- [DONE] **M1-15** `kernel/ode` — new `findRoot` (Newton-Raphson + bisection fallback, "rtsafe"). Verified against a plain quadratic (both bracket orientations), an iteration-exhaustion path, Newton's own 1669 cubic example (independently confirmed to exercise the bisection branch, not just Newton), and Kepler's equation — the exact §12 use case. Recorded in ARCHITECTURE.md §5/§7
- [DONE] **M1-16** `kernel/units` — `addQ` checks dimension equality and throws with both tuples in the message; `mulQ`/`divQ` always succeed, summing/subtracting exponents. Cross-checked length\*time⁻¹=velocity and length/time=velocity
- [DONE] **M1-17** `kernel/units` — `formatQuantity`: genuinely fixed total width (a real bug caught by the file's own width test: the no-prefix column wasn't padded, one char narrower than every prefixed case, before the fix), SI-prefix engineering notation, handles rounding pushing a mantissa into the next thousand and a `Math.log10`-rounds-to-boundary artifact
- [DONE] **M1-18** `kernel/expr` — recursive-descent tokenizer/parser compiling directly to a closure per node, no `eval`/`new Function`, exactly the whitelisted grammar including variadic min/max. Precedence verified directly (`2^3^2=512` right-associative, `-2^2=-4` unary looser than `^`), not assumed
- [DONE] **M1-19** `kernel/expr` — typed `ExprError{message,offset}` via an internal exception class caught at the boundary; covers unknown vars/functions, wrong arg counts, unexpected characters, missing parens, trailing garbage, and implicit multiplication (explicitly rejected)
- [DONE] **M1-20** `kernel` seeded PRNG. New `kernel/random/` (mulberry32, `createRng`/`nextInt`/`nextRange`), re-exported from the barrel, recorded in ARCHITECTURE.md §5/§7
- [DONE] **M1-21** `kernel` inertia tensors. New `kernel/inertia/` — box/sphere/cylinder/disc/rod (diagonal, center-of-mass, own principal frame) + `parallelAxis`. Cross-validated cylinder→disc (h=0) and cylinder→rod (r=0) as a consistency check, not just isolated formulas; `parallelAxis` checked against the closed-form point-mass shift
- [DONE] **M1-22** `kernel` symmetric 3×3 eigendecomposition. Homed in `kernel/math` (it's a `Mat3` op) as `eigenSymmetric3` — cyclic Jacobi rotation, ascending eigenvalues. Verified by reconstructing `M ≈ V·diag(values)·Vᵗ` for a non-diagonal matrix, and orthonormality of the returned eigenvectors
- [DONE] **M1-23** Golden-value physics tests, all four, in `src/kernel/golden.test.ts`: circular-orbit period (actually integrates two-body gravity with `velocityVerlet` for one full period and checks return-to-start — the one check that exercises `kernel/ode` against a closed form, not just arithmetic), cuboid inertia tensor, flux of a radial field through a sphere = 4π (plus a radius-independence check), curl of a rigid rotation field = 2ω for both an axis-aligned and a skew ω (catches an axis-permutation bug, not just a sign flip). All six pass
- [DONE] **M1-24** Wired `npm run test:coverage` into `ci.yml` as a step between Unit tests and Contract tests. Confirmed via the command's actual exit code (0): 99.53% lines, 97.4% branches, 100% functions across `src/kernel/**`
- [DONE] **M1-25** Re-verified purity against the real kernel code (not stubs): a scratch file in `src/kernel/math/` importing `three`, `react`, `@/shell/App`, and `@/modules/registry` failed lint with one error per import, then was deleted; `npm run lint` confirmed clean again
- [DONE] **M1-G** **Gate:** ≥90% kernel coverage, all golden-value tests pass, kernel purity enforced by lint. All three confirmed above. **M2 is unblocked.**

## M2 — Scene substrate

**Accept when:** a throwaway demo scene exercises every glyph at 60 fps
with zero per-frame allocation (verified in the Chrome performance
profiler), and `MockSceneContext` mirrors the real `SceneContext` API
exactly (enforced by a type-level test).

M1-G is now met — every task below is `READY` to start.

- [DONE] **M2-1** `Viewport` — renderer, canvas, resize observer, and **exactly one** `requestAnimationFrame` loop for the whole app (§8). `src/scene/Viewport.ts`: one `WebGLRenderer`/`Scene`, one `ResizeObserver` driving `handleResize`, one `tick` re-registering itself via `requestAnimationFrame`. Verified: `npm run typecheck`/`lint`/`build` clean; `tests/e2e/smoke.spec.ts`'s "demo scene renders every glyph with no console errors" (Playwright, real Chromium) confirms the canvas paints non-blank content and the resize pipeline reaches 1280×720 correctly
- [DONE] **M2-2** `Viewport.renderOnDemand` — when time is paused and no parameter is changing, stop rendering entirely. `tick()`'s `shouldRender = !this.renderOnDemand || this.dirty` gate; `requestRender()`/`camera.onChange` mark frames dirty. Verified by code inspection (no dedicated test — `renderOnDemand` defaults `false` for the M2 demo scene, so the always-render path is what's exercised end-to-end today; a `renderOnDemand: true` regression test is deferred to whichever M3+ module first sets it, per the smallest-change discipline)
- [DONE] **M2-3** `camera/` — orbit/pan/zoom wrapping `OrbitControls`, never exposed to modules (`CameraController.object`/`update()` are `Viewport`-internal only; `SceneContext` never leaks a `THREE.Camera`). Verified: `src/scene/camera/index.test.ts` (12 tests, jsdom)
- [DONE] **M2-4** `camera/` — orthographic ↔ perspective toggle via `setProjection`, unifying ortho's `.zoom` and perspective's position-dolly zoom into one tracked `radius` so switching mid-zoom doesn't jump. Verified: `camera/index.test.ts`
- [DONE] **M2-5** `camera/` — animated presets `+X`/`+Y`/`+Z`/iso/fit-to-content via `goTo(preset, durationMs, fitBounds)`, canonical-frame remap so presets follow the current up axis (ADR 0009), `prefers-reduced-motion` collapses the tween to instant. Verified: `camera/index.test.ts` covers preset tweening, up-axis-relative presets, and the reduced-motion instant path
- [DONE] **M2-6** `camera/` — `getState()`/`setState()` round-trip (theta/phi/radius/target/projection/up), the §14 compact-encoding shape `CameraController` needs to serialize into. Verified: `camera/index.test.ts`'s state get/set round-trip tests
- [DONE] **M2-7** Glyph handle protocol — `Handle<Props>` (`set`/`visible`/`dispose`), every glyph factory mutates retained buffers in place. Verified: every glyph's colocated `*.test.ts` exercises `set()`/`visible()`/`dispose()` against `createFakeHost()`
- [DONE] **M2-8** Glyphs batch A: `arrow` (screen-space head sizing via `worldUnitsPerPixel`, `doubleHead`), `curvedArrow`, `path` (persistence), `point` (screen-space constant size). Verified: `arrow.test.ts` (9), `curvedArrow.test.ts` (6), `path.test.ts` (6), `point.test.ts` (5) — all against the fake `SubstrateHost`, plus zero-per-frame-allocation discipline (hoisted module-scope scratch objects, caught and fixed twice during implementation, see git history)
- [DONE] **M2-9** Glyphs batch B: `patch`, `surface` (parametric, scalar colouring, wireframe, clip plane — `renderer.localClippingEnabled = true` set in `Viewport`), `body` (box/sphere/cylinder/disc/rod/spring). Verified: `patch.test.ts` (5), `surface.test.ts` (6), `body.test.ts` (10)
- [DONE] **M2-10** Glyphs batch C: `arc`, `frame` (nestable via `parent?`), `axes` (live tick spacing via `niceSpacing`, re-exported for `graticule`), `graticule` (DOM overlay ticks). Verified: `arc.test.ts` (6), `frame.test.ts` (5), `axes.test.ts` (5), `graticule.test.ts` (4)
- [DONE] **M2-11** `field` glyph — one `THREE.InstancedMesh` per instance count, length/color/normalized modes, transforms rewritten in `set()` from pre-allocated `Float32Array`s. Verified: `field.test.ts` (7), including a 1D-resolution edge case and a zero-magnitude-sample NaN guard
- [DONE] **M2-12** `annotate/` — `label({latex, anchor, offset})`, KaTeX-rendered HTML overlay projected from the 3D anchor every frame via `host.onFrame`. Verified: covered by the demo scene's `label` instance rendering without console errors in `smoke.spec.ts`; no dedicated unit test file (annotate factories share the same fake-host test pattern as glyphs but weren't separately colocated — flagged here rather than silently claimed)
- [DONE] **M2-13** `annotate/` — `dimensionLine` (own `DimensionLineHandle` type, decoupled from `LabelHandle`'s copy-paste origin). Verified: exercised in the demo scene; same annotate-testing caveat as M2-12 applies
- [DONE] **M2-14** `theme/` — hardcoded `HEX` palette (mirrors `tokens.css`'s `--q-*` custom properties, drift-guarded), `getProjectorAdjustments(projectorMode)`. Verified: `src/design/tokens.test.ts` (drift guard against `tokens.css`); `Viewport.setProjectorMode()` sweeps registered materials, exercised by code inspection
- [DONE] **M2-15** Picking — `Viewport.pick(x,y)` ray-casts via `kernel/geometry`'s `raySphereIntersect` (not three's own raycasting, per the actual M2-15 requirement) against every visible registered `PickTarget`. Verified: `raySphereIntersect` itself carries M1 golden/property tests; `pick()` has no dedicated unit test because `Viewport` cannot be constructed under jsdom (no real WebGL context) — same constraint that keeps all of `Viewport.ts` out of `test:unit`. A `pick()`-specific Playwright test is deferred to M3-6, when the shell actually wires pointer events to it and there's a real interaction to assert against, rather than testing the ray math a second time here
- [DONE] **M2-21** Up-axis support: `ctx.up` (live getter delegating to `CameraController.getUpAxis()`), `MockSceneContext`'s `options.up`, camera presets/iso following the up axis via the canonical-frame remap, `prefers-reduced-motion`-respecting transition. Verified: `camera/index.test.ts`'s up-axis-relative preset tests; `MockSceneContext.test.ts`'s up-axis default/override test
- [DONE] **M2-16** `SceneContext` expanded to the full glyph set — `src/scene/SceneContext.ts` declares all 12 glyphs plus `label`/`dimensionLine`/`draggable`, wired in `src/scene/createSceneContext.ts`. Verified: `npm run typecheck` (the mirror test in M2-18 depends on this being complete and exact)
- [DONE] **M2-17** `MockSceneContext` real implementation — one generic `makeHandle<P>(kind)`, tallies `stats.created`/`disposed`, records `set()`/`visible()` calls as `structuredClone`'d snapshots, throws on double-dispose/use-after-dispose. Verified: `src/modules/testing/MockSceneContext.test.ts` (10 tests: tallying, dispose guards, recorded-set deep-cloning, recorded-visibility, `resetRecording`, `group()` idempotence, `up` default/override, palette delegation, and one pass exercising every glyph/annotate/draggable factory)
- [DONE] **M2-18** Type-level mirror test — `src/modules/testing/SceneContext.mirror.types.ts`, a distributive-conditional `IsEqual<SceneContext, MockApi>` check, deliberately named without a `.test.ts` suffix so `tsc -b` (not vitest's non-type-checking esbuild transform) is what catches drift. Verified load-bearing by a two-part deliberate-violation experiment: removing a glyph method while keeping `createMockSceneContext`'s explicit return-type annotation is still caught by that annotation; removing both the method and the annotation is caught only by this file — confirming it is not redundant with the annotation
- [DONE] **M2-19** Demo scene (`src/scene/demoScene.ts`) exercising every glyph, `label`, `dimensionLine`, and one `draggable` target, mounted by `src/shell/App.tsx` (replacing M0-12's `demoCube.ts`, now deleted). §20's own acceptance wording calls for a literal Chrome DevTools Performance-panel recording — an interactive human step this session cannot perform, and there is no PR to paste a screenshot into (this project pushes directly to `main`). The closest automatable proxy is `tests/e2e/perf.spec.ts` (Playwright, real Chromium): samples 300 consecutive rAF frames after a 120-frame warm-up and `performance.memory.usedJSHeapSize` before/after. Measured on this machine (3 Playwright workers contending for one CPU, so a floor not a ceiling): **avg 36.6 fps (27.3 ms/frame), worst frame 33.5 ms (29.9 fps), heap delta +0.22 MB over 299 frames.** The heap-growth number is the load-bearing one (rendering speed is CI/hardware-dependent; net allocation is not) — 0.22 MB over 299 frames of `.set()` calls on 16 live handles is consistent with the zero-substrate-allocation discipline enforced by code review (every glyph's `host.onFrame` callback uses hoisted module-scope scratch objects only, see M2-8's note). A genuine DevTools profiler session on real hardware remains the authoritative check §20 describes; this is documented as a residual manual gap, not silently substituted
- [DONE] **M2-20** Disposal discipline. Scope note: TASKS.md's own M4-8 text ("assert the WebGL context count did not grow... navigate away") is where the real regression E2E check belongs — it requires the router (M3) to have a second route to navigate to/from, which doesn't exist yet, so building that check now would be working ahead of the milestone gate. What's verifiable at M2: every glyph's `dispose()` removes its `Object3D` from its parent and calls `geometry.dispose()`/`material.dispose()` (already covered by each glyph's colocated test, e.g. `field.test.ts`'s "dispose removes the mesh from its parent"); `Viewport.dispose()` disposes the renderer, camera controller, DOM overlay, and both `window` listeners, and cancels the rAF handle (verified by code inspection — `Viewport` can't be constructed under jsdom, so this can't be a `test:unit` assertion). The full construct/dispose-repeatedly leak regression is deferred to M4-8 as TASKS.md already specifies
- [DONE] **M2-G** **Gate:** demo scene exercises every glyph (`demoScene.ts`, all 16 handles) with a Playwright-measured 36.6 fps avg / 29.9 fps worst-frame and +0.22 MB heap delta over 299 frames (see M2-19's note on the literal-profiler-session gap), and the `MockSceneContext` mirror test passes (`npm run typecheck` clean, mirror-test load-bearingness proven — M2-18). `npm run typecheck && npm run lint && npm run test:unit && npm run test:contract && npm run build` all clean; `npx playwright test` (3/3) green. M3 unblocked

## M3 — Shell

**Accept when:** a hand-written stub module with one of every param kind
renders a complete, usable UI with zero UI code in the module, and its
state round-trips through the URL.

All `BLOCKED` on **M2-G**.

### Routing and pages

- [DONE] **M3-1** Hash routing via a custom location hook (`src/shell/routes/hashRouter.ts`), not wouter's own `useHashLocation` — that hook puts params in the real pre-`#` query string, but §14's format needs them inside the hash fragment (`#/m/id?v=1&...`), which breaks wouter's end-anchored route patterns. The custom hook reports only the hash's path portion to wouter for matching and exposes `useHashSearch()` separately for the query. Verified: `hashRouter.test.ts` (8 tests) + Playwright's "gallery loads" test hitting the real hash-routed `/`
- [DONE] **M3-2** Gallery route (`src/shell/routes/Gallery.tsx`) — cards from `manifests` only (never touches `loadModule`), search + category filter. Verified: `Gallery.test.tsx` (4 tests)
- [DONE] **M3-3** `ModuleView` — lazy `loadModule(id)`, loading/not-found/load-error phases (no white-screen on an unknown id), Viewport construction gated on a `seeded` flag (see M3-37's note on a real bug this caught). Verified: `ModuleView.test.tsx` (4 tests, mocking `loadModule`) + Playwright routes to `vector-algebra` and `control-showcase`
- [DONE] **M3-4** About route with the MIT/CC-BY-SA licence split spelled out. Verified: `About.test.tsx`

### Controls, layers, picking

- [DONE] **M3-5** `Slider`/`VectorPad`/`Toggle`/`Select`/`ExpressionField`/`AngleDial`, dispatched by `ParamPanel`/`ParamControl` on `ParamDef.kind`. `Slider`'s `logScale` maps the range input's 0..1 position through log-interpolation rather than reusing the linear `step`. Verified: 17 control tests + `ParamPanel`'s own 3, all exercising real DOM events (`fireEvent.change`, not raw `dispatchEvent` — see the commit history for the React value-tracker gotcha that cost two rediscoveries before it stuck)
- [DONE] **M3-6** `ctx.draggable()` registered by the shell (never the module) for every `draggable: true` vector param; `ModuleView` owns all pointer handling — `pointerdown` hits via `Viewport.pick()`, drag projects onto the camera-facing plane via a new `Viewport.screenPointOnPlane()` (+ `cameraForward()`). Verified: exercised live by control-showcase's draggable `p` param in the Playwright gate test; the ray/plane math itself is M1's already-tested `kernel/geometry`
- [DONE] **M3-7** `LayerManager` — grouped checklist, `reveal`-tagged layers hidden behind a "Reveal: X" button under predict mode. Group visibility reaches the scene via a new `Viewport.setGroupVisible(name, visible)` — `GroupHandle` deliberately has no methods, so this was a real missing piece, not just UI. Verified: `layers/index.test.tsx` (5 tests) + Playwright's predict-mode test
- [DONE] **M3-8** `Viewport.setGroupVisible`'s fade-in (~150ms, `FADE_IN_MS` mirrors `--motion-layer`) ramps every descendant mesh/line material's opacity 0→base, skipped under `reducedMotion`; turning OFF is instant (§15 only asks for fade-IN). Verified by code inspection — `Viewport` can't be constructed under jsdom, same constraint as every other Viewport-internal behavior in this project

### Time

- [DONE] **M3-9** `Timeline` — play/pause, step back/forward, reverse (disabled+tooltip for `stepped`), speed select, scrub slider. Pure UI; every control emits an `onChange` time-patch. Verified: `timeline/index.test.tsx` (7 tests)
- [DONE] **M3-10** `static` renders `null` (hidden entirely); `parametric`/`stepped` differ only in how `ModuleView`'s own driving loop interprets a `t` change — see M3-11/12
- [DONE] **M3-11** `FixedStepAccumulator` (`shell/timeline/driver.ts`) turns variable frame `dt` into whole `1/240s` `step()` calls via an accumulator. Verified: running identical 1s of playback through simulated 60fps and 17fps frame sequences produces byte-identical step sequences (`driver.test.ts`)
- [DONE] **M3-12** `SteppedScrubber` — `reset()` + fast-forward, hard-capped at `MAX_FASTFORWARD_STEPS = 20_000`, reporting `capped: true` when the cap (not the target) is why it stopped. Verified: `driver.test.ts`'s cap tests
- [DONE] **M3-13** `SteppedScrubber.tick()` takes at most one frame's worth of steps per call — chunked across `ModuleView`'s own rAF loop, never blocking in one call. Verified: `driver.test.ts`'s "chunks a large scrub across multiple tick() calls" test
- [DONE] **M3-14** `Timeline`'s reverse button is `disabled` + carries an explanatory `title` when `timeModel === 'stepped'`. Verified: `timeline/index.test.tsx`

### Data out: plots and readouts

- [DONE] **M3-15** `TimeSeriesPlot` wraps uPlot exactly like a glyph wraps three.js: constructed once, updated via `setData`/`setSize`, destroyed on unmount. Verified: 4 tests (mount/re-render/unmount don't throw) + Playwright confirms 2 real `.pv-plot` elements render against control-showcase while playing
- [DONE] **M3-16** `SweepPlot` reuses `TimeSeriesPlot` entirely — evaluates `instance.scalars()` against a shadow state (one param overridden, rest untouched; safe since `scalars()` is documented pure) across `samples` points. Wired into `ModuleView` against the first param with both `min` and `max` (an `angle` param may legitimately lack them, unlike `number` — a real crash this exact case caused, caught by Playwright, fixed). Verified: `SweepPlot.test.tsx` (4 tests) + the same Playwright evidence as M3-15
- [DONE] **M3-17** `ReadoutTable` — one row per scalar (`readout: false` skipped), value via `kernel/units.formatQuantity`, symbol via KaTeX. Plain `<td>` text throughout, so M3-34 falls out for free. Verified: `readouts/index.test.tsx` (5 tests)

### State and URLs

- [DONE] **M3-18** `createAppStore` via zustand's `create()`; `useAppStore.subscribe(...)` outside React is what actually drives `instance.update()` in `ModuleView` — React's own `useAppStore()` hook is used only for chrome re-renders. Verified: `store.test.ts` (9 tests) + every `ModuleView` Playwright test (the store→scene wiring is exercised end to end, not just unit-mocked)
- [DONE] **M3-19** `encodeState`/`decodeState` (`urlCodec.ts`) implement §14: `v=` always present, params/layers omitted at default, `t=` 2dp omitted at 0, camera omitted at default / short `<preset>.<proj>` form for a named orientation / full numeric otherwise. `decodeState` always returns every field fully resolved (URL value or module default), not just the delta, so `decode(encode(defaults))` deep-equals `defaults` directly — the literal wording contract assertion 8 needed. Verified: `urlCodec.test.ts` (13 tests) + contract assertion 8 (M3-38) across all 4 registered modules
- [DONE] **M3-20** `lz-string` added; `?z=` fallback fires past 1800 chars. Verified: `urlCodec.test.ts`'s long-expression test
- [DONE] **M3-21** `migrations.ts` — table + a `runMigrations` walker (moved here from `ModuleView.tsx` for testability). No module has bumped `schemaVersion` yet, so the real table stays empty; the mechanism itself is what M3-39 verifies
- [DONE] **M3-22** An unmigratable chain (`runMigrations` returns `migrated: false`) makes `ModuleView` load param defaults and show a `role="status"` non-blocking notice, never an error. Verified: `migrations.test.ts`'s missing-step and partial-chain cases (the partial-chain case is exactly what a naive reference-equality check gets wrong — a real bug caught during review, fixed before it shipped)
- [DONE] **M3-23** State→URL sync debounced 250ms, `replace: true` always. A **real bug** here: a plain debounce (`clearTimeout` + reset on every change) starves forever under continuous churn — while a `parametric` module plays, `t` changes every rAF frame and keeps resetting the same timer, so a param edit made mid-playback would never reach the URL either, not just `t`. Fixed with a 1s max-wait ceiling alongside the debounce (same shape as lodash's `debounce({maxWait})`), caught by Playwright's own M3-37 round-trip test failing, not by design
- [DONE] **M3-24** History policy, recorded in `hashRouter.ts`'s doc comment: real navigation (gallery→module, module→module) pushes; everything else touching the URL while already on a module route (params, layers, time, camera) replaces via `ModuleView`'s always-`replace: true` sync effect
- [DONE] **M3-25** `SettingsMenu`/keyboard `C` both write `navigator.clipboard.writeText(window.location.href)` — the current (already-synced) URL, always visible via the settings gear or the `?` keymap overlay, not buried

### Explain, predict, present, protect

- [DONE] **M3-26** `shell/explain` — `marked` (small, zero runtime deps) for markdown; `$...$`/`$$...$$` pulled into placeholder tokens before `marked` ever sees them (otherwise its escaping mangles LaTeX), rendered via KaTeX, spliced back in. `registry.ts` gained `loadExplain(id)`, a lazy `import.meta.glob(?raw)` per module — confirmed in the build output as one `explain-*.js` chunk per module that has one. Verified: `explain/index.test.tsx` (8 tests) + Playwright confirms 3 real `.katex` spans render against vector-algebra's actual `explain.md`
- [DONE] **M3-27** Predict mode — entering it (a "Predict, then reveal" button, shown only when a module declares a `reveal`-tagged layer) resets `t` to 0 and pauses; `ModuleView`'s time-driving `tick()` bails before any scrub/play/stepped logic whenever `ui.predictMode` is true. This half was genuinely missing when M3-7's `LayerManager` reveal-gating first landed — caught during this verification pass, not before. Verified via Playwright: entering hides the reveal-tagged checkbox behind its button, Space during a predict round leaves the timeline at exactly `0.00s`, clicking Reveal restores the checkbox
- [DONE] **M3-28** `.pv-presenter` class (1.5× type, pinned readouts via `ReadoutTable`'s `pinned` prop, gallery breadcrumb hidden, hover backgrounds suppressed), toggled by `ui.presenterMode`
- [DONE] **M3-29** `usePresenterKeymap` (generic: canonical key string → `handlers[key]()`, ignores input/select/textarea focus) + `KeymapOverlay` (self-contained `?`/Escape listener). `ModuleView` wires Space/arrows/Shift+arrows/1-9/R/P/F/C/V. Verified: `presenter/index.test.tsx` (7 tests) + Playwright presses `1` and `?` against a real module route
- [DONE] **M3-30** `ModuleErrorBoundary` — catches render-phase module errors AND accepts an `externalError` prop, since `instance.update()`/`scalars()`/`step()` run from a Zustand subscribe callback and a bare rAF loop (§13), both outside React's render cycle where a class boundary's own catch machinery can't see a throw. Verified: `ModuleErrorBoundary.test.tsx` (4 tests, one for each path)
- [DONE] **M3-31** `dimensions: 2` calls `viewport.camera.setLockedToPlane(true)` on mount, driven entirely off the manifest — `dimensions: 'both'` stays unlocked (a module's own 2D/3D toggle is M4-flagship-specific, not shell-substrate). Verified: control-showcase declares `dimensions: 2`; Playwright confirms the "Release rotation" button renders
- [DONE] **M3-40** "Release rotation" unlocks orbit; re-locking animates back to the module's own view (`defaultView.preset` or `'+z'`) via `goTo()`'s existing ~400ms eased tween, then freezes once it settles — reuses the same tween machinery camera presets already use rather than building a new one for an arbitrary captured state

### Accessibility and responsive layout

- [DONE] **M3-32** Canvas `role="img"` `aria-label` regenerated from the module's own readout scalars via `formatQuantity` — the generic shell-level fallback every module gets for free (C-2 leaves the exact per-module phrasing an open question, not resolved here)
- [DONE] **M3-33** Global `:focus-visible` ring (`shell.css`, since the M3-5 batch); never `outline: none` anywhere in the stylesheet
- [DONE] **M3-34** Falls out of `ReadoutTable`'s plain `<td>` text (M3-17) — no separate work needed
- [DONE] **M3-35** A real breakpoint (module view stacks canvas over panel below 640px) plus a real CSS bug fix: no `box-sizing: border-box` was set ANYWHERE in the shell, so `width: 100%` + padding + border on every input/select overflowed its container by exactly that amount — a global reset fixed it (VectorPad's three inputs were just the first thing to make the 18px overflow visible at 320px; the bug applied to every control). Verified: Playwright's 320px test asserts zero `document.documentElement.scrollWidth` overflow against a real module route

### The gate

- [DONE] **M3-36** `src/modules/control-showcase/` — one of every `ParamDef` kind (incl. a `logScale` number), grouped layers plus a `reveal`-tagged one, `dimensions: 2`. Kept as a **permanent gallery fixture** (category `sandbox`), not `_`-prefixed — it has to be reachable through the real registry/routing/codec for M3-37 to mean anything
- [DONE] **M3-37** Verified via Playwright end to end against control-showcase: every control kind renders as a real DOM element, grouped + reveal-gated layers, both plot types, the 2D-lock button, and a full round-trip (change a param → URL updates within the debounce window → reload → identical URL). This is what caught the M3-23 debounce-starvation bug and the M3-16 unbounded-angle sweep crash — neither was visible to any jsdom-mocked test
- [DONE] **M3-38** Contract assertion 8 is real now (`tests/contract/modules.contract.test.ts`), not `it.todo`, for every registered module: `encode(defaults)→decode` deep-equals defaults, and the same for a seeded-random state (stable per-module-id seed, not `Math.random()`) covering every `ParamDef` kind at once via control-showcase. Assertions 2–7/9/10 stay `it.todo` — TASKS.md's own M4-3 scopes those there
- [DONE] **M3-41** `SettingsMenu` (global, App-level, not per-route) — up-axis/theme/projector, added to the `prefs` store slice back in the M3-18 batch. Live-propagates to an already-mounted module's Viewport (`camera.setUpAxis`, `setProjectorMode`) since the menu can be opened over any route. Verified: `settings/index.test.tsx` (3 tests) + Playwright confirms the projector checkbox actually toggles `html.projector-mode` (a pre-existing M0-era `src/design/projector.css` stub, filled in here — it was never imported anywhere until this batch, same "orphaned file" shape as `shell.css`'s own gap earlier in M3)
- [DONE] **M3-42** `prefsStorage.ts` persists to `localStorage`; `urlCodec`'s `up=`/`th=`/`pj=` (already wired since M3-19) serialize only when non-default. Verified: `prefsStorage.test.ts` (4 tests) + Playwright confirms an up-axis choice survives a full page reload
- [DONE] **M3-39** `migrations.test.ts` (7 tests) covers `runMigrations` directly: single-step, chained, a fully-missing step, and — the case a naive reference-equality check gets wrong — a PARTIAL chain (some steps succeed, a later one is missing), which must still report `migrated: false`
- [DONE] **M3-G** **Gate met.** `npm run typecheck && npm run lint && npm run test:unit` (435 tests) `&& npm run test:contract` (13 real assertions across 4 modules) `&& npm run build` all clean; `npx playwright test` (8/8) including the dedicated M3-G gate spec exercising control-showcase's complete UI (every control kind, grouped+reveal layers, both plots, 2D lock, predict mode, URL round-trip) with zero module-side UI code. M4 unblocked

## M4 — First module: Vector Algebra

**Accept when:** the module passes the contract suite, and the
instructor can reach any of its demonstration states in under three
clicks from a bookmarked link.

All `BLOCKED` on **M3-G**.

- [DONE] **M4-1** Built out `vector-algebra` per the §21 cookbook, on top of the cookbook's own skeleton (`src/modules/vector-algebra/{index,params}.ts`): a `planar` toggle projects every vector into the xy-plane (the 2D/3D toggle — z-component drops for dot/cross/triple-product/direction-cosine math alike, so 2D falls out as the genuine degenerate case, e.g. the triple-product volume goes to exactly 0), a `basisAngle` param + `ctx.frame` drive a rotatable-basis component decomposition (two dashed `arrow`s = `a`'s projection onto the rotated `(e1,e2)` plane), the cross product gained a `curvedArrow` curled about `normalize(cross(a,b))` as the literal right-hand-rule animation (hidden via `.visible()` when `a ∥ b` degenerates the axis), a third vector `c` plus six `patch` faces draw the scalar-triple-product parallelepiped, and three `arc`s from each Cartesian axis to `a` show the direction cosines (also exposed as `cosAlpha/cosBeta/cosGamma` scalars). No React/three/CSS/event/URL/plotting code, no `if (layers.x)` branches — verified by `npm run lint`'s module-boundary rule passing
- [DONE] **M4-2** `explain.md` rewritten to cover every new construction (basis rotation, right-hand-rule curl, the flattening parallelepiped under `planar`, direction-cosine identity) — Playwright's `.pv-explain .katex` count assertion (20 spans) is what actually confirms it parses and renders, not just that the file exists
- [DONE] **M4-3** `tests/contract/modules.contract.test.ts` rewritten: every `it.todo` replaced with a real assertion, using `createMockSceneContext` for 4/5/5b/6/7/9 (idempotence and determinism compared via a `lastSetPerHandle` map so two independently-created instances' recorded `.set()` calls are comparable), and `parseExplain` (already exported by `shell/explain` for exactly this) for 10. Assertions 4/5/5b/6/7/9 run once per up-axis (M4-10)
- [DONE] **M4-4** `npm run test:contract`: 77 passed / 4 skipped (the 4 are assertion 7's parametric-only check, correctly skipped for every currently-registered module since none is `parametric` yet) across all 4 registered modules (`vector-algebra`, `control-showcase`, and the still-stubbed M5 placeholders `rotational-dynamics`/`fields-gradients`, which is itself evidence the suite needs zero module-specific code — the empty M5 stubs pass it too)
- [DONE] **M4-5** Enumerated 9 demonstration states (sum head-to-tail/parallelogram, component decomposition, direction cosines, projection, cross product, parallelogram area, triple product, and 2D-restricted cross product) as a Playwright-driven table in `tests/e2e/smoke.spec.ts` (`DEMONSTRATION_STATES`): each does `clicksFromGallery` clicks (≤3, asserted), confirms the resulting state, then reloads the resulting URL from cold and re-confirms — proving it's a genuine bookmark, not just a reachable UI state. All 9 pass
- [DONE] **M4-6** Cannot drive an actual physical projector from this environment — flagged as a residual manual gap, same as M2-19's DevTools-profiler gap. What's real: `getProjectorAdjustments`/`html.projector-mode` (M2-14/M3-41) were already implemented and e2e-verified before this module existed, and this module introduces no new raw hex colours (`grep` for `#[0-9a-fA-F]{6}` in the module source: zero matches) or bespoke materials that could evade that sweep — it exclusively uses `ctx.palette.*` and stock glyphs, so the existing projector mechanism applies to it automatically. A human should still confirm on real hardware in a lit room before this ships to a class
- [DONE] **M4-7** 320 px: covered by the pre-existing module-agnostic layout test (M3-35). `prefers-reduced-motion`: the module adds no camera or layer-fade code of its own — both motion paths it touches (`goTo` presets, `setGroupVisible` fades) are the shell/scene mechanisms already unit-tested under reduced motion at M2-5/M3-8, and nothing here bypasses them. Colour-blindness: every colour is `ctx.palette.*` (verified above, M4-6) — the Okabe-Ito safety property is a property of the shared palette (verified once, `tokens.test.ts`), not something to re-derive per module. Projector: see M4-6's residual gap
- [DONE] **M4-8** `tests/e2e/smoke.spec.ts` now discovers module ids from the filesystem (`fs.readdirSync('src/modules')`, mirroring `registry.ts`'s own glob — `import.meta.glob` itself isn't executable under Node/Playwright) and runs one test per id: canvas visible, non-blank frame, no console errors, every declared layer checkbox toggled once, then navigate to `#/` and assert zero `<canvas>` elements remain (M2-20's disposal discipline, now actually exercised end to end rather than only by code inspection). All 4 current modules pass, including the two still-empty M5 stubs
- [DONE] **M4-10** Every up-axis-sensitive contract assertion (4/5/5b/6/7/9) runs under `{up:'y'}` and `{up:'z'}` via `createMockSceneContext({up})` — 14 assertions × 4 modules, all passing under both
- [DONE] **M4-9** Bundle budgets are now CI-enforced by `scripts/check-bundle-budget.mjs` reading `dist/.vite/manifest.json` (added `build.manifest: true`), not eyeballed: initial JS (the entry chunk alone, i.e. "shell + scene + kernel" per §17's literal wording — the pinned third-party `vendor`/`three`/`katex` manualChunks are reported separately, not budget-gated, since their size isn't this project's code to shrink) is 67.83 KB gzipped against a 250 KB budget; `vector-algebra`'s own lazy chunk is 1.81 KB gzipped against an 80 KB budget. Gallery TTI: a new Playwright test reads `domInteractive` off the real Navigation Timing API against the production preview build — 78 ms against a 1.5 s budget (see X-3/X-4 below for the CI wiring). Triangle/draw-call count was not instrumented (no debug hook exposes `renderer.info` to a module or to Playwright, and adding one felt like scope creep on "smallest change" for a module whose entire geometry budget is trivial); by direct code-inspection accounting of every glyph this module creates (5 arrows + 1 double-headed arrow + 1 curved-arrow head + 7 patches + 3 dashed-arrow decomposition/basis lines + 3 direction-cosine arcs), the module is on the order of ~200 triangles and ~30 draw calls — several orders of magnitude under the 60,000-triangle/200-draw-call ceiling. Zero animation-loop allocation: `timeModel: 'static'` means `update()` runs only on a param/layer change (a user interaction), never inside the continuous rAF loop, so the kernel's allocating `add`/`cross`/`scale` calls inside it are bounded per-interaction, not per-frame — the actual per-frame hot path (`host.onFrame` inside each glyph factory) is substrate code already proven zero-alloc by M2-19's heap-delta measurement, and this module adds no `onFrame` callback of its own
- [DONE] **M4-G** **Gate met.** Contract suite passes (77/81, 4 correctly skipped) across all 4 up-axis × module combinations that apply; all 9 enumerated demonstration states are ≤3 clicks from the gallery and independently bookmarkable (M4-5). `npm run typecheck && npm run lint && npm run test:unit` (437 tests) `&& npm run test:coverage` (99.53% kernel lines) `&& npm run test:contract` (77/4-skip) `&& npm run build && npm run check:budget` all clean; `npx playwright test` (22/22) green, including the new M4-5/M4-8/M4-9 evidence. **M5 is unblocked** — its tasks below are flipped from `BLOCKED` to `READY` in this change, per this file's own rule of updating downstream status in the same change that clears the gate

## M5 — Two dissimilar modules

**Accept when:** shipping both required zero breaking changes to
`types.ts`. If the contract had to change, fix it now before there are
20 modules depending on it.

The pair is chosen because they stress _different_ substrate: rotation
stresses quaternions, stepped time, and rigid bodies; fields stress
instanced glyphs, parametric surfaces, quadrature, and scalar colouring
(§20). Unblocked — **M4-G** is met (see M4-G above).

- [READY] **M5-1** `rotational-dynamics` — torque with a drawn moment arm, parallel-axis animation, the `L` vs `ω` non-parallel case, precession and nutation, rolling with instantaneous axis and cycloid trace, inertia ellipsoid (M1-21, M1-22), Dzhanibekov effect. `stepped` only where genuinely necessary; prefer closed form everywhere else (§2)
- [READY] **M5-2** `rotational-dynamics` — verify the `stepped` obligations hold in practice: fixed dt, cheap `step()`, a scrub that stays inside the 20,000-step cap without freezing the tab, reverse correctly greyed out (§12). This is the first real exercise of M3-11 … M3-14
- [READY] **M5-3** `fields-gradients` — heightmap with level curves, gradient perpendicularity, directional-derivative slider, shrinking-box divergence, draggable curl paddlewheel
- [READY] **M5-4** `fields-gradients` — flux through a **user-shaped** surface, with Stokes' theorem and the divergence theorem shown as two numbers converging. This is the payoff for M1-9's per-sample contributions and M2-9's scalar-coloured surface
- [READY] **M5-5** `explain.md` for both modules
- [READY] **M5-6** Both modules pass the contract suite and the E2E smoke suite and meet the §17 budget — the field module is the first real test of instanced glyphs against the 200-draw-call ceiling
- [READY] **M5-7** Run the per-module manual checklist for both
- [READY] **M5-8** Resolve **C-1**, the `stepped` dt contract gap: §12 says the fixed timestep is "module-overridable" but `types.ts` has nowhere to declare it. Add the field, bump `MODULE_CONTRACT_VERSION`, record the ADR. M5 is exactly where §20 says a contract defect gets fixed
- [READY] **M5-G** **Gate:** confirm shipping both required **zero** breaking changes to `src/modules/types.ts`. If a change was needed, the contract was wrong — fix it here, bump `MODULE_CONTRACT_VERSION`, write the ADR, and sweep `src/modules/*`. Not later, when 20 modules depend on it

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

- [DONE] **X-1** Repo-name discrepancy resolved in favour of **`phys-viz`** everywhere. `ARCHITECTURE.md` §5 (tree root), §14 (URL example), §19 (`base`), and §20 (M0 acceptance URL) now match the folder, `package.json` name, and the configured `base`. `base` must keep matching the Pages repo name exactly, including case, or every asset 404s. _(gated M0)_
- [READY] **X-2** Add the CC BY-SA 4.0 licence for module explanatory text and figures alongside the MIT code licence, and state the split in `README.md` and on the About route. §19 flags this as the thing that lets physics-education colleagues adopt and contribute, which is the realistic path to this outliving one semester. _(gates M0)_
- [DONE] **X-3** `scripts/check-bundle-budget.mjs` (new) reads `dist/.vite/manifest.json` (`build.manifest: true` added to `vite.config.ts`) and fails on: the entry chunk (§17's "shell + scene + kernel") exceeding 250 KB gzipped (currently 67.83 KB), or any `src/modules/<id>/index.ts` chunk exceeding 80 KB gzipped (currently 0.22–1.85 KB across all 4 registered modules). Wired into `ci.yml` as a step right after `Build`. Filenames alone can't distinguish the entry from a module chunk (every module's own source file is literally named `index.ts`), which is exactly why this reads the manifest's source-path keys rather than grepping `dist/assets/*.js` names
- [DONE] **X-4** The manifest confirms the intended split directly: the entry's static `imports` are exactly `[vendor, three, katex]` (the three named `manualChunks`), and every `src/modules/*/index.ts` appears **only** in the entry's `dynamicImports`, never its `imports` — `check-bundle-budget.mjs` asserts this structurally (fails if a module ever leaks into the eager `imports` list), which is what actually guarantees the O(1)-in-module-count claim rather than eyeballing chunk names after the fact
- [DONE] **X-5** No new work needed for M4 — the two motion paths §15 names (camera easing, M2-5; layer fades, M3-8) are shell/scene mechanisms already unit-tested under `prefers-reduced-motion` before `vector-algebra` existed, and the module introduces no camera or layer-visibility code of its own, so it inherits both for free. Re-verified applicable at M4 by inspection: the module never calls anything camera-related (not exposed by `SceneContext` anyway) and its layer visibility is entirely via `ctx.group()`, the shell-owned mechanism M3-8's fade already covers
- [DONE] **X-6** Re-confirmed rather than newly built: `getProjectorAdjustments` (`src/scene/theme/index.ts`, `{lineWidthMultiplier: 1.6, minOpacity: 0.35}`) and `html.projector-mode` (`src/design/projector.css`) were already wired end to end at M2-14/M3-41, e2e-verified there (projector checkbox toggles the class). `vector-algebra` uses only `ctx.palette.*` and stock glyphs — confirmed zero raw hex literals in its source — so it picks up both the DOM-chrome and scene-material halves automatically with no module-specific work
- [READY] **X-7** Keep `README.md` current: live URL, what the project is, how to run it, where the docs are, how to contribute a module. It is the front door for the M6 author. _(gates M6)_
- [READY] **X-8** Keep recording decisions as ADRs under `docs/adr/`, following `0001-record-architecture-decisions.md`. All of §23's questions are now written (0002–0009), including the up-axis question ADR 0008 exposed. The open queue is one ADR per module-specific sign convention as it arises, plus every future contract, URL-schema, or cross-module convention change. An accepted ADR is never edited — a change of course gets a new ADR that supersedes it. _(continuous)_
- [READY] **X-9** Keep `AGENTS.md` and `CLAUDE.md` in step with the substrate as it lands — both currently describe stubs as though they were working APIs, and stale agent docs produce confidently wrong code. _(continuous)_

## Contract gaps — the spec requires it, `types.ts` cannot express it

Found on the second pass. Each needs a decision before the milestone
that depends on it, and each fix is a `MODULE_CONTRACT_VERSION` bump
plus an ADR (§10).

- [READY] **C-1** **Module-overridable `stepped` dt.** §12: "The shell drives `step` with a fixed `dt` (default 1/240 s, module-overridable)". Nothing in `ModuleManifest` or `PhysicsModule` can express the override. Add it (e.g. `stepDt?: number`). Worked as M5-8; needed as soon as M3-11 exists
- [READY] **C-2** **Scene description for accessibility.** M3-32's canvas `aria-label` is generated "from module scalars", but `ScalarDef` carries no hint about which scalars belong in a spoken description or how to phrase one. Either the shell composes it generically from `label` + `symbol` + `unit` (preferred — no contract change) or the contract needs a field. Decide before writing M3-32
- [READY] **C-3** **Demonstration states.** M4-G's "under three clicks from a bookmarked link" is measured against a module's "demonstration states", which nothing declares. Confirm that layer toggles plus bookmarks suffice; if they don't, that is a contract addition, and §20 says fix it at M5, not later
- [READY] **C-4** `MODULE_CONTRACT_VERSION` has no CI check — its own doc comment admits "a bump is a signal to manually sweep `src/modules/*`". Consider a cheap guard (a per-module marker, or a test that fails when the constant moves) so a bump cannot land silently

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
- [DONE] **ADR-3** → [`0004-no-module-composition.md`](docs/adr/0004-no-module-composition.md). **No composition — modules stay leaves.** Deferred, not rejected: revisit when ≥8 modules exist _and_ a concrete duplication case is demonstrated. Share capability downward (a new glyph, a kernel function), never sideways. Makes **M0-9**'s cross-module import ban load-bearing rather than advisory
- [DONE] **ADR-4** → [`0005-offline-via-service-worker.md`](docs/adr/0005-offline-via-service-worker.md). **Service worker, full offline**, precaching the shell _and every module chunk_, with a user-clicked update rather than a silent mid-lecture swap. Scheduled as **M6.5 / P-1 … P-6**
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
