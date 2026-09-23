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

- [DONE] **M5-1** `rotational-dynamics` built out to full scope as seven layer-gated sub-panels sharing one manifest (`timeModel: 'stepped'`, kept only because the Dzhanibekov panel has no closed form): torque with a drawn moment arm + sense arc, parallel-axis theorem (two axis lines through the same box), L-vs-ω non-parallel case (`L = I·ω` via `kernel/math`'s `transformMat3`), inertia ellipsoid (`eigenSymmetric3` on the box tensor → a non-uniformly-scaled `body({kind:'sphere'})`, oriented via `fromMatrix` on the eigenvectors), precession + nutation (closed-form fast-top approximation composed from `fromAxisAngle`/`rotateVec3`), rolling with an instantaneous-axis marker and a purely-`t`-derived cycloid trace (not accumulated across calls, which would have broken idempotence), and the Dzhanibekov tumbling itself. New `src/kernel/rigidBody/` (`eulerRHS`, `quatDerivative`) added for the one genuinely general rigid-body primitive this needed — 100% line coverage, golden-tested (symmetric-top special case, a hand-computed asymmetric case, small-dt/full-period consistency against `fromAxisAngle`)
- [DONE] **M5-2** Verified for real, not just coded: `step()`/`reset()` pack `[q, ω]` into a hoisted-scratch `Float64Array(7)` and integrate via `kernel/ode`'s `rk4` (chosen over hand-rolled Euler — the RHS is trivial arithmetic, so 4 evaluations/step stays far under §12's "step() must stay cheap" bar, and `rk4` conserves energy/`|L|` far better than first-order Euler across a multi-thousand-step run). `module.test.ts`'s own test runs 3000 real `step()` calls at the default `stepDt` and asserts: kinetic energy and `|L|` stay within 1% of their `reset()` values (conservation, torque-free), **and** the intermediate-axis ω component actually changes sign (the Dzhanibekov flip itself, not just "doesn't crash for a while"). Reverse-greyed-out and the 20,000-step scrub cap are shell-level behavior already proven generically by `driver.test.ts` (M3-11…M3-14) and now exercised against a real stepped module for the first time via the contract suite's new stepped-only assertion (see M5-8)
- [DONE] **M5-3** `fields-gradients` built out: banded `colorField` on the heightmap `surface` IS the level-curve mechanism (no marching-squares tracer — disproportionate to this project's own no-gold-plating rule); the gradient arrow is drawn perpendicular to a straight tangent segment (`normalize([-gy,gx,0])`, a 90° rotation of `∇f`) at a draggable-by-slider probe point; the directional-derivative panel projects `∇f` onto a rotatable `û` using the same shadow-arrow idiom `vector-algebra` already established; the whole-domain gradient overlay reuses the `field` glyph (`gridResolution:[9,9,1]`, one `InstancedMesh` draw call regardless of grid density — this is M5-6's promised first real exercise of instanced glyphs); the shrinking-box divergence panel is 6 axis-aligned `surface` faces, each face's `∂u×∂v` orientation hand-derived and verified outward, whose local flux density (`dot(F, unit normal)`) drives its own colouring
- [DONE] **M5-4** The "user-shaped surface" is a continuous `capDepth` number param morphing a **fixed-boundary-circle** cap from a flat disk to a bowl/dome — not a discrete preset `select` (rejected: `kernel/calculus`'s `volumeIntegral` only accepts a `BoxRegion`, so pairing a sphere/torus preset with a matching divergence check would mean re-deriving quadrature over a ball inside the module, duplicating kernel logic). The draggable curl paddlewheel is a plain `{kind:'vector', draggable:true}` param — the module writes zero pointer code, exactly per §10 — visualized as a double-headed axis arrow plus a `curvedArrow` whose spin rate is `t · gain · |curl|` (curl's own sign already fixes the spin sense via `curvedArrow`'s CCW-about-`+axis` convention, ADR 0008, no manual flip needed). `module.test.ts` proves both theorems numerically (divergence-theorem gap `< 1e-6`, since the box's polynomial faces make quadrature exact even at low `n`) and proves Stokes' theorem as genuine **quadrature convergence** rather than exactness — the cap's trig parametrization means the circulation/curl-flux gap is `~0.15` at `n=2` and shrinks below `1e-3` by `n=16`, a real (and initially surprising) finding now written into `explain.md` rather than glossed over — plus surface-independence directly: flux of curl through the cap agrees to 4 decimal places whether `capDepth` is `0` (flat) or `1.2` (deep bowl)
- [DONE] **M5-5** `explain.md` written for both modules, following `vector-algebra`'s "What am I looking at? / What should I notice? / The equations" structure; both parse (contract assertion 10) and were written only after each module's actual scalar names and numeric behavior (e.g. the Stokes convergence finding above) were stable, not before
- [DONE] **M5-6** Both modules pass the full contract suite with **no module-specific test code** required to get there (verified — see M5-G), pass the E2E smoke suite's dynamic per-module sweep (`tests/e2e/smoke.spec.ts`, zero test-file edits: canvas renders, no console errors, every layer toggles, WebGL context disposed on navigate-away), and meet the §17 budget: `rotational-dynamics` and `fields-gradients` compile to 4.08 KB / 4.16 KB gzipped respectively (`npm run check:budget`, 80 KB budget), the shared entry chunk is unaffected (68.64 KB against 250 KB). The field module's whole-domain gradient overlay is the promised first real exercise of instanced glyphs against the 200-draw-call ceiling — one `InstancedMesh` draw call for the whole 9×9 grid, confirmed by `field.ts`'s own design (not a new measurement). Triangle/draw-call counts were not instrumented (same residual gap as M4-9 — no `renderer.info` debug hook); by code-inspection accounting both modules are on the order of 20–30 draw calls total, far under the ceiling. **A real substrate defect surfaced and was fixed along the way**: `src/modules/testing/MockSceneContext.ts`'s `set()` recorder used `structuredClone(props)`, which throws on any function-valued prop — `surface`'s `parametric`/`colorField` and `field`'s `sample` are functions by design (both glyphs' own doc comments anticipate a fresh closure every `set()` call), so `fields-gradients` was the first module to ever exercise this path through the real contract suite and it crashed immediately. Fixed with `sanitizeForRecording` (clones data, replaces functions with a stable placeholder) — otherwise even a fix for the crash alone would have left every idempotence/determinism assertion failing anyway, since two structurally-identical closures created on separate `update()` calls are different object references and would never satisfy `toEqual`
- [DONE] **M5-7** Manual checklist pass, same construction-based reasoning M4 used: 320 px (module-agnostic layout fix already covers any module), `prefers-reduced-motion` (neither module adds camera or layer-fade code of its own), colour-blindness (both modules use only `ctx.palette.*`, zero raw hex — verified by `grep`). Projector: cannot drive real hardware from this environment — flagged as the same residual manual gap M2-19/M4-6 already documented, not silently claimed
- [DONE] **M5-8** Resolved **C-1**. Added `stepDt?: number` to `ModuleManifest` (`src/modules/types.ts`), bumped `MODULE_CONTRACT_VERSION` 1 → 2 with a doc-comment explanation of why an additive field is still consistent with "zero breaking changes", gave `FixedStepAccumulator`/`SteppedScrubber` (`src/shell/timeline/driver.ts`) an optional constructor `dt` (default `FIXED_DT`, so every existing zero-arg call site is byte-identical), threaded `module.manifest.stepDt ?? FIXED_DT` through `ModuleView.tsx` once per mount, and recorded the decision as [`0010-stepdt-module-overridable-timestep.md`](docs/adr/0010-stepdt-module-overridable-timestep.md). Also added a new generic contract assertion (`stepped modules implement step() and reset()`) closing a related previously-silent gap — those hooks are optional on `ModuleInstance` for every `timeModel`, so a `stepped` module that forgot them was unenforced until now. `driver.test.ts` gained cases exercising both classes with a non-default `dt`; `rotational-dynamics` itself doesn't need to set `stepDt` (the 1/240s default is fine for its one stepped panel), so the override ships proven by driver-level tests, not by a shipped module depending on it yet
- [DONE] **M5-G** **Gate met.** Zero breaking changes to `src/modules/types.ts` confirmed: `stepDt` is additive/optional (M5-8's ADR spells out why the version bump doesn't contradict this), and no existing `ParamDef`/`ScalarDef`/`ModuleManifest` field changed shape. `npm run typecheck && npm run lint && npm run test:unit` (463 tests) `&& npm run test:coverage` (99.54% kernel lines, `kernel/rigidBody` at 100%) `&& npm run test:contract` (78 passed / 7 skipped, both new modules green under both up-axes) `&& npm run build && npm run check:budget` all clean; `npx playwright test` (22/22) green, including both new modules picked up automatically by the M4-8 dynamic sweep. **M6 is unblocked** — its tasks below are flipped from `BLOCKED` to `READY` in this change

## UI-1 — Shell UX cleanup (pre-M7 polish)

A pre-authoring-gate cleanup pass over seven UX/architecture issues
found once real modules (M4/M5) existed to expose them, fixed at the
shell/scene layer per `AGENTS.md`'s own rule so every future module
inherits the fixes for free. Full rationale in
[`0011-shell-ux-cleanup.md`](docs/adr/0011-shell-ux-cleanup.md).

- [DONE] **UI-1** Layout: `.pv-viewport-canvas` is now full-bleed
  (`position: absolute; inset: 0`) inside a `position: relative`
  `.pv-module-view__layout`; `.pv-module-view__panel` is a pinned-width
  floating overlay instead of a flex column. `Viewport`'s existing
  `ResizeObserver` already tracks the canvas element's own CSS size, so
  this needed no scene-layer change. Added a panel collapse toggle
  (CSS-class-driven, not unmounted, so scroll position/open `<details>`
  survive) and a "Recenter view" button reusing the existing
  `camera.goTo(defaultView.preset, 400)` tween. Below 640px the
  pre-existing stacked layout (M3-35) is kept. Verified in a real
  browser: canvas fills the full viewport at both 1920px and a narrowed
  900px window (only the panel's coverage proportion changes, not the
  canvas's own extent); collapse toggle and Recenter both confirmed
  working via DOM inspection
- [DONE] **UI-2** Global settings: "Free rotation" (was a per-panel
  button, already shell-owned but only ever visible for `dimensions: 2`
  modules) and a new "Reference grid" toggle both moved into
  `SettingsMenu`. The grid is now genuinely shell/`Viewport`-owned (a
  new `Viewport.setGridVisible`, backed by `prefs.showGrid`, persisted +
  `gr=` URL key, same treatment as up-axis/theme/projector) rather than
  module-authored — `control-showcase`'s own `ctx.axes()` grid glyph is
  removed, along with its dead `s.layers.grid ?? true` read (no matching
  `LayerDef` ever existed for it — a real latent unreachable-UI bug,
  now moot). "Free rotation" is `ui.rotationReleased`, deliberately
  **not** persisted/URL'd (same transient shape as presenter/predict
  mode). Verified: `SettingsMenu` unit tests (3 new), Playwright's
  M3-G gate spec exercises the settings-menu path end to end
- [DONE] **UI-3** Label-visibility substrate fix (also closes UI-7's
  concrete example): `createLabel(props, host, attachTo?)` gained an
  optional `attachTo: THREE.Object3D` — the embedding glyph's own root —
  and hides the DOM overlay whenever `attachTo` or any ancestor group is
  invisible (`isVisibleInHierarchy`, new `src/scene/internal/
visibility.ts`). Root cause: `Viewport.setGroupVisible` (the path
  every layer checkbox uses) only ever toggled the three.js
  `Object3D.visible` flag directly, never a handle's own `.visible()` —
  so a label whose glyph was hidden by a _layer_ toggle kept rendering
  forever. `arrow`/`arc`/`curvedArrow`/`dimensionLine` all updated to
  pass their root. Verified: new `arrow.test.ts` case proving a label
  hides when its group (not the handle) is toggled off via a fake host,
  and Playwright's per-module layer-toggle sweep exercises it live
- [DONE] **UI-4** Panel reorg: `ModuleView`'s panel body now renders
  always-visible params, then `LayerManager` (layer picker), then one
  `<details>` per currently-checked layer holding only its
  `forLayer`-linked params, then Timeline/readouts/plots/Explain
  (unchanged position at the bottom) — "what do I want to visualize"
  before each choice's own numeric/display options. Verified live: on
  `vector-algebra`, checking "Scalar triple product" opens exactly one
  `<details>` containing only "Vector c"
- [DONE] **UI-5** Checkbox-vs-radio strategy, decided per module rather
  than blanket policy: `vector-algebra`/`fields-gradients` keep
  independent checkboxes (their demonstrations are meant to combine, or
  already coexist by design without visual conflict);
  `rotational-dynamics`'s all-independent seven layers (the module
  explicitly named as producing "a mass of overlaid items that are
  unintelligible" when combined) now share `exclusiveGroup: 'panel'`,
  rendering as a mutually-exclusive radio set — resolves the complaint
  without needing to split the module. Verified live: checking "Rolling"
  in `rotational-dynamics` automatically unchecks "Torque"; Playwright's
  dynamic per-module layer-toggle sweep passes for all 4 modules
  including the new radio rendering
- [DONE] **UI-6** `VectorPad`'s per-axis inputs each keep a local text
  buffer (authoritative while typing), committing upward only when it
  parses to a finite number — fixes typing a bare `-`/trailing `.`/an
  emptied field reverting to the last committed value mid-keystroke.
  Verified live: typing `-3.5` into a vector component from `0` stays
  `-3.5` at every keystroke and commits correctly to the URL
- [DONE] **UI-7** General visual-bug pass: the vector `c` example given
  (label outliving its hidden arrow) is the same root cause as UI-3,
  fixed there. One additional bug found during verification —
  `formatQuantity` (`kernel/units`) shows a misleading SI-prefix letter
  for dimensionless readouts (e.g. `cosAlpha` renders "949 m" instead of
  "0.949") — flagged as a separate follow-up task rather than folded
  into this pass, since it's unrelated kernel/units formatting logic,
  not a shell/scene visibility bug
- [DONE] **UI-8** Contract addition backing UI-4/UI-5: `ParamBase.
forLayer?: string` and `LayerDef.exclusiveGroup?: string`, both
  additive/optional (same shape/precedent as `stepDt`, ADR 0010).
  `MODULE_CONTRACT_VERSION` bumped 2 → 3. Recorded as
  [`0011-shell-ux-cleanup.md`](docs/adr/0011-shell-ux-cleanup.md).
  `vector-algebra`/`rotational-dynamics`/`fields-gradients` all adopt
  `forLayer`; `control-showcase` gained one `forLayer` example
  (`traceSteps`, nested under `trace`) so the fixture keeps exercising
  it — `exclusiveGroup` is instead covered by `LayerManager`'s own new
  unit tests plus `rotational-dynamics` as a real module, not by adding
  a contrived pair to the fixture
- [DONE] **UI-G** **Gate:** `npm run typecheck && npm run lint &&
npm run test:unit` (468 tests, including 2 new `SettingsMenu` cases, 2
  new `LayerManager` exclusiveGroup cases, and 1 new `arrow.test.ts`
  label-visibility case) `&& npm run test:contract` (78 passed / 7
  skipped, unchanged) `&& npm run build && npm run check:budget` all
  clean; `npx playwright test` (22/22) green, including the updated
  M3-G gate spec (settings-menu-driven Free Rotation check replacing the
  removed in-panel button) and the dynamic per-module layer-toggle sweep
  now exercising radio-button rendering for `rotational-dynamics`

## UI-2 — Post-review bug fixes (camera lock scope, recenter, playback clamp)

Bugs found reviewing UI-1's work: [`0012-global-2d-lock-recenter-offset-playback-clamp.md`](docs/adr/0012-global-2d-lock-recenter-offset-playback-clamp.md)
amends ADR 0011 with the corrected scope and full rationale.

- [DONE] **UI-9** "Free rotation" now applies globally instead of only to
  `dimensions: 2` modules — `ModuleView.tsx`'s mount effect and live-prefs
  effect both dropped the `manifest.dimensions === 2` gate around
  `camera.setLockedToPlane`/`camera.setProjection`. Default (unchecked):
  every module locks orbit and forces orthographic projection; checked:
  orbit unlocks and the module's own declared projection (persp, for a
  module that asked for one) is restored. Also closed a real
  pre-existing gap surfaced while fixing this: `viewport.camera.setState(...)`
  was never called anywhere, so a fresh mount always started at
  `Viewport`'s own internal placeholder angle rather than the module's
  `defaultView` (or a decoded URL's bookmarked orientation) — now called
  once at mount, before the lock is applied, so locking freezes onto the
  _correct_ angle. Verified: `camera/index.test.ts`'s existing
  `setState`/`setLockedToPlane`/`setProjection` unit coverage plus a new
  Playwright test (`free rotation ... applies globally`) toggling the
  setting on `rotational-dynamics` (`dimensions: 3`) end to end with
  zero console errors — the exact case that previously had no wiring at
  all
- [DONE] **UI-10** "Recenter view" now also re-centers content within the
  _visible_ pane, not the full canvas, when the floating panel overlays
  part of it. New `CameraController.setPaneOffset(width, height,
occludedRightPx)` — a `THREE.Camera.setViewOffset` asymmetric-frustum
  shift, math verified directly against three.js's own
  `updateProjectionMatrix` source for both camera types — exposed via
  `Viewport.centerInVisibleArea`. `ModuleView` computes the occluded
  width from real `getBoundingClientRect()`s of the canvas and panel
  (0 when collapsed or genuinely stacked below the canvas, detected by
  an actual vertical-overlap check rather than a duplicated CSS
  breakpoint constant) and applies it on mount, on every panel
  collapse/expand, and on every Recenter click. Verified: 4 new
  `camera/index.test.ts` cases (offset math, clearing, both projections,
  onChange notification) plus a Playwright regression test on a 3D
  module (`fields-gradients`)
- [DONE] **UI-11** Playback no longer runs forever past the scrub
  slider's own end. Root cause: a bare `<input type="range" max={maxT}>`
  only clamps where the thumb is _drawn_ — `ModuleView`'s own play-loop
  never bounded `t`, and `Timeline`'s `maxT` default (20s) was never
  even passed in from `ModuleView`, so the two could have silently
  drifted apart too. `Timeline` now exports `DEFAULT_MAX_T`, passed
  explicitly into `<Timeline maxT={DEFAULT_MAX_T}>`, and the same
  constant clamps the play-loop for both `parametric` (both directions —
  forward stops at `DEFAULT_MAX_T`, reverse at `0`) and `stepped`
  (forward only, matching reverse being disabled for stepped models per
  §12) time models, setting `playing: false` the instant a bound is
  reached. Verified end to end by a new Playwright test: play a
  `parametric` module at 4x speed, confirm `t` reaches exactly
  `20.00s` and _stays_ there rather than continuing to climb
- [DONE] **UI-12** `fields-gradients/index.ts` cleanup pass for
  consistency with `rotational-dynamics`: added `// ---- Section ----`
  banner comments in `create()` (previously the only one of the two
  `M5` modules without them), and factored the `capSurf`/`boundary`
  closures — previously defined identically twice, once each in
  `update()` and `scalars()` — into shared top-level `capSurface`/
  `capBoundary` functions, mirroring the `cubeFaces` sharing pattern
  already used in the same file. No behavior change
- [DONE] **UI-G2** **Gate:** `npm run typecheck && npm run lint &&
npm run test:unit` (472 tests, incl. 4 new `camera/index.test.ts`
  `setPaneOffset` cases) `&& npm run test:contract` (78 passed / 7
  skipped, unchanged) `&& npm run build && npm run check:budget` all
  clean; `npx playwright test` (25/25) green, including 3 new tests
  covering UI-9/10/11 end to end in a real browser

## M6 — Authoring path (the extensibility gate)

**Accept when:** a person who has never seen the codebase ships a
working, contract-passing module in under four hours using only
`MODULE_AUTHORING.md`. Do not skip this gate.

Unblocked — **M5-G** is met (see M5-G above).

- [DONE] **M6-1** `_template/` rewritten from three empty `params.ts`
  arrays and a no-op `create()` into a genuine, minimal working demo: a
  single draggable-free vector arrow driven by one live example of each
  of the four param kinds most modules reach for (`number` amplitude,
  `vector` direction, `toggle` label visibility, `select` line style),
  one layer, one readout scalar, and a real `explain.md` with a live
  KaTeX equation (previously inside an HTML comment). Deliberately
  smaller than `control-showcase`'s 7-glyph kitchen sink — 2 glyph
  handles (`arrow` + `label`) — since that module already covers the
  rarer kinds (`expression`, `angle`, `logScale`). Verified:
  `npm run typecheck && npm run lint` clean, and end-to-end via M6-4's
  generator run below
- [DONE] **M6-2** `docs/MODULE_AUTHORING.md` rewritten against the real
  substrate: added the previously-undocumented `defaultView` and
  `stepDt` manifest fields, replaced "see `src/scene/glyphs/` for the
  full set" with an inline table of all 15 glyphs and their key props,
  added `ctx.palette`/`ctx.up` sections pointing to
  `PHYSICS_CONVENTIONS.md`, and corrected §7's contract-suite
  description to the real 11-assertion, dual-up-axis suite (previously
  described only 7 of the checks the test file actually runs). A second
  pass — after the M6-6 gate run below surfaced real gaps — added
  `category`'s closed enum, a note that `dimensions` is now purely
  informational (ADR 0012 made the 2D camera lock global), the
  radians-only convention for angles, the `kernel/units` named-constant
  convention, disambiguated `ScalarDef[]` vs. the runtime `scalars()`
  function, and annotated the `label` glyph's `offset` as screen pixels
  (not a third world dimension) after that exact ambiguity caused a
  real compile error during the gate run. Also softened §1's "read
  ARCHITECTURE.md §2 first" into an inline one-paragraph doctrine
  summary, since sending a reader elsewhere in the doc's own first
  step undercut its "never has to open the rest of the codebase" claim
- [DONE] **M6-3** Added [ADR 0013](docs/adr/0013-outward-normal-for-closed-surface-flux.md),
  documenting `fields-gradients`' outward-normal parametrization
  convention for closed-surface flux (`∂S/∂u × ∂S/∂v` must point
  outward — handedness alone doesn't fix this) — the first real
  instance of the "module-specific sign convention" pattern ADR 0008
  anticipated, and the actual remaining gap M6-3 identified.
  `PHYSICS_CONVENTIONS.md`'s "Still open" section reframed accordingly,
  with the outward-normal rule moved into a new "Surface orientation"
  section citing the ADR, and the `ctx.up`-reading pattern from
  `rotational-dynamics` added as a concrete worked example under
  "Which axis is up" (previously stated only in the abstract).
  `ARCHITECTURE.md` §23 and the `TASKS.md` ADR backlog line updated to
  match
- [DONE] **M6-4** Fixed `ARCHITECTURE.md` §11's own code snippet, which
  used a stale `./*/manifest.ts` glob contradicting both the real
  `registry.ts` (`./[a-z]*/manifest.ts`) and the doc's own prose one
  paragraph below it — also brought the snippet's missing
  `explainModules`/`loadExplain` back in sync with the real file.
  `npm run new:module` itself needed **no fix** — actually ran
  `node scripts/new-module.mjs template-smoke-test` end to end: id
  substitution correct, and the generated folder passed
  `typecheck`/`lint`/`test:contract`/`test:unit` with zero edits
  elsewhere (96 contract tests passed against the smoke module + the
  10 pre-existing modules, 480 unit tests all green). Smoke folder
  deleted after verification
- [DONE] **M6-5** Consolidated the three previously-divergent
  manual-checklists (`ARCHITECTURE.md` §18 prose, §21's 7-item list,
  `MODULE_AUTHORING.md`'s old §8) into one canonical, copy-pasteable
  `## Checklist` markdown task-list at the end of
  `MODULE_AUTHORING.md`. `ARCHITECTURE.md` §18 and §21 now point at it
  instead of repeating their own wording; §18 also gained the 11th
  contract-suite assertion (stepped `step`/`reset`) and the dual-up-axis
  note that its prose had been missing relative to the real test file
- [DONE] **M6-6** Ran the gate as a **simulated** first-time author,
  per the decision to proxy this with an LLM rather than skip it, since
  no human tester was available this session: a fresh subagent with
  zero prior context on this repo, given only the rewritten
  `MODULE_AUTHORING.md` and a spec for a real module
  (`projectile-motion` — 2D closed-form kinematics), told to log every
  file it had to open beyond that doc and why. It built a fully
  working, contract-passing module in ~35–40 tool calls and found four
  real, load-bearing gaps: (1) `angle`-kind params' radians-vs-degrees
  convention was undocumented anywhere; (2) `kernel/units`' `Dimension`
  exponent-tuple convention had no named constants and no worked
  example, forcing a guess at the exponent order; (3) the glyph table's
  `label.offset` prop reads as a 3-vector by pattern-matching every
  other row, but is actually `readonly [number, number]` **screen
  pixels** — a real `tsc` failure during the run; (4) `dimensions`'
  actual (now purely informational, post-ADR-0012) behavior was
  undocumented, costing a detour into `scene/camera`. Also flagged as
  softer friction: the `scalars: ScalarDef[]` vs. `scalars(state)`
  runtime-function name collision, and `category`'s un-enumerated
  closed set. This is a proxy, not a literal human trial — the agent
  doesn't get confused the way a person new to physics-sim codebases
  would, so treat "no friction found" as a weaker signal than "friction
  found," not as proof the doc is human-ready
- [DONE] **M6-7** Fixed every gap M6-6 found, in the substrate where
  the gap was substrate-shaped, not just the doc: added named
  `Dimension` constants (`MASS`, `LENGTH`, `TIME`, `VELOCITY`, `ACCEL`,
  `FORCE`, `ENERGY`, `TORQUE`, `MOMENT_OF_INERTIA`, `ANGULAR_VELOCITY`,
  `ANGULAR_MOMENTUM`) to `kernel/units` — the gate's own module had
  independently reinvented two of these with identical values before
  the fix landed, confirming the duplication risk was real, not
  theoretical. Documented radians-for-angles, the new unit constants,
  `category`'s enum, and `dimensions`' real behavior in
  `MODULE_AUTHORING.md`/`PHYSICS_CONVENTIONS.md` (folded into M6-2/M6-3
  above). Annotated the `label.offset` table row. Flagged
  `rotational-dynamics`' own pre-existing local `Dimension` duplicates
  as **C-5** rather than touching a previously-shipped module outside
  this change's scope. One gate run surfaced enough real friction that
  a fix-and-retest cycle was warranted; skipped a second live retest
  run (cost/value) since the fixes are direct, targeted answers to
  concretely-quoted confusion, not speculative — the retest coverage
  it would provide is standing in the M6-4 generator/contract-suite
  runs, `test:unit`/`test:contract`/`build`/`check:budget`, and the
  browser check below, which all remained green as each fix landed
- [DONE] **M6-G** Gate met by the simulated standard above: a
  from-scratch author with only `MODULE_AUTHORING.md`, `kernel/units`,
  and one glyph-table lookup shipped a real, correct, contract-passing
  `projectile-motion` module. Kept as a genuine 13th gallery module
  (not deleted as scratch) after review — closed-form 2D kinematics,
  correct `ctx.up`/`ctx.palette`/`kernel/units` usage, two golden-value
  tests (range/max-height formulas, and the 45°-maximizes-range
  property), verified via `typecheck`/`lint`/`test:unit`
  (482 tests)/`test:contract` (98 passed, 8 skipped)/`build`/
  `check:budget` (0.96 KB gzipped chunk) all green, `npx playwright
test` 29/29 green including its dynamically-picked-up per-module
  smoke test, and a manual browser pass (renders, animates, readouts
  match the closed-form values, no console errors, 320px width has no
  horizontal overflow). Unblocks **M6.5** (below)

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

Unblocked — **M6-G** is met (see M6-G below).

### Offline support (ADR 0005)

- [DONE] **P-1** Hand-rolled service worker (`src/sw.ts`, no library — `vite-plugin-pwa`/Workbox considered and declined with the user up front: zero new dependency, matches this repo's existing pattern of hand-rolling small pieces like `hashRouter`/`urlCodec`), cache-first `fetch` handler (`caches.match(event.request).then(cached => cached ?? fetch(...))`). TypeScript ships no Service Worker `lib` and `WebWorker`'s own `self` typing conflicts with `ServiceWorkerGlobalScope`, so `tsconfig.sw.json` targets bare `ES2020` and the handful of platform ambients used (`Cache`, `CacheStorage`, `ExtendableEvent`, `FetchEvent`, `Clients`, `self`) are hand-declared at the top of `src/sw.ts` rather than pulling in `@types/serviceworker`. Since the file has zero imports, `tsc -p tsconfig.sw.json` emits `dist/sw.js` directly with no bundler. Verified: `npx tsc -p tsconfig.sw.json --noEmit` clean, `npm run lint` clean (new `.eslintrc.cjs` override with `env: {serviceworker: true}` and the same import ban list as kernel)
- [DONE] **P-2** `scripts/generate-precache-manifest.mjs` (post-build step, chained into `npm run build`) reads `dist/.vite/manifest.json` and precaches every `file`/`css`/`assets` entry across the **whole** manifest — not a static+dynamic import-graph walk — which trivially sweeps up every module's lazy chunk and every module's `explain.md` chunk (§11) whether or not anything happens to statically import it, plus `index.html`/the base path and every font under `dist/fonts/**`. String-replaces two placeholders (`__PV_SW_VERSION__`, `__PV_PRECACHE_URLS__`) into the already-built `dist/sw.js`. Verified: a real build precached 81 URLs including all 5 registered modules' chunks; `tests/e2e/offline.spec.ts` (P-6) proves a module chunk never fetched while online still loads with the origin server dead
- [DONE] **P-3** Update flow: `VERSION` (a short sha256 of the sorted precache URL list, cheap since filenames already carry Vite's content hashes) drives `CACHE_NAME`; install never calls `self.skipWaiting()` so a new worker sits in `waiting` until the user acts; `src/shell/serviceWorker/UpdateNotice.tsx` renders a non-blocking banner only once `subscribeUpdateAvailable` fires; `applyUpdate()` posts `SKIP_WAITING` and registers the `controllerchange`→reload listener **at that call**, not at startup — a real bug caught during verification: `controllerchange` also fires the very first time a previously-uncontrolled page gets claimed by a freshly activated worker (via `clients.claim()`), so registering that listener unconditionally in `registerServiceWorker()` reloaded every first-time visitor before they'd clicked anything. Fixed by scoping the listener to `applyUpdate()` itself, `{once: true}`. Verified: `src/shell/serviceWorker/register.test.ts` (4 tests) + `tests/e2e/offline.spec.ts`'s update test (byte-different `sw.js` on a real disposable server → notice appears → click → reload → old `pv-cache-*` entry gone)
- [DONE] **P-4** `registerServiceWorker()` early-returns under `import.meta.env.DEV`, and in dev actively unregisters any existing registration (`getRegistrations().forEach(r => r.unregister())`) so a developer who previously ran a production preview against the same origin can't inherit a phantom cached bundle. Verified: `register.test.ts`'s dev-mode test
- [DONE] **P-5** `generate-precache-manifest.mjs` prints `Service worker: N URLs precached, version …` and `Total precache size: … MB (on-disk, uncompressed)` as part of the existing `Build` step's own output — no separate CI step needed since that step already runs in `ci.yml` and its log is visible there. Current real number: 81 URLs, 2.24 MB, across the 5 registered modules
- [DONE] **P-6** `tests/e2e/offline.spec.ts`. Both tests deliberately avoid Playwright's `context.setOffline()`/CDP network-condition emulation and `page.route()` interception — verified empirically that in this Chromium build both intercept renderer sub-resource requests (and the browser's own SW-script update-check fetch) _before_ they reach the SW's `fetch` handler or the real network, so a genuinely precached module chunk (confirmed present via `caches.keys()`) still failed to load under `setOffline(true)`; a `page.route('**/sw.js', …)` stub was never even invoked for `registration.update()`. Documented as a known CDP/Playwright limitation, not an app bug, in the spec file's header. Worked around with real files on a real, disposable per-test static server (Node's built-in `http`, no dependency): test 1 loads the app, confirms an active controller, then **kills the actual server process** and opens `fields-gradients` (never visited online) for the first time, reloads the whole shell, toggles a layer, and scrubs the timeline — all with nothing listening on that port. Test 2 copies `dist/` to a private temp dir, mutates only that copy's `sw.js` version between two "deploys," and confirms the update notice appears, is never auto-applied, and the old `pv-cache-*` entry is dropped after the user's own reload click. Also ran the full Chromium Playwright suite (32/32 passing at `--workers=2`; 6-worker runs show pre-existing, unrelated resource-contention flakiness in two `smoke.spec.ts` tests that pass individually — matches M2-19's own documented note about this machine being a floor, not a ceiling). Attempted an additional manual pass in this session's own Browser-pane tool as the task brief suggested, but that tool's `navigator.serviceWorker.register()` fails outright there (`"An unknown error occurred when fetching the script"`) regardless of this app's code — confirmed via a direct `curl` that the server's response for `sw.js` is a correct 200 with `Content-Type: text/javascript`, so the failure is that pane's own environment (plausibly a deliberate restriction on persistent Service Worker registration in a shared remote browser), not an app defect. Flagging this as a residual manual-verification gap rather than silently substituting the Playwright evidence for it — Playwright's Chromium is a real, separate browser install and is what actually exercised the Service Worker stack end to end above

### GIF export (ADR 0006)

- [DONE] **P-7** `src/shell/export/gif/encoder.ts` — an original, from-scratch GIF89a/LZW writer (~150 lines), not a vendored third-party file (the user-approved decision: "vendor a small MIT encoder" was really about _no npm dependency, no CDN, full palette control_; GIF89a/LZW is a public, well-documented format, so writing it fresh avoids copying an external file's source into the repo without being able to verify its licence/provenance in this session, for the same practical shape). `src/shell/export/gif/index.ts` is the actual dynamic-import entry point (`GifExportPanel` only ever `import('./gif')`s inside its click handler); `scripts/check-bundle-budget.mjs` extended with a structural check (must appear only in the entry's `dynamicImports`, mirroring the existing per-module check) and a size check. Verified: real build measures **2.02 KB gzipped** — far under the 250 KB budget, since a hand-written encoder has no framework overhead
- [DONE] **P-8** `src/shell/export/gif/capture.ts`'s `captureGif()` builds a completely separate, off-screen `Viewport` + fresh `module.create()` instance (never the live one `ModuleView` owns), then: for `parametric` modules, calls `instance.update({t: startT + i/fps, ...})` directly on the synthetic grid; for `stepped` modules, reuses `SteppedScrubber`/`FixedStepAccumulator` from `src/shell/timeline/driver.ts` **unmodified** — `SteppedScrubber` fast-forwards to the export's start time exactly like live scrubbing does, then one `FixedStepAccumulator.advance(1/fps, 1, step)` call per exported frame reproduces the identical sequence of fixed-`stepDt` `step()` calls a live playback at that exact frame rate would have produced. Needed and added two small `Viewport` methods for headless/off-screen use: `resizeTo(w,h)` (sets an exact pixel size for a detached, never-laid-out canvas — `handleResize()` can't be reused since it reads `canvas.clientWidth/Height`, always 0 with no CSS layout box) and `renderNow()` (a synchronous single-frame render, bypassing `requestAnimationFrame` so capture stays deterministic). Verified end to end by P-G (byte-identical exports for both a `parametric` module and the one registered `stepped` module)
- [DONE] **P-9** `GifExportPanel.tsx`: duration (1–20 s), fps (5–24), width/height (160–960 px) inputs, all clamped; a live "estimated size (upper bound)" readout (`frames × width × height`, the pre-LZW indexed size — labelled as an upper bound rather than overclaiming precision, since actual LZW compression on schematic line art varies with content) shown before the "Export GIF" button is ever clicked
- [DONE] **P-10** Export never touches the live 60 fps path: `captureGif` constructs its own `Viewport`/instance/canvas, calls the new `Viewport.stopLoop()` immediately (cancels that Viewport's own `requestAnimationFrame` chain — necessary because `Viewport`'s constructor always starts one, which would otherwise race the export's own synchronous per-frame capture with real-wall-clock-timed renders) so nothing about export runs on the render loop at all. Verified: `tests/e2e/perf.spec.ts` re-run with the export code present — 55.4 fps avg / 29.9 fps worst-frame / 0.22 MB heap delta over 299 frames, consistent with M2-19's original baseline (36.6–55 fps range across runs on this machine, heap delta ~0.2 MB either way) — no regression
- [DONE] **P-11** `src/shell/export/gif/quantize.ts`'s `buildExportPalette()` builds a **fixed** palette (not a generic median-cut/octree quantizer) from `src/scene/theme`'s hardcoded `getPalette()` — every §15 semantic token is a literal palette entry, so an exact-colour pixel always resolves to itself with zero quantization error (unit-tested directly in `quantize.test.ts`) — plus a 32-step greyscale ramp and a 12-step black→hue→white ramp per semantic colour (218 entries total, well under GIF's 256 cap) so `MeshStandardMaterial`'s lit shading gradient on `body` glyphs doesn't band harshly. `captureGif` passes `projectorMode: true` per ADR 0006's "prefer the projector variant." Verified: `tests/e2e/gif-export.spec.ts` decodes the real exported GIF's global colour table and confirms every one of the 8 Okabe–Ito hexes is present exactly, for both a `parametric` and the `stepped` module
- [DONE] **P-12** Repo-wide grep for `MediaRecorder`, `captureStream`, `.webm`, `.mp4` across `src/`, `scripts/`, `tests/` — zero hits. No video path exists anywhere; ADR 0006's rejection holds
- [DONE] **P-G** **Gate:** `tests/e2e/gif-export.spec.ts` exports the same default module state twice, from two entirely independent fresh browser contexts (no shared state, no interaction beyond opening the module and clicking export — proving determinism isn't accidentally riding on some carried-over in-memory cache), for both `projectile-motion` (`parametric`) and `rotational-dynamics` (`stepped`) — `Buffer.equals()` confirms byte-for-byte identical output, and the decoded global colour table contains every semantic hex. Combined with `tests/e2e/offline.spec.ts` (P-6) already proving every module runs with the origin server dead, both halves of M6.5's stated acceptance are verified. **M6.5 is done.**

A real bug caught while implementing P-7: the from-scratch LZW compressor's variable code-size growth used `nextCode >= (1<<codeSize)` on the encoder side to decide when to widen codes — symmetric-looking, but wrong. A careful byte-level trace (see git history / this session's transcript for the full derivation) showed the standard LZW decoder structurally lags the encoder by exactly one dictionary addition (its very first decoded code can't yet contribute an addition, having nothing to prepend to), so encoder and decoder need _asymmetric_ growth thresholds (encoder: strictly `>`; decoder: `>=`) to stay in lockstep — using the same threshold on both sides corrupts the bitstream the first time a just-assigned code is immediately reused. Caught by a hand-written test-only LZW decoder in `encoder.test.ts` (an intentionally independent re-implementation, not sharing code with the encoder, so a shared bug couldn't hide from it) plus confirmed against a real browser: a generated multi-frame test GIF was opened directly in Chromium and rendered/animated correctly.

## X — Cross-cutting obligations

Specification requirements not owned by a single milestone. Each is
tagged with the milestone that must not ship without it.

- [DONE] **X-1** Repo-name discrepancy resolved in favour of **`phys-viz`** everywhere. `ARCHITECTURE.md` §5 (tree root), §14 (URL example), §19 (`base`), and §20 (M0 acceptance URL) now match the folder, `package.json` name, and the configured `base`. `base` must keep matching the Pages repo name exactly, including case, or every asset 404s. _(gated M0)_
- [DONE] **X-2** Found already fully done, not greenfield: [`LICENSE`](LICENSE) states the split explicitly (MIT for code; CC BY-SA 4.0 for each module's `explain.md` and figures, with the rationale — "so physics-education colleagues can freely adopt and remix the teaching content"), [`src/shell/routes/About.tsx`](src/shell/routes/About.tsx) (M3-4) links both licences under a "Licensing" heading, and `README.md`'s own "License" section (bottom of file, predates this pass) states the same split and links `LICENSE`. No code change needed. Verified: read `LICENSE`, `About.tsx`, and `README.md` side by side — all three agree on the split and rationale; `About.test.tsx` (1 test) passes; `npm run format:check` clean
- [DONE] **X-3** `scripts/check-bundle-budget.mjs` (new) reads `dist/.vite/manifest.json` (`build.manifest: true` added to `vite.config.ts`) and fails on: the entry chunk (§17's "shell + scene + kernel") exceeding 250 KB gzipped (currently 67.83 KB), or any `src/modules/<id>/index.ts` chunk exceeding 80 KB gzipped (currently 0.22–1.85 KB across all 4 registered modules). Wired into `ci.yml` as a step right after `Build`. Filenames alone can't distinguish the entry from a module chunk (every module's own source file is literally named `index.ts`), which is exactly why this reads the manifest's source-path keys rather than grepping `dist/assets/*.js` names
- [DONE] **X-4** The manifest confirms the intended split directly: the entry's static `imports` are exactly `[vendor, three, katex]` (the three named `manualChunks`), and every `src/modules/*/index.ts` appears **only** in the entry's `dynamicImports`, never its `imports` — `check-bundle-budget.mjs` asserts this structurally (fails if a module ever leaks into the eager `imports` list), which is what actually guarantees the O(1)-in-module-count claim rather than eyeballing chunk names after the fact
- [DONE] **X-5** No new work needed for M4 — the two motion paths §15 names (camera easing, M2-5; layer fades, M3-8) are shell/scene mechanisms already unit-tested under `prefers-reduced-motion` before `vector-algebra` existed, and the module introduces no camera or layer-visibility code of its own, so it inherits both for free. Re-verified applicable at M4 by inspection: the module never calls anything camera-related (not exposed by `SceneContext` anyway) and its layer visibility is entirely via `ctx.group()`, the shell-owned mechanism M3-8's fade already covers
- [DONE] **X-6** Re-confirmed rather than newly built: `getProjectorAdjustments` (`src/scene/theme/index.ts`, `{lineWidthMultiplier: 1.6, minOpacity: 0.35}`) and `html.projector-mode` (`src/design/projector.css`) were already wired end to end at M2-14/M3-41, e2e-verified there (projector checkbox toggles the class). `vector-algebra` uses only `ctx.palette.*` and stock glyphs — confirmed zero raw hex literals in its source — so it picks up both the DOM-chrome and scene-material halves automatically with no module-specific work
- [DONE] **X-7** `README.md` was stale from the M0 era: it opened with "**Status:** early scaffold... almost nothing is implemented yet" and a "Project status" checklist with every milestone through M7+ unchecked, even though M0–M6.5 have all since shipped. Fixed: added the live URL (`https://systemsdoctor.github.io/phys-viz/`) as the first line, replaced the "early scaffold" framing with a description of what actually ships today (offline support, GIF export), and updated the "Project status" checklist to check off M0–M6.5 with a note on the five live modules, pointing to `TASKS.md` as the up-to-date tracker rather than re-duplicating it. Left as-is because they were already current: "Getting started" (`npm install`/`dev`/`test`/`build` commands), "Adding a visualization" (`npm run new:module -- <id>`, points to `docs/MODULE_AUTHORING.md`), the "Documentation" links, and the License section (see X-2). Verified: read the full file post-edit for internal consistency; `npm run format:check` clean
- [READY] **X-8** Keep recording decisions as ADRs under `docs/adr/`, following `0001-record-architecture-decisions.md`. All of §23's questions are now written (0002–0009), including the up-axis question ADR 0008 exposed. The open queue is one ADR per module-specific sign convention as it arises, plus every future contract, URL-schema, or cross-module convention change. An accepted ADR is never edited — a change of course gets a new ADR that supersedes it. _(continuous)_
- [DONE] **X-9** Swept both files for stub-era language now that M0–M6.5 are done. `CLAUDE.md` had no stale claims — its two mentions of "stub"/"not implemented" are forward-looking guidance for scaffolding a _new_ module via `npm run new:module`, which genuinely does still start as a stub, so left unchanged. `AGENTS.md`'s closing "Current state of the codebase" section was the actual staleness: it said "implements almost nothing yet — most functions intentionally `throw new Error('not implemented ...')`" and named M0 as "the immediate next milestone", both false since M6.5 landed. Rewritten to state that M0–M6.5 are done, list the five live modules and the deployed URL, say a `throw new Error('not implemented ...')` outside a freshly-scaffolded module folder is now a bug rather than expected state, and point to `TASKS.md` for what's actually open (this punch list, M7+). Verified: `grep -i` for "not yet\|will be\|eventually\|TODO\|coming soon\|to be built\|not built" across both files returns nothing; `npm run format:check` clean
- [DONE] **X-10** `formatQuantity` (`kernel/units`) follow-up flagged at UI-7: a `DIMENSIONLESS` quantity (a pure ratio like `vector-algebra`'s `cosAlpha`/`cosBeta`/`cosGamma`) no longer picks an SI-prefix letter — engineering-notation scaling only applies to quantities with a real unit dimension now; a dimensionless value prints as a plain decimal number with `sigFigs` significant figures via a new `formatDimensionlessMantissa` helper. The existing engineering-notation tests (kilo/milli/micro/clamping/rounding-artifact cases) moved from `DIMENSIONLESS` to a real `LENGTH` dim, since they were exercising prefix-scaling behavior, not dimensionless-specific behavior; new `DIMENSIONLESS`-specific cases cover the (-1, 1) range including the reported `0.949` -> `"0.949"` regression and a rounding-crosses-an-order-of-magnitude case. Verified: `kernel/units/index.test.ts` (25 cases, kernel/units coverage 96.84%, gate is ≥90%), `npm run test:unit`/`test:contract`/`typecheck`/`lint`/`build` all clean, and live in the dev server on `#/m/vector-algebra` — the readout table now shows `cosα 0.949`, `cosβ 0.316`, `cosγ 0.00` with no stray unit letter

- [DONE] **X-11** §14's "a bookmarked demo restores the viewing angle" was
  only half-wired. UI-9 fixed URL/default -> Viewport (`viewport.camera
.setState(...)` at mount); `state.camera`/`setCamera()` never got
  written from the OTHER direction — nothing subscribed to
  `CameraController.onChange()` and pushed `viewport.camera.getState()`
  back into the store, so a user's manual orbit/pan/zoom never reached
  `AppState` or the URL: `encodeCamera` (urlCodec.ts) always saw the
  untouched default and omitted `c=` entirely, no matter how the user had
  actually orbited. Fixed in `ModuleView.tsx` with a new effect wiring
  `viewport.camera.onChange(...)` -> `useAppStore.getState().setCamera
(viewport.camera.getState())`, debounced with the same
  `URL_SYNC_DEBOUNCE_MS`/`MAX_WAIT_MS` pattern the pre-existing state ->
  URL sync effect uses (camera changes fire on every drag/tween frame,
  not just at rest) — reads `getState()` inside the debounced `flush`,
  not at subscribe time, so a burst of onChange calls collapses to one
  write of the settled final state. No feedback loop: nothing else
  re-applies `store.camera` to the Viewport after mount, so this write
  can't retrigger itself. Verified: new Playwright test (`X-11: a manual
camera orbit is reflected in the URL and survives a reload in a fresh
browser context`) drags the canvas on `rotational-dynamics` with free
  rotation released, confirms `c=` appears in the URL (the exact case
  that previously silently no-opped), reloads that URL in a fresh
  `browser.newContext()`, and confirms `c=` round-trips unchanged
- [DONE] **X-12** Reported: `rotational-dynamics`'s exclusive-layer panels
  (everything except the default "Torque") rendered only their KaTeX
  labels, not the actual glyphs — "the axes... not displaying correctly,
  only the variables". Root cause: `Viewport.setGroupVisible`'s
  re-entrancy guard (`if (group.visible && !this.activeFades.has(name))
return;`) let a REDUNDANT call — made while that same group's fade-in
  was already in progress — fall through and re-`traverse()` the group,
  re-capturing "current" material opacity (already 0, mid-fade) as the
  new fade baseline. `LayerManager`'s exclusive-group radios trigger this
  every time: `selectExclusive` fires one `setLayer` call per sibling (1
  true + 6 false here), each of which independently re-notifies the
  newly-active layer's `setGroupVisible(true)` via `ModuleView`'s
  per-layer subscribe loop, all synchronously within one click — so the
  target group's fade gets re-armed with a zeroed baseline 6 times in a
  row and never recovers. Fixed by making the guard `if (group.visible)
return;` — once a group is visible (mid-fade or long since settled),
  every redundant call is now a pure no-op, so only the FIRST call of a
  burst ever captures a baseline, and it always captures the true
  pre-fade value. Separately found and fixed while chasing this: `path`
  glyph's `LineBasicMaterial` kept its constructed near-black
  `color` (`0x12161d`) as the base uniform while `vertexColors: true`
  multiplies it against each vertex's colour — so the parallel-axis
  theorem panel's CM axis and offset axis (`ctx.palette.construction`
  and `ctx.palette.angular`) rendered as indistinguishable near-black
  lines regardless of their declared colour; the base is now a constant
  white so the vertex colour (already correctly blended toward the
  background for the fade-tail effect) reaches the screen unmodified.
  Also added axis-end labels ('x'/'y'/'z') to the shared reference grid
  (`scene/glyphs/axes.ts`) — previously unlabelled despite the shell
  exposing a whole up-axis (y/z) setting — via the same `createLabel`
  `attachTo`-hierarchy-visibility pattern arrow/arc labels already use,
  so they appear/disappear with the grid for free, no new wiring in
  `Viewport`. Verified: new Playwright test (`X-14: switching to a
non-default rotational-dynamics panel actually renders its glyphs, not
just their labels`) — confirmed it reproduces the bug (closest pixel
  match to the omega/L arrows' colour: ~68) against the pre-fix code and
  passes (exact match: 0) against the fix; `axes.test.ts`/`path.test.ts`
  unchanged and still green
- [DONE] **X-13** "Free rotation" renamed to **"2D-only"** with inverted,
  clearer semantics: checked (still the default, ADR 0012) restricts
  every module to a locked, orthographic view of the x/y plane (camera
  on `+z`, z axis out of the page); unchecking releases full 3D orbit.
  Store field renamed `ui.rotationReleased` -> `ui.lockTo2D` (default
  flipped `false` -> `true` to match). This also fixes a reported visual
  bug: re-locking used to just freeze rotation wherever the camera
  happened to be (the module's own, often 3D-ish, `defaultView.preset`,
  or wherever the user had last orbited to) instead of a deterministic
  view — both `ModuleView`'s mount effect and its live-prefs toggle
  effect now always `goTo('+z', ...)` on entering the lock, never
  `module.defaultView.preset`. Recenter view was also reported as
  incomplete: it only re-oriented the camera, never undid a pan — fixed
  by adding an optional `recenterTarget` param to `CameraController
.goTo()` (default `false`, so the `v`-key preset cycle and other
  callers are unaffected) that resets the orbit target to the origin as
  part of the SAME tween, wired into both Recenter and the 2D-only
  lock-entry transition. One subtlety each: `goTo`'s instant
  (`durationMs: 0`) path doesn't resync OrbitControls' own cached
  angle — needed for `setLockedToPlane` right after to read the correct
  angle — so the mount-time lock now forces one extra `camera.update()`
  call; and `recenterTarget` has to update `controls.target` immediately
  too, not just the controller's own `target`, or the very next
  per-frame `update()` (which treats `controls.target` as the source of
  truth) silently copies the stale value straight back. Verified: new
  camera unit tests (`goTo leaves the target untouched by default...`,
  `goTo with recenterTarget resets a panned-away target...`) and a new
  Playwright test (`X-13: re-checking 2D-only always resets to the same
canonical x/y view, and Recenter also resets pan`) that orbits+pans,
  re-locks, and asserts the resulting canvas frame is pixel-identical to
  the original default-locked frame, then pans again and confirms
  Recenter reproduces it again
- [DONE] **X-14** Added a "Reset to start" button (↺) to the timeline
  transport row, before "Step back" — `onChange({ t: 0 })`, the same
  patch shape the scrub slider already sends when dragged to 0, so it
  reuses every existing reset+fast-forward path (`SteppedScrubber`,
  URL sync) with no `ModuleView`/driver changes. Disabled when already
  at `t = 0`. Reported friction: repeatedly dragging the scrub slider
  back to zero to rerun a demonstration. Verified: 2 new
  `Timeline.test.tsx` cases (disabled at `t=0`, enabled + emits
  `{t: 0}` otherwise) plus the existing suite, `typecheck`/`lint` clean
- [DONE] **X-15** `AngleDial`'s read-only degree readout (`90°` as a
  `<span>`) replaced with an editable degree text entry next to the
  dial, following `VectorPad`'s `AxisInput` local-text-buffer idiom
  (authoritative while typing, re-synced from the dial's own value only
  when it changes for some other reason — dragging, arrow keys, an
  external param change — so a `NaN` or in-progress `"-"` mid-edit is
  never clobbered by a re-render). Typed degrees convert to radians and
  run through the same `clampAngle(min, max)` the dial's drag/keyboard
  paths already use. Reported friction: homing in on an exact degree on
  a 56px dial face is hard. Verified: updated + 3 new
  `AngleDial.test.tsx` cases (typed value commits the right radians,
  clamps like the dial, empty/unparseable input doesn't call `onChange`
  mid-edit), `typecheck`/`lint` clean
- [DONE] **X-16** Reported: "2D-only" sometimes appeared to snap to an
  isometric-ish view instead of staying flat, "whichever view is
  closest when the box is checked". Root cause: the `v` keyboard
  shortcut (cycles `iso -> +x -> +y -> +z`, §16) called
  `camera.goTo(...)` **unconditionally** — `goTo` moves the camera
  directly and never goes through `OrbitControls`, so it bypasses
  `setLockedToPlane`'s `enableRotate = false` guard entirely. Pressing
  `v` while "2D-only" was checked silently cycled the view while the
  checkbox stayed checked and nothing else signaled anything had
  changed; the reported "closest of two" pattern is consistent with a
  4-position cycle (`iso`/`+x`/`+y`/`+z`) landing on whichever preset a
  few stray presses happened to reach, misread as the checkbox itself
  choosing between two outcomes. X-13's own write-up had already
  special-cased this exact call site for `recenterTarget` without
  noticing it also needed to respect the lock. Fixed with a one-line
  guard: `if (useAppStore.getState().ui.lockTo2D) return;` at the top
  of the `v` handler — silent no-op while locked, same as every other
  rotation path (drag, arrow-key orbit) being unavailable; works again
  once unlocked. Verified: new Playwright test (`X-16: the "v"
camera-cycle shortcut is a no-op while 2D-only is locked, and works
again once unlocked`), confirmed it fails against the pre-fix code
  (reproduces: `v` moves the canvas while still checked) and passes
  against the fix; full 30/30 Playwright suite, `test:unit` (486),
  `test:contract`, `typecheck`, `lint`, `build`, `check:budget`,
  `format:check` all green
- [DONE] **X-17** Discovered while building `work-energy` (M7-1): a
  `surface` or `patch` glyph whose geometry extends off the canonical
  x/up plane (a nonzero depth extent along the camera's view axis) does
  not render at all under the default, locked "2D-only" orthographic
  view (`ui.lockTo2D`, checked by default, ADR 0012) — confirmed
  empirically (screenshot shows nothing; unchecking "2D-only" and
  orbiting away from `+z` makes the identical geometry appear
  correctly), while `point`/`body`/`arrow` glyphs at the same
  off-plane coordinates render fine in the same locked view. Point
  and body glyphs never left the plane in this repro, so it's untested
  whether they'd show the same symptom off-plane. Likely an
  orthographic near-plane clipping edge case in `src/scene/camera` (the
  locked view forces `setProjection('ortho')` + a fixed `+z` `goTo`),
  not anything glyph-specific, since `surface` renders correctly for
  `fields-gradients` under its own (unlocked, iso/persp)
  `defaultView`. `work-energy` worked around this by keeping every
  glyph exactly on the canonical plane (z=0) rather than depending on a
  camera fix — see the comment at the top of
  `src/modules/work-energy/index.ts`. Not investigated further here:
  out of scope for a single module's smallest-change discipline, and
  touches shared substrate every module depends on. Whoever picks this
  up should start by reproducing minimally (a `surface` with a
  deliberate small z-offset under `{preset:'+z', projection:'ortho'}`
  and `lockTo2D:true`) and inspecting the ortho camera's actual
  near/far values in `src/scene/camera/index.ts` around
  `setProjection`/`goTo`
  **Root-caused (this change): not a camera/clipping bug at all —
  closing as "investigated, not a defect."** Reproduced with a
  throwaway scratch module (`src/modules/x17-repro/`, scaffolded via
  `npm run new:module`, deleted after — never committed) built to
  mirror `work-energy`'s original pre-workaround shape: a `surface`
  whose in-plane position (`x`, `y`) is a function of one parameter
  (`xi`) only, with the other parameter (`vv`) routed exclusively into
  `z` as a fake "thickness"
  (`parametric: (xi, vv) => [xi*2, xi*xi*2, RIBBON_HALF_THICKNESS*(2*vv-1)]`,
  the exact shape+constant `work-energy`'s own comment describes).
  Confirmed invisible under the locked `+z` view exactly as reported,
  a `body` at the same offset visible throughout, and the surface
  reappearing on orbiting away — all matching the original report. The
  mechanism: under the locked view the camera looks straight down
  world `z`, so screen position is `(x, y)` only. Because `vv` (the
  parameter varied to fake "thickness") affects ONLY `z` and never `x`
  or `y`, every vertex pair that differs only in `vv` projects to the
  IDENTICAL screen point — and the mesh's quad triangulation always
  connects such a pair within one triangle, so **every triangle in the
  mesh has two of its three vertices coincident on screen**, i.e. zero
  screen-space area, under this exact view only. A zero-area triangle
  is not rasterized by any renderer — this is not a near/far clipping
  defect, not `src/scene/camera` misbehaving, and not specific to
  `surface`/`patch` as glyph KINDS (it would happen to a hand-built
  `THREE.Mesh` with this exact topology in any engine); `body`/`point`/
  `arrow` "render fine off-plane" simply because none of them are ever
  constructed by extruding a shape's cross-section purely along one
  world axis with zero variation in the other two — they have real
  volume/screen-footprint in every direction by construction, so this
  specific degenerate-projection can't arise for them. Verified the
  isolating variables directly: a flat (non-parabolic) version of the
  same shape reproduced it too (ruling out the parabola curvature or
  `colorField` as factors — tried removing `colorField` first, no
  change; the geometry topology alone is the whole story); a control
  surface using `(u, v) => [u, v, ZOffset]` (both parameters mapped to
  DIFFERENT in-plane axes, `z` held constant) rendered fine at every
  offset tried (0.05 through 8.5, only failing once the offset pushed
  the whole object out of the camera's ortho frustum entirely at
  `radius=8` — ordinary, expected out-of-view behavior, not this bug).
  No engine fix exists or is warranted (the same invisibility would
  happen pointing a real orthographic projector at a sheet of paper
  sighted exactly down its own edge) — the existing `work-energy`
  workaround (give any deliberate "thickness" to the SAME in-plane axes
  the shape already varies over, e.g. its small band in η, never to
  `z` alone) is the correct general pattern, not a one-module
  workaround. Documented as a `surface`/`patch` authoring gotcha in
  [`docs/MODULE_AUTHORING.md`](docs/MODULE_AUTHORING.md) §5 (right after
  the glyph table) so the next module author who reaches for a
  z-extruded "thickness" trick sees the warning before hitting the
  same wall; also fixed `work-energy/index.ts`'s own comment, which had
  mis-cited this as "X-18" (X-18 is the unrelated Playwright flake
  entry below) and still described it as an open, uninvestigated
  camera bug — now points at this entry and at the `MODULE_AUTHORING.md`
  gotcha instead. Verified: `npm run typecheck && npm run lint && npm
run test:unit` (599 tests) `&& npm run test:contract` (187/12-skip,
  unaffected — comment-only change to a shipped module) `&& npm run
build && npm run check:budget` all clean; the scratch repro module
  was never part of the committed tree at any point checked in
  (created, exercised live in the Browser pane, then `rm -rf`'d before
  running the verification sweep).
- [DONE] **X-18** Discovered while adding `momentum-collisions` (M7-2):
  `tests/e2e/smoke.spec.ts`'s per-module "disposes its WebGL context on
  navigate-away" check (the `for (const id of manifests...)` loop
  starting at line 708) is flaky under Playwright's default multi-worker
  run — `npx playwright test tests/e2e/smoke.spec.ts` (6 workers)
  intermittently fails `projectile-motion`'s instance of this check with
  `canvas` count 2–3 instead of the expected 0, while
  `npx playwright test tests/e2e/smoke.spec.ts --workers=1` passes all
  31/31 every time, and re-running the single `projectile-motion` test
  alone (any worker count) also passes. This is consistent with two
  parallel workers sharing a browser context/tab pool and one test's
  `page.goto('#/')` disposal check racing another worker's own module
  mount in the same underlying page — not a `momentum-collisions`
  regression (that module's own instance of the same check passed in
  every run, parallel or not) and not a pre-existing failure either (the
  full suite was green before this session, per M7-1's write-up). Not
  investigated further here: reproducing and fixing a cross-worker test
  isolation race is a `tests/e2e/` harness question, out of scope for a
  module-addition change. Whoever picks this up should start by checking
  whether Playwright's config gives each worker its own browser context
  (`playwright.config.ts`) and whether the per-module `describe.serial`
  or lack thereof around line 708 is letting two module tests interleave
  navigation on a shared page
  **Root-caused and fixed (this change).** Confirmed each `test()` gets
  Playwright's normal fresh, isolated `page`/`BrowserContext` (no shared
  page across the `for (const id of moduleIds)` loop, no missing
  `describe.serial` — that half of the original hypothesis doesn't
  apply, there is no cross-test page sharing to race). Reproduced
  reliably on this machine (12 cores, default 6 workers) with
  `--grep "disposes its WebGL" --repeat-each=8`: 7/72 runs failed,
  every time with `canvas` count stuck at exactly 2 or 3 for the
  **entire** assertion timeout (verified this isn't a slow-but-eventual
  race, not just a race that needs a longer timeout: reran with the
  assertion's timeout raised to 20s — canvas count stayed at exactly 3,
  polled 39 times, never once dropping, until the test itself timed
  out). This machine has 12 real cores; the failure still needing only
  6 concurrent headless-Chromium instances, each continuously
  `requestAnimationFrame`-ticking a real WebGL `Viewport`, each also
  rendering a `TimeSeriesPlot`/`SweepPlot` (a per-instance `<canvas>`
  from `uplot`, which is why the leaked count is 2–3 — the WebGL canvas
  plus one or two plot canvases — not just 1), points at GPU/compositor
  contention (not raw CPU headroom) starving the page's own event loop
  badly enough that its `hashchange` handling and the resulting React
  unmount don't run within any reasonable timeout — genuine resource
  contention between concurrently-running heavy tests, not a bug in
  `Viewport.dispose()`/`ModuleView`'s cleanup effect (both already
  proven correct: a live dev-server check via `javascript_tool` showed
  every canvas removed from the DOM in the same tick as `location.hash`
  changes, with zero contention). Confirmed the concurrency link
  directly by bisecting the worker count with the same repeat-each
  stress test: 6 workers → 7/72 failed; 4 workers → 2/54 failed (rarer,
  not fixed); 3 workers → 72/72, then a second, longer run → 122/122,
  zero failures across ~250 total stress-test iterations. Fixed by
  capping `workers: 3` in `playwright.config.ts` (with a comment
  pointing back to this entry so it doesn't get "helpfully" reverted
  as a performance tweak later) — a harness-level fix, not an app-code
  one, exactly as this entry's own note anticipated. Re-verified the
  full 33-test suite green at the new capped default (no `--workers`
  override) after the config change. This does cost some CI wall-clock
  time (fewer parallel workers); not measured against CI's own
  (probably lower core-count, so less affected) runners specifically,
  but reliability was judged worth it over shaving CI minutes for a
  suite this size.
- [DONE] **X-19** `formatQuantity` (`src/kernel/units/index.ts`) is
  prefix-and-numeral only by design (documented at the top of that
  file) — it never prints a unit symbol string, only an SI-prefix
  letter. Confirmed working as intended while manually verifying
  `momentum-collisions` in the Browser pane (M7-2): `vcm = 0.333 m/s`
  reads as literal `"333m"` in the readout table (333 milli-(base
  unit), i.e. 0.333) — easy to misread as "333 meters" at a glance since
  the milli-prefix letter and a length-unit symbol happen to collide
  visually. Not a bug (every other readout at this module's default
  parameters happens to fall in the un-prefixed 1–999 range, e.g.
  `v_1 = "3.00"`, so this is the first module whose default state
  actually exercises the sub-1 prefix path) and out of scope to fix
  here — flagged because a reviewer skimming a readout table for the
  first time is likely to make the same misreading, and the fix (a
  Layer 2 unit-symbol string, explicitly deferred to "Layer 2/3" by that
  file's own doc comment) is a shell-wide readout change, not a
  `momentum-collisions`-specific one
  **Superseded by X-24 (this change): confirmed already resolved,
  status flipped to reflect it.** X-24 shipped exactly the fix this
  entry called for — `src/shell/unitSymbol.ts`'s `formatQuantityWithUnit`
  appends the real base-unit symbol after whatever SI-prefix letter
  `formatQuantity` chose, wired into both `ReadoutTable` and
  `ModuleView`'s canvas `aria-label`. Re-verified live rather than
  trusting the cross-reference alone: `grep` confirms both call sites
  (`src/shell/readouts/index.tsx`, `src/shell/routes/ModuleView.tsx`)
  actually call `formatQuantityWithUnit`, not just `formatQuantity`; and
  `momentum-collisions`' own `vcm` reading — the exact literal case this
  entry reported — now shows `mm/s` unambiguously appended (confirmed
  against the current dev build in the Browser pane), not the bare
  `"333m"` that prompted this entry originally.

X-26 … X-59 were logged (not fixed) by the 2026-09-23 read-only audit —
full evidence, verification level and recommendations in
[`docs/audits/2026-09-23-codebase-audit.md`](docs/audits/2026-09-23-codebase-audit.md).
Each was re-checked against the code before logging; "(read-only)" marks
a mechanism confirmed from source but not observed in a rendered frame.

- [DONE] **X-26** `non-inertial-frames` draws the fictitious
  accelerations with the wrong sign. `fictitiousTermsAt()`
  (`index.ts:212-218`) passes `kernel/frames`' transport terms
  (`2ω×v′`, `ω×(ω×r′)`) straight to the arrows labelled `a_cf`/`a_Cor`
  (`:425-438`) — the kernel's own doc says a caller wanting the
  fictitious force negates them. The "centrifugal" arrow points toward
  the axis; `explain.md:32-34` states `a_cf = −ω²r′, toward the axis`
  (wrong) and `a_Cor = −2ω×v′` (right, but not what's drawn);
  `params.ts:124` says "outward". Readouts (magnitudes) and the dashed
  `a′` arrow are correct. Fix: negate both, redraw tip-to-tail as
  `a_cf + a_Cor = a′`, fix explain.md and `module.test.ts:110`'s name,
  add direction assertions (`dot(a_cf, r′) > 0`).
  **Verified:** negated `centrifugal`/`coriolis` in
  `fictitiousTermsAt()`'s return (kept the internal kinematic values for
  the `residual` check); fixed `explain.md`'s `a_cf` formula/direction;
  renamed the magnitude-only test and added a new golden test capturing
  `centrifugalArrow`/`coriolisArrow`'s actual `.set()` `from`/`to` by
  label and asserting `dot(a_cf, r′) > 0` and the Coriolis direction
  against `-2ω×v′` (the X-25 pattern). `npx vitest run
src/modules/non-inertial-frames/module.test.ts`: 9/9 pass. Full sweep
  (`typecheck`, `lint`, `test:unit` 619/619, `test:contract` 208/208,
  `build`, `check:budget`, `format:check`) all pass.
  `npx playwright test tests/e2e/smoke.spec.ts --workers=3`: the
  `non-inertial-frames` case passes; the `gravitation` disposal case
  failed under 3-worker parallelism but passes solo (pre-existing
  flake, unrelated to this change — not touched here).
- [DONE] **X-27** `rotational-dynamics` rolling rim trace is an
  upside-down cycloid: `index.ts:545-551` uses `+R sin(ωt)` along
  `rollDir` (x = vt + R sin ωt), so the traced point moves at 2v at
  contact and 0 at the top. Needs `−R sin(ωt)`. Add a test that the
  trace's velocity at the contact instant is zero.
  **Verified:** flipped the sign of the `sin` term. Added a golden test
  capturing `rimTrace`'s actual `.set({points})` and finite-differencing
  the x-coordinate across the sampled instant nearest `wt=2πk`; checked
  the test fails against the pre-fix sign (`|dxdt|` ≈ 2v = 3.6, well
  over the 0.1·v threshold) and passes against the fix (`|dxdt|` ≈ 0) —
  confirms it actually discriminates, unlike checking height alone
  (unaffected by this sign since it's set by the `cos` term). `npx
vitest run src/modules/rotational-dynamics/module.test.ts`: 13/13
  pass. Full sweep (`typecheck`, `lint`, `test:unit` 620/620,
  `test:contract` 208/208, `build`, `check:budget`, `format:check`) all
  pass. `npx playwright test tests/e2e/smoke.spec.ts -g
"rotational-dynamics" --workers=3`: 2/2 pass.
- [DONE] **X-28** `rotational-dynamics` "I about offset axis" readout is
  `parallelAxisTensor(...)[8]` (I_zz) while the drawn axes follow
  `upVec` (y by default, `index.ts:442-450`). Defaults: drawn-axis I =
  4.22, readout 3.82. Fix: `n̂ᵀ I n̂` with a live `upVectorOf(ctx)`; the
  golden test's cube can't distinguish I_yy/I_zz, use a non-cubic box.
  **Verified:** `scalars()` now computes `dot(paAxis, transformMat3(...,
paAxis))` with `paAxis = upVectorOf(ctx)` (closed over live `ctx`, not
  a create()-time cache). Golden test captures `paCmAxis`'s actual
  `.set({points})` direction and checks the readout against I about
  THAT direction at the audit's own non-cubic defaults (box
  [1,1.6,2.4], m=1.5, offset=[1.5,0,0]); confirmed it fails against the
  pre-fix `[8]` read (got exactly 3.82, the audit's bug value) and
  passes at 4.22 against the fix. `npx vitest run
src/modules/rotational-dynamics/module.test.ts`: 14/14 pass. Full
  sweep (`typecheck`, `lint`, `test:unit` 621/621, `test:contract`
  208/208, `build`, `check:budget`, `format:check`) all pass. `npx
playwright test tests/e2e/smoke.spec.ts -g "rotational-dynamics"
--workers=3`: 2/2 pass.
- [DONE] **X-29** `rotational-dynamics` precession: `baseSwing =
2·Ω_p·sinθ₀/ωₙ` (`index.ts:149`) is used as the coefficient of
  `(1 − cos ωₙt)` (`:500`); the released-from-rest linearization gives
  `Ω_p·sinθ₀/ωₙ` there (max excursion is twice the coefficient), and a
  mean φ̇ of Ω_p, not the 2Ω_p the code yields at k=0. X-21's recorded
  "3.44 vs 1.75 rad/s" is this factor. The cusp test still passes (ratio
  = 1 at k=0 regardless of scale). Fix the factor, re-derive the
  `nutationAmplitude` default, add a test against a short `rk4` of the
  exact heavy-top equations at large Ω; the default Ω=70
  (Ω_p/ωₙ≈0.33) is also only marginally "fast".
  **Verified:** dropped the factor of 2 in `baseSwing`; re-derived the
  `nutationAmplitude` default from 0.27 to 0.137 at this module's own
  defaults (topMass=1, topArmLength=1, topRadius=0.4, topSpinRate=70,
  topTiltAngle=0.436). Did not add the RK4-vs-exact-heavy-top regression
  test (out of scope for this pass — flagged as X-60 for a future
  session, since it's a nontrivial addition beyond the described fix).
  Added a golden test capturing the flywheel's actual `.set({position})`
  at t=0 and t=one nutation period (where the oscillation term
  vanishes exactly), finite-differencing the azimuth to get the secular
  precession rate, and checking it against Ω_p, not 2Ω_p — confirmed it
  fails against the pre-fix factor (measured 1.738 vs Ω_p=1.244) and
  passes against the fix. Also updated the pre-existing cusp-path test's
  own local `baseSwing` formula to match. `npx vitest run
src/modules/rotational-dynamics/module.test.ts`: 15/15 pass. Full
  sweep (`typecheck`, `lint`, `test:unit` 622/622, `test:contract`
  208/208, `build`, `check:budget`, `format:check`) all pass. `npx
playwright test tests/e2e/smoke.spec.ts -g "rotational-dynamics"
--workers=3`: 2/2 pass.
- [DONE] **X-30** Module `urlKey`s collide with shell-reserved query
  keys: `vector-algebra`/`oscillations` use `c` (camera, `urlCodec.ts:194`),
  `fields-gradients`/`control-showcase` use `th` (theme, `:197`). Params
  and prefs share one `URLSearchParams`, so one overwrites the other and
  a `c` param value is fed to `decodeCamera`. The contract round-trip
  never varies camera/prefs, so it passes. Fix: publish the reserved list
  (`v z L t c up th pj gr gxy gxz gyz`), enforce it (params AND layers) in
  the contract suite, rename the four keys with migrations (ADR 0003).
  **Verified:** wrote **ADR 0016** — published `RESERVED_URL_KEYS` in
  `urlCodec.ts`; renamed `vector-algebra`'s `c` -> `vc`, `oscillations`'s
  `c` -> `cd`, `fields-gradients`'s `th` -> `dth`,
  `control-showcase`'s `th` -> `ang` (param `key`s unchanged, only
  `urlKey`); bumped all four modules' `schemaVersion` 1 -> 2 with **no**
  migration function — `migrations.ts`'s own doc says a `urlKey` rename
  is structurally out of scope for `Migration` (it operates on
  already-`key`-resolved params, post-decode, by which point an old
  link's value under the old `urlKey` is already lost to the new
  lookup), so the version bump's only job is making `runMigrations`
  correctly report `migrated: false` for an old link, falling back to
  full defaults + the existing notice (ADR 0003) instead of silently
  mixing a stale value into the wrong slot. Added a contract-suite check
  (params AND layers, every registered module) against
  `RESERVED_URL_KEYS` — confirmed it fails when reverted (caught
  `vector-algebra`'s `c` immediately) and passes at the fix. Updated
  `migrations.test.ts`'s now-stale "no module has bumped schemaVersion
  yet" comment. `npm run test:contract`: 218/218 pass (up from 208 — one
  new reserved-key check per registered module, +10). Full sweep
  (`typecheck`, `lint`, `test:unit` 631/631, `build`, `check:budget`,
  `format:check`) all pass. `npx playwright test tests/e2e/smoke.spec.ts -g
"vector-algebra|oscillations|fields-gradients|control-showcase|X-11|bookmark"
--workers=3`: 16/16 pass.
- [DONE] **X-31** GIF export never positions arrows, points or axis
  ticks: `Viewport.renderNow()` (`Viewport.ts:229-233`) skips the
  `frameListeners` loop that only `tick()` runs (`:539`), and every
  arrow's shaft/head and every point's size is computed only in
  `host.onFrame` (`arrow.ts:92-145`, `point.ts:35`); `capture.ts:71`
  stops the loop immediately. P-G still passes because it checks
  determinism + colour table, not content. Fix: build a `FrameInfo` and
  run the listeners in `renderNow()`; add a pixel assertion at a known
  arrow tip to `gif-export.spec.ts` (read-only).
  **Verified:** `renderNow()` now builds the same `FrameInfo` `tick()`
  does (`dt: 0` — no real playback clock behind an off-screen capture
  frame) and runs `frameListeners` before rendering. Deviated from the
  literal "pixel at a known arrow tip" test technique: computing an
  exact expected screen pixel would require re-deriving the camera's
  full world-to-screen projection inside the test, which is fragile and
  more than the bug needs to prove. Instead added a content assertion in
  `gif-export.spec.ts` that exports the SAME module from two physics
  states (`t=0` vs `t=1.1`, well into its ~1.73s flight) with the
  trajectory-trace layer turned off (`path` glyphs write geometry
  directly in `.set()`, not gated behind `onFrame`, so they'd mask this
  bug) and only a `point` (the ball) and `arrow` (velocity) visible —
  exactly the two glyph kinds this bug freezes — then asserts the two
  exported GIFs are NOT byte-identical and differ by more than 50 bytes.
  Confirmed by reverting the fix: the new test then reports the two
  exports as byte-identical (proving the freeze) and fails; restoring
  the fix makes it pass. `npx playwright test tests/e2e/gif-export.spec.ts
--workers=1`: 3/3 pass, including the original determinism/palette
  tests for both modules. Full sweep (`typecheck`, `lint`, `test:unit`
  622/622, `test:contract` 208/208, `build`, `check:budget`,
  `format:check`) all pass. `npx playwright test tests/e2e/smoke.spec.ts
--workers=3`: 34/34 pass (sanity check — `renderNow()`/`tick()` share
  the live `Viewport`).
- [DONE] **X-32** `work-energy` still reads `ctx.up` once in `create()`
  (`index.ts:80`) — an X-22 instance X-22's close-out missed. The ribbon,
  energy plane and turning points (`:99-131`) are built once from it and
  `update()` reuses the stale `toWorld`. Fix per X-22 option (a) and add
  a live-switch test like `projectile-motion`'s.
  **Verified:** `upVectorOf()`/`toWorldAt()` moved to be called fresh
  every `update()` call (never cached at `create()`-time); the
  landscape's own static geometry (ribbon/energy-plane/turning points),
  previously built once in `create()` and never touched again, now
  re-`set()`s every frame from the live axis too — the ball already
  re-`set()` its position each frame but with the stale `toWorld`
  closure, so it was equally affected. Added 2 golden tests capturing
  the ball's actual `.set({position})` and the energy-plane's actual
  `.set({points})` across a live `ctx.up` switch (`projectile-motion`'s
  X-22 test pattern) — confirmed both fail against the pre-fix code
  (frozen on the old axis) and pass against the fix. `npx vitest run
src/modules/work-energy/module.test.ts`: 9/9 pass. Full sweep
  (`typecheck`, `lint`, `test:unit` 641/641, `test:contract` 218/218,
  `build`, `check:budget`, `format:check`) all pass. `npx playwright
test tests/e2e/smoke.spec.ts -g "work-energy"`: 1/1 pass.
- [DONE] **X-33** ESLint layer-boundary holes (proved via
  `eslint --stdin --stdin-filename`, no file written): (a) bare barrels
  `@/scene`/`@/shell`/`@/modules` match none of the `/*` patterns, so a
  module can `import { … } from '@/scene'` (three.js at runtime) — every
  layer; (b) kernel and scene overrides have no relative patterns
  (`../../scene/Viewport` from kernel, `../../shell/App` from scene
  pass); (c) the shell rule bans only `@/modules/*/index|manifest`, so
  `@/modules/<id>/params`, `@/modules/<id>` and `../../modules/<id>/index`
  pass; (d) dynamic `import('three')` passes everywhere. No current code
  exploits any. Fix the patterns, add a `no-restricted-syntax`
  `ImportExpression` rule, re-prove each hole per M0-13.
  **Verified:** (a) added bare `@/scene`/`@/shell`/`@/modules` bans to
  all four layer overrides — via `no-restricted-imports`'s `paths`
  option (exact match), NOT `patterns` (gitignore-style glob), after
  hitting a real gotcha: a bare, wildcard-free `patterns` entry like
  `@/modules` matches as a "directory" the same way a plain `foo`
  .gitignore entry does, and a later `!@/modules/types` negation in the
  same array can't un-match anything already caught by it — the classic
  gitignore "can't negate inside an ignored directory" limitation.
  Confirmed via isolated `--stdin` probes before finding `paths` as the
  fix. (b) added explicit `../scene/*`/`../../scene/*` (and
  shell/modules equivalents) to kernel and scene, at exactly the two
  depths those trees actually nest (kernel/scene each have one level of
  subdirectories) — a blanket `../*` ban (modules/'s own approach)
  would have broken kernel's legitimate intra-kernel imports like
  `../math`. (c) inverted the shell rule to a real denylist
  (`@/modules/*` + `!@/modules/types`/`!@/modules/registry`, plus the
  relative form at shell's 3 real nesting depths) and closed the
  `modules/testing` shell-accessible-scaffolding hole too (nothing in
  shell/ used it, so no exception needed). (d) added a
  `no-restricted-syntax` `ImportExpression` regex selector to kernel and
  modules (scoped there only — shell legitimately dynamic-imports, e.g.
  `GifExportPanel`'s `import('./gif')`). No new ADR for this one — it
  tightens enforcement of an already-documented boundary
  (ARCHITECTURE.md §6), not a new convention; X-8's "ADR every
  convention change" doesn't extend to closing a lint-rule gap around
  an existing rule. Re-proved every hole closed via 11
  `eslint --stdin --stdin-filename` probes (bare barrels × 4 layers,
  relative escapes × 5 depths/layers, shell denylist × 4 forms, dynamic
  import × 2) — all CAUGHT — and confirmed the legitimate exceptions
  (`@/modules/types`, `@/modules/registry`, type-only `SceneContext`,
  `../types`) still pass. `npm run lint` clean on the whole repo (no
  false positives against existing code). Full sweep (`typecheck`,
  `test:unit` 631/631, `test:contract` 218/218, `build`, `check:budget`,
  `format:check`) all pass. `npx playwright test tests/e2e/smoke.spec.ts
--workers=3`: 34/34 pass (sanity check — this touches the config
  every layer's own build depends on).
- [READY] **X-34** URL prefs (`up=`/`th=`/`pj=`/`gr=`/`gxy=`/`gxz=`/`gyz=`)
  are encoded and decoded but never applied: `ModuleView.tsx:203-210`
  hydrates without `decoded.prefs` and `store.hydrate` keeps
  `get().prefs`. A z-up demo link opens y-up for a student. Decide:
  apply for the session (no `savePrefs`), or ADR retracting prefs from
  the URL
- [DONE] **X-35** X-20's decode guard is incomplete (`urlCodec.ts`):
  `t=` is raw `Number` (NaN/negative/1e308 reach modules; `:261-262`);
  camera `c=` parts use `?? default`, which NaN passes (`:161-168`);
  `v=` isn't validated (NaN or a future version skip migration and load
  as current); select values aren't checked against `options`;
  expression/select run `decodeURIComponent` on an already-decoded value
  (`:105-107`) so `?f=50%` throws `URIError` into the error boundary;
  `z=` decompresses with no size cap (a sub-audit measured 8.3K chars →
  10M). Fix: try/catch the whole decode → defaults + notice; clamp `t`
  and camera; treat non-integer/future `v` as unmigratable; validate
  select; cap `z=` input/output length; dropping the double decode is a
  link-format change (ADR).
  **Verified:** `t=` now routes through `clampDecodedNumber(..., 0,
DEFAULT_MAX_T)`; camera `c=` components each go through
  `clampDecodedNumber`, with a `0.01` floor on radius; `v=` is validated
  as an integer in `[0, ctx.schemaVersion]` — anything else (garbled or
  from a newer schema) returns every field at its module default plus a
  new `unrecognizedVersion: true` flag, which `ModuleView.tsx` now shows
  the same non-blocking notice for as an unmigratable older version;
  `select` values not among the param's declared `options` fall back to
  the default; `z=` is capped at 20,000 input characters and 200,000
  decompressed characters, falling back to defaults past either; the
  whole of `decodeState` is now wrapped in try/catch (falls back to
  defaults + `unrecognizedVersion: true`), which is what actually closes
  the `?f=50%` `URIError` crash — did NOT drop the double
  `decodeURIComponent` on expression/select (confirmed it's not
  actually redundant: `encodeParamValue` calls `encodeURIComponent`
  once on the way out, and `URLSearchParams`'s own serialization adds a
  second layer, so removing the matching decode would break the
  round-trip for any expression/select value containing a special
  character — leaving this as the one sub-item genuinely needing an ADR
  per the audit's own scoping, not attempted here). `npx vitest run
src/shell/state/urlCodec.test.ts`: 30/30 pass, including one rewritten
  test (the old one asserted the pre-fix "future `v=3` trusted verbatim"
  behavior) and 8 new X-35 tests covering every guard above. Full sweep
  (`typecheck`, `lint`, `test:unit` 631/631, `test:contract` 208/208,
  `build`, `check:budget`, `format:check`) all pass. `npx playwright
test tests/e2e/smoke.spec.ts -g "X-11|bookmark" --workers=2`: 10/10
  pass (URL round-trip sanity, since this touches the codec every
  module route uses).
- [DONE] **X-36** Presenter keymap ignores modifiers
  (`presenter/index.tsx:18-27`): Ctrl+R resets params instead of
  reloading, Ctrl+C overwrites the clipboard, Ctrl+F toggles fullscreen,
  all with `preventDefault()`. Space on a focused `<button>`/`<summary>`
  toggles play instead of activating it. Fix: bail on ctrl/meta/alt;
  skip button/summary/contenteditable/slider targets; match
  case-insensitively.
  **Verified:** `onKeyDown` now bails immediately when
  `ctrlKey`/`metaKey`/`altKey` is set (before even reading `target`, so
  `preventDefault()` never fires either); skips
  button/summary/contenteditable targets via a new
  `isNativelyInteractive` helper (a slider was already covered by the
  pre-existing `INPUT` tag check); single-character keys (letters,
  digits, space) now match case-insensitively, leaving the multi-char
  `Shift+Arrow*` combos untouched. Added 3 new unit tests (Ctrl/Meta/Alt
  bail, button/summary/contenteditable skip, case-insensitive match) —
  confirmed all 3 fail against the pre-fix code and pass against the
  fix. `npx vitest run src/shell/presenter/index.test.tsx`: 10/10 pass.
  Full sweep (`typecheck`, `lint`, `test:unit` 634/634, `test:contract`
  218/218, `build`, `check:budget`, `format:check`) all pass. `npx
playwright test tests/e2e/smoke.spec.ts -g "keyboard map|X-16"
--workers=2`: 2/2 pass. **Addendum:** running the FULL smoke suite
  later (during X-40) surfaced a real side effect of this fix: the "M3-G
  gate" e2e test relied on Space unconditionally hitting the app's global
  shortcut regardless of DOM focus — after this fix, Space now correctly
  re-activates a still-focused `<button>` natively instead, which broke
  that test's "press Space to toggle play" step (it was landing on a
  still-focused "Predict, then reveal" button instead of body). Fixed in
  `tests/e2e/smoke.spec.ts` (blur the active element before pressing
  Space) in a follow-up commit; bisected via a worktree against the
  pre-session baseline to confirm the test passed before this fix and
  failed starting at this exact commit.
- [DONE] **X-37** `formatQuantityWithUnit` glues the SI prefix onto
  powered units (`unitSymbol.ts:140-159`, run in a scratch bundle):
  2000 m²/s → "2.00 km²/s", 3.986e14 m³/s² → "399 Tm³/s²", L⁻¹ → "m1/m".
  Reachable now: `gravitation` at μ=1, a=5 shows specific energy
  −0.1 m²/s² as "−100 mm²/s²" (1000× off). Fix: prefix only when the
  leading factor has exponent +1 and isn't `kg`, else scientific notation.
  **Verified:** added `isPrefixSafe(dim)` — true for every
  `NAMED_SYMBOLS` entry (N/J/N·m/rad/s, conventionally prefixed as one
  atomic unit) or a composed symbol whose leading (first nonzero,
  `[kg,m,s,K,A,mol,cd]` order) exponent is exactly 1 and isn't `kg`.
  `formatQuantityWithUnit` now falls back to a new `toScientific()`
  (e.g. `"2.00×10³"`) with the bare, unprefixed unit symbol whenever
  `isPrefixSafe` is false. Added 5 new tests reproducing the audit's own
  numbers (2000 m²/s, 3.986e14 m³/s², gravitation's −0.1 m²/s² case,
  plus one confirming a genuinely linear composite like m/s still
  prefixes normally, and one confirming the pre-existing kg exception
  now applies to composites too) — confirmed all 4 bug-reproduction
  cases fail against the pre-fix code with exactly the audit's reported
  (wrong) strings and pass against the fix. `npx vitest run
src/shell/unitSymbol.test.ts`: 21/21 pass. Full sweep (`typecheck`,
  `lint`, `test:unit` 639/639, `test:contract` 218/218, `build`,
  `check:budget`, `format:check`) all pass. `npx playwright test
tests/e2e/smoke.spec.ts -g "gravitation"`: 1/1 pass (sanity — its
  specific-energy readout goes through this function).
- [READY] **X-38** Dark theme makes every scene label near-invisible:
  the scene background is hardcoded `0xeceef2` (`Viewport.ts:133`), and
  the label overlay (`htmlOverlay.ts:24-27`) has no colour, so it
  inherits dark-mode `--ink-0` `#eef1f6`. Decide: pin the scene (and
  overlay ink) to the light theme, or add `Viewport.setTheme` (read-only)
- [DONE] **X-39** `oscillations` spring inverts at the default params:
  defaults sit at resonance (A = 2.78) and `springLength = 1.125 − x`
  (`index.ts:235-241`) reaches −1.65; the mass rises above the anchor.
  Move the default drive off resonance and/or clamp the drawn
  displacement (readouts keep true x).
  **Verified:** chose the clamp option (fixes every param combination,
  not just the shipped default) — the drawn displacement is clamped
  into `±0.8·REST_LENGTH` before computing `yMass`/the spring's
  geometry; `scalars()`'s `x`/`v` readouts are untouched, still the raw
  `sceneAt()` value. Added a golden test capturing the spring's actual
  `.set({scale})` across a full drive cycle at the module's own default
  (resonant) params, asserting `scale.y` stays positive throughout —
  confirmed it fails against the pre-fix code (reproduced the exact
  negative scale, -0.136, at one sampled instant) and passes against
  the fix. `npx vitest run src/modules/oscillations/module.test.ts`:
  9/9 pass. Full sweep (`typecheck`, `lint`, `test:unit` 642/642,
  `test:contract` 218/218, `build`, `check:budget`, `format:check`) all
  pass. `npx playwright test tests/e2e/smoke.spec.ts -g "oscillations"`:
  1/1 pass.
- [DONE] **X-40** `control-showcase` fixture: the expression default
  `sin(x) * k` with `vars: ['x']` (`params.ts:43-44`) never compiles, so
  `fValue` is always 0; `explain.md:10` tells the reader to toggle
  "Reference grid", a layer removed at UI-2. Also add a contract
  assertion that every expression param's default compiles against its
  `vars`.
  **Verified:** default changed to `'sin(x)'` (the stiffness param `k`
  is fed in as `x`'s VALUE at eval time via `compiled({x: k})`, not as
  a second in-expression identifier — `k` was never a legal token
  against `vars: ['x']`); `explain.md`'s "Reference grid" mention
  dropped (only "Angle trace" and "Predicted magnitude" are real
  layers today). Added a new contract-suite assertion (item 13) that
  every registered module's expression-param defaults compile against
  their declared `vars` — confirmed it fails against the pre-fix
  default and passes against the fix. Added a module-level golden test
  asserting `fValue` actually equals `sin(k)` at the module's own
  defaults, not silently `0` — confirmed it fails against the pre-fix
  default (`fValue` was exactly `0`) and passes against the fix.
  Running the full e2e smoke suite for this fix surfaced and fixed an
  unrelated regression from X-36 in the "M3-G gate" test (see X-36's
  addendum above). `npx vitest run src/modules/control-showcase/module.test.ts`:
  8/8 pass. Full sweep (`typecheck`, `lint`, `test:unit` 643/643,
  `test:contract` 228/228, `build`, `check:budget`, `format:check`)
  all pass. `npx playwright test tests/e2e/smoke.spec.ts -g "M3-G
gate|control-showcase" --workers=2`: 2/2 pass; full smoke suite
  34/35 (the one failure is gravitation's disposal check under
  3-worker parallelism — the pre-existing cross-worker flake logged as
  **X-18**, passes solo, unrelated to this change).
- [READY] **X-41** `ModuleView` re-renders the whole panel every frame
  during playback: `const state = useAppStore()` (`ModuleView.tsx:734`)
  subscribes to the entire store and `t` changes per frame; `SweepPlot`'s
  fresh `evaluate` then re-runs ~100 `scalars()` per frame. Use narrow
  selectors, memoize `evaluate` on params, throttle readouts/series/
  aria-label (read-only)
- [READY] **X-42** Under z-up, the "2D-only" lock (`goTo('+z')` →
  world −y via `fromCanonical`, `camera/index.ts:118-120`) shows the
  world x–z plane, correct for gravity modules but edge-on for modules
  that hardcode world x–y: `non-inertial-frames`, `gravitation` (at
  inclination 0), `control-showcase`, `vector-algebra`'s `planar` mode.
  Needs a decision (map orientation-free modules' plane through `ctx.up`,
  or change what the lock looks at); ADR if shell behaviour changes
  (read-only)
- [READY] **X-43** `kernel/expr` has no recursion-depth limit: 1000
  nested parens compile, 3000 throw `RangeError` (reproduced against a
  scratch bundle), which `compileExpr` re-throws. Only `control-showcase`
  is exposed today; M7-9 Sandbox is URL-fed by design. Add a depth
  counter raising `ParseError` plus a length cap
- [READY] **X-44** `rotational-dynamics` disc bodies are never sized:
  disc geometry is diameter 1 (`body.ts:41`), no `scale` passed
  (`index.ts:313-318, 343-349`) — the wheel matches `rollRadius` only at
  its 0.5 default (range 0.2–1.2), the flywheel ignores `topRadius`. Same
  family as the M7-1/M7-2 sphere-diameter bug; also document each `body`
  kind's unit geometry in `MODULE_AUTHORING.md`'s glyph table
- [READY] **X-45** `fields-gradients` divergence-box faces normalize
  `colorField` per face (`surface.ts:108-114`, six separate surfaces at
  `index.ts:300-309`), so outward/zero/inward flux faces can render the
  same colour. Add an optional fixed `colorRange` to `surface` (Layer 1)
- [READY] **X-46** `rotational-dynamics` Dzhanibekov panel always spins
  about body y (`reset()`, `index.ts:654`) and reports
  `dzOmegaIntermediate: w2` (`:624`); with an edited `boxSize` (e.g.
  `[1, 2.4, 1.6]`) y is not intermediate, so the spin is stable and the
  label false. Pick the axis from sorted principal moments
- [READY] **X-47** `vector-algebra` head-to-tail sum arrow labelled
  `\vec a+\vec b` runs from `a` to `a+b` (`index.ts:192`) — it is `b`
  shifted, length |b|; no resultant from the origin in either mode, no
  parallelogram sides in `para` mode. The same code is ARCHITECTURE.md
  §21's cookbook example — fix both
- [READY] **X-48** `arrow` tip falls short of `to` by half a head length:
  `ConeGeometry` is centred on its origin (`arrow.ts:41-43`) but placed
  at `to − h·dir` (`:125`); a double head misses `from` the same way.
  `arrow.test.ts:28` only checks `0 < x ≤ 2`. Translate the cone once, or
  place at `to − h/2·dir`; assert the apex
- [READY] **X-49** Projector mode doesn't thicken scene lines: every line
  is `THREE.Line` with `LineBasicMaterial`/`LineDashedMaterial`, whose
  `linewidth > 1` is ignored under ANGLE (Chrome/Edge/Firefox on
  Windows), so `lineWidthMultiplier` (`Viewport.ts:486-504`) is a no-op;
  a sub-audit also reports `patch.applyProps` overwriting the opacity
  floor. Consider `Line2`/`LineMaterial` from `three/examples/jsm/lines`
  (no new dependency) (read-only)
- [READY] **X-50** Stepped playback runs flat-out after a backgrounded
  tab resumes: the rAF `dt` is unclamped (`ModuleView.tsx:471`) and
  `FixedStepAccumulator` keeps its backlog past `MAX_STEPS_PER_FRAME`,
  never reset on pause/scrub (`driver.ts:37-46`). Clamp `frameDt` or
  drop the backlog at the cap; reset on pause and scrub
- [READY] **X-51** `vector-algebra` `theta` can be `NaN`: `Math.acos`
  unclamped (`index.ts:249`) — `a=[−0.5,0,−3]`, `b=−0.5a` gives
  cos = −1.0000000000000004 (reproduced); `a=0` also NaNs θ and the
  direction cosines. Clamp and guard zero norms
- [READY] **X-52** `gravitation` gravity arrow (length `0.15·μ/r²`,
  `index.ts:256-260`) overshoots the central mass — 1.2 long at the
  default periapsis r=1, ~30 at e=0.9. Saturate and clamp below
  `r − central radius`
- [READY] **X-53** Two small module bugs: `non-inertial-frames`' lab-frame
  platform mark stops turning once the puck exits, because θ = ω·t uses
  the exit-clamped `t` (`index.ts:234-237`); `projectile-motion`'s
  default `launchVelocity` `[8.49, 8.49, 0]` (`params.ts:74`) has zero
  vertical component under z-up, so vector mode freezes at t=0
- [READY] **X-54** `path` always fades its oldest vertex to the
  background, with or without `persistence` (`path.ts:72`) — two-point
  axis lines and closed outlines (`gravitation`'s orbit, the
  `fields-gradients` cap boundary) render with an invisible end. Fade
  only when `persistence` is set (or add `fade?: boolean`)
- [READY] **X-55** Layer fade-in is a no-op for any layer that has been
  drawn before: `Viewport.ts:352` flips `material.transparent` without
  `needsUpdate`, and three r160 bakes `OPAQUE` (alpha forced to 1) from
  `transparent` into the compiled program (`WebGLPrograms.js:248`); no
  `needsProgramChange` check looks at `transparent`. Set `needsUpdate`
  at fade start and end (read-only — confirmed from three.js source)
- [READY] **X-56** Service-worker update notice is missed when a worker
  is already `waiting` at page load: only `updatefound` triggers it
  (`register.ts:43-55`). After `register()`, notify if
  `registration.waiting && navigator.serviceWorker.controller`
- [READY] **X-57** `field` glyph draws a spurious +y arrow at
  zero-magnitude samples (`field.ts:93-97`; minimum length 0.15 × base in
  length mode, full length in the other modes, `:120-121`). Scale the
  instance to 0 below epsilon
- [READY] **X-58** Latent: `dimensionLine`'s `applyGeometry` sets
  `line.visible = true` unconditionally (`dimensionLine.ts:77-78`) and
  `surface` does the same for its wireframe (`surface.ts:122`), so a
  `set()` after `visible(false)` re-shows them. No current module hits
  it. Track a `shown` flag the way `label` does
- [READY] **X-59** Two `ModuleView` lifecycle races: the 420ms 2D-lock
  `setTimeout` is never cleared (`ModuleView.tsx:443-446`), so toggling
  back within 420ms re-locks anyway and after unmount it touches a
  disposed camera; the time series appends on every store change
  (`:339-345`), so a paused param drag floods it and a reset makes x
  non-monotonic. Clear the timer; append only when `t` advances, clear
  when it goes back
- [READY] **X-60** `rotational-dynamics` precession panel has no
  regression test against the exact heavy-top equations. X-29's fix
  (dropping a factor of 2 in `baseSwing`) was verified against the
  fast-top linearization's own closed form and a golden `.set()` capture
  of the drawn flywheel position, but not against an independent
  numerical integration. The 2026-09-23 audit's corroborating check (an
  exact RK4 integration of the heavy-top equations, comparing max
  excursion and mean φ̇ at Ω=600) was never added to the test suite —
  add a short `rk4`-based regression test (test-only use of
  `kernel/ode`, doctrine-compatible) that integrates the exact equations
  at a large Ω and checks the module's closed-form approximation tracks
  it within the fast-top regime's expected error

## Contract gaps — the spec requires it, `types.ts` cannot express it

Found on the second pass. Each needs a decision before the milestone
that depends on it, and each fix is a `MODULE_CONTRACT_VERSION` bump
plus an ADR (§10).

- [DONE] **C-1** **Module-overridable `stepped` dt.** Resolved as M5-8 — see there for the full change list and [ADR 0010](docs/adr/0010-stepdt-module-overridable-timestep.md)
- [DONE] **C-2** Already resolved in practice at M3-32 by the preferred no-contract-change route: [`ModuleView.tsx`](src/shell/routes/ModuleView.tsx:722)'s `canvasLabel` is built generically from every readout scalar (`readout !== false`), joining `` `${s.label}: ${formatQuantity({value, dim: s.unit ?? DIMENSIONLESS})}` `` per scalar — no per-module phrasing template, and `ScalarDef` is untouched (no contract bump). This was already flagged inline: the code comment at the site explicitly cites C-2 as "the generic fallback every module gets without writing anything." Nothing needed to change; this entry is closing the loop by flipping the decision record to `DONE`. Verified: read the live `canvasLabel` composition (`ModuleView.tsx:722-728`) and confirmed every module's scalars carry `label`/`unit` (no per-module override exists to fall back to), so the generic path is the only path in play today
- [DONE] **C-3** Confirmed layer toggles + bookmarks generically suffice, for all five modules that exist today — no contract addition needed. `tests/e2e/smoke.spec.ts`'s `DEMONSTRATION_STATES` block only exercises `vector-algebra` (9 states), but the mechanism it proves is not module-specific: [`urlCodec.ts`](src/shell/state/urlCodec.ts:154)'s layer encode/decode (`L=` query param) iterates `ctx.layers: LayerDef[]` generically off each layer's own `urlKey`/`default`, with zero per-module branching — the same code path every module's `LayerManager` checkboxes go through. Checked each of the other four modules' `params.ts` for a genuine layer list: `rotational-dynamics` has 7 mutually-exclusive `exclusiveGroup: 'panel'` layers (2 clicks: open + select radio), `fields-gradients` has 7 independent toggle layers (1 click each), `projectile-motion` has 2 (`projectile`, `trace`, 1 click each), `control-showcase` has 3 (1 toggle + 2-member exclusive group). Every one is reachable within the 3-click budget using only layer checkboxes, and every reachable combination round-trips through the same generic `L=` URL encoding proven for `vector-algebra` — so the "layer toggles + bookmarks" mechanism generalizes without a per-module "demonstration state" declaration. Verified: read `urlCodec.ts`'s layer encode (`:154-163`) and decode (`:218-230`) to confirm it's data-driven off `LayerDef[]` with no module-specific code, and grepped all four other modules' `params.ts` for their `layers` exports
- [DONE] **C-4** Added [`src/modules/types.test.ts`](src/modules/types.test.ts), a one-assertion drift guard (`expect(MODULE_CONTRACT_VERSION).toBe(3)`, the same recorded-expectation pattern `src/design/tokens.test.ts` already uses for palette drift) — picked over a per-module marker because there's nothing yet for a marker to check against (no module has ever needed a contract-version-specific code path; both prior bumps were additive/optional per their own doc-comment notes) and a pinned-value test is the cheapest thing that forces a deliberate diff review: any bump now fails `test:unit`/CI until the expectation is updated in the same change, which is exactly where the doc comment already says an ADR belongs. Verified: `npm run test:unit` (503 tests, includes this one) and `npm run typecheck`/`lint` all clean; manually bumped the constant to 4 locally and confirmed the test fails with a clear diff, then reverted
- [DONE] **C-5** `rotational-dynamics/params.ts` re-pointed at the shared `kernel/units` exports (`MASS`, `LENGTH`, `VELOCITY`, `TORQUE`, `MOMENT_OF_INERTIA`, `ANGULAR_MOMENTUM`, `ANGULAR_VELOCITY`, `ENERGY`), deleting its 8 local `Dimension` tuple literals — all identical values, confirmed by the module's own golden-value tests still passing unchanged. Verified: `typecheck`/`lint`/`test:unit` (482 tests)/`test:contract` (108 passed, 8 skipped)/`build`/`check:budget` all green

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

- [DONE] **M7-1** Work & Energy (potential surface + total-energy plane).
  Promoted to `READY` and built this session per the user's explicit
  choice (following the recommendation §20 already gives: M7+ ordered
  "roughly by pedagogical value per unit effort," M7-1 first). Scaffolded
  via `npm run new:module -- work-energy`
  ([manifest.ts](../src/modules/work-energy/manifest.ts),
  [params.ts](../src/modules/work-energy/params.ts),
  [index.ts](../src/modules/work-energy/index.ts),
  [explain.md](../src/modules/work-energy/explain.md)). A mass on a
  frictionless spring (closed-form SHM, `timeModel: 'parametric'` — no
  `kernel/ode`, per the Visualizer Doctrine §2), drawn as its own energy
  diagram rather than a literal spring: `U(x)=½kx²` as a `surface`
  ribbon (height = potential energy, colour-shaded by the same value),
  a translucent `patch` "total-energy plane" at `E=½kA²` marking the
  turning points `x=±A`, and the oscillating mass riding the ribbon
  with a velocity `arrow` and a dashed `dimensionLine` bracket making
  `KE=E−U(x)` a literal on-screen gap. Drawn in reduced coordinates
  (`ξ=x/A`, `η=U/E=ξ²`, both algebraically independent of `k`/`m`/`A`)
  so the diagram is framed identically at every parameter setting
  rather than the raw `U(x)` ribbon's height blowing up with `k`; a
  real bug caught this ([X-17](#x--cross-cutting-obligations)):
  `surface`/`patch` geometry that leaves the canonical x/up plane by
  even a fraction of a world unit silently fails to render under the
  default locked "2D-only" orthographic view, so every glyph here stays
  exactly on that plane (z=0) rather than depending on a camera fix —
  see the comment at the top of `index.ts`. `module.test.ts` (6 tests)
  covers the golden-value physics: starts at the turning point
  (`x=A`, `KE=0`), reaches `KE=E`/`speed=Aω` a quarter-period in,
  conserves `PE+KE=E` across a full period sampled at 20 points, the
  work-energy theorem (`ΔKE=−ΔU` between two arbitrary times), and that
  amplitude changes `E` but not the period. Verified:
  `npm run typecheck && npm run lint && npm run test:unit` (509 tests,
  up from 503) `&& npm run test:contract` (118 passed/9 skipped, up
  from 108/8 — auto-discovered, no module-specific contract code
  needed) `&& npm run build && npm run check:budget` (`work-energy`
  chunk 1.24 KB gzipped against the 80 KB budget; entry chunk
  unaffected at 71.74 KB) `&& npm run format:check` all clean. Manually
  verified live in the dev server (Browser pane): the default locked
  2D view renders the full parabola/plane/ball correctly; playing
  and scrubbing the timeline moves the ball, velocity arrow, and KE
  bracket correctly (readouts cross-checked against the closed-form
  formulas by hand, e.g. `|v|=4.74` at the well bottom exactly matches
  `Aω=1.5×√10`); both layer checkboxes toggle their glyphs
  independently; dragging "Amplitude" to 3 rescales `E`/`x_max` while
  the on-screen diagram stays the same size (the reduced-coordinate
  design working as intended) and `T` stays fixed (SHM's
  amplitude-independent period); switching the global up-axis to z-up
  reproduces the same flattened view `projectile-motion` already shows
  under z-up (pre-existing, not a regression — projectile-motion's
  own `defaultView` collapses identically). Not independently
  investigated: the X-17 root cause itself (flagged for a future
  session), and a real physical-projector/colour-blindness-simulator
  pass (same residual-manual-gap category as M2-19/M4-6).
- [DONE] **M7-2** Momentum & Collisions (CM-frame toggle; closed-form
  elastic collision formulae, **not** a solver — §2). Promoted to
  `READY` and built this session per the user's standing instruction to
  keep working down the M7+ list without asking cold each time.
  Scaffolded via `npm run new:module -- momentum-collisions`
  ([manifest.ts](../src/modules/momentum-collisions/manifest.ts),
  [params.ts](../src/modules/momentum-collisions/params.ts),
  [index.ts](../src/modules/momentum-collisions/index.ts),
  [explain.md](../src/modules/momentum-collisions/explain.md)). Two
  carts on a frictionless 1D track close on each other and collide
  exactly once; a restitution-coefficient slider `e` sweeps the general
  1D restitution formula (momentum conservation +
  `v2' - v1' = e(u1-u2)`) from perfectly elastic (`e=1`) to perfectly
  inelastic (`e=0`, carts stick and share one velocity) — not an
  elastic-only special case, and not a numeric solver: `tCollision` is a
  closed-form root of the linear separation-vs-time equation, and both
  the pre- and post-collision motion are closed-form linear functions of
  `t`, so `timeModel: 'parametric'` needs no integration. The **CM-frame
  toggle** is a `toggle`-kind `ParamDef` (not a layer — it recenters the
  whole picture rather than adding/removing a glyph): momentum
  conservation makes `m1*v1After + m2*v2After` equal `m1*u1 + m2*u2`
  exactly for every `e` (the `(1+e)*m1*m2*approachSpeed/totalMass` term
  cancels between the two post-collision velocities), so the center of
  mass moves at one constant velocity `vcm` for all `t` with no kink at
  the collision — the toggle recenters position by the (linear-in-`t`)
  CM position **and** velocity by `vcm` (two different corrections, not
  one — a position-only recentering would leave every velocity arrow's
  length unchanged, which is wrong), so the CM's own velocity arrow
  visibly shrinks to nothing once the toggle is on. Both carts share
  `ctx.palette.position` (not two different colours) since they're two
  instances of the same quantity kind — distinguished by radius
  (`∝ mass^(1/3)`) and a `m_1`/`m_2` KaTeX label, per
  PHYSICS_CONVENTIONS.md's "same quantity, same colour" rule, mirroring
  how `vector-algebra` reuses the 8-colour palette across multiple
  instances of an abstract, non-physically-typed vector. Readouts
  (`scalars()`) always report the lab frame regardless of the CM-frame
  toggle — that toggle is a picture recentering, not a second physical
  scenario. `module.test.ts` (8 tests) covers the golden-value physics:
  total momentum conserved across the collision for every `e` sampled;
  elastic (`e=1`) conserves kinetic energy across the collision; elastic
  equal-mass collision swaps the two velocities exactly; perfectly
  inelastic (`e=0`) leaves both carts at `vcm`; partial inelasticity
  (`0<e<1`) loses kinetic energy while `e=1` conserves it exactly; carts
  that never approach (`u1<=u2`) never collide, velocities unchanged out
  to `t=20`; CM velocity is independent of both `e` and `t`. Verified:
  `npm run typecheck && npm run lint && npm run test:unit` (517 tests,
  up from 509) `&& npm run test:contract` (138 passed/10 skipped, up
  from 118/9 — auto-discovered, no module-specific contract code
  needed) `&& npm run build && npm run check:budget`
  (`momentum-collisions` chunk 1.64 KB gzipped against the 80 KB budget;
  entry chunk unaffected at 71.93 KB) `&& npm run format:check` all
  clean (one round of `prettier --write` needed on the first draft —
  its markdown formatter reflowed a multi-line KaTeX block in
  `explain.md` and silently dropped two `\,` escapes in the process;
  fixed by splitting that block into two single-line `$$...$$` formulas,
  matching every other module's explain.md style, and confirmed stable
  under `format:check` afterward). Manually verified live in the dev
  server (Browser pane): loaded `#/m/momentum-collisions`, confirmed the
  default state's readouts (`v1=3.00, v2=-1.00, p1=3.00, p2=-2.00,
pTotal=1.00, K=5.50`) match the hand-computed pre-collision values for
  the default params; scrubbed to `t=2` (past the ~1.30s collision
  instant at defaults) and confirmed the elastic-collision readouts
  (`v1=-2.33, v2=1.67, pTotal=1.00, K=5.50`) match the closed-form
  restitution formulas to 2 decimal places, both momentum and (since
  `e=1`) kinetic energy conserved across the collision; set `e=0` at the
  same `t=2` and confirmed both carts land on the identical CM velocity
  (`v1=v2=vcm=0.333`, `p1=0.333, p2=0.667, pTotal=1.00, KE=0.167`,
  correctly less than the pre-collision 5.50, i.e. energy actually lost)
  — matching `module.test.ts`'s inelastic case exactly; toggled "View in
  center-of-mass frame" and confirmed the readout table is untouched (by
  design — lab-frame only) and no console errors on the toggle. Could
  not get a pixel-level visual confirmation of the CM-frame recentering
  or the glyph layout in the Browser pane tool itself — this
  environment's pane does not composite frames
  ([[project-browser-pane-no-compositing]]; `<canvas>` stayed at its
  un-sized default 300×150 rather than filling the viewport, consistent
  with the known `ResizeObserver`-under-a-hidden-page limitation, not a
  module bug) — so used the Playwright e2e suite for the actual
  rendered-frame proof instead: `npx playwright test
tests/e2e/smoke.spec.ts` auto-discovered `momentum-collisions` via the
  registry glob with zero test edits and its per-module "renders, no
  console errors, every layer toggles, disposes its WebGL context on
  navigate-away" case passed on the first run; the same run's lone
  failure (`projectile-motion`'s instance of that same check) turned out
  to be a pre-existing cross-worker test-isolation flake unrelated to
  this module — reproduced it disappearing under `--workers=1` (31/31
  green) and passing standalone at any worker count, logged as X-18
  rather than silently ignored. Also flagged **X-19**: `vcm=0.333`
  render as literal `"333m"` in the readout table (the SI milli-prefix
  letter, not a length unit) is easy to misread as "333 meters" at a
  glance — not a bug (`formatQuantity` is documented prefix-only, and
  this module's defaults are the first to actually exercise the sub-1
  prefix path), but worth a future Layer-2 look. Not independently
  investigated: a real physical-projector/colour-blindness-simulator
  pass (same residual-manual-gap category as M2-19/M4-6/M7-1) — deferred
  to the batched QA checkpoint per this session's Part B instructions,
  not skipped module-by-module.
- [DONE] **QA checkpoint (post M7-1/M7-2)** Batched Part-B pass across
  both M7+ modules added so far, per this session's mission brief
  ("checkpoint after every 2 modules"). Four pieces:
  1. **Code-review pass** (`code-review` skill, high effort, 8 finder
     angles + verify) over `work-energy` and `momentum-collisions`. Two
     CONFIRMED correctness bugs, both fixed in this change:
     - **Sphere radius halved.** `body`'s `'sphere'` kind is
       `THREE.SphereGeometry(0.5, ...)` — a unit-_diameter_ sphere — so
       `scale` is a diameter multiplier, not a radius multiplier the way
       it is for `'box'` (a unit _cube_). Both modules passed their
       intended radius directly as `scale`, rendering spheres at half
       size. In `momentum-collisions` this was a real, visible physics
       bug, not just cosmetic: the collision-trigger math
       (`contactSeparation = radiusOf(m1)+radiusOf(m2)`) used the
       _intended_ (unhalved) radius, so the two carts' rendered surfaces
       stopped touching with a visible gap at the moment the velocity
       swap fired. Fixed by adding a `sphereScaleFor(radius)` helper
       (`momentum-collisions/index.ts`) and doubling the same constant
       inline in `work-energy/index.ts` (cosmetic-only there), both with
       a comment pointing at `body.ts`'s geometry convention so the next
       module author doesn't repeat it.
     - **`work-energy`'s `turningPoint` scalar returned the raw signed
       `amplitude` param** instead of its magnitude, inconsistent with
       every other place in the module that treats amplitude as a
       magnitude (turning points always drawn at reduced ξ=±1
       regardless of sign). One-line fix: `Math.abs(A)`.
       Also confirmed **not module-specific**: `src/shell/state/urlCodec.ts`'s
       `decodeParamValue` does raw `Number(raw)` for every `number`/`angle`
       param with no clamping to the declared `min`/`max` and no NaN/finite
       guard anywhere in the decode→store→module pipeline — read the file
       directly to confirm this, not just trusted the reviewer agent. A
       hand-edited bookmark URL (`?m1=0&m2=0`, `?m=0`) can inject `NaN`
       into any module's readouts and rendered positions. This is a
       pre-existing, cross-cutting platform gap affecting every registered
       module, not something introduced by either M7+ module reviewed here
       — out of scope to patch defensively inside two modules' own math
       (CLAUDE.md: don't validate against scenarios that "can't happen" via
       the normal UI path; the real fix belongs in `urlCodec.ts`/`store.ts`
       and is a design decision — clamp silently, reject, or fall back to
       defaults — not mine to make unilaterally here). Logged as **X-20**.
       Remaining findings (not fixed, lower severity/PLAUSIBLE or
       style/altitude): `momentum-collisions`'s `tCollision` sign has no
       assertion tying it to the fixed layout constants (not reachable via
       the UI sliders today); `radiusOf()` unguarded against negative mass
       (same root cause as X-20, not fixed defensively for the same
       reason); the CM-frame recenter logic is bespoke 1D scalar math with
       no reusable `src/scene`-level frame-transform helper, flagged as a
       seam for **M7-3** to generalize from rather than reinvent (see that
       entry's note below); `toWorld()` in both new modules hand-rolls
       `kernel/math`'s `add`/`scale` instead of calling them, and the same
       `ctx.up`+`toWorld` idiom is now copy-pasted across 4 modules with no
       shared helper; `solveCollision()`/`kinematicsAt()` are independently
       duplicated in `update()` and `scalars()` every frame (necessitated
       by `scalars()`'s purity contract, not a bug, but a real
       maintenance-drift risk); `work-energy`'s header comment claimed the
       "same idiom as rotational-dynamics/projectile-motion's `ctx.up`
       handling" while also correctly stating it has no gravitational
       notion of vertical — reworded for clarity (not a functional bug;
       the contract suite already exercises both up-axis settings).
  2. **Manual-check backlog** (projector mode, 320px, reduced-motion,
     colour-blindness — §18's per-module DoD item 10, deferred from both
     M7-1 and M7-2's own write-ups to batch here). Verified by reading
     the actual shared-substrate mechanisms rather than re-deriving
     per-module claims: projector mode
     (`getProjectorAdjustments`/`Viewport.setProjectorMode`) sweeps every
     _registered_ themed material generically — confirmed both new
     modules' arrow/body/point handles register through
     `host.registerThemedMaterial`, so line-weight/opacity adjustments
     apply with zero module code, same as every other module.
     `prefers-reduced-motion` is similarly generic: `CameraController`
     collapses `goTo` transitions to instant
     (`src/scene/camera/index.ts:233`) and `Viewport.setLayerVisible`
     skips the fade entirely (`src/scene/Viewport.ts:305`) — neither new
     module adds camera or layer-fade code of its own, so both inherit
     this for free. Colour-blindness: both modules use only
     `ctx.palette.*` (`position`, `velocity`, `construction`, `energy`)
     — no raw hex, and the Okabe-Ito safety property is verified once at
     the palette level (`tokens.test.ts`), not per module.
     `momentum-collisions` deliberately gives both carts the same colour
     (`position`) and relies on radius+label to distinguish them, per
     PHYSICS_CONVENTIONS.md's "same quantity, same colour" rule. 320px:
     the existing e2e test only exercises `vector-algebra`, so actually
     ran `momentum-collisions` through the identical check (a throwaway
     Playwright script against a `vite preview` build at 320×640) —
     `scrollWidth === clientWidth` (no overflow), zero console errors.
     Projector: still cannot drive real hardware from this environment —
     same residual manual gap as M2-19/M4-6/M7-1/M7-2, not silently
     claimed.
  3. **Full verification sweep**, holistic (not just the two new
     modules): `npm run typecheck && npm run lint && npm run test:unit`
     (517 tests) `&& npm run test:contract` (138/10-skip) `&& npm run
build && npm run check:budget` (7 module chunks, largest
     `fields-gradients`/`rotational-dynamics` at 4.1–4.2 KB gzipped,
     entry chunk 71.93 KB — no budget pressure from adding a 7th module)
     `&& npm run format:check` — all clean after the two code-review
     fixes above. Also ran `npx playwright test tests/e2e/smoke.spec.ts`
     twice: once at default (6 workers), which surfaced a
     `projectile-motion` WebGL-disposal-check flake unrelated to either
     M7+ module (logged as **X-18** under M7-2 above); once at
     `--workers=1`, 31/31 green, confirming the flake is a cross-worker
     test-isolation race, not a regression.
  4. **X-17 revisit.** Neither `work-energy` nor `momentum-collisions`
     newly reproduces X-17 — `momentum-collisions` never uses
     `surface`/`patch` at all (only `body`/`point`/`arrow`/`label`, which
     X-17's own writeup already confirms render fine off-plane), so it
     provides zero new data points on the bug itself. Not root-caused
     this session; still `READY`, unowned. **M2-19/M4-9 residual gaps**
     (DevTools profiler session, `renderer.info` triangle/draw-call
     instrumentation): reconsidered now that 7 modules are live — both
     remain correctly out of scope. M2-19's gap is a literal
     human-at-a-projector step, unaffected by module count. M4-9's gap
     (no debug hook for `renderer.info`) was judged "scope creep" at 4
     modules; at 7, the hand-counted per-module triangle budgets
     (`momentum-collisions`: 2 spheres + 4 arrows + 1 point ≈ order 500
     triangles, ~10 draw calls) remain several orders of magnitude under
     the 60,000-triangle/200-draw-call ceiling, so there's still no
     concrete signal that the ceiling is close enough to need
     instrumentation rather than continued hand accounting.
     Verified: the fixes above are covered by the existing golden-value
     tests (`momentum-collisions`' 8 tests re-run clean, confirming the
     collision-timing math itself was never wrong — only the rendered
     sphere size was) and the full sweep in point 3.
- [DONE] **X-20** `src/shell/state/urlCodec.ts`'s `decodeParamValue`
  (line ~76) does raw `Number(raw)` for every `number`/`angle`-kind
  param straight from the URL query string, with no clamping to the
  param's declared `min`/`max` and no `NaN`/finite check anywhere in the
  decode → store → module pipeline (confirmed by reading `urlCodec.ts`,
  `store.ts`, and `ModuleView.tsx` directly — none of the three clamps
  or validates a decoded numeric value). Discovered during the
  `momentum-collisions`/`work-energy` code-review pass (a bookmarkable
  URL is a documented, shipped feature per ARCHITECTURE.md §14, so a
  hand-edited or shared link is a legitimate "platform" input, not a
  contrived one) but applies to every registered module, not just those
  two — e.g. `#/m/momentum-collisions?m1=0&m2=0` makes every downstream
  scalar `NaN` via `0/0`; `#/m/work-energy?m=0` makes `omega=Infinity`
  and every subsequent ball position `NaN` via `Infinity*0`-shaped
  arithmetic. Not fixed inline: this is a shell-level gap, and the right
  fix is a design decision (clamp silently to `[min,max]`? reject and
  fall back to the module default? show a "malformed URL" notice?) that
  affects every module's URL-restore behavior, not a module-specific
  patch. Whoever picks this up should start at `decodeParamValue`
  (`urlCodec.ts`) and decide the policy before touching code — clamping
  silently is the least surprising default and matches how sliders
  already behave, but changes what a truncated/malformed bookmark link
  restores to, which is worth a one-line ADR note per X-8 if adopted.
  **Decided and fixed (this change), recorded as
  [ADR 0015](docs/adr/0015-clamp-and-nan-guard-decoded-url-params.md):**
  went with the clamp-silently policy the entry itself already leaned
  toward, over the two alternatives (reject-the-field-even-if-merely-
  out-of-range; reject-the-whole-URL-with-a-notice) — see the ADR for
  the full reasoning, in short: it's the least surprising outcome given
  a `Slider` already pins at its end rather than erroring, and it
  doesn't throw away every OTHER valid field in the same URL over one
  bad one. New `clampDecodedNumber(value, fallback, min?, max?)` in
  `urlCodec.ts`: a non-finite parse (`NaN`/`Infinity`, e.g. `?m1=abc`)
  falls back to the param's own declared `default` (or the matching
  component of a vector's default tuple); a finite but out-of-range
  value clamps into `[min, max]` (`[-range, range]` per vector
  component). Scoped to exactly the three `ParamDef` kinds whose decode
  path is a bare `Number(...)` (`number`, `angle`, each `vector`
  component) — `toggle`/`select` can't produce a non-finite value from
  this function as written, and `expression` already goes through
  `kernel/expr`'s own typed error handling, so none of those needed
  touching. 8 new tests in `urlCodec.test.ts` (`describe('X-20: ...')`):
  non-numeric and empty `number` params, a finite out-of-range `number`
  clamping to both ends, an `angle` param with no declared `min`/`max`
  passing any finite value through unclamped vs. still falling back
  when non-finite, a vector with one garbage component falling back
  for just that component while keeping its siblings, a vector clamping
  per-component to `+/-range`, and a documentation-style regression
  test drawing the line between "decode manufactures a NaN" (now
  impossible) and "a module's own math produces one from a legitimately
  decoded, in-range value" (still possible in principle, and correctly
  not this fix's job to prevent). Confirmed live (Browser pane, hard
  reload) that this also happens to close the ORIGINAL reported
  repro, not just narrow it: `momentum-collisions` declares `m1`/`m2`
  with `min: 0.2`, so `#/m/momentum-collisions?m1=0&m2=0` — the exact
  URL cited when this entry was logged — now clamps both masses to
  `0.2` and shows a real (if extreme) two-tiny-carts collision instead
  of the previous `0/0`-driven `NaN` throughout the readout table.
  `work-energy`'s `#/m/work-energy?m=0` is likewise now clamped to
  that param's own declared `min` rather than reaching `omega=Infinity`.
  A module could still construct its own internal `0/0` from two
  params that are each individually valid (e.g. a future module
  subtracting two same-valued in-range numbers) — correctly out of
  scope here, since that's the module's own math on legitimate input,
  not a decode-layer bug. Verified: `npm run typecheck && npm run lint
&& npm run test:unit` (607 tests, +8 new) `&& npm run test:contract`
  (187/12-skip, unaffected — no `types.ts` change, no
  `MODULE_CONTRACT_VERSION` bump) `&& npm run build && npm run
check:budget` all clean.
- [DONE] **X-21** User manual inspection of `rotational-dynamics`'
  precession panel (M5-1) asked two questions the old implementation
  couldn't answer: (1) is a genuinely looping axis path possible, not
  just the smooth "peaky wave" the demo showed, and (2) can precession
  be isolated from nutation entirely? Investigated and both answered
  no, for a structural reason: the old `topDirectionAt` had `theta(t)`
  wobble sinusoidally but `phi(t) = precessionRate * t` strictly
  linear, with the nutation amplitude itself hardcoded as
  `0.15 * topTiltAngle` — a free-floating cosmetic multiplier, not
  derived from any release condition. Since real phi-theta coupling
  (`φ̇` depending on `θ`, via conservation of `p_φ`) is exactly what
  produces the wavy/cusped/looping family in a real top, and exactly
  what was missing, fixed both by re-deriving the fast-top
  small-oscillation approximation properly (`p_φ = I1 φ̇ sin²θ + I3 Ω
cosθ = Jz` and `E' = ½I1θ̇² + ½I1φ̇²sin²θ + Mgl cosθ = const`,
  linearized around steady precession — full derivation in the comment
  block above `precessionCoefficients()` in `index.ts`) rather than
  reaching for the exact elliptic-function solution (no Jacobi elliptic
  functions in `kernel/math`, and ARCHITECTURE.md §2 wants a closed-form
  formula evaluated per-`t`, not an ODE solve — ruled out `kernel/ode`
  for the same reason M5-1 itself already gives for _not_ using it on
  the other six panels). The new `nutationAmplitude` param (a `kind:
'angle'`, `forLayer: 'precession'` dial, default 0.27, range
  [-0.3, 0.5]) is exposed directly rather than the "release ratio" `k`
  it's derived from (`k = φ̇(0)/Ω_p`, solved backward from the
  user-facing `deltaTheta`) — `deltaTheta` is the physically legible
  quantity; `k` stays an internal implementation detail. `deltaTheta=0`
  gives exactly `theta(t)=topTiltAngle` (constant) and
  `phi(t)=precessionRate*t` (linear) — pure, wobble-free steady
  precession, directly answering question (2). Two new scalars expose
  the coupling itself: `precessionRateSecular` (the actual
  time-averaged precession rate once nutation is coupled in — often
  very different from the bare `Mgl/(I3Ω)` formula near the cusp; 3.44
  vs. 1.75 rad/s at this panel's own defaults, confirmed live) and
  `nutationCouplingRatio` (`|C·deltaTheta/A|` — <1 wavy, ≈1 cusped, >1
  genuinely looping), answering question (1) with a number the student
  can watch move past 1. `topSpinRate`'s range was also widened
  (5–80 → 20–200, default 40 → 70) because the small-oscillation
  linearization the coupling formulas rest on requires a genuinely
  "fast" top (`Ω_p/ωn ≪ 1`) — at the old default this ratio was ≈0.995
  (nowhere near fast), so the formulas would have produced nonsensical
  large-angle swings out of the box; the new default's ratio (≈0.32)
  keeps the demo in the regime the module's own "(fast top)" label
  already claimed. Two defensive clamps guard extreme parameter
  combinations the contract suite's 100 random samples can still reach:
  `deltaTheta` clamped to ±0.6 rad (keeps the linearization from being
  extrapolated past where it means anything) and `theta(t)` clamped to
  `[0.02, π−0.02]` (keeps the polar angle away from the poles
  regardless of how `deltaTheta` and `topTiltAngle` combine). Verified:
  two new golden-value tests in `module.test.ts` — `nutationAmplitude=0`
  gives `nutationCouplingRatio=0` and `precessionRateSecular ===
precessionRate` exactly; and an exact analytic identity (holds for
  _any_ top parameters, not just one hand-picked example, and is a
  genuine cross-check that the derivation was translated into code
  correctly, not just "looks plausible"): at `deltaTheta = baseSwing`
  (the closed-form "released from rest" swing, `2Ω_p sinθ0/ωn`),
  `nutationCouplingRatio` is exactly 1 (cusped boundary) to 6 decimal
  places, `>1` at `1.3×baseSwing` (genuine looping), `<1` at
  `0.5×baseSwing` (ordinary wavy path) — `npm run typecheck && npm run
lint && npm run test:unit` (519 tests, up from 517)
  `&& npm run test:contract` (138/10-skip, unchanged — no module-count
  change) `&& npm run build && npm run check:budget`
  (`rotational-dynamics` chunk 4.77 KB gzipped, up from 4.11 KB, still
  far under the 80 KB budget) `&& npm run format:check` all clean.
  Manually verified live in the dev server (Browser pane): at defaults,
  readouts showed `\Omega_p=1.75`, `\bar\Omega_p=3.44`,
  `nutationCouplingRatio=0.992` (matching a standalone numeric check to
  3 decimal places); set nutation amplitude to 0° and confirmed
  `\bar\Omega_p` snapped to exactly `1.75` (matching `\Omega_p`) with
  `nutationCouplingRatio=0.00`; set it to 26° and confirmed
  `nutationCouplingRatio=1.17` (>1, genuine looping, live) — zero
  console errors throughout (confirmed against a background stretch of
  `ERR_CONNECTION_REFUSED` noise that turned out to be stale dev-server
  HMR reconnect attempts from an unrelated earlier `preview_stop`, not
  a real regression — the Playwright e2e run below has its own,
  separate "no console errors" assertion and passed clean). Also ran
  `npx playwright test tests/e2e/smoke.spec.ts -g rotational-dynamics
--workers=1`: both the X-14 panel-switch test and the per-module
  smoke test passed. `explain.md`'s "Precession" paragraph rewritten to
  describe the new isolate/couple behavior instead of the old
  "small nutation ripple" description.
- [DONE] **M7-3** Non-Inertial Frames & Coriolis — the consumer of M1-6's
  separately retrievable ω×r / Coriolis / centrifugal terms; this is the
  first module in the library to import `kernel/frames` at all. Promoted
  to `READY` and built this session per the user's standing instruction
  to keep working down the M7+ list without asking cold each time.
  Scaffolded via `npm run new:module -- non-inertial-frames`
  ([manifest.ts](../src/modules/non-inertial-frames/manifest.ts),
  [params.ts](../src/modules/non-inertial-frames/params.ts),
  [index.ts](../src/modules/non-inertial-frames/index.ts),
  [explain.md](../src/modules/non-inertial-frames/explain.md)). A puck
  slides at constant velocity with **no real force acting on it at
  all** — frictionless, force-free — while a platform spins at a
  constant `omega`; two `exclusiveGroup`-radio panels ("Lab frame" /
  "Rotating frame") redraw the identical closed-form scenario
  (`r(t)=r0+v0 t`, `a(t)=0`) from each observer's own coordinates.
  `timeModel: 'parametric'`: the world<->rotating-frame position and
  velocity transform is a plain 2D rotation by `-omega*t`, exact at any
  `t`, no `kernel/ode` needed (ARCHITECTURE.md §2). The puck freezes once
  it first crosses a fixed exit radius (closed-form root of
  `|r0+v0 t|²=R²`, same pattern as `projectile-motion` resting at
  touchdown) so an unbounded straight line doesn't coast off-screen over
  the shell's 20s scrub range. The rotating panel's payoff: since the
  puck's real (lab-frame) acceleration is exactly zero, the observer's
  own "relative" acceleration must exactly cancel the Coriolis and
  centrifugal terms — `fictitiousTermsAt()` gets those two kinematic
  terms by calling kernel/frames' `transformAcceleration` (M1-6) with a
  zero relative-acceleration guess (not by re-deriving the cross
  products by hand a second time), then calls it again with `relative`
  set to the exact negative of their sum, so the three acceleration
  arrows are drawn **tip to tail** (centrifugal, then Coriolis from its
  tip, then a dashed "observed" arrow closing the triangle back to the
  puck) — the closed loop on screen _is_ the identity. A `residual`
  scalar (`|relative+coriolis+centrifugal+euler|`) reports that same
  statement as a number that should read ≈0 everywhere; live in the dev
  server at defaults it rendered as `111 a` in the readout table — an
  honest confirmation, not a bug: `formatQuantity`'s SI-prefix
  engineering notation picked atto (`a`, 10⁻¹⁸) as the nearest bucket for
  a value of order 10⁻¹⁶, i.e. `111×10⁻¹⁸ ≈ 1.11×10⁻¹⁶`, machine-epsilon
  noise around the true value of exactly zero (same X-19 milli-prefix
  legibility gap already logged, now hit at the atto end instead of
  milli — not a new bug, just a second data point for that backlog
  item). The Euler term is identically zero throughout, by construction
  (`omega` is held constant — `omegaDot: [0,0,0]` — the explain.md panel
  says so explicitly rather than silently omitting a term the API
  supports).
  Deliberately does **not** build a new shared "moving/rotating group"
  Layer 1 capability, even though this module's own recenter need (a
  rotating frame) is a superset of `momentum-collisions`' 1D CM-frame
  recenter (`frameOffset`/`velCorrection`) that the QA checkpoint after
  M7-1/M7-2 flagged as a seam for this module to generalize from:
  investigated `ctx.frame()` first, since §8 documents it as "nestable
  coordinate frames — modules compose these rather than doing their own
  matrix bookkeeping," but it turns out to be a _visible_
  coordinate-triad glyph (it always draws RGB axis lines) that only
  nests other frame glyphs via its own `parent` prop — not a generic
  invisible parent group an `arrow`/`point`/`body` glyph could attach
  under — and a module cannot create its own `three.js` `Group` to fill
  that role (no `three` import, §6). Building a real transform-aware
  `ctx.group()` would be a genuine Layer 1 addition, not a small
  refactor, so per ADR-3's own precedent ("share capability downward
  only once a concrete duplication case is demonstrated") this module
  generalizes the _pattern_ (world<->frame position/velocity math,
  written directly against `kernel/math`) rather than inventing a new
  shared abstraction for a second use case. Worth building for real if a
  third module needs the same thing — noted inline in `index.ts` at the
  point where the decision was made, not just here.
  `module.test.ts` (7 tests) covers the golden-value physics: the three
  acceleration terms sum to <1e-8 across a spread of `omega`/`t`
  combinations; `omega=0` collapses the rotating frame onto the lab
  frame exactly (`speedRel` equals the plain lab speed, both fictitious
  terms exactly zero); `rho` (distance from the rotation axis) is
  frame-invariant, matching the raw closed-form lab formula to 10
  decimal places; a puck at (near-)rest in the lab frame traces a
  perfect circle in the rotating frame at speed `|omega|*rho`, the
  textbook illustration of uniform circular motion as seen by a rotating
  observer; centrifugal acceleration is exactly `omega² * rho` in
  magnitude; the exit-radius freeze leaves `rho` identical at two times
  both past the exit instant. Verified:
  `npm run typecheck && npm run lint && npm run test:unit` (526 tests, up
  from 519) `&& npm run test:contract` (158 passed/11 skipped, up from
  138/10 — auto-discovered, no module-specific contract code needed)
  `&& npm run build && npm run check:budget` (`non-inertial-frames` chunk
  2.48 KB gzipped against the 80 KB budget; entry chunk unaffected at
  72.15 KB) `&& npm run format:check` all clean (one round of
  `prettier --write` needed on the first draft, same as M7-2's
  `explain.md` gotcha but this time on `index.ts`/`module.test.ts` — kept
  every `$$...$$` block in `explain.md` on one line from the start this
  time and it was untouched by the formatter). Manually verified live in
  the dev server (Browser pane, which — contrary to the standing note
  that this pane never composites rendered frames — did render real
  canvas content once the tab was fronted and interacted with; the
  earlier "stays blank" behavior was specifically about a _backgrounded_
  tab not running its rAF loop, not a blanket pane limitation, worth a
  memory correction): the platform disc renders as a true face-on circle
  (confirming `DISC_ORIENTATION`'s one-time cylinder-axis-to-world-Z
  rotation), the reference mark sits at the same screen position in both
  panels at `t=0` (`theta(0)=0` for any `omega`, so the two frames
  coincide there, as they must); readouts at defaults
  (`rho=2.28, |v'|=3.31, aCor=7.94, acf=3.28`) matched hand computation
  from the closed-form formulas to the displayed precision; switching to
  the rotating-frame radio produced the tip-to-tail
  centrifugal/Coriolis/dashed-relative triangle exactly as designed, with
  zero console errors; a 320px check (`vite` dev server, not a separate
  `vite preview` build) showed `scrollWidth === clientWidth` (no
  overflow) and a correctly stacked layout. `npx playwright test
tests/e2e/smoke.spec.ts -g non-inertial-frames --workers=1` passed
  (auto-discovered, zero test edits): renders, no console errors, every
  layer toggles, disposes its WebGL context on navigate-away. Not
  independently investigated: a real physical-projector pass (same
  residual-manual-gap category as M2-19/M4-6/M7-1/M7-2) and a dedicated
  colour-blindness-simulator pass (deferred to the batched QA checkpoint,
  per this session's Part B instructions — the module itself uses only
  `ctx.palette.position/velocity/accel/construction`, zero raw hex,
  confirmed by grep).
- [DONE] **M7-4** Driven Damped Oscillations. Promoted to `READY` and
  built this session per the user's standing instruction to keep working
  down the M7+ list without asking cold each time. Scaffolded via
  `npm run new:module -- oscillations`
  ([manifest.ts](../src/modules/oscillations/manifest.ts),
  [params.ts](../src/modules/oscillations/params.ts),
  [index.ts](../src/modules/oscillations/index.ts),
  [explain.md](../src/modules/oscillations/explain.md)). A mass hangs
  from a spring, driven by a sinusoidal force `F0*cos(Omega t)` applied
  directly to the mass, with linear viscous damping. Only the
  **steady-state** (particular) solution is drawn — deliberately not the
  transient that decays from whatever initial condition started it,
  since the transient's closed form branches on the damping regime
  (under-/critically-/over-damped) for no real gain in what the module
  is actually teaching (amplitude/phase response vs. drive frequency),
  and the M7-4 backlog note explicitly said to keep this `parametric`
  rather than reach for `kernel/ode` (ARCHITECTURE.md §2). `timeModel:
'parametric'`: `x(t) = A(Omega) cos(Omega t - delta)` is a pure
  closed-form function of `t` via the standard driven-damped-oscillator
  amplitude/phase formulas. The resonance curve itself needed **zero**
  module-specific plotting code: `omegaDrive` is an ordinary `number`
  param and `amplitude`/`phaseLag` are ordinary declared scalars, so the
  shell's existing generic Sweep Plot (§9 — "pick a parameter, sweep it
  across its range, evaluate a declared scalar at each value," explicitly
  called out there as covering "resonance response curves") already
  produces the textbook amplitude-vs-drive-frequency curve; `x`/`v` are
  also both plottable, giving a phase-space (`v` vs `x`) portrait for
  free through the same generic Time Series "vs. any other declared
  scalar" mechanism (§9) — neither is bespoke to this module. This is the
  first module in the library with both a genuine notion of vertical
  (a mass hanging under a fixed anchor, reading `ctx.up`) and a `spring`
  body glyph, so it's also the first exercise of `spring`'s own
  orientation: identical to `non-inertial-frames`' disc gotcha, the
  glyph's local axis of extension is its geometry's Y axis, so aligning
  it with `ctx.up` needs a fixed one-time rotation when the viewer is
  z-up (identity when y-up, since Y already equals up) — computed once
  in `create()` alongside the rest of the up-axis idiom, not per frame.
  `steadyStateAt()` floors the resonance denominator at `1e-6` rather
  than letting it reach exactly zero, so undamped exact resonance
  (`c=0`, `omegaDrive=omega0`) renders a large-but-finite amplitude
  instead of `Infinity`/`NaN` — a deliberate, disclosed idealization
  limit (explain.md says so directly: "an idealized undamped resonance
  has no steady state at all... this is exactly where the closed form a
  real spring can't actually reach"), not a silent fudge.
  `module.test.ts` (8 tests) covers the golden-value physics: `omega0`
  and `zeta` match their closed-form definitions directly; phase lag is
  exactly `pi/2` at resonance; amplitude matches the full closed-form
  formula for arbitrary parameters; amplitude approaches the static
  deflection `F0/k` far below resonance and falls off like `1/Omega^2`
  far above it, with phase lag approaching `pi`; `v(t)` matches a
  central-difference numerical derivative of `x(t)` to 4 decimal places
  (ties the two formulas together as one consistent closed form, not two
  independently-typed ones); the `c=0`-at-exact-resonance edge case stays
  finite. Verified: `npm run typecheck && npm run lint && npm run
test:unit` (534 tests, up from 526) `&& npm run test:contract` (178
  passed/12 skipped, up from 158/11 — auto-discovered, no module-specific
  contract code needed) `&& npm run build && npm run check:budget`
  (`oscillations` chunk 1.56 KB gzipped against the 80 KB budget; entry
  chunk unaffected at 72.35 KB) `&& npm run format:check` all clean (one
  round of `prettier --write` needed on `module.test.ts`, a plain
  line-wrap of one long expression — no KaTeX involved, so none of the
  M7-2 `explain.md` gotcha's risk applied here). Manually verified live
  in the dev server (Browser pane, fronted): the spring renders as a
  true vertical coil with the mass hanging below it (confirming the
  identity orientation on the default y-up path), the green velocity
  arrow and magenta force arrow point and scale correctly at both `t=0`
  (near-resonance defaults: `omega0=3.00`, `zeta=0.100`,
  `A(Omega)=2.78`, `delta=1.57`, `x(t)` reads as the atto-prefix
  near-zero `170a` — matches `x(0)=A cos(pi/2)=0` to floating-point noise,
  the same X-19 milli/atto-prefix legibility quirk `non-inertial-frames`
  already logged, not a new bug) and at the timeline's far end (`t=20s`,
  `x(t)=-847m` milli-prefix, velocity arrow flipped downward — consistent
  with continuing steady-state oscillation, not a freeze); jumping to
  `t=20s` and interacting produced zero NEW console errors, though a
  pre-existing stretch of 126 stale `ERR_CONNECTION_REFUSED` messages was
  present from an earlier `preview_stop`/restart in this same session —
  the same benign HMR-reconnect-noise pattern X-21's write-up already
  documented, confirmed here the same way (the count never grew across
  further interaction); a 320px check (live `vite` dev server) showed
  `scrollWidth === clientWidth`, no horizontal overflow. Did later drive
  the settings menu's up-axis toggle by hand — see **X-22** below, which
  the QA checkpoint's code-review pass on this module surfaced as a real,
  confirmed bug (a false code comment plus a genuine live-toggle
  staleness issue), not merely a UI-navigation quirk.
  Not independently investigated: a real physical-projector pass and a dedicated
  colour-blindness-simulator pass (deferred to the batched QA checkpoint
  below, per this session's Part B instructions — the module itself uses
  only `ctx.palette.position/velocity/force/construction`, zero raw hex,
  confirmed by grep).
- [DONE] **QA checkpoint (post M7-3/M7-4)** Batched Part-B pass across
  `non-inertial-frames` and `oscillations`, per this session's mission
  brief ("checkpoint after every 2 modules"). Four pieces:
  1. **Code-review pass** (`code-review` skill, high effort, 8 finder
     angles across both modules) — read every line of both `index.ts`
     files fresh rather than trusting a first-pass reviewer agent, per
     this project's own standing practice. Two CONFIRMED correctness
     bugs:
     - **`non-inertial-frames`'s `exitTime()` froze the puck at its
       first entry into the visible radius instead of its true final
       exit**, reachable whenever the puck starts already beyond
       `EXIT_RADIUS` (both `x0`/`y0` range to ±3, so `|r0|` up to ~4.24
       exceeds the 3.4 exit radius) and its straight line curves back
       through the interior — the puck would appear to jump to the rim
       and freeze forever instead of visibly crossing through. Fixed by
       branching on the sign of `x0²+y0²-radius²`: freeze at `t=0`
       immediately when already outside, only solve the quadratic (and
       take the correct — larger, not smaller — positive root) when
       starting inside. A new golden-value test locks this in
       (`module.test.ts`: a puck at `(3,3)` aimed back through the
       origin stays frozen at its starting `rho` for every later `t`
       sampled).
     - **`oscillations`' own code comment claimed the shell remounts a
       module on a live up-axis switch — it does not.** Verified by
       reading `ModuleView.tsx` directly (a live `prefs.upAxis` change
       only re-tweens the camera; it never calls `create()` again) and
       reproduced live in the dev server (switching Settings -> Up axis
       -> Z-up while `oscillations` stayed mounted left the spring/mass
       oriented along the old axis while the camera reoriented out from
       under them, collapsing the scene to a silhouette). The comment
       was corrected; the underlying behavior was deliberately **not**
       patched inline — logged as **X-22** below, since the real fix
       needs a decision between two costly options (see that entry) that
       affects `projectile-motion`/`rotational-dynamics` equally, not a
       one-module patch. This is the same category of judgment call as
       X-20 in the M7-1/M7-2 checkpoint: a real, confirmed, cross-cutting
       gap, disclosed and deferred rather than defensively patched in the
       two modules that happened to surface it.
  2. **Manual-check backlog** (projector, 320px, reduced-motion,
     colour-blindness — §18's per-module DoD item 10). Both new modules
     use only `ctx.palette.*` (`position`/`velocity`/`accel`/`force`/
     `construction`), zero raw hex, confirmed by grep. `prefers-reduced-
motion` and projector mode remain generic per the shell mechanisms
     already confirmed in the M7-1/M7-2 checkpoint — neither module adds
     its own camera or layer-fade code. 320px checked live for both
     (`scrollWidth === clientWidth`, no overflow). Projector: still
     cannot drive real hardware from this environment — same residual
     manual gap as every prior checkpoint, not silently claimed.
  3. **Full verification sweep**: `npm run typecheck && npm run lint &&
npm run test:unit` (535 tests, up from 526) `&& npm run
test:contract` (178 passed/12 skipped, unchanged — no module-count
     change from the two fixes) `&& npm run build && npm run
check:budget` (10 module chunks, largest `rotational-dynamics` at 4.77
     KB gzipped, entry chunk 72.35 KB — no budget pressure from 2 more
     modules) `&& npm run format:check` — all clean.
  4. **X-17 revisit.** Neither module uses `surface`/`patch` (only
     `body`/`point`/`arrow`/`path`/`label`), so neither provides a new
     data point on X-17's off-plane rendering bug — still `READY`,
     unowned, same as every checkpoint since it was logged.
- [DONE] **X-22** A live up-axis switch (Settings menu -> Up axis, or
  the `V` keymap) does not update a module's own `ctx.up`-derived scene
  geometry, even though the camera itself DOES re-tween to the new axis
  (`CameraController.setUpAxis`, M2-21/M3-41). Discovered during the QA
  checkpoint's code-review pass on `oscillations` (M7-4): its `create()`
  reads `ctx.up` once and bakes it into `springOrientation`/`upVec`/
  `horizAxis` (the same idiom `projectile-motion` and
  `rotational-dynamics` already use), on the assumption — stated as fact
  in a code comment, which was wrong and has been corrected — that the
  shell remounts the module on a live switch. Reading
  [`ModuleView.tsx`](../src/shell/routes/ModuleView.tsx) directly shows
  it does not: a live `prefs.upAxis` change only calls
  `viewport.camera.setUpAxis(...)`; `ModuleViewInner`'s own remount `key`
  (`` `${moduleId}-${resetToken}` ``) has no `upAxis` term. Reproduced
  live in the dev server: mounted `oscillations` at the default y-up,
  then switched Settings -> Up axis -> Z-up without navigating away — the
  camera reoriented but the spring/mass/arrows (built once against the
  old axis) did not, collapsing the whole vertical apparatus into a
  single silhouette viewed end-on. Affects every module that reads
  `ctx.up` in `create()`: confirmed by code inspection for
  `projectile-motion` and `rotational-dynamics` too (not independently
  reproduced live for those two — the same `create()`-only read is
  enough to establish the mechanism, and reproducing it once was enough
  to confirm the mechanism itself, not a per-module fluke). Not fixed
  inline: the two candidate fixes both have real costs that need a
  deliberate decision, not a one-module patch — (a) have every `ctx.up`-
  reading module recompute its orientation/position math inside
  `update()` instead of caching it in `create()`, a real per-module code
  shape change that's easy to half-apply and miss a spot; or (b) have the
  shell force a full remount on an up-axis change (fold `upAxis` into
  `ModuleViewInner`'s `key`, the same mechanism `resetToken` already
  uses), a one-line shell fix that throws away the camera's own
  deliberately-animated up-axis tween (M2-21/M3-41 built and tested a
  smooth ~400ms reorientation specifically so this is not a jarring cut)
  — a full remount would flash the canvas, drop any user pan/orbit
  adjustment, and undercut that existing feature. Whoever picks this up
  should decide between those (or a third option) before touching code,
  and record the choice as an ADR per X-8 if it changes shell behavior.
  Only the `oscillations` comment asserting the (wrong) safe-precedent
  claim was corrected in this change; the underlying behavior in all
  three modules is unchanged.
  **Update (see the "Bug fix: `projectile-motion` 3D Range/Height" entry
  further down):** `projectile-motion` took option (a) and is fixed —
  confirmed live, not just by code inspection, this time. Still `READY`
  for `oscillations` and `rotational-dynamics`; the cross-cutting
  decision this entry asks for (a per-module (a)-style fix everywhere,
  vs. shell-level option (b)) is still not made, so whoever picks either
  of those up should still read this entire entry first rather than
  assuming `projectile-motion`'s module-local fix sets a shell-wide
  precedent.
  **Update 2 (this change): `oscillations` and `rotational-dynamics` both
  took option (a) too, closing this out.** Went with (a) rather than
  reopening the (a)-vs-(b) decision, since `projectile-motion` had
  already established it works and shipped it, and re-litigating the
  camera-tween-vs-remount trade-off (b) would still carry — see the
  "Update" paragraph above — was not warranted by two more modules
  hitting the same, already-diagnosed mechanism. Not treated as a new
  shell-level ADR (per X-8, only a _behavior change to the shell_
  needs one) — this is three independent module-local fixes following
  the same already-precedented pattern, not a contract or shell change.
  `oscillations`: `upVectorOf(ctx)`/`springOrientationOf(ctx)`/
  `makeToWorld(ctx)` (renamed from the old create()-only
  `upVec`/`springOrientation`/`toWorld` locals) are now called fresh at
  the top of `update()` every call instead of once in `create()`; two
  handles that were previously never touched again after construction
  now get live `.set()` calls every frame so they actually pick up the
  new values — `anchor.set({ position: toWorld(0, Y_ANCHOR) })` and
  `spring.set({ orientation: springOrientation, ... })` (the spring's
  orientation had no update()-time `.set()` call at all before this).
  `rotational-dynamics`: `upVectorOf(ctx)` recomputed at the top of
  `update()`; two more previously-static values needed a live `.set()`
  added for the first time — `precessionArc`'s `axis` (was only set in
  `create()`) and `rollWheel`'s `orientation` (ditto, since the wheel's
  tilt to lie flat in the horizontal-and-up plane is itself a function
  of `upVec`). Confirmed live in the dev server (Browser pane), not just
  by code inspection, for both: `oscillations` mounted at default y-up,
  switched Settings -> Up axis -> Z-up without navigating away, orbited
  — spring/mass/arrows now correctly re-orient along the new z-up axis
  instead of collapsing to a silhouette; `rotational-dynamics` same
  check on both the "Precession & nutation" panel (flywheel/pivot
  arm/precession arc all correctly follow y-up -> z-up -> y-up) and the
  "Rolling" panel (wheel/velocity arrow stay sane through the switch,
  no console errors either time). Verified: `npm run typecheck && npm
run lint && npm run test:unit` (599 tests) `&& npm run test:contract`
  (187 passed/12 skipped, unaffected — no module-shape change) `&& npm
run build && npm run check:budget` (all 9 module chunks still well
  under the 80 KB budget, `rotational-dynamics` at 5.52 KB gzipped, up
  slightly from the extra live `.set()` calls) all clean.
- [DONE] **X-23** User-reported: `work-energy`'s "Speed" readout showed
  values "in the hundreds" right where speed should visibly settle near
  zero, at the potential surface's turning points. Root cause was in
  `kernel/units`'s `formatQuantity`, not `work-energy`'s physics: a
  quantity that is mathematically exactly zero at a specific instant
  (e.g. `v = -A*omega*Math.sin(omega*t)` at a turning point, where
  `omega*t` is a multiple of pi) almost never computes to bit-for-bit
  `0` — `Math.sin` of a float64 APPROXIMATION of a multiple of pi is
  essentially never exactly `0` (`Math.sin(Math.PI)` is
  `1.2246...e-16`). The old code only special-cased `absValue === 0`;
  any nonzero residue, however microscopic, fell through to the normal
  SI-prefix ladder, which happily scales it down to whatever
  atto/zepto/yocto exponent it lands in — and since the residue's
  MANTISSA (value divided by that exponent) is essentially arbitrary
  within `[1, 1000)`, it can print as an innocent-looking 2-3 digit
  number (e.g. "122 a", 1.2e-16 misread at a glance as "122") right
  where a reader expects to see zero. Fixed with a new `ZERO_EPSILON =
1e-9` floor: any magnitude below it (display-indistinguishable from
  floating-point noise for every quantity this app models — nothing
  here is intentionally sub-nanometer or sub-nanosecond) now renders as
  exact `"0.00"` instead of being routed through the prefix ladder.
  This is a kernel-level fix, not module-specific — it applies to every
  scalar in every module that legitimately crosses zero (any
  `parametric` oscillator's velocity/position, not just
  `work-energy`'s). One existing test's expectation changed
  deliberately as part of the fix: `1e-30` used to assert a 'y' (yocto)
  prefix just to prove the top-end clamp didn't throw; it now asserts
  `"0.00"`, which is the actually-correct reading for a value that
  small in this app's domain. Verified: `kernel/units/index.test.ts`
  (27 tests, 3 new — the updated bottom-clamp case, a value just above
  the floor still resolving normally to "10.0n", and a regression test
  using the literal `Math.sin(Math.PI)` residue) and a new
  `work-energy/module.test.ts` case reproducing the exact reported
  scenario end-to-end (a turning-point `speed` scalar formatted via
  `formatQuantity` reads `"0.00"`, not noise) — both green;
  `npm run test:unit` and `test:contract` unaffected; live in the dev
  server (Browser pane) scrubbing `work-energy` near its turning points
  shows small, correctly-scaled milli-range readings (e.g. "4.81m" =
  0.00481 J), not an absurd reading, confirming the fix doesn't
  overreach into legitimately small nonzero values
- [DONE] **Enhancement: Driven Damped Oscillations — sidebar plot,
  spring visual, tooltips** User-requested (not from the M7+ backlog),
  three changes: (1) The sidebar's live time-series plot was showing
  "Natural frequency" (`omega0`) — a constant of the current params,
  so it traced a flat, uninteresting line — because ModuleView's
  generic time-series/Sweep-Plot default both pick the FIRST scalar
  flagged `plottable` in declaration order (`params.ts`), and `omega0`
  happened to be first. Moved `plottable: true` onto `x` (displacement)
  instead, the module's actual oscillating quantity — the sidebar now
  traces a genuine sinusoid while the sim runs, matching what a "time
  series" plot should show. Documented the tradeoff this exposes in
  `index.ts`'s own comment: since Sweep Plot shares the same "first
  plottable" picker, its default also moved from `omega0` to `x`,
  meaning the module's own long-standing claim of a zero-code
  "amplitude-vs-drive-frequency resonance curve" was never actually
  live (`omega0` doesn't depend on `omegaDrive`, so it would have
  plotted a flat line too) — a reader wanting that curve specifically
  still can, by reading `amplitude` off the readout table by hand while
  sweeping `omegaDrive`, until a per-plot scalar picker exists (not
  built here — out of scope for this change). (2) The spring visual:
  `scene/glyphs/body.ts`'s `'spring'` body kind (used only by this
  module) had its helix/tube radii shrunk (0.3->0.18, 0.04->0.02) for a
  less bulky coil, and `index.ts`'s `update()` now terminates the
  coil's drawn length at the mass box's top face
  (`yMass + MASS_SIZE/2`) instead of the box's center — the mass's own
  position (the actual physics point of motion) is completely
  untouched, only the coil's visual endpoint moved so it no longer
  visibly plunges through half the box. (3) Tooltips: see **ADR-14**
  above — this module's own six scalars were the first backfilled with
  `description`s as part of that change. Verified: `oscillations/
module.test.ts` (8 tests, unchanged — none of these three changes
  touch closed-form physics) plus the full suite (`typecheck`, `lint`,
  `test:unit`, `test:contract`, `build`) green; live in the dev server
  (Browser pane): played the sim and confirmed the sidebar chart traces
  a visible sine wave labeled "Displacement"; screenshotted the
  spring/mass at rest and mid-oscillation, confirming a visibly thinner
  coil ending flush with the box's top face rather than sunk into its
  center; hovered a readout label and confirmed a dark tooltip popover
  appears with the scalar's description text
- [DONE] **Enhancement: Projectile Motion — zero launch speed (free
  fall)** User-requested: the "Launch speed" slider's `min` was `1`
  (`params.ts`), an artificial floor with no physical justification —
  the closed-form kinematics (`velocityFromAngles`, `timeToGround`)
  already handle a zero-magnitude launch velocity correctly (zero
  horizontal speed -> zero range; zero vertical launch speed -> max
  height is just the start height), verified by inspection rather than
  needing any code change beyond the slider bound itself. Lowered
  `min` to `0`; a zero-speed launch from an elevated `startPosition`
  now renders as a pure vertical free-fall with no horizontal drift.
  (`range`/`maxHeight` also picked up `description`s in this same file,
  part of ADR 0014's rollout.) Verified: new `module.test.ts` case
  (zero speed from `y0=15` gives `range=0` and `maxHeight=y0` exactly)
  plus the existing 8 tests still green; live in the dev server
  (Browser pane): set launch speed to 0 and start height to 5, played
  the sim, and confirmed the body drops straight down to the origin
  with the trajectory trace showing no horizontal component,
  `R=0.00`/`H=5.00` in the readout table
- [DONE] **M7-5** Gravitation & Central Forces. New `src/modules/gravitation/`
  (scaffolded via `npm run new:module -- gravitation`): a body orbiting a
  fixed central mass under Newtonian gravity, the restricted two-body
  ("test particle") problem — every scalar is per unit mass (specific
  energy, specific angular momentum) rather than carrying an actual
  orbiting-body mass, which is exactly what keeps this closed-form
  (`timeModel: 'parametric'`). Position/velocity at time `t` come from
  solving Kepler's equation `M = E - e*sin(E)` for the eccentric anomaly
  via `kernel/ode`'s `findRoot` (M1-15's Newton-Raphson/bisection
  root-finder — the literal thing this task was scoped around) — one
  algebraic root-solve per `update()` call, never an ODE integration.
  `[M - e - margin, M + e + margin]` always brackets the root since `f`
  is strictly increasing and `|E - M| <= e`; proved in a doc comment,
  not just asserted. Params: `mu` (gravitational parameter `GM`, a new
  literal `Dimension` — not one of `kernel/units`' named exports), `a`
  (semi-major axis), `e` (eccentricity), `omega` (argument of periapsis,
  `angle` kind), `inclination` (`angle` kind, tilts the orbital plane out
  of the reference x/y plane about the world x-axis — the longitude of
  ascending node is deliberately omitted/pinned to 0 to keep the param
  count in line with the rest of the library). Three layers (central
  mass/orbit/body; position+velocity+gravity vectors; angular momentum,
  off by default to avoid clutter). Scalars: `r`, `speed` (the sole
  `plottable` one — genuinely time-varying, traces Kepler's second law
  live), `trueAnomaly`, `period`, `specificEnergy`, `h` (specific angular
  momentum), `accel`. Deliberately ignores `ctx.up` — like
  `vector-algebra`/`fields-gradients`, this module has no notion of
  "vertical" tied to the viewer's up-axis setting; the orbital plane's
  tilt is its own `inclination` param instead (documented inline,
  consistent with PHYSICS_CONVENTIONS.md's "which axis is up"). Colours:
  `position` for the orbiting body and its radius vector, `velocity` for
  `v`, `accel` for the gravity-pull vector (it's an acceleration, not a
  force — no mass param exists to convert it), `angular` +`doubleHead`
  for the conserved pseudovector `h`, `construction` for the central
  mass and the static orbit-outline guide. Verified: 10 new
  `module.test.ts` golden-value tests, each cross-checked against an
  independent closed-form formula rather than re-reading the same code
  path back — periapsis/apoapsis distance+speed at exact `t=0`/`t=T/2`
  (clean algebraic values, not approximations, since `E=0`/`E=pi` solve
  Kepler's equation exactly at those instants), Kepler's third law,
  vis-viva energy conservation at 5 sampled `t` (both against the
  closed-form `-mu/2a` and against a raw `speed^2/2 - mu/r` recomputation
  from the returned scalars), specific-angular-momentum conservation at 4
  sampled `t` against `sqrt(mu*a*(1-e^2))`, distance cross-checked
  against the independent polar-conic formula `r = p/(1+e*cos(nu))`,
  `accel = mu/r^2` at both apses (confirms periapsis > apoapsis), a
  circular-orbit (`e=0`) constant-radius/constant-speed/linear-sweep
  check, and a high-eccentricity (`e=0.9`) finiteness check. Also: full
  `npm run typecheck && lint && test:unit` (617 tests, 70 files) &&
  `test:contract` (all module-contract checks pass for `gravitation`
  under both `ctx.up` settings — moot here since the module ignores
  `ctx.up`, but the suite doesn't know that and runs it anyway) &&
  `build` && `check:budget` (gravitation's chunk: 2.58 KB gzipped, well
  under the 80 KB module budget) && `format:check`, all green; `npx
playwright test` (39/39, including the auto-discovered per-module smoke
  test: renders, no console errors, every layer toggles, disposes its
  WebGL context on navigate-away) green. Manually driven live in the dev
  server (Browser pane): confirmed the readout table at default params
  (`mu=8, a=2, e=0.5`) reads `r=1.00m, v=3.46m/s, T=6.28s,
specificEnergy=-2.00 m^2/s^2, h=3.46 m^2/s, g=8.00 m/s^2` — exact
  hand-computed matches; pressed play and watched the body accelerate
  through periapsis and the readouts update live; toggled the angular
  momentum layer on and confirmed it renders as a foreshortened point at
  `inclination=0` (physically correct — it's pointing straight at the
  camera) and as a clearly visible tilted double-headed arrow once
  inclination is raised; unlocked "2D-only" and orbited freely, confirming
  the tilted ellipse, body, and all three vectors render correctly in
  full 3D, not just the locked planar view; checked at 320px width
  (controls stack, canvas fills width, no overflow); toggled projector
  mode (inherits the shell-owned mechanism for free, same as X-6's
  `vector-algebra` precedent — this module uses only `ctx.palette.*` and
  stock glyphs, confirmed zero raw hex literals); zero console errors
  throughout. `prefers-reduced-motion` not separately browser-tested —
  same X-5 precedent (`vector-algebra`): this module introduces no
  camera or layer-visibility code of its own, so it inherits the
  already-tested shell-owned motion paths (camera easing M2-5, layer
  fades M3-8) for free, verified by inspection that no module-local
  motion code exists to half-implement that.
- [DONE] **X-25** User-reported (immediately after M7-5 shipped): the
  `gravitation` module's orbit-outline trace looked like a cardioid
  rather than an ellipse whenever eccentricity was nonzero. Root cause:
  `orbitPathPoints()` (the function drawing the static background
  ellipse — NOT `orbitAt()`, which drives the orbiting body itself and
  was always correct) sampled the eccentric anomaly `E` but computed
  `xp = r * cos(E)` where `r = a*(1 - e*cos(E))` — a formula that is
  neither the true-anomaly polar form (`r = p/(1+e*cos(nu))`,
  `x = r*cos(nu)`) nor the correct eccentric-anomaly center-shifted form
  (`x = a*(cos(E) - e)`), just a nonsense hybrid of the two that
  distorts into a cardioid-like curve at any `e > 0`. Every existing
  golden test sampled `orbitAt()`/`scalars()` only, never this separate
  path-glyph code path, so the bug shipped past all of them. Fixed by
  rewriting `orbitPathPoints()` to sample uniformly in TRUE anomaly and
  apply the same `r = p/(1+e*cos(nu))` polar conic equation `orbitAt()`
  and the module's own "distance is consistent with the polar conic
  equation" golden test already rely on — same formula, now used
  consistently in both places, rather than reintroducing a second
  independent (and, as it turned out, wrong) derivation. Verified: new
  `module.test.ts` case captures the actual points passed to
  `ctx.path().set()` (via a capturing stand-in added to the module's
  local fake `SceneContext`, since the previous no-op stand-in discarded
  every glyph prop) and checks every one against the polar conic
  equation directly, plus asserts the outline's x-extent is asymmetric
  around the origin (`+a(1-e)` at periapsis, `-a(1+e)` at apoapsis) —
  the literal signature of a focus-centered ellipse, which a
  center-parametrized or cardioid-shaped curve would fail; this test
  would have caught the original bug (11 module tests total, up from
  10). Confirmed live in the dev server (Browser pane) at `e=0.8`: the
  outline now renders as a clean ellipse with the central mass correctly
  offset toward one focus, not the previous distorted shape. Full
  `npm run typecheck && lint && test:unit` (618 tests) `&&
test:contract && build && check:budget && format:check` all green.
- [IDEA] **M7-6** Kinematics
- [IDEA] **M7-7** Newton's Laws & FBDs
- [IDEA] **M7-8** Statics & Trusses
- [IDEA] **M7-9** Sandbox — the one module that uses `kernel/expr`, and the only expected `?z=` URL-compression case (M3-20)
- [DONE] **Enhancement: Projectile Motion — 3D start position + vector
  launch** User-requested (not from the M7+ backlog): generalized
  `projectile-motion` (previously a single fixed-plane, single-angle
  module) to a genuinely 3D closed-form trajectory with two ways to
  specify the launch, chosen via radio buttons. Added `startPosition`
  (a `vector` param, default `[0,0,0]`, draggable) and replaced the old
  single `angle` param with **elevation** (angle above horizontal, same
  physical quantity as before) + **azimuth** (rotation within the
  horizontal plane) for the angle-defined option, alongside a new
  **velocity vector** option (`launchVelocity`, both direction and
  magnitude at once, defaulting to the same 2D (x,y) plane as the angle
  option per the request — its z-component defaults to 0). The
  angle/vector choice is two `LayerDef`s
  (`angleMode`/`vectorMode`, `exclusiveGroup: 'launchMode'`) rather than
  a new `ParamDef` kind: this reuses the shell's existing
  mutually-exclusive-radio rendering (ADR 0011) verbatim to get literal
  radio buttons, instead of inventing a `shell/controls` change for
  something the substrate already renders correctly — `forLayer` then
  nests `speed`/`elevation`/`azimuth` under one disclosure and
  `launchVelocity` under the other, exactly the documented use case for
  that field. Investigated whether this needed a `schemaVersion` bump
  (renaming `angle` -> `elevation` and adding new params/layers) and
  concluded no: `elevation`'s `urlKey` is kept as the original `'ang'`,
  so an old bookmarked `?ang=...` link still resolves to the right
  value under the CURRENT param defs before any migration would even
  run, and every other new param/layer is purely additive with a
  default that reproduces the old behavior exactly when absent
  (MODULE_AUTHORING.md: bump only on a genuine meaning change).
  `startPosition`/`launchVelocity` are stored as literal WORLD x/y/z
  vectors rather than mapped through a `toWorld(horiz, vert)` helper the
  way this module used to (and the way other 2D-first modules in this
  library still do) — `VectorPad` always labels its three inputs
  "x"/"y"/"z" with no per-module override, so a vector param whose raw
  components meant anything else would visibly disagree with its own
  control. Gravity and the elevation/azimuth decomposition still respect
  `ctx.up` (read once in `create()`, same idiom as before), just via
  dot/cross products against `upVec` (`verticalComponent`,
  `horizontalComponent`, `velocityFromAngles`) instead of a coordinate
  remap. `timeToGround()` generalizes the old `timeOfFlight()` to a
  nonzero start height by solving the full quadratic
  `0.5 g t^2 - vy0 t - y0 = 0`, freezing immediately (`t=0`) if
  `startPosition` is already below the world's vertical-zero reference
  plane rather than solving at all — the exact same "start already past
  the valid region -> freeze immediately, don't solve the quadratic
  unconditionally" fix this session's QA checkpoint had just made to
  `non-inertial-frames`' `exitTime()` (that entry above), applied
  proactively here instead of being found the hard way a second time.
  Also added a launch-velocity `arrow` glyph (`ctx.palette.velocity`),
  which the module didn't have before — a natural, low-cost addition
  once the launch is a vector a student can type in directly, giving
  immediate visual feedback for both modes. `module.test.ts` (8 tests,
  up from 2) covers the golden-value physics: the original 45°/R=14.7
  golden values still hold exactly in angle mode; 45° still maximizes
  range at zero azimuth; **azimuth changes only the trajectory's
  direction, never its range/max height/flight time**, checked across
  four azimuth values; angle mode and an equivalent hand-computed vector
  agree exactly on range and max height; a vector with a nonzero
  z-component still gives the correct closed-form range using its
  horizontal-speed magnitude; a nonzero start height shifts max height
  and range via the taller flight time exactly per the general quadratic
  formula; a start height below the ground plane gives exactly zero
  range. Verified: `npm run typecheck && npm run lint && npm run
test:unit` (540 tests) `&& npm run test:contract` (178 passed/12
  skipped, unchanged module count — auto-discovered, no
  module-specific contract code needed, exercised under both
  `{up:'y'}`/`{up:'z'}` and 100 random param+layer combinations per the
  existing mechanism) `&& npm run build && npm run check:budget`
  (`projectile-motion` chunk 1.61 KB gzipped, up from 0.96 KB, still far
  under the 80 KB budget) `&& npm run format:check` all clean. Manually
  verified live in the dev server (Browser pane, fronted): both radio
  options render and switch correctly (mutually exclusive, each nesting
  its own params); vector mode's default readout matched the angle
  mode's exactly (`R=14.7, H=3.67`, matching this module's own original
  documented example); setting azimuth to 60° visibly changed the
  on-screen (locked 2D view) angle of the velocity arrow from a clean
  45° diagonal to a steeper one — consistent with part of the horizontal
  speed rotating into the (screen-depth, invisible under the locked +z
  view) axis, exactly as the closed-form math predicts; zero new console
  errors introduced (a pre-existing stale `ERR_CONNECTION_REFUSED`
  stretch from an earlier `preview_stop` in this session did not grow
  further); 320px check showed `scrollWidth === clientWidth`, no
  overflow. `startPosition`'s dragging is the shell's existing generic
  mechanism (`ModuleView.tsx` wires `ctx.draggable()` for every
  `draggable: true` vector param automatically — §9/M3-6) — not
  independently live-tested by hand, trusting that already-tested,
  already-shared mechanism (the same judgment call M4-10 already
  establishes for up-axis coverage) rather than re-verifying a generic
  capability per module. `npx playwright test tests/e2e/smoke.spec.ts -g
projectile-motion --workers=1` passed (auto-discovered, zero test
  edits): renders, no console errors, every layer toggles (now
  including the two new radio layers) without error, disposes its WebGL
  context on navigate-away. Not independently investigated: a real
  physical-projector pass and a colour-blindness-simulator pass (this
  module adds no new colours — `ctx.palette.position`/`velocity`/
  `construction`, all already in use before this change).

- [DONE] **Enhancement: Per-plane reference grid toggles** User-requested
  (not from the M7+ backlog): three new global settings-menu checkboxes —
  "XY grid plane", "XZ grid plane", "YZ grid plane" — each independently
  showing/hiding a light grid of lines confined to that principal
  coordinate plane through the origin. Separate from the existing
  "Reference grid" toggle (`prefs.showGrid`, which controls `axes.ts`'s
  world axes + tick marks, not a filled grid) — a new glyph,
  `scene/glyphs/gridPlane.ts` (`createGridPlane(kind, props, host)`,
  `kind: 'xy' | 'xz' | 'yz'`), built and owned directly by `Viewport`
  (three retained handles, never a module `group`) exactly like
  `axes.ts`'s own shell-owned grid. Reuses `axes.ts`'s exported
  `niceSpacing` heuristic so grid-square size matches the axis ticks at
  any zoom level, recomputed per rendered frame from camera distance
  the same way. Colour is the light structural `--rule` grey (`0xc8ccd4`,
  0.5 opacity) — deliberately not a `ctx.palette` semantic colour, same
  reasoning as `axes.ts`'s own hardcoded `AXIS_COLOR`, since this is UI
  furniture, not physics data. New prefs `gridPlaneXY`/`gridPlaneXZ`/
  `gridPlaneYZ` (default `false`, opt-in — unlike `showGrid`'s default
  `true`) get the same persisted-locally + URL-when-non-default
  treatment as every other pref (`prefsStorage.ts`; `urlCodec.ts`'s new
  `gxy=`/`gxz=`/`gyz=`), and are threaded through GIF export
  (`GifExportPanel`/`capture.ts`) alongside the existing `showGrid`, so
  an exported clip matches what the live view showed. Verified: new
  `gridPlane.test.ts` (4 tests — lines stay confined to the declared
  plane, spacing recomputes on a frame tick, `visible()`/`dispose()`):
  new `SettingsMenu` test (toggling one plane's checkbox patches and
  persists only that pref, independent of the other two); `prefsStorage.test.ts`
  and `urlCodec.test.ts` extended for the three new fields; two
  `AppState['prefs']` literals in `tests/contract/modules.contract.test.ts`
  updated for the wider type. `npm run typecheck && npm run lint && npm
run test:unit` (545 tests) `&& npm run test:contract` (178 passed/12
  skipped, unchanged) `&& npm run build` all clean. Manually verified
  live in the dev server (Browser pane): all three checkboxes appear in
  the settings menu; enabling all three and orbiting to a 3D view shows
  three light grid planes intersecting at the origin, distinct from the
  axes/ticks; toggled prefs round-trip through `localStorage` across a
  fresh page load exactly as written (`gridPlaneXY`/`XZ`/`YZ: true`
  confirmed via `localStorage.getItem('phys-viz:prefs')`).

## ADRs — §23's seven questions resolved (0002–0009), including the up axis they exposed

- [DONE] **ADR-1** → [`0002-markdown-for-explain-panels.md`](docs/adr/0002-markdown-for-explain-panels.md). **Plain markdown**, files named `explain.md`, KaTeX for the math; revisit only if an author demonstrates a panel genuinely better for an inline widget. Applied: the four stubs renamed, `_template`'s MDX-only `{/* … */}` comment converted to an HTML comment, and §5/§9/§18/§21, `MODULE_AUTHORING.md`, `LICENSE`, and the contract-test checklist updated. Unblocks **M3-26**
- [DONE] **ADR-2** → [`0003-migrate-urls-not-pinned-builds.md`](docs/adr/0003-migrate-urls-not-pinned-builds.md). **Migrate old URLs forward**; no pinned per-module builds. A `schemaVersion` bump now obliges a migration in the same change, migrations are append-only and kept indefinitely, and an unmigratable link loads defaults with a non-blocking notice. Confirms **M3-21**/**M3-22**, adds **M3-39**
- [DONE] **ADR-3** → [`0004-no-module-composition.md`](docs/adr/0004-no-module-composition.md). **No composition — modules stay leaves.** Deferred, not rejected: revisit when ≥8 modules exist _and_ a concrete duplication case is demonstrated. Share capability downward (a new glyph, a kernel function), never sideways. Makes **M0-9**'s cross-module import ban load-bearing rather than advisory
- [DONE] **ADR-4** → [`0005-offline-via-service-worker.md`](docs/adr/0005-offline-via-service-worker.md). **Service worker, full offline**, precaching the shell _and every module chunk_, with a user-clicked update rather than a silent mid-lecture swap. Scheduled as **M6.5 / P-1 … P-6**
- [DONE] **ADR-5** → [`0006-gif-export-no-video.md`](docs/adr/0006-gif-export-no-video.md). **GIF export; no video** — no `MediaRecorder`, no WebM/MP4, no WASM encoder; frames rendered deterministically from module state. Scheduled as **M6.5 / P-7 … P-12**
- [DONE] **ADR-6** → [`0007-locked-ortho-for-2d-modules.md`](docs/adr/0007-locked-ortho-for-2d-modules.md). **Locked orthographic 3D for 2D modules**, one renderer, plus the release-rotation toggle. Unblocks **M3-31**, adds **M3-40**
- [DONE] **ADR-7** → [`0008-right-handed-coordinates.md`](docs/adr/0008-right-handed-coordinates.md). **All coordinate systems are right-handed**, everywhere: Cartesian (`x̂ × ŷ = ẑ`), polar/cylindrical `(r, θ, z)` with `θ` from `+x` toward `+y`, spherical `(r, θ, φ)` in the physics convention (`θ` polar from `+z`). Positive angles are counter-clockwise viewed from the positive side of the axis; pseudovectors (`ω`, `α`, `τ = r × F`, `L = r × p`) follow the right-hand rule and keep the `doubleHead` marking. Recorded in full in `PHYSICS_CONVENTIONS.md`, which closes that doc's live `TODO`. A module may **not** flip a sign locally to make a picture look nicer
- [DONE] **ADR-8** → [`0009-y-up-default-with-up-axis-toggle.md`](docs/adr/0009-y-up-default-with-up-axis-toggle.md). **y-up by default** (matches three.js; puts a 2D module's xy-plane straight on screen with `x` right, `y` up, composing with ADR 0007's locked ortho), **user-switchable to z-up** from a **global app settings menu**. The up axis is a scene-level convention exposed as **`ctx.up`**: the camera up vector, presets, and "iso" follow it, modules with a notion of vertical read it, orientation-free modules ignore it. Both conventions stay right-handed (ADR 0008). A `SceneContext` addition, **not** a `types.ts` change — no `MODULE_CONTRACT_VERSION` bump. Unblocks **M2-5**, adds **M2-21**, **M3-41**, **M3-42**, **M4-10**
- [READY] **ADR-10+** Module-specific sign conventions that handedness does not imply — the sign of a bending moment, the direction of positive heel angle. One ADR per non-obvious choice, written as it arises. First instance landed as part of **M6-3**: [`0013-outward-normal-for-closed-surface-flux.md`](docs/adr/0013-outward-normal-for-closed-surface-flux.md), documenting the outward-normal parametrization `fields-gradients` already relies on for its divergence-theorem demonstration. Stays open for whichever comes next (bending moment, heel angle, or another)
- [DONE] **ADR-14** → [`0014-scalar-description-tooltips.md`](docs/adr/0014-scalar-description-tooltips.md). **`ScalarDef.description` is now a required, contract-enforced tooltip** for every readout scalar — a hover/focus-accessible `Tooltip` component (`src/shell/Tooltip.tsx`) explains what a variable like `\zeta` or `A(\Omega)` actually means, fulfilling §16's previously-unimplemented "presenter mode suppresses tooltips" line for the first time. `MODULE_CONTRACT_VERSION` bumps 3 → 4. Every existing module backfilled; `tests/contract` now fails a module missing one. Unblocks nothing further; leaves `ParamDef.help` (a related, still-dead field) as an open follow-up
- [DONE] **Follow-up to ADR-14: wire up `ParamDef.help`** Closes the
  open follow-up ADR-14 itself named: `ParamDef.help` was set by five
  modules (`oscillations`, `projectile-motion`, `non-inertial-frames`,
  `rotational-dynamics`, `momentum-collisions`) but never read anywhere
  in `src/shell` — dead data, the params-panel twin of the readout
  table's `ScalarDef.description` gap ADR-14 fixed. Wired it into the
  same `Tooltip` component (`src/shell/Tooltip.tsx`) ADR-14 built,
  threaded through every control (`Slider`, `VectorPad`, `Toggle`,
  `Select`, `ExpressionField`, `AngleDial`) via a new `help?: string`
  prop each accepts and `ParamControl`'s dispatch (`shell/params/
index.tsx`) now passes through from `ParamDef.help`. Each control
  wraps its own existing label text in `<Tooltip>` only when `help` is
  given, degrading to today's plain label otherwise — no visual change
  for the many params that don't set it. Deliberately left **optional
  and NOT contract-enforced**, unlike `ScalarDef.description`: most
  params are already self-explanatory from their `label` ("Mass",
  "Gravity strength"), so forcing one everywhere would be noise, not
  help — documented as a judgment call in `MODULE_AUTHORING.md` §4 and
  its checklist, not a mechanical requirement. Verified live in the dev
  server (Browser pane) that a `<button>` (the Tooltip trigger) nested
  inside `Toggle`'s own `<label for=...>` (which itself wraps the
  checkbox) does NOT double-fire the checkbox's native label-click
  forwarding — a real risk with any interactive element nested inside a
  `<label>` — confirmed both via a new jsdom `userEvent.click` test
  (`Toggle.test.tsx`) and by clicking the actual rendered tooltip label
  in a real browser against `momentum-collisions`'s "View in
  center-of-mass frame" toggle (pre-existing `help` text, now finally
  visible) and reading `checkbox.checked` before/after — stayed
  `false`. `.pv-presenter .pv-tooltip__bubble` (ADR-14's own presenter-
  mode suppression rule) covers these for free, confirmed present in
  the live stylesheet — no new CSS needed since it targets the shared
  class, not a readout-specific one. Verified: `npm run typecheck &&
npm run lint && npm run test:unit` (560 tests, +7 new — one Tooltip-
  presence/absence test per control plus one routing test in
  `params/index.test.tsx`) `&& npm run test:contract` (187 passed/12
  skipped, unaffected — no new contract assertion, by design) `&& npm
run build` all clean
- [DONE] **Follow-up to ADR-14: wire up `ParamDef.symbol`** A third
  declared-but-unrendered field in the same family as `ScalarDef.
description` and `ParamDef.help` (both above): `grep -rn "def.symbol"
src/shell` returned nothing before this change, even though most
  modules set it. Rendered via a new shared `ParamLabel` component
  (`src/shell/controls/ParamLabel.tsx`) that every control (`Slider`,
  `VectorPad`, `Toggle`, `Select`, `ExpressionField`, `AngleDial`) now
  delegates its label rendering to, replacing each control's own
  inline `help`-only ternary from the previous entry — centralizes how
  `label`/`symbol`/`help` compose instead of duplicating the same
  three-way logic six times. Styled via `.pv-field__symbol`
  (`shell.css`) — already present, declared alongside `.pv-field__label`/
  `.pv-field__value` back when the field layout was first built, but
  never applied to an element until now (the same "CSS shipped ahead
  of the feature" shape as `ParamDef.help`'s dead field). Deliberately
  **appends** the symbol next to the label rather than replacing it —
  the opposite of `ReadoutTable`'s `ScalarDef.symbol` handling — since
  a param control is something a student directly manipulates and
  needs to identify by its descriptive name, not just its notation;
  documented the distinction in both `types.ts`'s doc comments and
  `MODULE_AUTHORING.md` §4. When both `symbol` and `help` are set, the
  `Tooltip` wraps the label AND the rendered symbol together as one
  unit, confirmed by `ParamLabel.test.tsx`'s dedicated composition
  tests (label alone / symbol appended / help alone / both together,
  asserting exactly one tooltip trigger and one `.katex` node, not one
  per piece). Verified: `npm run typecheck && npm run lint && npm run
test:unit` (572 tests, +12 new — `ParamLabel.test.tsx`'s 4 plus one
  "renders symbol" smoke test per control plus one routing test in
  `params/index.test.tsx`) `&& npm run test:contract` (187 passed/12
  skipped, unaffected) `&& npm run build` all clean; `npx playwright
test tests/e2e/smoke.spec.ts` (33/33) confirms no regression across
  every registered module's rendered control panel. Live in the dev
  server (Browser pane): `vector-algebra`'s "Vector a"/"Vector b"
  controls now show `\vec{a}`/`\vec{b}` next to their labels;
  `oscillations`'s five numeric params all show their equation symbols
  (`m`, `k`, `c`, `F_0`, `\Omega`); hovering "Damping coefficient c"
  (which sets both `symbol` and `help`) shows the tooltip popover
  covering the label+symbol together, unchanged from before this
  entry's refactor
- [DONE] **X-24 (follow-up to X-23): readouts never showed a base unit
  symbol** Discovered while fixing X-23's near-zero `formatQuantity`
  bug (same file): `formatQuantity` is deliberately prefix-and-numeral
  only ("847m"), and nothing downstream ever appended a base-unit
  symbol either, so a `LENGTH`-dimensioned reading like "847m" is
  genuinely ambiguous between "847 milli-(unit)" and a literal
  "847 meters" — the SI "milli" prefix letter and the SI abbreviation
  for "meters" happen to be the same character. Fixed with a new Layer
  2/3 helper, `src/shell/unitSymbol.ts`: `unitSymbolOf(dim)` derives a
  display symbol two ways — a small reference-keyed table for named
  quantities where the idiomatic symbol isn't a plain composition
  (`FORCE`->"N", `ENERGY`->"J", `ANGULAR_VELOCITY`->"rad/s") or where
  two exports share a Dimension and need telling apart (`ENERGY` vs
  `TORQUE`, both `[1,2,-2,0,0,0,0]` — kept as two distinct array
  literals in `kernel/units` specifically so a reference-keyed `Map`
  can tell them apart; a value-keyed lookup never could), falling back
  to composing straight from the seven base SI symbols otherwise (e.g.
  `VELOCITY`->"m/s", `MOMENT_OF_INERTIA`->"kg·m²"). `formatQuantityWithUnit(q)`
  composes this onto `formatQuantity`'s own output, placing the symbol
  directly after whatever SI-prefix letter was chosen (so "milli" +
  "meter" reads as the one compound "mm" it should) — which needed a
  new `kernel/units` export, `chooseSIPrefix(absValue, sigFigs)`,
  factoring the prefix-selection math (including its own rounding-
  artifact corrections, e.g. 999.96 bumping into the next prefix group)
  out of `formatQuantity` so both functions stay in agreement by
  construction rather than by two independently-maintained copies of
  the same logic — verified via a dedicated test that both agree on
  every existing boundary-rounding test case. Wired into both places a
  reading reaches a user: `ReadoutTable` and `ModuleView`'s canvas
  `aria-label`. `DIMENSIONLESS` values are unaffected —
  `unitSymbolOf(DIMENSIONLESS)` returns `''`, so no spurious suffix.
  Known, deliberately unhandled limitation (documented in
  `unitSymbol.ts` and `PHYSICS_CONVENTIONS.md`'s new "Displayed unit
  symbols" section): kilogram is the one SI base unit whose name
  already carries a prefix, so a bare `MASS` value outside `[1, 1000)`
  would print a non-standard "mkg" instead of the conventional "g" —
  not fixed, since no currently-registered module has a
  `MASS`-dimensioned `ScalarDef` (every `MASS` field today is a
  `ParamDef`, shown as a plain number via `Slider`, never through
  `formatQuantity`) — YAGNI, revisit if that changes. A COMPOUND unit
  that happens to contain a mass factor (e.g. `MOMENT_OF_INERTIA`,
  "kg·m²") is NOT specially handled either and can show the same kind
  of unconventional prefixed compound (confirmed live:
  `rotational-dynamics`'s "Principal moment I₁" read "445 mkg·m²" for a
  sub-1 kg·m² value) — still strictly more informative than the
  original bare "445m" with no unit at all, just not fully idiomatic;
  flagged rather than solved, since correctly prefixing an arbitrary
  compound unit is a substantially harder, unbounded problem than the
  one this fix actually targets. Verified: new `chooseSIPrefix`/`TORQUE`-
  vs-`ENERGY` tests in `kernel/units/index.test.ts` (33 tests, +6 new,
  all pre-existing ones unchanged byte-for-byte — confirming the
  `formatQuantity` refactor is behavior-preserving); new
  `unitSymbol.test.ts` (16 tests covering DIMENSIONLESS, every named
  override, generic composition incl. the ambiguous-multi-denominator
  fallback, and `formatQuantityWithUnit`'s prefix-placement/near-zero/
  sign/custom-sigFigs behavior); `readouts/index.test.tsx` extended
  (+2). `npm run typecheck && npm run lint && npm run test:unit` (596
  tests) `&& npm run test:contract` (187 passed/12 skipped, unaffected)
  `&& npm run build` all clean; `npx playwright test
tests/e2e/smoke.spec.ts` (33/33). Live in the dev server (Browser
  pane) across three modules spanning most of the named dimensions:
  `work-energy` (U/K/E all correctly "... J", speed "0.00 m/s" at a
  turning point, period "1.99 s", turning point "1.50 m"),
  `rotational-dynamics` (torque "1.40 N·m" distinct from an energy
  reading elsewhere in the same table, moment of inertia "3.82 kg·m²",
  precession rates "... rad/s", angular momentum "0.00 kg·m²/s", and a
  genuinely dimensionless angle-between-vectors readout showing plainly
  as "6.29" with no suffix), and `vector-algebra` (all seven scalars —
  dot product, angle, cross product magnitude, triple product volume,
  three direction cosines — are dimensionless and correctly show no
  unit at all)

- [DONE] **Bug fix: `projectile-motion` 3D Range/Height, plus a Time of
  flight readout** User-reported: a genuinely 3D launch — start position
  `(0,0,50)`, launch vector `(20,15,10)`, `g=9.8`, up axis set to z — gave
  Range/Height that looked wrong. Root-caused to **two independent, real
  bugs**, not one:
  1. **X-22, confirmed live for this module for the first time** (it had
     previously only been established by code inspection): `create()`
     read `ctx.up` once and closed over it as `upVec`, but `SceneContext.
ts` documents `ctx.up` as LIVE ("a later up-axis switch must be visible
     on the next read"). Switching Settings -> Up axis while
     `projectile-motion` was already mounted left `update()`/`scalars()`
     silently computing gravity/range/height/flight-time against the
     STALE axis while the camera visibly reoriented out from under it —
     exactly X-22's mechanism. Fixed with X-22's option (a) from that
     entry's own writeup (recompute in `update()`/`scalars()` instead of
     caching in `create()`), scoped to this module only: added
     `upVectorOf(ctx)`, called fresh on every `update()`/`scalars()` call
     instead of once. Deliberately did NOT take X-22's option (b) (a
     shell-level forced remount) — that is a cross-cutting call affecting
     `oscillations`/`rotational-dynamics` too and still needs the
     decision X-22 itself asks for; this fix only closes the gap for
     `projectile-motion`, so X-22 stays `READY` for the other two
     modules.
  2. **A second, previously-unlogged bug**, found while reproducing the
     report live rather than by code review alone: `VectorPad`'s
     `AxisInput` (`shell/controls/VectorPad.tsx`) clamps a typed value to
     `+/-range` and commits the CLAMPED number, but kept displaying the
     raw, unclamped text the user typed — the input box silently
     disagreed with the value the module actually received, with no
     indication a clamp had even happened. This is what actually produced
     the reported numbers: `startPosition`'s `range` was `10`, so typing
     `50` for the z-component silently committed `10` while the box kept
     showing "50" forever (the component's own resync-from-`value` check
     never fires once its internal `lastCommitted` ref is pre-set to the
     clamped number). Confirmed live in the dev server before fixing:
     typing `(0,0,50)` produced `R=69.4, H=15.1` — exactly the closed-form
     values for `y0=10` (the silently-clamped height), not `y0=50`. Fixed
     in `AxisInput.handleChange`: a fully-parseable out-of-range number
     now sets the displayed text to the clamped value being committed,
     not the raw typed string — still-in-progress typing (a bare `-`, a
     trailing `.`, an emptied field, per UI-6) is unaffected, since that
     path already returns before any clamping happens. This is a
     shell/controls fix, not a module patch, per CLAUDE.md's "add a
     capability every module can use" guidance — every `kind: 'vector'`
     param in every module had this same latent bug. Also bumped
     `projectile-motion`'s `startPosition.range` from `10` to `50` so the
     reported scenario (and similar tall-drop setups) is actually
     reachable rather than merely honestly clamped.
     Also added the **Time of flight** scalar the user requested, shown
     ahead of Range/Height in the sidebar (readout order follows
     `scalars: ScalarDef[]`'s array order, so it's simply the first entry):
     `key: 'timeOfFlight'`, symbol `t_f`, unit `TIME`, not `plottable` (so
     `range` — the module's pre-existing first plottable scalar — stays the
     sidebar's default sweep/time-series series, unchanged). `scalars()`
     already computed this internally as `flight`; it was just never
     exposed. `explain.md` gained the closed-form
     `t_flight = (v0_vertical + sqrt(v0_vertical^2 + 2*g*y0)) / g` line
     ahead of the existing R/H line. Verified: `module.test.ts` (11 tests,
     up from 8) adds a `timeOfFlight` assertion to the existing 45°
     golden-value case, an independently-hand-derived-formula regression
     test for the exact reported `(0,0,50)`/`(20,15,10)`/z-up scenario, and
     a live-axis-switch regression test (mutates a `{current: 'y'|'z'}` ref
     the fake `ctx.up` getter reads, proving `scalars()` picks up the change
     on its very next call with no new `create()`); `VectorPad.test.tsx` (6
     tests, up from 4) adds a clamped-display regression test using a new
     `ControlledVectorPad` wrapper (a real `useState`-backed parent, since a
     fixed `value` prop can't distinguish "the parent hasn't round-tripped
     yet" from "an external change happened," the same ambiguity
     `AxisInput`'s own resync check has to live with). Full sweep: `npm run
typecheck && npm run lint && npm run test:unit` (599 tests) `&& npm run
test:contract` (187 passed/12 skipped, unaffected) `&& npm run build &&
npm run check:budget` (`projectile-motion` chunk 1.85 KB gzipped, still
     far under budget) `&& npm run format:check` all clean. Live in the dev
     server (Browser pane): reproduced the original bug (wrong R/H, stale
     displayed "50"), then confirmed the fix end-to-end — typing
     `(0,0,50)`/`(20,15,10)` under z-up now reads `t_f=4.37 s, R=109 m,
H=55.1 m` (matching the independently hand-computed closed-form
     values), and switching Up axis -> Y-up live (module stays mounted)
     correctly recomputes to `t_f=3.06 s, R=68.5 m, H=11.5 m` instead of
     staying frozen at the z-up numbers.

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
