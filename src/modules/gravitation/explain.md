<!--
  The "what am I looking at" panel (ARCHITECTURE.md §9). Optional but
  strongly encouraged — a visualization without a caption teaches less.
  Keep it short: what the student sees, what to notice, and the
  governing equation in KaTeX.

  Plain markdown, not MDX (ADR 0002): prose plus KaTeX, no components.
-->

## What am I looking at?

A body orbiting a fixed central mass $M$ under Newtonian gravity — the
"restricted two-body problem," where the orbiting body's own mass is
small enough to ignore next to $M$. The path is a closed ellipse with
$M$ sitting at one focus, never at the center. Position, velocity, and
every readout below are exact closed-form functions of time — this
module never numerically integrates anything.

## What should I notice?

- **The body moves fastest near the central mass and slowest far from
  it.** Watch the Speed readout (and the velocity arrow's length) as the
  body sweeps through periapsis versus apoapsis. This is Kepler's second
  law: with angular momentum conserved, a smaller radius forces a larger
  speed.
- **The gravity arrow always points straight at $M$**, and grows sharply
  near periapsis — gravity here falls off as $1/r^2$, so the pull is much
  stronger up close.
- **Specific orbital energy stays constant** even though kinetic and
  potential energy individually trade off as the body moves — check the
  readout table across a full orbit.
- Turn on **"Angular momentum (conserved)"** to see $\vec{h} = \vec{r}
  \times \vec{v}$: a fixed pseudovector, perpendicular to the orbital
  plane, that never changes as the body orbits — the conservation law
  behind the equal-areas rule above.
- **Eccentricity** stretches the ellipse and moves $M$ visibly off-center
  toward one focus; **inclination** tilts the whole orbital plane out of
  the page.

## The equations

Position at time $t$ comes from solving **Kepler's equation** for the
eccentric anomaly $E$, given the mean anomaly $M(t) = n t$ and mean
motion $n = \sqrt{\mu/a^3}$:

$$ M = E - e \sin E $$

solved once per frame by Newton–Raphson (falling back to bisection when
needed) — an ordinary root-find, not a time integration. From $E$, the
distance and true anomaly follow in closed form:

$$ r = a(1 - e\cos E), \qquad \tan\frac{\nu}{2} = \sqrt{\frac{1+e}{1-e}}\,\tan\frac{E}{2} $$

Speed follows from the **vis-viva equation**:

$$ v^2 = \mu\left(\frac{2}{r} - \frac{1}{a}\right) $$

and the orbital period from **Kepler's third law**:

$$ T = 2\pi\sqrt{\frac{a^3}{\mu}} $$
