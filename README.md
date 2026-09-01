# PhysViz

**Live at [systemsdoctor.github.io/phys-viz](https://systemsdoctor.github.io/phys-viz/)**

A static, client-only gallery of interactive, rotatable, toggleable
physics visualizations for undergraduate mechanics and engineering
courses. Pick a module, orbit and zoom a 3D scene, adjust parameters
with sliders, and toggle individual visual elements on and off. Every
configuration is encoded in the URL, so a demo can be prepared in
advance, bookmarked, projected in a lecture hall, and handed to students
as a link. Works offline once loaded (installable, service-worker
precached) and can export the current demonstration as a GIF.

## This is a visualizer, not a simulator

That distinction is the project's central design constraint. Closed-form
math over numerical integration wherever possible; no physics engine, no
collision solver, no backend. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §2 for the full doctrine
— it governs every decision in this codebase.

## Getting started

```sh
npm install
npm run dev
```

Other useful commands:

```sh
npm run typecheck      # tsc, strict
npm run lint           # eslint, including the layer-boundary rules
npm run test:unit      # kernel + shell unit tests
npm run test:contract  # runs every registered module through the conformance suite
npm run test:e2e       # Playwright smoke tests
npm run build          # production build
npm run new:module -- <kebab-case-id>   # scaffold a new visualization
```

## Adding a visualization

See [`docs/MODULE_AUTHORING.md`](docs/MODULE_AUTHORING.md) for the full
cookbook. In short: `npm run new:module -- my-module-id`, fill in a
manifest and a params/layers/scalars declaration, build scene handles
once and mutate them in `update()`. No React, no three.js, no CSS, no
routing code — that's the point of the layered architecture below.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — the full architecture
  and build plan. Start here for anything non-trivial.
- [`docs/MODULE_AUTHORING.md`](docs/MODULE_AUTHORING.md) — the module
  authoring cookbook.
- [`docs/PHYSICS_CONVENTIONS.md`](docs/PHYSICS_CONVENTIONS.md) — sign
  conventions, colour semantics, and notation, binding across every
  module.
- [`docs/adr/`](docs/adr/) — architecture decision records.
- [`AGENTS.md`](AGENTS.md) / [`CLAUDE.md`](CLAUDE.md) — guidance for AI
  coding agents working in this repo.

## Architecture, in one paragraph

Four one-directional layers: `src/kernel` (pure math and physics, no
DOM), `src/scene` (the only place `three.js` is imported), `src/shell`
(React app chrome), and `src/modules` (one folder per visualization,
declarative — no `three`, no React). The boundaries are enforced by
ESLint, not convention. Dropping a folder into `src/modules/` registers
a module automatically; nothing else needs editing. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §3–§11 for the full
picture.

## Project status

Tracking [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §20's milestone
plan, in order:

- [x] **M0** — scaffold and deploy
- [x] **M1** — kernel
- [x] **M2** — scene substrate
- [x] **M3** — shell
- [x] **M4** — first module: Vector Algebra
- [x] **M5** — two deliberately dissimilar modules (Rotational Dynamics,
      Fields/Gradients/Flux)
- [x] **M6** — authoring path (the extensibility gate)
- [x] **M6.5** — offline support (installable, service-worker precached)
      and GIF export
- [ ] **M7+** — library growth (ongoing; see `TASKS.md`)

Five modules are live today: Vector Algebra, Rotational Dynamics,
Fields/Gradients/Flux, Projectile Motion, and a Control Showcase (the
authoring reference implementation). `TASKS.md` is the authoritative,
up-to-date execution tracker — check it before starting non-trivial
work.

## License

Code is [MIT](LICENSE). Module explanatory text and figures are
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). See
[`LICENSE`](LICENSE) for details.
