# 2. Markdown, not MDX, for explain panels

Date: 2026-08-25

## Status

Accepted

Resolves the first open decision in ARCHITECTURE.md §23.

## Context

Every module ships a short "what am I looking at, what should I notice,
what's the equation" panel (§9). The original handoff spec left the
format open: MDX would allow interactive inline examples inside the
prose, at the cost of a build-time plugin, a React runtime for the
panel, and a second way for a module to smuggle UI code past the layer
boundary in §6.

Four `explain.mdx` files already exist in the repository with **no
loader configured at all**, so nothing renders today either way. One of
them (`_template/explain.mdx`) uses MDX-only comment syntax
(`{/* … */}`), which plain markdown renders literally.

The panels we actually want to write are prose plus KaTeX. KaTeX is
already in the stack (§4) and is synchronous, so math in a markdown
panel needs no additional machinery.

## Decision

Explain panels are **plain markdown**, rendered client-side, with KaTeX
for the math. Files are named `explain.md`.

We will revisit MDX if and when an author demonstrates a panel that is
genuinely better for having an interactive widget inline. That revisit
is a new ADR superseding this one, and it is a one-line change to the
glob plus a rename — deliberately cheap to reverse.

## Consequences

- `explain.mdx` becomes `explain.md` everywhere: the four existing
  stubs, ARCHITECTURE.md §5/§9/§18/§21, `MODULE_AUTHORING.md` §6,
  `LICENSE`, and contract assertion 10. `scripts/new-module.mjs` copies
  the template directory wholesale, so the generator needs no change.
- `_template/explain.md` must drop its `{/* … */}` comment for an HTML
  comment, which markdown does support.
- The explain panel needs a small markdown renderer dependency, chosen
  under the §4 constraint that it be self-hosted and small. No CDN — a
  lecture hall behind a captive portal is exactly where that fails.
- An explain panel cannot contain interactive controls. That is the
  point: interactivity belongs in params and layers, which the shell
  renders and the URL serializes, not in prose that neither can reach.
- Contract assertion 10 ("every `explain.md`, if present, parses") stays
  meaningful and gets cheaper — parsing markdown needs no JSX pipeline.
