<!--
  The "what am I looking at" panel (ARCHITECTURE.md §9). Optional but
  strongly encouraged — a visualization without a caption teaches less.
  Keep it short: what the student sees, what to notice, and the
  governing equation in KaTeX.

  Plain markdown, not MDX (ADR 0002): prose plus KaTeX, no components.
-->

## What am I looking at?

A mass on a frictionless spring, drawn not as a spring but as its own
**potential-energy landscape**. The ribbon's height at each $x$ is the
spring's potential energy, $U(x) = \tfrac{1}{2}kx^2$ — a literal
parabolic valley. The translucent sheet is the **total-energy plane**,
sitting at the constant height $E = \tfrac{1}{2}kA^2$ set by the
amplitude. The ball rides the ribbon at $\big(x(t),\, U(x(t))\big)$.

## What should I notice?

The two points where the ribbon meets the plane are the **turning
points**, $x = \pm A$ — the ball can never go further, since that would
need $U(x) > E$, negative kinetic energy. The dashed bracket from the
ball up to the plane is exactly the kinetic energy, $K = E - U(x)$: it
vanishes at the turning points (the ball stops) and is largest at
$x=0$, where the ribbon is at its lowest and the velocity arrow (green)
is longest. Try increasing "Amplitude" — the whole valley doesn't
change, only the height of the energy plane, so the turning points move
out and every readout — $K_{max}$, the speed, the period — is unaffected
except by that one number, $E$.

The work-energy theorem is sitting in the readout table: as the ball
swings from a turning point to the origin, the potential energy drops
by exactly the amount the kinetic energy rises — the spring does
positive work $W = -\Delta U = \Delta K$ on the mass.

## The equations

$$ U(x) = \tfrac{1}{2}kx^2 \qquad E = \tfrac{1}{2}kA^2 \qquad K(x) = E - U(x) $$

$$ x(t) = A\cos(\omega t), \quad \omega = \sqrt{k/m}, \quad T = \frac{2\pi}{\omega} $$
