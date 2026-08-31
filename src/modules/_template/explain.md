<!--
  The "what am I looking at" panel (ARCHITECTURE.md §9). Optional but
  strongly encouraged — a visualization without a caption teaches less.
  Keep it short: what the student sees, what to notice, and the
  governing equation in KaTeX.

  Plain markdown, not MDX (ADR 0002): prose plus KaTeX, no components.

  This file is a real, working example — replace its content with your
  own module's, don't leave it as boilerplate.
-->

## What am I looking at?

A single vector, $\vec{v}$, set by an amplitude, a direction, a
visibility toggle for its label, and a solid/dashed style — one live
example of each common param kind.

## What should I notice?

Changing "Direction" rotates the arrow; changing "Amplitude" rescales
it without changing where it points. The magnitude readout always
matches the amplitude, since the arrow is drawn at unit direction times
that amplitude.

## The equation

$$ |\vec{v}| = a $$
