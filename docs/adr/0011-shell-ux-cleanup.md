# 11. Shell UX cleanup: overlay layout, global view prefs, param/layer linkage

Date: 2026-08-26

## Status

Accepted

## Context

With three real modules shipped (`vector-algebra`, `rotational-dynamics`,
`fields-gradients`) plus the `control-showcase` fixture, several shell-level
UX problems became visible in a way a single stub module never exposed:

1. **Layout didn't scale.** The two-column flex layout (`canvas: flex:1`,
   `panel: width:320px; flex-shrink:0`) meant a narrow browser window
   squeezed the canvas arbitrarily thin instead of the window simply
   cropping a fixed-size scene.
2. **View-level toggles weren't actually global.** "Release rotation"
   was already shell-owned (`ModuleView.tsx`, gated on
   `manifest.dimensions === 2`), but only ever rendered for
   `control-showcase` since it's the only module with `dimensions: 2` —
   easy to mistake for a per-module feature. The reference grid was
   genuinely module-authored: `control-showcase` built its own
   `ctx.axes()` gated behind a **`grid` `LayerDef` that didn't exist**
   (`s.layers.grid ?? true` had no matching declared layer), so it was
   unreachable from the UI at all — a real latent bug, not just an
   inconsistency.
3. **Labels didn't track their glyph's group visibility.** `arrow`/`arc`/
   `curvedArrow`/`dimensionLine` each embed a `createLabel(...)` DOM
   overlay. The glyph's own `.visible(show)` correctly hides the label
   too, but `Viewport.setGroupVisible` — the path every layer checkbox
   actually uses — only ever toggled the three.js `Object3D.visible`
   flag directly, never calling a handle's `.visible()`. A label whose
   glyph was hidden by a _layer_ toggle (not an explicit call) rendered
   forever. Concretely: `vector-algebra`'s `c` arrow is grouped under
   the `triple` layer (off by default) — the arrow was correctly
   invisible from first paint, its label wasn't.
4. **The control panel had no selection-first structure.** Every
   `ParamDef` rendered in one flat always-visible list regardless of
   which `LayerDef`s were even checked, so a module with many
   demonstrations (e.g. `rotational-dynamics`'s seven) dumped all of
   their numeric controls into the panel at once, unrelated to what was
   actually being shown.
5. **No way to express "these layers conflict."** `rotational-dynamics`
   declares seven independent rigid-body demonstrations sharing one 3D
   scene. Nothing stopped a user from checking several simultaneously,
   producing an unreadable overlay of unrelated arrows/bodies — exactly
   the failure mode `LayerDef`'s plain independent-checkbox model can't
   prevent.
6. `VectorPad`'s numeric inputs were plain controlled `<input value={n}>`
   fields: typing a bare `-` (or a trailing `.`, or clearing the field)
   parsed to `NaN`, the change handler bailed without calling `onChange`,
   and React re-rendered the input back to its last committed value —
   erasing the keystroke the user just typed.

## Decision

### Layout (no contract change)

`.pv-viewport-canvas` becomes `position: absolute; inset: 0` (full-bleed)
inside a `position: relative` `.pv-module-view__layout`; the control panel
becomes a pinned-width floating overlay (`position: absolute; top/right/
bottom`) instead of a layout column. `Viewport`'s existing
`ResizeObserver` already tracks the canvas element's own CSS size, so this
needed no scene-layer change. A collapse toggle (`panelCollapsed` local
state, CSS-class-driven so scroll position/open `<details>` survive) lets
a user hide the panel entirely; a "Recenter view" button reuses the
existing `camera.goTo(defaultView.preset, 400)` tween. Below 640px the
pre-existing stacked layout is kept (a floating panel wide enough to be
usable would cover most of a phone screen).

### Global view prefs (no contract change — `SceneContext`/`Viewport` only)

- **Reference grid**: `Viewport` now builds its own axes/graticule glyph
  directly (via the same `createAxes` factory `ctx.axes()` already
  exposes), attached to the scene root, independent of any module group.
  `Viewport.setGridVisible(visible)` toggles it. Backed by a new
  `prefs.showGrid` (persisted, URL `gr=`, same treatment as
  up-axis/theme/projector — ADR 0009). A module no longer needs to build
  its own grid for this; `ctx.axes()` remains available for a
  module-specific extent/behavior that genuinely differs from the global
  default.
- **Free rotation**: `ui.rotationReleased` (new `AppState.ui` field,
  deliberately **not** persisted/URL-serialized — same transient-per-visit
  shape as `presenterMode`/`predictMode`). `ModuleView`'s existing
  live-prefs-reactive effect (the one already handling up-axis/projector
  changing while a module is mounted) grew a branch for it, calling
  `camera.setLockedToPlane`. A no-op on any module that isn't 2D-locked.
- Both surface as checkboxes in `SettingsMenu`, which still never touches
  a `Viewport`/camera directly — it only writes store values that
  `ModuleView`'s effects react to, preserving §9's "not attached to the
  viewport" property.

### Label visibility (no contract change — `src/scene/**` only)

`createLabel(props, host, attachTo?: THREE.Object3D)` gains an optional
third parameter: the glyph's own root `Object3D`. Each frame, in addition
to the existing off-screen/`shown` checks, the label hides itself when
`attachTo` (or any ancestor — a new `isVisibleInHierarchy` walks the
`.parent` chain) is invisible. `arrow`/`arc`/`curvedArrow`/
`dimensionLine` all pass their own root. This is the general fix for
"a label outlives its glyph's group visibility," not a `vector-algebra`-
specific patch.

### Param/layer linkage and exclusive layers (**additive contract change**)

`ParamBase` gains `forLayer?: string` (references a `LayerDef.key`): when
set, the shell nests that control under the named layer's own disclosure
(a native `<details>/<summary>`, opened only while the layer is checked)
instead of the flat always-visible list. `LayerDef` gains
`exclusiveGroup?: string`: layers sharing the same value render as a
mutually-exclusive radio set (`LayerManager`) instead of independent
checkboxes.

`MODULE_CONTRACT_VERSION` bumps 2 → 3 — same additive/optional shape and
bump rationale as `stepDt` (ADR 0010): every existing module compiles and
renders identically without adopting either field (an omitted `forLayer`
stays in the always-visible list; an omitted `exclusiveGroup` stays a
checkbox).

`ModuleView`'s panel body is reordered: always-visible params → layer
picker (`LayerManager`) → one `<details>` per currently-checked layer
(only ones with `forLayer`-linked params) → Timeline → readouts/plots →
Explain. Selection ("what do I want to visualize") now comes before each
selection's own numeric/display options, per the panel's own use order.

**Per-module adoption**, driven by each module's actual visual coupling,
not blanket policy:

- `vector-algebra` — `sumStyle`/`basisAngle`/vector `c` get `forLayer`
  (sum/comps/triple respectively); layers stay independent checkboxes,
  since its demonstrations are explicitly meant to combine (e.g. cross
  product + the parallelogram area it bounds).
- `rotational-dynamics` — every panel-specific param gets `forLayer`;
  all seven layers get `exclusiveGroup: 'panel'`. This is the module
  that motivated point 5 above: its seven demonstrations are independent
  and visually incompatible when combined, and exclusive selection alone
  resolves that — no need to split it into smaller modules.
- `fields-gradients` — params get `forLayer` where they're specific to
  one of the seven panels; params feeding more than one panel (probe
  position, the vector field definition) stay always-visible rather than
  arbitrarily assigned to one. Layers stay independent checkboxes: the
  shipped default (heightmap backdrop plus several spatially distinct
  demo probes on simultaneously) is intentional, not the "unintelligible
  overlay" failure mode — unlike `rotational-dynamics`, these panels
  don't visually collide.
- `control-showcase` gained a small `forLayer` example (`traceSteps`,
  nested under `trace`) so the fixture keeps exercising the new field;
  `exclusiveGroup` is instead covered directly by `LayerManager`'s own
  unit tests and by `rotational-dynamics` as a real module, rather than
  adding a contrived exclusive pair to a fixture whose layers already
  have established Playwright assertions against them.

### Numeric text entry (no contract change)

`VectorPad`'s per-axis inputs each keep a local text buffer (authoritative
while the user is typing), committing upward via `onChange` only when the
buffer parses to a finite number — so `-`, a trailing `.`, or a
momentarily empty field are never clobbered by a stale controlled value.

## Consequences

- Zero breaking changes: every field added (`forLayer`, `exclusiveGroup`,
  `prefs.showGrid`, `ui.rotationReleased`, `Viewport.setGridVisible`) is
  additive/optional, and no existing module needed a code change to keep
  working.
- A module author building a new module with several visually-
  incompatible demonstrations should default to one `exclusiveGroup`
  per incompatible cluster rather than independent checkboxes; see
  `MODULE_AUTHORING.md`'s worked example.
- A module no longer needs (and should not add) its own reference-grid
  glyph — it's inherited from `Viewport` for free.
- The label-visibility fix is substrate-level and applies to every
  future module automatically; no module-side change needed to benefit
  from it.
