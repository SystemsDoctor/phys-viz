# Module authoring cookbook

This is the expanded version of ARCHITECTURE.md §21 — you don't need to
read that first, everything you need to ship a module is here. It is
also the reference material for the `npm run new:module` generator
(`scripts/new-module.mjs`) and for the M6 milestone gate: a person who
has never seen this codebase should be able to ship a working,
contract-passing module in under four hours using only this document.

## 1. The one rule that matters most

**Prefer closed form over numerical integration.** The single most
common way a module gets rejected in review is by trying to be a
simulator instead of a visualizer — see ARCHITECTURE.md §2 (the
Visualizer Doctrine) for the full reasoning, and §12 for what a
`timeModel: 'stepped'` module owes if a closed form genuinely isn't
possible. Most modules — anything whose state at time `t` can be
written as a formula in `t` — don't need `stepped` at all; use
`timeModel: 'parametric'` and compute `state.t` directly.

## 2. Copy the template

```sh
npm run new:module -- my-module-id
# or manually:
cp -r src/modules/_template src/modules/my-module-id
```

The folder name **is** the module id. It is kebab-case and, once shared
in a URL, effectively permanent (§10).

## 3. Fill in `manifest.ts`

Twenty lines of data: id, title, category, blurb, tags, `timeModel`
(prefer `'parametric'`; see §12), `dimensions`, `schemaVersion` (bump
only when a param's _meaning_ changes, not its default), and `level`.

`category` is a closed set — pick the closest fit, don't invent one:
`vectors`, `kinematics`, `dynamics`, `energy`, `momentum`, `rotation`,
`oscillations`, `gravitation`, `fields`, `statics`, `engineering`,
`sandbox` (the last is for non-physics substrate/demo modules like
`_template` and `control-showcase`).

`dimensions` (`2 | 3 | 'both'`) is informational — it's shown on the
gallery card and does **not** drive any camera or rendering behavior.
(It used to gate the locked-orthographic-camera behavior for `2`-only
modules; ADR 0012 made that lock a global settings-menu toggle applied
to every module regardless of `dimensions`.) Pick whichever value
actually describes the content.

Two more fields exist and are worth knowing about even though most
modules skip them:

- `stepDt?: number` — only for `timeModel: 'stepped'`, a fixed
  integration timestep in seconds (default 1/240s if omitted). See §12
  and [ADR 0010](adr/0010-stepdt-module-overridable-timestep.md).
- `defaultView?: { preset, projection }` on the `PhysicsModule` object
  itself (not the manifest) — a camera hint the shell applies on first
  mount, e.g. `{ preset: '+z', projection: 'ortho' }` for a module that
  reads best looking straight down the z-axis. Omit it to get the
  shell's own default.

## 4. Declare `params`, `layers`, `scalars` in `params.ts`

These are pure data — the shell builds the entire control panel, layer
checklist, readout table, and URL codec from these arrays. You do not
write UI code. See the `ParamDef` union in `src/modules/types.ts` for
every control kind currently available (number, vector, toggle, select,
expression, angle). If you need a new kind, that is a `shell/controls`
change, not a module hack.

An `angle`-kind param (and any angle-valued quantity in general) is
always **radians** — see `PHYSICS_CONVENTIONS.md`. It has no `unit`
field; a `number` or `vector` param that does carry physical units uses
one of the named `Dimension` constants from `kernel/units` (also in
`PHYSICS_CONVENTIONS.md`'s "Units" section), not a hand-written tuple.

**`scalars` names two different things — don't conflate them.** The
`scalars: ScalarDef[]` array you declare here is metadata (key, label,
symbol, unit) that tells the shell what a readout/plot series is
_called_. The `scalars(state)` function you return from `create()` in
step 5 is what actually _computes_ the numbers at runtime. Every key
your `scalars(state)` function returns must appear in this `ScalarDef[]`
array, and vice versa — they describe the same set of outputs from two
different angles.

**Tie a param to the layer it belongs to.** If a `ParamDef` only matters
once a particular `LayerDef` is checked (e.g. a "spin rate" number that
does nothing until the "Precession" layer is on), set
`forLayer: '<that LayerDef's key>'`. The shell nests it under that
layer's own disclosure in the panel, shown only while the layer is
checked, instead of cluttering the always-visible list. Leave `forLayer`
unset for params that matter regardless of what's checked (the base
vectors a module always draws, say).

**Checkboxes vs. radios for layers.** Independent checkboxes (the
default — no extra field needed) are right when a module's
demonstrations are meant to combine, e.g. showing a cross product
alongside the parallelogram area it bounds. When a cluster of layers is
visually or physically incompatible when shown together — several
unrelated rigid-body demonstrations sharing one 3D scene is the
motivating case (`rotational-dynamics`) — give every layer in that
cluster the same `LayerDef.exclusiveGroup` string; the layer manager
renders them as a mutually-exclusive radio set instead. A module can mix
both: some layers plain checkboxes, others grouped into one or more
`exclusiveGroup`s. If exclusivity still leaves the result unintelligible,
that's a sign to split the module into smaller, more focused ones (§21)
rather than adding more UI machinery to one.

## 5. Implement `create()` and `update()` in `index.ts`

- `create(ctx)` builds every scene handle **once**. Attach each handle
  to `ctx.group(layerKey)` so the shell's layer toggles work with zero
  `if` statements in your module. Every handle is
  `{ set(props), visible(show), dispose() }` regardless of glyph kind.
  The full set `ctx` offers:

  | Glyph           | Purpose                                      | Key props                                                                                                                                                        |
  | --------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `arrow`         | vectors, forces                              | `from`, `to`, `color`, `dashed`, `doubleHead`                                                                                                                    |
  | `curvedArrow`   | angular arcs (torque, curl)                  | `center`, `axis`, `radius`, `startAngle`, `endAngle`                                                                                                             |
  | `path`          | trajectories, fading tails                   | `points`, `persistence`                                                                                                                                          |
  | `point`         | markers                                      | `position`, `sizePx`                                                                                                                                             |
  | `patch`         | flat filled regions (fan, ≤ 16 points)       | `points`, `opacity`                                                                                                                                              |
  | `surface`       | parametric surfaces                          | `parametric`, `uRange`, `vRange`, `resolution`                                                                                                                   |
  | `arc`           | angle between two vectors from origin        | `from`, `to`, `radius`                                                                                                                                           |
  | `body`          | rigid-body shapes                            | `kind` (`box`\|`sphere`\|`cylinder`\|`disc`\|`rod`\|`spring`), `position`, `orientation`, `scale`                                                                |
  | `field`         | sampled vector field on a grid               | `sample`, `gridBounds`, `gridResolution`, `mode`                                                                                                                 |
  | `frame`         | nestable coordinate frames                   | `origin`, `orientation`, `parent`                                                                                                                                |
  | `axes`          | reference axes (rarely needed — see below)   | `extent`, `showTicks`                                                                                                                                            |
  | `graticule`     | 2D grid overlay (no `group`; DOM, not scene) | `viewportSize`, `worldUnitsPerTick`                                                                                                                              |
  | `label`         | KaTeX text at a world anchor                 | `latex`, `anchor` (world position), `offset` (**screen pixels**, `[x, y]` — not a third world dimension, unlike every other `offset`/`anchor`-shaped prop above) |
  | `dimensionLine` | measurement brackets                         | `from`, `to`, `offset`, `label`                                                                                                                                  |
  | `draggable`     | wire a param to pointer drag                 | `paramKey`, `getPoint`                                                                                                                                           |

  `resolution`, `gridResolution`, and `kind` (on `body`) are fixed for a
  handle's lifetime — pass their final value at `create()` time, not in
  `update()`.

- `ctx.palette` gives you the 8 project-wide semantic colours —
  `position`, `velocity`, `accel`, `force`, `angular`, `field`,
  `energy`, `construction` — instead of a raw hex. Colour is data
  (ARCHITECTURE.md §3, principle 7): the same quantity gets the same
  colour in every module. The full table and what each one means is in
  `PHYSICS_CONVENTIONS.md`.
- `ctx.up` (`'y'` or `'z'`) is the viewer's current up-axis setting. A
  module with a notion of _vertical_ — gravity, a ground plane, a
  hanging pendulum — reads it instead of hardcoding `[0, 1, 0]`; a
  module with no such notion (vector algebra, fields and gradients)
  ignores it. See `PHYSICS_CONVENTIONS.md`'s "Which axis is up" for a
  worked example. The contract suite (§7 below) runs every relevant
  check under both settings, so a module that half-uses `ctx.up` gets
  caught.
- Don't build your own reference grid with `ctx.axes()` — every module
  already gets one for free, shell-owned and toggled globally from the
  settings menu (§9, ADR 0011). `ctx.axes()` is still there if a module
  genuinely needs a _different_ extent or behavior than the global grid,
  but that's the exception now, not the default.
- A glyph you attach a `label` to (via its own `label:` prop, e.g.
  `ctx.arrow({ label: '\\vec{a}', ... })`) hides that label automatically
  whenever the glyph's group is toggled off — no module code needed for
  this either (ADR 0011).
- `update(state)` only calls `.set(...)` on handles created in
  `create()`. It must be **idempotent**: the same `state` in always
  produces the same scene, regardless of what happened before. This is
  what makes URL restore, undo, and scrubbing work without special
  cases (§3, principle 4).
- `scalars(state)` is pure and side-effect-free; it feeds the readout
  table and both plot types for free.
- `dispose()` releases every handle. The contract suite checks this.
- If you use `kernel/math`'s scratch pool (`tmp.v3()`), never hold a
  result across calls — it aliases a ring buffer and wraps. Read the
  values out or copy them (`[...v]`) before returning from `update()`;
  never stash a `tmp.v3()` result in a closure inside `create()`.

If your module is `timeModel: 'stepped'`, also implement `step(dt,
state)` and `reset(state)` — see the obligations in §12 (fixed timestep,
the 20,000-step scrub cap, and why reverse playback is disabled). Keep
`step()` cheap: the shell may call it up to 20,000 times in a row to
fast-forward a scrub with no yield back to the browser between calls, so
anything expensive in there (recomputing an inertia tensor, an
eigendecomposition) turns a scrub into a multi-second freeze on the
lecture-hall laptop. If `step()` can't stay cheap, that's usually a sign
the module wants a closed form instead — re-read §2.

## 6. Write `explain.md`

A short "what am I looking at, what should I notice, what's the
equation" panel, with KaTeX for the math. Optional but strongly
encouraged (§9) — a visualization without a caption teaches less.

**Plain markdown, not MDX** (ADR 0002). No components, no JSX, no
interactive widgets in the prose — interactivity belongs in params and
layers, where the shell renders it and the URL serializes it.

## 7. Run the contract suite

```sh
npm run test:contract
```

It finds your module automatically via the registry glob (§11) and runs
it through the full conformance checklist in §18 for every registered
module, including yours — no module-specific test code is required to
pass it. `module.test.ts` is for anything _specific_ to your module —
e.g. a golden-value physics check. Concretely, it checks:

- Your manifest is well-formed and every `urlKey` (params and layers)
  is unique and ≤ 4 characters.
- Every numeric param's `default` lies within `[min, max]`.
- `create() → update(defaults) → dispose()` leaves zero undisposed
  handles — the leak check.
- `update()` is both **idempotent** (`update(A); update(B); update(A)`
  matches calling `update(A)` alone) and **deterministic** (calling it
  twice in a row with the same state produces byte-identical results —
  this is what catches a stray `Date.now()`, unseeded `Math.random()`,
  or a captured mutable closure variable). Same determinism check for
  `scalars()`.
- `scalars()` is pure — it never mutates the scene.
- For `timeModel: 'parametric'` modules: `update({t: 5})` from a fresh
  instance matches `update({t: 0}); update({t: 5})`.
- URL round-trip: encoding then decoding both the defaults and a
  randomized state reproduces them exactly.
- No `NaN` in any scalar, sampled across 100 quasi-random parameter
  combinations.
- For `timeModel: 'stepped'` modules: `step()` and `reset()` are
  actually implemented.
- **Every check above except the URL round-trip and the `explain.md`
  parse runs twice — once with `ctx.up === 'y'`, once with `'z'`** — so
  a module that only half-respects the up-axis setting fails here
  instead of in front of a class.

## Checklist

Copy-paste this when starting a module:

- [ ] Copied `_template/` (`npm run new:module -- <id>`), folder renamed
      to `<id>`
- [ ] `manifest.ts` filled in; `id` matches the folder name
- [ ] `params.ts`: params, layers, scalars declared as data
- [ ] `create()` builds every handle once; `update()` only calls
      `.set()`/`.visible()` on them; `dispose()` releases every one
- [ ] Any notion of "vertical" reads `ctx.up`, not a hardcoded axis
- [ ] `explain.md` written with real content
- [ ] `npm run test:contract` passes
- [ ] `npm run typecheck && npm run lint` pass
- [ ] Checked on a projector (or the projector CSS mode) — a palette
      that sings on a laptop can vanish on a 4000-lumen projector
- [ ] Checked at 320px width
- [ ] Checked with `prefers-reduced-motion` enabled
- [ ] Checked with a colour-blindness simulator; colour must never be
      the only channel carrying information

## What you should never need to write

React, three.js, CSS, event handlers, URL/hash routing code, plotting
code, a `layers.x ? ... : ...` branch, a registry edit, or a route
registration. If you find yourself reaching for any of these, the
substrate is probably missing a capability — raise it as a Layer 1 or
Layer 2 change (glyph, control kind, plot type) instead of working
around the boundary. See ARCHITECTURE.md §6 and §10, "What 'extensible'
buys, concretely."
