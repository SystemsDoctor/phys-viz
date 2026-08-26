# Module authoring cookbook

This is the expanded version of ARCHITECTURE.md §21. Read that section
first; this document exists so a first-time author never has to open the
rest of the codebase. It is also the reference material for the
`npm run new:module` generator (`scripts/new-module.mjs`) and for the M6
milestone gate: a person who has never seen this codebase should be able
to ship a working, contract-passing module in under four hours using
only this document.

## 1. Read the doctrine first

Before writing anything, read ARCHITECTURE.md §2 (the Visualizer
Doctrine). The single most common way a module gets rejected in review
is by trying to be a simulator. Prefer closed form. If you think you
need numerical integration, re-read §2 and §12 first.

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

## 4. Declare `params`, `layers`, `scalars` in `params.ts`

These are pure data — the shell builds the entire control panel, layer
checklist, readout table, and URL codec from these arrays. You do not
write UI code. See the `ParamDef` union in `src/modules/types.ts` for
every control kind currently available (number, vector, toggle, select,
expression, angle). If you need a new kind, that is a `shell/controls`
change, not a module hack.

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

- `create(ctx)` builds every scene handle **once**, via `ctx.arrow(...)`,
  `ctx.patch(...)`, etc. (see `src/scene/glyphs/` for the full set).
  Attach each handle to `ctx.group(layerKey)` so the shell's layer
  toggles work with zero `if` statements in your module.
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
it through the full conformance checklist in §18. No module-specific
test code is required to pass it. `module.test.ts` is for anything
_specific_ to your module — e.g. a golden-value physics check.

## 8. Manual checklist

- Check on an actual projector (or the projector CSS mode) — a palette
  that sings on a laptop can vanish on a 4000-lumen projector.
- Check at 320px width.
- Check with `prefers-reduced-motion` enabled.
- Check with a colour-blindness simulator; colour must never be the
  only channel carrying information.

## What you should never need to write

React, three.js, CSS, event handlers, URL/hash routing code, plotting
code, a `layers.x ? ... : ...` branch, a registry edit, or a route
registration. If you find yourself reaching for any of these, the
substrate is probably missing a capability — raise it as a Layer 1 or
Layer 2 change (glyph, control kind, plot type) instead of working
around the boundary. See ARCHITECTURE.md §6 and §10, "What 'extensible'
buys, concretely."
