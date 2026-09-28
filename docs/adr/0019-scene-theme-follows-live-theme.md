# 19. The scene background and label overlay ink follow the live theme

Date: 2026-09-28

## Status

Accepted

## Context

`Viewport`'s WebGL scene background was hardcoded (`this.scene.background
= new THREE.Color(0xeceef2)`, `Viewport.ts:133`) regardless of
`prefs.theme`. The label overlay (`htmlOverlay.ts`'s `createKatexElement`)
sets no colour of its own, so it inherits `body`'s `color: var(--ink-0)`
(`shell.css:22`) — which DOES flip live with the theme, via the CSS
custom property. The combination is the bug: under dark mode, `--ink-0`
becomes a near-white `#eef1f6` (correct against the page's own dark
`--surf-0`/`--surf-1` backgrounds), but the WebGL canvas stayed the
hardcoded light `#eceef2` — so every label rendered near-white text on a
near-white background, effectively invisible. Logged as **X-38** in the
2026-09-23 audit.

## Decision

1. **`Viewport.setTheme(theme: 'light' | 'dark')`** drives BOTH colours
   from the SAME call, so they can never disagree the way the hardcoded
   background vs. CSS-live overlay ink did: `this.scene.background` (the
   WebGL clear colour) and `this.overlayEl.style.color` (now set
   explicitly, no longer left to `body`'s inherited `--ink-0`). A new
   `ViewportOptions.theme` seeds the same pair at construction. `ModuleView`
   calls `setTheme()` from the same live-prefs subscription that already
   drives `setUpAxis`/`setProjectorMode`/grid visibility (`prefs.theme`
   is tracked alongside them), and passes the current `prefs.theme` when
   constructing a fresh `Viewport`.
2. **Two new hardcoded colour pairs in `scene/theme/index.ts`**
   (`getSceneTheme('light' | 'dark')` returning `{ background,
overlayInk }`), deliberately duplicating `tokens.css`'s `--surf-2`/
   `--ink-0` rather than reading them via `getComputedStyle` — the exact
   same reasoning `getPalette`'s existing `HEX` duplication already
   documents: `Viewport` needs a concrete colour at construction time and
   on every `setTheme()` call, and a DOM read would race `App.tsx`'s own
   `data-theme`-attribute effect (which of the two runs first on a theme
   toggle is not guaranteed) rather than solve the "who's the source of
   truth" question. `src/design/tokens.test.ts` gained a second drift
   guard (alongside the existing `--q-*`/`getPalette` one) checking both
   the light AND dark values of `--surf-2`/`--ink-0` against
   `getSceneTheme`.
3. **The overlay container now carries a stable class,
   `pv-scene-overlay`**, purely so an e2e assertion can find the label
   text belonging to the scene (as opposed to some other `.katex`
   element the shell renders, e.g. a readout panel) — no behavioral
   change.

## Consequences

- Dark theme now actually produces legible scene labels — verified by an
  e2e test (`tests/e2e/smoke.spec.ts`, "X-38") that samples the WebGL
  canvas's own background pixel (must be dark, not the old hardcoded
  light grey) AND the computed `color` of a real rendered label (must be
  the dark-theme ink, not indistinguishable from the background) —
  confirmed to fail against the pre-fix code (background pixel came back
  the hardcoded light grey) and pass against the fix.
- `getSceneTheme`'s pure light/dark colour pairs are covered by a unit
  drift guard against `tokens.css`, the same shape as the existing
  `getPalette` guard — a future edit to either `--surf-2`/`--ink-0` or
  `SCENE_THEME` that isn't mirrored in the other will fail
  `test:unit`, not surface as a silent runtime mismatch.
- No `MODULE_CONTRACT_VERSION`/`types.ts` change — modules never see
  `Viewport` directly; this is entirely inside the scene/shell rendering
  path, the same shape as ADR 0015/0016/0017/0018's shell/rendering-layer
  fixes.
- `demoScene.ts` and the GIF-export capture path (`shell/export/gif/
capture.ts`) both construct a `Viewport` without a `theme` option and
  so keep the previous hardcoded-light behavior by default — deliberate:
  the M0 demo cube route is a throwaway dev page, and exported GIFs
  already deliberately force `projectorMode: true` (ADR 0006) for
  export-specific contrast, independent of the viewer's own live theme
  preference.
