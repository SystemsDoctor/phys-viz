# PhysViz — Architecture & Build Plan

**Status:** Draft v1.0 — handoff specification
**Audience:** The coding agent or developer bootstrapping this repository, and future module authors.
**Deliverable:** A static, client-only site hosted on GitHub Pages providing a library of interactive, rotatable, toggleable physics visualizations for undergraduate mechanics and engineering courses.

---

## How to use this document

Sections 1–5 are **doctrine**: read them first, they constrain everything else. Sections 6–9 are the **layer specifications**. Section 10 is the **module contract**, which is the single most important interface in the project — it is what makes new visualizations cheap to add. Sections 11–19 are implementation detail. Section 20 is the **milestone plan with acceptance criteria**; work through it in order. Section 21 is the **module authoring cookbook** — copy that pattern.

If any later section contradicts Section 2, Section 2 wins.

---

## 1. What this is

A gallery of self-contained, interactive visualizations of physics and engineering concepts. An instructor picks a module (e.g. _Vector Algebra_), sees a 3D scene they can orbit and zoom, adjusts parameters with sliders, and toggles individual visual elements on and off (the cross-product parallelogram, the projection shadow, the component decomposition). The resulting configuration is encoded in the URL, so a demo can be prepared in advance, bookmarked, projected in a lecture hall, and handed to students as a link.

**Primary users, in priority order:**

1. **Instructor at the front of a room.** Needs: legible on a projector, fast to reach the right state, no fiddling mid-lecture, keyboard-driven, recoverable if something is knocked out of place.
2. **Student on a laptop or phone, unsupervised.** Needs: discoverable controls, sensible defaults, an explanation of what they're looking at, no way to get permanently stuck.
3. **Module author** — the instructor, a colleague, or a capable undergraduate adding a new visualization. Needs: to ship a working module in an afternoon without reading the whole codebase.

User 3 is the reason this document exists. A visualization library that only its original author can extend has a shelf life of one person's enthusiasm.

---

## 2. The Visualizer Doctrine (non-goals)

**This is a visualizer, not a simulation engine.** This is the load-bearing constraint of the project and it must be defended in code review.

### What that means concretely

- **Prefer closed form over integration.** If the state of a system at time `t` can be written down — projectile motion, SHM, uniform circular motion, a Kepler orbit via Kepler's equation, a rotating rigid body about a principal axis — write it down. Do not integrate what you can evaluate.
- **Numerical integration is a fallback, not a default.** It is permitted for the small set of modules that genuinely need it (coupled oscillators, chaotic pendulum, non-principal-axis rigid body tumbling, orbits under perturbation). Those modules declare themselves `stepped` and accept the constraints in §12.
- **No collision detection, no contact resolution, no constraint solver of general form, no rigid-body physics engine.** If a module needs objects to bounce off each other, the module supplies the closed-form outcome (elastic collision formulae), not a solver.
- **No meshes with more than a few thousand triangles.** No imported CAD. No physically-based rendering. Geometry is schematic: arrows, rods, discs, boxes, parametric surfaces, translucent patches.
- **No backend, no database, no accounts, no analytics.** GitHub Pages serves static files. All state lives in the URL or in memory.
- **No general-purpose scripting by end users.** A constrained expression parser for `F(x, v, t)` in the sandbox module is the ceiling. We are not building a CAS.

### Why this matters

Every one of these is a place where a well-meaning contributor will otherwise spend three months and produce something slow, fragile, and pedagogically worse. A visualization that runs at 60 fps, scrubs backwards instantly, and always looks the same on the projector is more useful in a classroom than an accurate simulation that stutters. Fidelity is not the goal; **legibility** is.

### The one exception worth stating explicitly

We _do_ care about numerical honesty where it is itself the lesson. A module may deliberately show energy drift from a bad integrator, because "your simulation is a model, not an oracle" is worth teaching. That is a _feature_, presented as such, not an accident.

---

## 3. Engineering principles

1. **Layers are one-directional.** Kernel knows nothing of rendering. Scene knows nothing of React. Modules know nothing of three.js. Enforced by lint rule (§6), not by good intentions.
2. **Modules are declarative about _what_, imperative about _how_.** A module declares its parameters and its visual layers as data; the shell builds all the UI from that declaration. The module then imperatively builds and mutates scene objects. This split is what removes UI work from module authoring.
3. **Retain and mutate; never rebuild per frame.** Scene handles are created once in `create()` and updated in place. Allocating geometry in an animation loop is the fastest way to a stuttering lecture.
4. **Idempotent update.** `update(state)` must produce the same scene for the same state regardless of history. This is what makes URL restore, undo, and scrubbing work without special cases.
5. **Fail visible, not silent.** A module that throws renders an in-panel error card naming the module and the failing parameter. It does not white-screen the site or take down the gallery.
6. **The contract test is the architecture.** Every registered module is automatically run through a conformance suite (§18). If the contract is testable, it stays real.
7. **Colour is data.** Vector colours are semantic and colourblind-safe (§15). Red never means "velocity" in one module and "force" in another.

---

## 4. Technology stack

| Concern          | Choice                                                                       | Rationale                                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language         | **TypeScript**, `strict: true`                                               | Module contract is only enforceable with types. Non-negotiable.                                                                                       |
| Build            | **Vite**                                                                     | Fast, first-class static output, `import.meta.glob` powers zero-edit module registration (§11).                                                       |
| 3D               | **three.js** (r160+)                                                         | Mature, well-documented, huge community, works everywhere. Confined entirely to Layer 1.                                                              |
| UI               | **React 18** + **Zustand**                                                   | React for the shell chrome; Zustand for module state because it is small, unopinionated, and gives cheap non-React subscriptions for the render loop. |
| Camera controls  | `three/examples/jsm/controls/OrbitControls`                                  | Wrapped, never used directly by modules.                                                                                                              |
| Math typesetting | **KaTeX**                                                                    | Synchronous, fast, renders to DOM — good for billboard labels and inline UI. MathJax is slower and async.                                             |
| 2D plots         | **uPlot**                                                                    | ~45 KB, extremely fast for time series, which is 90% of our plotting. Do not reach for D3 or Chart.js.                                                |
| Styling          | **CSS custom properties + CSS Modules**                                      | No Tailwind. Design tokens (§15) must be readable and overridable in one file for projector/print variants.                                           |
| Routing          | **Hash routing** (hand-rolled or `wouter`)                                   | GitHub Pages has no server rewrite. Hash routing avoids the `404.html` SPA hack entirely.                                                             |
| Testing          | **Vitest** (unit + contract), **Playwright** (smoke)                         |                                                                                                                                                       |
| Lint/format      | **ESLint** (with `no-restricted-imports` boundaries) + **Prettier**          |                                                                                                                                                       |
| CI/CD            | **GitHub Actions** → `actions/deploy-pages`                                  |                                                                                                                                                       |
| Explain panels   | **Plain markdown**, rendered client-side (ADR 0002)                          | Not MDX. Prose plus KaTeX needs no JSX pipeline, and a panel cannot then smuggle UI past §6.                                                          |
| Offline          | **Service worker**, precaching the shell _and every module chunk_ (ADR 0005) | The lecture hall with dead wifi is the failure that matters most (§1).                                                                                |
| GIF export       | Small self-hosted pure-JS encoder, loaded on demand (ADR 0006)               | No video: `MediaRecorder` output varies by browser and a WASM encoder blows the §17 bundle budget.                                                    |

### Explicitly rejected

- **react-three-fiber** — tempting, but it puts three.js semantics into React's reconciler and would leak rendering concerns into module code. We want modules to be plain functions with handles, not JSX trees. Reconsider only if module authoring proves painful.
- **A physics engine** (cannon-es, rapier, matter.js) — see §2.
- **Tailwind** — the design system here is small and token-driven; utility classes obscure the token layer.
- **Next.js / SSR** — no server, no benefit.
- **Video export** (`MediaRecorder`, WASM encoders) — GIF covers the actual use, which is a short silent loop in a slide. See ADR 0006.

---

## 5. Repository layout

```
phys-viz/
├── .github/
│   └── workflows/
│       ├── deploy.yml            # build + deploy to Pages on push to main
│       └── ci.yml                # lint, typecheck, test on PR
├── public/
│   ├── .nojekyll                 # REQUIRED: stops Pages ignoring _-prefixed assets
│   └── fonts/                    # self-hosted; no CDN dependency in a lecture hall
├── src/
│   ├── kernel/                   # LAYER 0 — pure. No DOM, no three, no React.
│   │   ├── math/                 # vec2, vec3, mat3, mat4, quat, scratch pools, symmetric eigendecomposition
│   │   ├── frames/               # coordinate systems, frame transforms, rotating frames
│   │   ├── calculus/             # grad, div, curl, jacobian, quadrature
│   │   ├── geometry/             # polygon area/centroid, half-plane clip, convex hull
│   │   ├── ode/                  # rk4, velocityVerlet, rkf45, event detection, general root-finder
│   │   ├── units/                # dimensional quantities, formatting
│   │   ├── expr/                 # constrained expression parser + evaluator
│   │   ├── random/               # seeded PRNG (M1-20 — added at M1, not in the original list)
│   │   ├── inertia/              # inertia tensors for the schematic body set + parallel-axis theorem (M1-21 — added at M1, not in the original list)
│   │   └── index.ts
│   ├── scene/                    # LAYER 1 — the ONLY place `three` is imported.
│   │   ├── SceneContext.ts       # the object handed to every module
│   │   ├── Viewport.ts           # renderer, canvas, resize, render loop
│   │   ├── camera/               # OrbitControls wrapper, presets, ortho/persp
│   │   ├── glyphs/               # arrow, path, point, patch, arc, surface, field, body
│   │   ├── annotate/             # KaTeX billboards, dimension lines, graticule
│   │   ├── theme/                # palette → three materials
│   │   └── index.ts
│   ├── shell/                    # LAYER 2 — app chrome, React lives here.
│   │   ├── App.tsx
│   │   ├── routes/               # gallery, module view, about
│   │   ├── params/               # ParamDef → auto-generated control components
│   │   ├── controls/             # slider, vector pad, toggle, select, expression field
│   │   ├── layers/               # layer visibility manager UI
│   │   ├── timeline/             # play/pause/scrub/speed/reverse
│   │   ├── plots/                # uPlot wrapper: time series + sweep plots
│   │   ├── readouts/             # live numeric value table
│   │   ├── state/                # zustand store, URL codec, schema migration
│   │   ├── presenter/            # presenter mode, keyboard map, fullscreen
│   │   ├── errors/               # ModuleErrorBoundary
│   │   ├── serviceWorker/        # SW registration + update-available notice (M6.5, ADR 0005)
│   │   └── export/gif/           # on-demand GIF encoder + capture (M6.5, ADR 0006)
│   ├── sw.ts                     # the service worker itself (M6.5) — a "fifth layer": no DOM,
│   │                             #   no React, no three; see tsconfig.sw.json and the
│   │                             #   .eslintrc.cjs `src/sw.ts` override
│   ├── modules/                  # LAYER 3 — one folder per visualization.
│   │   ├── types.ts              # THE MODULE CONTRACT
│   │   ├── registry.ts           # glob-based auto-registration
│   │   ├── testing/              # MockSceneContext for headless module tests
│   │   ├── _template/            # copy this to start a new module
│   │   ├── vector-algebra/
│   │   │   ├── manifest.ts       # eagerly loaded (gallery listing)
│   │   │   ├── index.ts          # lazily loaded (implementation)
│   │   │   ├── params.ts
│   │   │   ├── explain.md        # the "what am I looking at" panel
│   │   │   └── module.test.ts
│   │   ├── rotational-dynamics/
│   │   └── fields-gradients/
│   ├── design/
│   │   └── tokens.css            # single source of truth for colour + type
│   └── main.tsx
├── tests/
│   ├── contract/                 # runs against EVERY registered module
│   └── e2e/                      # Playwright smoke
├── docs/
│   ├── ARCHITECTURE.md           # this file
│   ├── MODULE_AUTHORING.md       # the cookbook, §21 expanded
│   ├── PHYSICS_CONVENTIONS.md    # sign conventions, colour semantics, notation
│   └── adr/                      # architecture decision records, 0001-*.md
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.sw.json           # separate program for src/sw.ts (M6.5) — see that file's own comment
├── .eslintrc.cjs
└── package.json
```

---

## 6. Enforced boundaries

The layering is only real if it is mechanically checked. Add to `.eslintrc.cjs`:

```js
rules: {
  'no-restricted-imports': ['error', {
    patterns: [
      // Kernel is pure.
      { group: ['three', 'react', 'react-dom', '@/scene/*', '@/shell/*', '@/modules/*'],
        message: 'kernel/ must stay pure: no rendering, no UI, no module imports.',
        // scoped to src/kernel/** via an overrides block
      },
    ],
  }],
}
```

Use `overrides` blocks to apply per-directory:

| Directory        | May import                                                      | May **not** import                            |
| ---------------- | --------------------------------------------------------------- | --------------------------------------------- |
| `src/kernel/**`  | nothing internal                                                | `three`, `react`, `scene`, `shell`, `modules` |
| `src/scene/**`   | `kernel`, `three`                                               | `react`, `shell`, `modules`                   |
| `src/shell/**`   | `kernel`, `scene`, `modules/types`, `modules/registry`, `react` | concrete module implementations               |
| `src/modules/**` | `kernel`, `modules/types`                                       | **`three`**, `react`, `shell`, other modules  |

**The rule that matters most:** modules cannot import `three`. If a module author needs a visual primitive that does not exist, the correct response is to add a glyph to Layer 1 — where every future module gets it for free — not to reach around the abstraction. This single rule is why module #30 will be as cheap to write as module #4.

---

## 7. Layer 0 — Kernel

Pure computation. Fully unit-testable with no browser. Target ≥90% line coverage.

### `kernel/math`

- `Vec2`, `Vec3`, `Mat3`, `Mat4`, `Quat` as plain typed structures with free functions (`add`, `cross`, `normalize`, …). Provide both allocating and in-place (`addInto(out, a, b)`) variants.
- **Scratch pool**: a pre-allocated ring of temporary vectors (`tmp.v3()`) so hot paths allocate nothing. Document it loudly; garbage collection pauses are visible as stutter on a projector.
- Quaternions for all orientation. Never store orientation as Euler angles — the rigid-body and gyroscope modules will gimbal-lock.
- Symmetric 3×3 eigendecomposition (`eigenSymmetric3`, added at M1 — see M1-22): a `Mat3` operation, so it lives here rather than a dedicated folder. Needed for the inertia ellipsoid and principal axes in M5, and later Mohr's circle.

### `kernel/frames`

- Cartesian ↔ cylindrical ↔ spherical conversion, with Jacobians.
- `Frame` type: origin + orientation + optional angular velocity ω and its derivative.
- `transformPoint`, `transformVector`, and critically `transformVelocity` / `transformAcceleration` between frames, exposing the ω × r, 2ω × v (Coriolis) and ω × (ω × r) (centrifugal) terms **as separately retrievable components**, not just as a sum. The non-inertial-frames module needs to draw each term as its own arrow.

### `kernel/calculus`

- `grad(f, p, h)`, `div(F, p, h)`, `curl(F, p, h)` — central differences, with an adaptive `h`.
- `lineIntegral(F, path, n)`, `surfaceFlux(F, surf, nu, nv)`, `volumeIntegral(f, region, n)` — Gauss–Legendre quadrature, not naive Riemann sums.
- Every integral returns both the value **and** the per-sample contributions, so the visualizer can shade the accumulating ribbon rather than just report a number.

### `kernel/geometry`

- Polygon area and centroid (signed, shoelace).
- **Sutherland–Hodgman clip of a polygon by a half-plane.** Add this early even though nothing in the first three modules needs it: it is the foundation of any submerged-area / cross-section / cutaway work (ship stability, buoyancy, beam sections). Cheap now, unblocking later.
- Convex hull (2D), point-in-polygon, ray–plane and ray–sphere intersection for picking.

### `kernel/ode`

- `rk4`, `velocityVerlet` (symplectic — the default for anything conservative), `rkf45` (adaptive).
- Event detection: root-find a scalar event function between steps (bisection is fine) for turning points, zero-crossings, and "hits the ground".
- All integrators are pure `(state, dt) => state` and allocate nothing.
- `findRoot` (added at M1 — see M1-15; not in this file's original list): a general scalar root-finder, Newton-Raphson with a bisection fallback. §12 assumes one exists ("a Kepler orbit via Newton-Raphson on Kepler's equation").

### `kernel/units`

- `Quantity { value: number; dim: Dimension }` where `Dimension` is an exponent tuple over `[M, L, T, Θ, I, N, J]`.
- Arithmetic that checks dimensions and throws on mismatch.
- Formatting with SI prefixes and significant-figure control.
- **Rationale:** this catches a live-demo error class that is otherwise invisible, and dimensional consistency is itself a thing we teach. It also makes readouts and axis labels correct for free.

### `kernel/expr`

- A small recursive-descent parser over a whitelisted grammar: numbers, named variables, `+ - * / ^`, parentheses, and a fixed function set (`sin cos tan asin acos atan atan2 exp ln sqrt abs sign min max floor`).
- Compiles to a closure. **No `eval`, no `new Function`.** This is user-facing input on a public site.
- Returns typed errors with character offsets so the input field can underline the problem.

### `kernel/random`

Added at M1 (see M1-20); not in this file's original list. §12's determinism requirement permits module randomness only via "a seeded PRNG from the kernel, seeded from a serialized param" — a bookmarked demo must render identically every time. A small, fast, deterministic, non-cryptographic generator (mulberry32) plus `nextInt`/`nextRange` helpers. Contract assertion 9's quasi-random parameter sampling also needs it.

### `kernel/inertia`

Added at M1 (see M1-21); not in this file's original list. Inertia tensors for the schematic body set (box, sphere, cylinder, disc, rod — the same shapes `body` in §8 draws), about each body's own center of mass in its own principal-axis frame, plus the parallel-axis theorem to translate a tensor to an offset point. §18's golden-value list names "the inertia tensor of a uniform cuboid"; M5's rotational-dynamics module needs the rest.

---

## 8. Layer 1 — Scene substrate

The only place `three` appears. Everything here exists to be used by many modules.

### `Viewport`

Owns the canvas, `WebGLRenderer`, resize observer, and the single `requestAnimationFrame` loop. Exactly one render loop for the whole app. Supports `renderOnDemand` mode: when time is paused and no parameter is changing, stop rendering entirely (battery, and it keeps fans quiet in a quiet lecture hall).

Also owns the **reference grid** (ADR 0011): a single axes/graticule glyph built via the same `createAxes` factory `ctx.axes()` exposes, attached to the scene root independent of any module group, toggled globally by `Viewport.setGridVisible(visible)` from the settings menu's `prefs.showGrid` (§9). A module does **not** need to build its own grid for this — `ctx.axes()` remains available, but only for a module-specific extent/behavior that genuinely differs from the global default.

### `camera/`

- Orbit / pan / zoom, wrapping `OrbitControls`.
- **Orthographic ↔ perspective toggle.** Orthographic must be the default for any module about components, projections, or angles — reading a vector's components off a perspective projection is misleading, and this is a pedagogical requirement, not a preference.
- Preset views: `+X`, `+Y`, `+Z`, isometric, and "fit to content", each animated over ~400 ms with an ease so students keep their spatial bearings. Instant camera cuts are disorienting.
- Camera state is part of serialized state (§14) so a bookmarked demo restores the viewing angle.
- **`y` is up by default** (ADR 0009), matching three.js and putting a 2D module's xy-plane straight on screen with `x` right and `y` up. The up axis is user-switchable to `z` from the global settings menu (§9); the camera up vector, the presets, and the "iso" orientation all follow it, and switching reorients through the same ~400 ms eased transition rather than cutting. Both conventions are right-handed (ADR 0008). Modules with a notion of _vertical_ read `ctx.up` rather than hardcoding an axis.
- **Every module gets this same orthographic camera, locked to its own default view, by default** — there is no second 2D renderer (ADR 0007), and this is no longer scoped to `dimensions: 2` modules only (ADR 0012 broadened it after `dimensions: 3` modules turned out to need the same locked, undistorted framing by default too). Pan and zoom stay available; only orbit is suppressed, and projection is forced orthographic regardless of the module's own declared default. A global **"Free rotation"** toggle in the settings menu (§9, ADR 0011/0012) — not a per-module button — unlocks orbit AND restores the module's own declared projection (e.g. perspective, if it asked for one), for any module, so a student can tip the scene and see the diagram as a slice of a 3D situation; re-locking returns to the module's own default view and forces orthographic again via the same eased tween.

### `glyphs/`

Each glyph is a factory returning a **handle** with `set(props)`, `visible(bool)`, and `dispose()`. Handles are retained; `set` mutates buffers in place.

| Glyph         | Purpose                    | Notes                                                                                                                                                                           |
| ------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `arrow`       | vectors                    | Cone head sized in _screen_ space, not world space, so short vectors still read as arrows. Optional double head for pseudovectors (ω, τ, L) — a convention we teach explicitly. |
| `curvedArrow` | rotation sense, torque     | Arc with a tangential head.                                                                                                                                                     |
| `path`        | trajectories, field lines  | Supports a fading tail with configurable persistence.                                                                                                                           |
| `point`       | particles, markers         | Screen-space constant size.                                                                                                                                                     |
| `patch`       | translucent polygons       | Cross-product parallelograms, swept areas, flux elements. Needs correct double-sided transparency and depth-write off.                                                          |
| `surface`     | parametric surfaces        | `(u,v) => Vec3` plus optional scalar colouring; supports wireframe overlay and clipping plane.                                                                                  |
| `arc`         | angle annotations          | With optional label at midpoint.                                                                                                                                                |
| `body`        | schematic rigid bodies     | Box, sphere, cylinder, disc, rod, spring helix. Low poly by design.                                                                                                             |
| `field`       | vector field glyph grids   | **Instanced** — one draw call for thousands of arrows. Supports magnitude→length, magnitude→colour, or normalized modes.                                                        |
| `frame`       | nestable coordinate triads | Modules compose these rather than doing their own matrix bookkeeping.                                                                                                           |
| `axes`        | world axes with ticks      | Ticks are live: labels reflect current world-unit spacing as you zoom.                                                                                                          |
| `graticule`   | the instrument bezel (§15) | Scale rules along viewport edges.                                                                                                                                               |

### `annotate/`

- `label({ latex, anchor, offset })` — KaTeX rendered once to an HTML element, positioned by projecting the anchor each frame. HTML overlay rather than texture: crisp at any zoom, selectable, and accessible to screen readers. A glyph that embeds a label (`arrow`/`arc`/`curvedArrow`/`dimensionLine`) passes its own root `Object3D` as `createLabel`'s `attachTo` — the label hides itself whenever that root or any ancestor group is invisible, since the DOM overlay it renders into sits outside the three.js scene graph and isn't skipped by group-level visibility on its own (ADR 0011).
- Dimension lines, projection drop-lines (dashed), and leader lines.

### `theme/`

Maps the semantic palette (§15) onto three materials, with a projector variant (higher contrast, thicker lines) toggled at runtime.

### Picking

Ray-cast against registered draggable handles. Modules declare a param as `draggable` and the shell wires dragging to that param — the module does not write mouse code.

---

## 9. Layer 2 — Shell

### Module view layout

The canvas is full-bleed (fills the entire viewport below the breadcrumb bar); the control panel is a pinned-width floating overlay on top of it, not a layout column (ADR 0011). Resizing the browser window changes only how much of the canvas the panel covers, never the canvas's own extent — `Viewport`'s `ResizeObserver` tracks the canvas element's CSS size directly, so this needed no scene-layer change. The panel has its own collapse toggle so a student can see the un-occluded scene, and a "Recenter view" button reorients the camera (`camera.goTo(defaultView.preset, …)`) **and** shifts the rendered frame so content stays centered in the visible pane rather than the full canvas (`Viewport.centerInVisibleArea`, a `THREE.Camera.setViewOffset` "lens shift" — ADR 0012), applied on mount, on every panel collapse/expand, and on every Recenter click. Below 640px this falls back to the pre-existing stacked layout (§18's 320px manual check) — a floating panel wide enough to be usable would cover most of a phone-width screen.

### Auto-generated controls

The shell reads a module's `ParamDef[]` and renders the control panel. **A module author writes zero UI code.** Adding a new _kind_ of control (e.g. a 2D angle dial) is a shell change that every module can then use.

**Panel ordering (ADR 0011): selection before detail.** "What do I want to visualize" is the first decision a user makes, so the panel renders: (1) always-visible params (`forLayer` unset — base quantities relevant no matter what's checked), (2) the layer manager itself, (3) one `<details>` disclosure per currently-checked layer, holding only the `ParamDef`s tagged `forLayer: '<that layer's key>'`. A `ParamDef` tagged `forLayer` never appears in the always-visible list — only inside its owning layer's disclosure, and only while that layer is checked.

### Layer manager

Renders the module's `LayerDef[]` as a checklist, grouped. This is the "click a toggle to add the cross product" interaction from the original brief, and it is generic.

**Checkboxes vs. radios (ADR 0011).** Independent checkboxes are the default — use them when a module's demonstrations are meant to combine (e.g. a cross product and the parallelogram area it bounds). When several layers are visually or physically incompatible when shown together (several unrelated rigid-body panels sharing one 3D scene, say), tag them with the same `LayerDef.exclusiveGroup` string instead: the layer manager renders that cluster as a mutually-exclusive radio set, so checking one automatically unchecks its siblings. If a module needs several _different_ incompatible clusters, give each its own `exclusiveGroup` value. If exclusivity still isn't enough to keep a module intelligible, that's a signal to split it into smaller, more focused modules (§21) — not to keep adding UI machinery to one.

### Timeline

Play / pause / step / scrub / speed / **reverse**. Behaviour depends on the module's time model (§12). Playback stops itself at the scrub slider's own bounds (`DEFAULT_MAX_T`, exported from `shell/timeline` and passed explicitly into both the slider and `ModuleView`'s play-loop, ADR 0012) — a bare `<input type="range" max>` only clamps where the thumb is _drawn_, never the underlying value, so without this a run kept advancing past the visible end of the slider forever.

### Settings menu

One global, app-level settings menu — not attached to the viewport or to a panel — holding the display preferences that would otherwise scatter: the **up-axis toggle** (`y`/`z`, ADR 0009), theme, projector mode, the **reference grid** toggle, and **free rotation** (ADR 0011/0012). Up-axis/theme/projector/grid are viewer preferences persisted locally across sessions and serialized into the URL only when they differ from the default (§14); free rotation is deliberately transient (not persisted or URL-serialized, same as presenter/predict mode) and applies globally — every module locks to a plane-fixed orthographic view by default and unlocks to full orbit + its own declared projection when checked (ADR 0012), regardless of the module's own `dimensions`. The menu itself never touches a `Viewport`/camera directly — it only writes store values that `ModuleView`'s own effects react to, the same pattern already used for up-axis/projector.

### Plot panel

Two plot types, both generic:

1. **Time series** — any module-declared scalar vs. time, or vs. any other declared scalar (giving phase-space portraits for free).
2. **Sweep plot** — pick a parameter, sweep it across its range, evaluate a declared scalar at each value, plot the curve. This one generic feature serves resonance response curves, effective-potential curves, _and_ — later — a ship's GZ righting-arm curve. Build it once in the shell; never build it in a module.

### Readouts

A live table of module-declared scalars with units, formatted by `kernel/units`. In presenter mode this can be pinned as a large overlay.

### Explain panel

Each module ships an `explain.md` — a short "what am I looking at, what should I notice, what's the equation" panel with KaTeX. Optional but strongly encouraged; a visualization without a caption teaches less.

**Plain markdown, not MDX** (ADR 0002). Rendered client-side with KaTeX for the math. An explain panel therefore cannot contain interactive controls, which is deliberate: interactivity belongs in params and layers, where the shell renders it and the URL serializes it, not in prose that neither can reach.

### Predict mode

A shell-level feature: hide the outcome, let the student commit to a prediction, then reveal. Implemented as "freeze time at t=0 and hide layers tagged `reveal: true` until the student clicks". Modules opt in by tagging layers. Predict-observe-explain is the pedagogy that makes interactive sims outperform a chalkboard; making it a shell feature means every module gets it.

### Error boundary

`ModuleErrorBoundary` catches module exceptions and renders a card with the module id, the error, and a "reset to defaults" button. The gallery stays usable.

---

## 10. The module contract

This is the interface that makes the project extensible. Treat changes to it as breaking and record them as ADRs.

```ts
// src/modules/types.ts

/** How a module relates to time. Prefer 'parametric' over 'stepped'. */
export type TimeModel =
  | 'static' // no time dependence; timeline hidden
  | 'parametric' // state is a pure function of t; scrubbing and reverse are free
  | 'stepped'; // state advances by integration; see §12 for the obligations

export type Category =
  | 'vectors'
  | 'kinematics'
  | 'dynamics'
  | 'energy'
  | 'momentum'
  | 'rotation'
  | 'oscillations'
  | 'gravitation'
  | 'fields'
  | 'statics'
  | 'engineering'
  | 'sandbox';

export interface ModuleManifest {
  /** kebab-case, stable forever — it appears in shared URLs. */
  id: string;
  title: string;
  category: Category;
  /** One sentence for the gallery card. */
  blurb: string;
  tags: string[];
  timeModel: TimeModel;
  dimensions: 2 | 3 | 'both';
  /** Bump when a param key changes meaning; drives URL migration. */
  schemaVersion: number;
  /** Course level, for filtering the gallery. */
  level: 'algebra-based' | 'calculus-based' | 'upper-division';
  /** Fixed integration timestep in seconds for a 'stepped' module (default 1/240s). ADR 0010. */
  stepDt?: number;
}

/* ---------- Parameters: declared as data, rendered by the shell ---------- */

interface ParamBase {
  /** Long key, used in code. */
  key: string;
  /** Short key (≤4 chars, unique within module) used in the URL. */
  urlKey: string;
  label: string;
  /** Optional accordion grouping in the control panel. */
  group?: string;
  /**
   * References a LayerDef.key this param only matters for (ADR 0011).
   * When set, the shell nests this control under that layer's own
   * disclosure — shown only while the layer is checked — instead of
   * the always-visible top section.
   */
  forLayer?: string;
  /** KaTeX shown next to the label, e.g. '\\vec{a}'. */
  symbol?: string;
  help?: string;
}

export type ParamDef =
  | (ParamBase & {
      kind: 'number';
      min: number;
      max: number;
      step: number;
      default: number;
      unit?: Dimension;
      logScale?: boolean;
    })
  | (ParamBase & {
      kind: 'vector';
      default: [number, number, number];
      range: number;
      draggable?: boolean;
      unit?: Dimension;
    })
  | (ParamBase & { kind: 'toggle'; default: boolean })
  | (ParamBase & { kind: 'select'; options: { value: string; label: string }[]; default: string })
  | (ParamBase & { kind: 'expression'; vars: string[]; default: string })
  | (ParamBase & { kind: 'angle'; default: number; min?: number; max?: number });

export interface LayerDef {
  key: string;
  urlKey: string;
  label: string;
  default: boolean;
  group?: string;
  /**
   * Layers sharing the same exclusiveGroup render as a mutually-
   * exclusive radio set instead of independent checkboxes (ADR 0011).
   * Use when a module's demonstrations conflict visually/physically
   * when shown together; leave unset when they're meant to combine.
   */
  exclusiveGroup?: string;
  /** Hidden until revealed in predict mode. */
  reveal?: boolean;
}

/* ---------- Declared outputs ---------- */

export interface ScalarDef {
  key: string;
  label: string;
  symbol?: string; // KaTeX
  unit?: Dimension;
  /** Show in the readout table by default. */
  readout?: boolean;
  /** Offer as a plottable series. */
  plottable?: boolean;
}

/* ---------- The module itself ---------- */

export interface ModuleState {
  params: Record<string, number | boolean | string | [number, number, number]>;
  layers: Record<string, boolean>;
  t: number;
}

export interface PhysicsModule {
  manifest: ModuleManifest;
  params: ParamDef[];
  layers: LayerDef[];
  scalars: ScalarDef[];
  /** Camera hints the shell applies on first mount. */
  defaultView?: { preset: 'iso' | '+x' | '+y' | '+z'; projection: 'ortho' | 'persp' };
  create(ctx: SceneContext): ModuleInstance;
}

export interface ModuleInstance {
  /**
   * Called on every param or layer change, and every frame while time runs.
   * MUST be idempotent: same state in, same scene out, regardless of history.
   * MUST NOT allocate geometry — mutate retained handles only.
   */
  update(state: ModuleState): void;

  /** Values for readouts and plots. Pure; no side effects on the scene. */
  scalars(state: ModuleState): Record<string, number>;

  /** Only for timeModel === 'stepped'. Advance internal state by dt. */
  step?(dt: number, state: ModuleState): void;

  /** Only for timeModel === 'stepped'. Return to t = 0. */
  reset?(state: ModuleState): void;

  /** Release every handle created in create(). */
  dispose(): void;
}
```

### What a module author actually writes

`manifest.ts` (≈20 lines of data), a `params` array (data), a `layers` array (data), a `scalars` array (data), and a `create()` that builds handles and an `update()` that sets their properties from state. **No React, no three.js, no CSS, no routing, no URL handling, no plotting code.**

### What "extensible" buys, concretely

Adding a module touches exactly one new folder. Adding a _capability_ (a new glyph, a new control type, a new plot type) touches Layer 1 or 2 and immediately benefits every existing and future module. There is no central switch statement, no registry file to edit (§11), no route to register.

---

## 11. Registry and code splitting — zero-edit registration

Dropping a folder into `src/modules/` registers a module. Nothing else to edit.

```ts
// src/modules/registry.ts
import type { ModuleManifest, PhysicsModule } from './types';

// Manifests: eagerly loaded. They are tiny data objects, and the gallery
// needs all of them to render cards, search, and filter.
const manifestModules = import.meta.glob<{ default: ModuleManifest }>('./[a-z]*/manifest.ts', {
  eager: true,
});

// Implementations: lazily loaded. Each becomes its own chunk, so the
// initial bundle never grows as the library does.
const implModules = import.meta.glob<{ default: PhysicsModule }>('./[a-z]*/index.ts');

// explain.md: lazily loaded as raw text, same reasoning as implModules —
// the explain panel content (§9) must not bloat the initial bundle.
// Optional per module; loadExplain resolves to null when a module has
// none.
const explainModules = import.meta.glob<string>('./[a-z]*/explain.md', {
  query: '?raw',
  import: 'default',
});

export const manifests: ModuleManifest[] = Object.values(manifestModules)
  .map((m) => m.default)
  .sort((a, b) => a.title.localeCompare(b.title));

export async function loadModule(id: string): Promise<PhysicsModule> {
  const entry = Object.entries(implModules).find(([path]) => path === `./${id}/index.ts`);
  if (!entry) throw new Error(`Unknown module: ${id}`);
  return (await entry[1]()).default;
}

export async function loadExplain(id: string): Promise<string | null> {
  const entry = Object.entries(explainModules).find(([path]) => path === `./${id}/explain.md`);
  if (!entry) return null;
  return await entry[1]();
}
```

This is the single most important piece of scaffolding for the extensibility goal. **The initial page load cost is O(1) in the number of modules**, so the library can grow to 50 modules without the gallery getting slower.

Folders prefixed with `_` (like `_template`) and the non-module `testing/` folder are excluded by the glob pattern `./[a-z]*/`, which only matches directories starting with a lowercase letter.

---

## 12. Time model

The timeline behaves differently per model. This is where the visualizer doctrine is enforced in code.

### `static`

Timeline hidden. `t` is always 0.

### `parametric` — **the preferred model**

`update(state)` is a pure function of `state.t`. The shell can:

- scrub anywhere instantly,
- run time backwards,
- jump to `t = 12.7` without computing anything at `t = 0..12.7`,
- render on demand when paused.

Almost everything in intro mechanics can be written this way: projectile motion, SHM, damped and driven SHM (steady state), uniform circular motion, normal modes, a Kepler orbit via Newton–Raphson on Kepler's equation, rolling without slipping, precession of a fast top.

### `stepped` — permitted but constrained

For genuinely path-dependent systems. Obligations:

- Must implement `step(dt, state)` and `reset(state)`.
- **Fixed timestep only.** The shell drives `step` with a fixed `dt` (default 1/240 s, module-overridable) and accumulates, so behaviour is identical regardless of frame rate. Variable-dt integration makes demos non-reproducible.
- Scrubbing is implemented by the shell as `reset()` then fast-forward, **capped at 20,000 steps**. If a module cannot reach its scrub target within the cap, the shell shows "fast-forwarding…" and then clamps. If you find yourself wanting to raise the cap, you are building a simulator; go back to §2.
- **`step()` must stay cheap** — the shell's fast-forward loop is not obligated to yield back to the browser between steps, so 20,000 sequential calls to an expensive `step()` (an inertia-tensor recompute, an eigendecomposition) can freeze the tab for seconds mid-scrub, mid-lecture. Keep `step()` to simple arithmetic; if that is not possible, the shell should chunk fast-forward across animation frames rather than block, which is a shell obligation, not a module workaround.
- Reverse playback is _not_ available. The shell greys out the reverse control and shows a tooltip explaining why. This is honest and is itself a small lesson about irreversibility.

### Determinism requirement

No `Math.random()` in module code without a seeded PRNG from the kernel, seeded from a serialized param. A demo must look identical every time it is opened.

---

## 13. State model

Single Zustand store:

```ts
interface AppState {
  moduleId: string | null;
  params: Record<string, ParamValue>;
  layers: Record<string, boolean>;
  time: { t: number; playing: boolean; speed: number; direction: 1 | -1 };
  camera: {
    theta: number;
    phi: number;
    radius: number;
    target: [number, number, number];
    projection: 'ortho' | 'persp';
  };
  ui: { presenterMode: boolean; predictMode: boolean; panelsOpen: string[] };
  prefs: { upAxis: 'y' | 'z'; theme: 'light' | 'dark'; projector: boolean };
}
```

The render loop subscribes to the store **outside React** (Zustand's `subscribe`) and calls `instance.update()` directly. React re-renders only the chrome. Never drive a 60 fps three.js loop through React state.

---

## 14. URL serialization

The bookmarkable-demo feature. Hash routing, so GitHub Pages needs no rewrite rules.

```
https://<user>.github.io/phys-viz/#/m/vector-algebra?v=1&a=1,2,0&b=0,3,1&L=xp,proj&t=2.40&c=iso.o
```

Rules:

- `#/m/<moduleId>` — route.
- `v=<schemaVersion>` — always present; drives migration.
- Parameters use `urlKey`. **Omit any parameter at its default value** — a lightly-modified demo produces a short, human-readable, hand-editable URL.
- `L=` — comma-separated list of layer `urlKey`s whose state _differs from default_, with `-` prefix for "turned off". `L=xp,-axes`.
- `t=` — time, 2 dp, omitted when 0.
- `c=` — camera, compactly encoded (`iso.o` = isometric, orthographic; explicit angles when the user has orbited).
- Display preferences (`prefs`, §13) are omitted at their defaults like everything else, so a short link stays short — but a demo prepared in z-up and handed to a class reproduces what the instructor actually saw (ADR 0009).
- If the encoded string exceeds 1800 characters, fall back to `?z=<lz-string compressed blob>`. Rare; only the sandbox module with long expressions should hit it.
- **Debounce camera writes to the URL/history.** `OrbitControls` fires many `change` events per drag frame; writing to the URL/history on every one spams browser history and can visibly stall the render thread. Debounce camera-state URL sync (e.g. ~250 ms after the last `change`, or only on `end`), while the in-memory Zustand `camera` field itself can still update every frame for the render loop to read.

**Migration:** `src/shell/state/migrations.ts` holds `Record<moduleId, Record<fromVersion, (old) => new>>`. An old shared link from a previous semester must still work; a link that cannot be migrated loads defaults and shows a non-blocking notice rather than erroring.

A "Copy link" button is a first-class control, not buried in a menu. This is the feature that gets the tool used.

---

## 15. Visual design

### Direction

The subject's own world is technical drafting and laboratory instrumentation — graticules, scale rules, engineering drawing conventions. The interface should read as an **instrument**, not as a web app with a 3D widget in it.

Two typographic registers, deliberately distinct:

- **Chrome** (labels, controls, readouts): **IBM Plex Sans** and **IBM Plex Mono**. Plex was drawn for technical and engineering contexts, has a matched superfamily, and its mono has tabular figures that keep live readouts from jittering as digits change.
- **Mathematics**: **Computer Modern**, via KaTeX, left as-is. Every equation on screen looks like it came out of the textbook, because it did.

The split is the point: instrument chrome and mathematical content are visibly different kinds of thing, and students should never wonder which they are reading.

### Signature element

The **graticule bezel**: every viewport is framed by a tick-marked scale rule along its edges, like an oscilloscope screen or a drafting scale, with live labels reflecting the current world-unit spacing. It is the one decorative flourish, and it is also functional — it answers "how big is this?" at a glance, which a bare 3D scene never does. Everything else stays quiet.

### Palette

Light mode is the **default**, because projected dark backgrounds wash out in a lit lecture hall. Dark mode exists for students on laptops.

```css
/* src/design/tokens.css */
:root {
  /* Surfaces — cool paper, not cream. Drafting vellum under fluorescent light. */
  --surf-0: #f7f8fa; /* page */
  --surf-1: #ffffff; /* panels */
  --surf-2: #eceef2; /* wells, viewport backdrop */
  --rule: #c8ccd4; /* hairlines, graticule ticks */
  --ink-0: #12161d; /* primary text */
  --ink-1: #4a5260; /* secondary text */
  --ink-2: #7b8494; /* tertiary, disabled */

  /* Semantic physics colours — Okabe–Ito derived, colourblind-safe. */
  --q-position: #0072b2; /* blue     — position, displacement */
  --q-velocity: #009e73; /* green    — velocity, momentum */
  --q-accel: #d55e00; /* vermilion — acceleration */
  --q-force: #cc79a7; /* magenta  — force, torque */
  --q-angular: #7a4fbf; /* violet   — ω, L, pseudovectors */
  --q-field: #56b4e9; /* sky      — field vectors */
  --q-energy: #e69f00; /* amber    — energy, work */
  --q-construction: #7b8494; /* grey     — axes, projections, guides */
}
```

**Colour semantics are binding across all modules** and documented in `docs/PHYSICS_CONVENTIONS.md`. Acceleration is vermilion in module 2 and in module 27. A student who learns the colour language once carries it through the course. Module authors pick from `ctx.palette.velocity`, never a raw hex.

The Okabe–Ito basis is not aesthetic preference: with ~8% of male students having some colour vision deficiency, a physics diagram that distinguishes force from velocity by colour alone must be built on a colourblind-safe set.

### Projector mode

A token override file that raises contrast, thickens every line by ~1.6×, increases label size, and disables subtle transparency. One class on `<html>`. Test it on an actual projector before Milestone 4 ships — a palette that sings on a laptop can vanish on a 4000-lumen projector in a bright room.

### Motion

Sparing and functional. Camera preset transitions (~400 ms) preserve spatial orientation. Layer toggles fade in over ~150 ms so students see _what_ appeared. Nothing else animates. `prefers-reduced-motion` disables camera easing and layer fades.

---

## 16. Accessibility and presenter mode

- Full keyboard operation: `Space` play/pause, `←/→` step, `Shift+←/→` scrub, `1–9` toggle layers, `R` reset, `P` presenter mode, `F` fullscreen, `C` copy link, `V` cycle camera presets. Displayed in a `?` overlay.
- All controls reachable by tab, with a visible focus ring that survives the design (do not `outline: none`).
- The canvas carries an `aria-label` with a text description of the current scene, updated from module scalars — a screen reader user gets "vector a, magnitude 2.24, at 63 degrees from the x axis; cross product magnitude 3.00."
- Every readout value is also available as selectable text, not only as a canvas pixel.
- Presenter mode: hides the gallery chrome, enlarges type ~1.5×, pins the readout overlay, applies projector tokens, and suppresses tooltips and hover states that a projected audience cannot see.

---

## 17. Performance budget

Enforce in CI where possible; check manually otherwise.

| Metric                              | Budget                                                         |
| ----------------------------------- | -------------------------------------------------------------- |
| Frame rate                          | 60 fps on a 2020 integrated-graphics laptop; hard floor 30 fps |
| `instance.update()`                 | ≤ 4 ms                                                         |
| Triangles                           | ≤ 60,000                                                       |
| Draw calls                          | ≤ 200 (field glyphs must be instanced)                         |
| Allocations in the animation loop   | zero (use the kernel scratch pool)                             |
| Initial JS (shell + scene + kernel) | ≤ 250 KB gzipped                                               |
| Per-module chunk                    | ≤ 80 KB gzipped                                                |
| Time to interactive on the gallery  | ≤ 1.5 s on a mid-tier connection                               |

If a module cannot meet these, it is doing too much simulation. See §2.

---

## 18. Testing

### Kernel unit tests (Vitest)

Target ≥90% coverage. Include **golden-value physics tests** against known analytic results: the period of a circular orbit, the inertia tensor of a uniform cuboid, the flux of a radial field through a sphere equals 4π, the curl of a rigid rotation field equals 2ω. These catch sign errors that eyeballing a pretty picture will not.

### The contract test — the extensibility guard

`tests/contract/modules.contract.test.ts` iterates `manifests` and runs **every registered module** through a conformance suite using a headless `MockSceneContext` (no WebGL, no DOM). This is what keeps module #30 honest.

Assertions:

1. Manifest is well-formed; `id` matches its folder name.
2. `urlKey`s are unique within the module and ≤ 4 characters.
3. Every numeric param default lies within `[min, max]`.
4. `create()` → `update(defaults)` → `dispose()` leaves **zero undisposed handles** (the mock context tallies creates and disposes). This is the leak check.
5. **Idempotence:** `update(A); update(B); update(A)` produces the same recorded handle-property set as `update(A)` alone.
   5b. **Determinism:** `update(A)` called twice in a row (no state change between) produces byte-identical recorded handle-property sets, and likewise for `scalars(A)` called twice. Catches hidden state leaking into a module via `Date.now()`, unseeded `Math.random()`, or a captured mutable closure variable — the determinism requirement in §12 is otherwise unenforced by any test.
6. **Purity of `scalars()`:** calling it twice with the same state gives identical results and does not mutate the scene.
7. For `parametric` modules: `update({t: 5})` from a fresh instance equals `update({t: 0}); update({t: 5})`.
8. URL round-trip: encode(defaults) → decode → deep-equals defaults; and the same for a randomized state.
9. No `NaN` in any scalar across a sampling of the parameter space (100 quasi-random states).
10. Every `explain.md`, if present, parses.
11. For `stepped` modules: `step()` and `reset()` are actually implemented.

Assertions 4–7 and 9 each run **twice — once with `ctx.up === 'y'`, once with `'z'`** (ADR 0009), so a module that only half-respects the up-axis setting fails here.

A new module either passes this or does not merge. **No module-specific test code is required to get this coverage** — that is the point.

### E2E smoke (Playwright)

For every module id: navigate to its route, wait for canvas, assert non-blank render, assert no console errors, toggle each layer once, navigate away, assert WebGL context count did not grow.

### Manual checklist per module

See the copy-pasteable checklist in `MODULE_AUTHORING.md` — projector, 320 px width, `prefers-reduced-motion`, colour-blindness simulator, plus the mechanical steps (contract suite, typecheck, lint).

---

## 19. Build and deployment

### `vite.config.ts`

```ts
export default defineConfig({
  base: '/phys-viz/', // MUST match the repo name for project Pages
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          vendor: ['react', 'react-dom', 'zustand'],
          katex: ['katex'],
        },
      },
    },
  },
});
```

### GitHub Pages specifics — the things that bite

- `public/.nojekyll` is **required**. Without it Pages runs Jekyll, which silently drops any file or directory beginning with `_`, including Vite's asset directories in some configurations.
- `base` must match the repository name exactly, including case, or every asset 404s. If a custom domain is added later, `base` becomes `/`.
- **Use hash routing.** The common alternative — copying `index.html` to `404.html` — works but produces a real HTTP 404 status, which breaks link previews and confuses caches. Hash routing has no downside here.
- Self-host fonts in `public/fonts/`. A CDN dependency will fail in exactly the situation that matters most: a lecture hall with captive-portal wifi.
- Deploy via `actions/upload-pages-artifact` + `actions/deploy-pages` with `permissions: { pages: write, id-token: write }`. Do not use a `gh-pages` branch; the Actions path is simpler and leaves no build output in git history.

### `ci.yml`

On every PR: `typecheck` → `lint` → `test:unit` → `test:contract` → `build` → `test:e2e`. All must pass to merge.

### Licensing

- Code: **MIT**.
- Module explanatory text and figures: **CC BY-SA 4.0**.

The split matters if you want physics-education colleagues to adopt and contribute, which is the realistic path to this outliving one semester.

---

## 20. Milestones

Each milestone has a binary acceptance criterion. Do not proceed until it is met.

### M0 — Scaffold and deploy (target: day 1)

Vite + TS + React + three, ESLint boundary rules, Vitest, Playwright, both GitHub Actions workflows.
**Accept when:** a rotatable cube is live at `https://<user>.github.io/phys-viz/`, CI is green, and a deliberate cross-layer import (importing `three` from a file in `src/modules/`) fails lint.

### M1 — Kernel (target: week 1–2)

`math`, `frames`, `calculus`, `geometry`, `ode`, `units`, `expr`.
**Accept when:** ≥90% coverage and all golden-value physics tests pass. No file under `src/kernel/` imports anything outside it.

### M2 — Scene substrate (target: week 2–4)

Viewport, camera with ortho toggle and presets, all glyphs in §8, KaTeX billboards, graticule, picking, projector theme.
**Accept when:** a throwaway demo scene exercises every glyph at 60 fps with zero per-frame allocation (verified in the Chrome performance profiler), and `MockSceneContext` mirrors the real `SceneContext` API exactly (enforced by a type-level test).

### M3 — Shell (target: week 4–5)

Auto-generated controls for every `ParamDef` kind, layer manager, timeline, both plot types, readouts, URL codec with migration, error boundary, presenter mode, keyboard map.
**Accept when:** a hand-written stub module with one of every param kind renders a complete, usable UI with zero UI code in the module, and its state round-trips through the URL.

### M4 — First module: **Vector Algebra** (target: week 6)

The flagship. 2D/3D toggle, draggable vectors, head-to-tail and parallelogram sums, component decomposition onto a rotatable basis, dot product with projection shadow and live cos θ, cross product with the parallelogram patch and right-hand-rule animation, scalar triple product as a parallelepiped, direction cosines.
**Accept when:** the module passes the contract suite, and the instructor can reach any of its demonstration states in under three clicks from a bookmarked link.

### M5 — Two deliberately dissimilar modules (target: week 7–9)

**Rotational Dynamics** (`stepped` where necessary; torque with drawn moment arm, parallel-axis animation, `L` vs `ω` non-parallel case, precession and nutation, rolling with instantaneous axis and cycloid trace, inertia ellipsoid, Dzhanibekov effect) and **Fields, Gradients & Flux** (`static`/`parametric`; heightmap with level curves, gradient perpendicularity, directional-derivative slider, shrinking-box divergence, draggable curl paddlewheel, flux through a user-shaped surface, Stokes and divergence theorems as two converging numbers).

These two are chosen because they stress _different_ parts of the substrate: rotation stresses quaternions, stepped time, and rigid bodies; fields stress instanced glyphs, parametric surfaces, quadrature, and scalar colouring.
**Accept when:** shipping both required **zero breaking changes** to `types.ts`. If the contract had to change, the contract was wrong — fix it now, before there are 20 modules depending on it.

### M6 — Authoring path (target: week 10) — **the extensibility gate**

`_template/` module, `MODULE_AUTHORING.md`, `PHYSICS_CONVENTIONS.md`, a `npm run new:module` generator.
**Accept when:** a person who has never seen the codebase — a colleague or a capable undergraduate — ships a working, contract-passing module in **under four hours** using only `MODULE_AUTHORING.md`. If they cannot, the failure is in the substrate or the docs, not in them. Fix it and retest. **Do not skip this gate**; everything after it depends on the answer.

### M6.5 — Post-gate platform features (target: week 11)

Two features deliberately sequenced _after_ the authoring gate, so they are built against a substrate that a stranger has already proven authorable: **offline support via a service worker** (ADR 0005) and **GIF export** (ADR 0006).
**Accept when:** the site loads and runs every module with the network disabled, including a module never visited while online; and a GIF exported from a module is byte-identical across two runs from the same state, with the §15 semantic colours still distinguishable after palette quantization.

### M7+ — Library growth (ongoing)

Then, in rough order of pedagogical value per unit effort: Work & Energy (potential surface with the total-energy plane), Momentum & Collisions (with the CM-frame toggle), Non-inertial Frames & Coriolis, Oscillations, Gravitation & Central Forces, Kinematics, Newton's Laws & FBDs, Statics & Trusses, Sandbox.

Each of these is now a self-contained unit of work suitable for a student project or a summer contributor.

---

## 21. Module authoring cookbook

The pattern, in full. This is what `_template/` contains.

```ts
// src/modules/vector-algebra/manifest.ts
import type { ModuleManifest } from '../types';

const manifest: ModuleManifest = {
  id: 'vector-algebra',
  title: 'Vector Algebra',
  category: 'vectors',
  blurb: 'Sums, projections, dot and cross products in 2D and 3D.',
  tags: ['vectors', 'dot product', 'cross product', 'components'],
  timeModel: 'static',
  dimensions: 'both',
  schemaVersion: 1,
  level: 'algebra-based',
};
export default manifest;
```

```ts
// src/modules/vector-algebra/index.ts
import type { PhysicsModule, ModuleState } from '../types';
import type { SceneContext } from '@/scene/SceneContext';
import { cross, dot, norm, scale, add } from '@/kernel/math';
import manifest from './manifest';

const module: PhysicsModule = {
  manifest,

  defaultView: { preset: 'iso', projection: 'ortho' },

  params: [
    {
      kind: 'vector',
      key: 'a',
      urlKey: 'a',
      label: 'Vector a',
      symbol: '\\vec{a}',
      default: [3, 1, 0],
      range: 6,
      draggable: true,
    },
    {
      kind: 'vector',
      key: 'b',
      urlKey: 'b',
      label: 'Vector b',
      symbol: '\\vec{b}',
      default: [1, 3, 1],
      range: 6,
      draggable: true,
    },
    {
      kind: 'select',
      key: 'sumStyle',
      urlKey: 'ss',
      label: 'Sum construction',
      options: [
        { value: 'tip', label: 'Head to tail' },
        { value: 'para', label: 'Parallelogram' },
      ],
      default: 'tip',
      group: 'Addition',
    },
  ],

  layers: [
    { key: 'sum', urlKey: 'sum', label: 'Sum a + b', default: false, group: 'Addition' },
    { key: 'comps', urlKey: 'cp', label: 'Components', default: false, group: 'Structure' },
    { key: 'proj', urlKey: 'pr', label: 'Projection of a on b', default: false, group: 'Products' },
    { key: 'xprod', urlKey: 'xp', label: 'Cross product a × b', default: false, group: 'Products' },
    { key: 'xarea', urlKey: 'xa', label: 'Parallelogram area', default: false, group: 'Products' },
  ],

  scalars: [
    { key: 'dot', label: 'a · b', symbol: '\\vec{a}\\cdot\\vec{b}', readout: true },
    { key: 'theta', label: 'Angle', symbol: '\\theta', readout: true },
    { key: 'xmag', label: '|a × b|', symbol: '|\\vec{a}\\times\\vec{b}|', readout: true },
  ],

  create(ctx: SceneContext) {
    // Create every handle ONCE. Attach to layer groups so the shell's
    // toggles work without any code here.
    const gA = ctx.group('always');
    const gSum = ctx.group('sum');
    const gProj = ctx.group('proj');
    const gCross = ctx.group('xprod');
    const gArea = ctx.group('xarea');

    const aArrow = ctx.arrow({ group: gA, color: ctx.palette.position, label: '\\vec{a}' });
    const bArrow = ctx.arrow({ group: gA, color: ctx.palette.velocity, label: '\\vec{b}' });
    const sArrow = ctx.arrow({
      group: gSum,
      color: ctx.palette.energy,
      label: '\\vec{a}+\\vec{b}',
    });
    const shadow = ctx.arrow({ group: gProj, color: ctx.palette.construction, dashed: true });
    const xArrow = ctx.arrow({
      group: gCross,
      color: ctx.palette.angular,
      doubleHead: true,
      label: '\\vec{a}\\times\\vec{b}',
    });
    const patch = ctx.patch({ group: gArea, color: ctx.palette.angular, opacity: 0.18 });
    const angle = ctx.arc({ group: gA, color: ctx.palette.construction, label: '\\theta' });

    return {
      update(s: ModuleState) {
        const a = s.params.a as [number, number, number];
        const b = s.params.b as [number, number, number];

        // Only set(); never construct. Layer visibility is handled by the
        // shell via the groups, so there are no `if (layers.x)` branches here.
        aArrow.set({ from: [0, 0, 0], to: a });
        bArrow.set({ from: [0, 0, 0], to: b });

        const style = s.params.sumStyle as string;
        sArrow.set(
          style === 'tip' ? { from: a, to: add(a, b) } : { from: [0, 0, 0], to: add(a, b) },
        );

        const proj = scale(b, dot(a, b) / dot(b, b));
        shadow.set({ from: [0, 0, 0], to: proj });

        const x = cross(a, b);
        xArrow.set({ from: [0, 0, 0], to: x });
        patch.set({ points: [[0, 0, 0], a, add(a, b), b] });
        angle.set({ from: a, to: b, radius: 1.2 });
      },

      scalars(s) {
        const a = s.params.a as [number, number, number];
        const b = s.params.b as [number, number, number];
        return {
          dot: dot(a, b),
          theta: (Math.acos(dot(a, b) / (norm(a) * norm(b))) * 180) / Math.PI,
          xmag: norm(cross(a, b)),
        };
      },

      dispose() {
        [aArrow, bArrow, sArrow, shadow, xArrow, patch, angle].forEach((h) => h.dispose());
      },
    };
  },
};

export default module;
```

**Note what is absent:** no React, no three.js, no CSS, no event handlers, no URL code, no plotting, no layer `if` statements, no registry edit, no route registration. That is the extensibility target, and every substrate decision above exists to preserve it.

### Author's checklist

The short version: copy `_template/`, fill in `manifest.ts`, declare
params/layers/scalars, build handles in `create()` and set them in
`update()`, write `explain.md`, run `npm run test:contract`. The full,
copy-pasteable checklist — including the manual projector/320px/
reduced-motion/colour-blindness checks — lives in `MODULE_AUTHORING.md`
and is the canonical version; this is only a summary.

---

## 22. Anticipated extensions — design for, do not build

The engineering-focused visualizations sketched in the brief are the reason for the layering. Here is what each would need, so that the substrate does not foreclose them. **Build none of this now.** Just do not make it impossible.

| Future module                                                                              | Substrate capability it needs                                                                                                                                                                                                                                                                                                                                       | Status                          |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Ship stability** (metacentre, GZ righting-arm curve, heel response, free-surface effect) | Clip a polygon by a half-plane (submerged section area + centroid) → **already specified in `kernel/geometry`, M1**. Sweep a parameter and plot a derived scalar (GZ vs. heel angle) → **already specified as the shell Sweep Plot, M3**. Section/clipping plane in the viewport → small addition to `glyphs/surface`. Lofting a hull from 2D stations → new glyph. | ~80% covered by planned work    |
| **Mechanisms and linkages** (four-bar, slider-crank, coupler curves)                       | A tiny planar constraint solve: Newton–Raphson on 2–3 unknowns, ~40 lines in `kernel`. Path tracing → **`path` glyph already has a persistence tail**.                                                                                                                                                                                                              | Needs one small kernel addition |
| **Gears and cams**                                                                         | Involute and cycloid profile generators (pure functions in `kernel/geometry`); nothing new in the scene layer.                                                                                                                                                                                                                                                      | Fully covered                   |
| **Beam bending, shear and moment diagrams**                                                | Linked 2D plots synced to a 3D deformed shape → **Sweep Plot plus a deformation-parameterized `surface`**.                                                                                                                                                                                                                                                          | Fully covered                   |
| **Stress tensor / Mohr's circle**                                                          | Eigen-decomposition of a symmetric 3×3 (kernel), ellipsoid glyph → **already needed for the inertia tensor in M5**.                                                                                                                                                                                                                                                 | Fully covered by M5             |
| **Fluid statics, buoyancy, centre of pressure**                                            | Same half-plane polygon clip as ship stability.                                                                                                                                                                                                                                                                                                                     | Covered by M1                   |
| **Thermodynamic cycles**                                                                   | 2D-only; PV/TS diagrams with a shaded enclosed area. Purely a Sweep Plot variant.                                                                                                                                                                                                                                                                                   | Fully covered                   |
| **Waves, Lissajous, interference**                                                         | Parametric surfaces with time — the easiest case.                                                                                                                                                                                                                                                                                                                   | Fully covered                   |

The pattern is worth noting: **three generic substrate features** — half-plane polygon clipping, the Sweep Plot, and the retained-handle glyph set — unlock most of the engineering extensions. Two of the three are already in M1 and M3 for other reasons. That is what a strong foundation looks like: the future modules turn out to be data and arithmetic, not new architecture.

**The rule for future work:** when a proposed module needs a capability that does not exist, ask whether it belongs in Layer 1 or 2 (where every module gains it) rather than in the module. If it can only live in the module, that is a signal — either the substrate has a gap worth filling, or the module is drifting toward simulation.

---

## 23. Decisions (recorded as ADRs)

The six questions this document originally left open are now resolved.
Each is recorded in `docs/adr/` and is binding; a change of course needs
a new ADR that supersedes the old one, not an edit to it.

| #   | Question                                              | Decision                                                                                                                                                                                                | ADR                                                |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | MDX or plain markdown for explain panels?             | **Plain markdown**, files named `explain.md`, rendered client-side with KaTeX. Revisit only if an author demonstrates a panel that is genuinely better for an inline widget.                            | [0002](adr/0002-markdown-for-explain-panels.md)    |
| 2   | Migrate old URLs, or pin old builds?                  | **Migrate forward.** A `schemaVersion` bump obliges a migration in the same change; an unmigratable link loads defaults with a non-blocking notice. No per-module pinned builds.                        | [0003](adr/0003-migrate-urls-not-pinned-builds.md) |
| 3   | Do modules ever compose?                              | **No — modules stay leaves.** Deferred, not rejected: revisit when ≥8 modules exist _and_ a concrete duplication case is demonstrated. Share downward (a new glyph, a kernel function), never sideways. | [0004](adr/0004-no-module-composition.md)          |
| 4   | Offline use?                                          | **Yes — service worker**, precaching the shell and **every** module chunk, with a user-clicked update, never a silent mid-lecture swap. Scheduled as M6.5.                                              | [0005](adr/0005-offline-via-service-worker.md)     |
| 5   | GIF / video export?                                   | **GIF yes, video no.** On-demand pure-JS encoder, frames rendered deterministically from module state. Scheduled as M6.5.                                                                               | [0006](adr/0006-gif-export-no-video.md)            |
| 6   | `dimensions: 2`: locked ortho, or a real 2D renderer? | **Locked orthographic 3D**, one renderer, plus a shell-provided **"release rotation"** toggle so a student can tip the scene and see the 2D diagram is a slice of 3D.                                   | [0007](adr/0007-locked-ortho-for-2d-modules.md)    |

Handedness is settled too: **all coordinate systems are right-handed**,
in every module, plot, and glyph — Cartesian, polar/cylindrical, and
spherical alike ([ADR 0008](adr/0008-right-handed-coordinates.md)), now
recorded in full in `PHYSICS_CONVENTIONS.md`.

The up axis that ADR 0008 left open is settled too: **y-up by default**,
user-switchable to z-up from the global settings menu, exposed to modules
as `ctx.up` ([ADR 0009](adr/0009-y-up-default-with-up-axis-toggle.md)).

The pattern has already produced its first module-specific instance:
`fields-gradients`' outward-normal convention for closed-surface flux
parametrizations, which handedness alone does not fix
([ADR 0013](adr/0013-outward-normal-for-closed-surface-flux.md)), now
recorded in `PHYSICS_CONVENTIONS.md`.

Still genuinely open, and tracked in `TASKS.md`: further module-specific
sign conventions that handedness does not imply — the sign of a bending
moment, the direction of positive heel angle — each of which
`PHYSICS_CONVENTIONS.md` defers to its own ADR as it arises, the way
ADR 0013 did.

---

## 24. Glossary

| Term              | Meaning                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Module**        | One self-contained visualization; a folder under `src/modules/`.                                                                   |
| **Handle**        | A retained reference to a scene object with `set` / `visible` / `dispose`. Modules hold handles; they never hold three.js objects. |
| **Layer**         | A named, toggleable group of visual elements within a module.                                                                      |
| **Param**         | A declared, user-adjustable input, rendered automatically by the shell.                                                            |
| **Scalar**        | A declared, module-computed output value, available to readouts and plots.                                                         |
| **Time model**    | `static` / `parametric` / `stepped` — how a module relates to time (§12).                                                          |
| **Sweep plot**    | Shell feature: sweep a parameter, plot a scalar against it.                                                                        |
| **Contract test** | The conformance suite run automatically against every registered module.                                                           |
| **The doctrine**  | §2. Visualizer, not simulator.                                                                                                     |
