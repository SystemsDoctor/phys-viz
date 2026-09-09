<!--
  The "what am I looking at" panel (ARCHITECTURE.md §9). Optional but
  strongly encouraged — a visualization without a caption teaches less.
  Keep it short: what the student sees, what to notice, and the
  governing equation in KaTeX.

  Plain markdown, not MDX (ADR 0002): prose plus KaTeX, no components.
-->

## What am I looking at?

A mass hangs from a spring and is shaken by a sinusoidal driving force
$F(t) = F_0\cos(\Omega t)$ (magenta arrow), with some viscous damping
$c$. What's drawn is the **steady-state** response only — the part of
the motion left over long after any initial transient has died away —
because that's the part with a single clean formula, independent of how
the system started.

## What should I notice?

The mass doesn't oscillate at its own natural frequency $\omega_0 =
\sqrt{k/m}$; it locks onto the **drive** frequency $\Omega$, but with an
amplitude and a phase lag that both depend on how close $\Omega$ is to
$\omega_0$. Drag "Drive frequency" toward the natural-frequency readout
and watch the amplitude readout climb toward a peak — that's resonance.
Right at $\Omega = \omega_0$, the mass's velocity (green) and the
driving force (magenta) point the same way at the same instant: the
force is doing maximum work, pumping energy in as fast as the damping
can carry it away. Far below resonance the mass tracks the force almost
in step; far above it, the phase lag approaches $\pi$ — the mass moves
opposite the force, too sluggish to keep up.

Push "Damping coefficient" to 0 and sweep through $\Omega = \omega_0$:
the amplitude readout spikes to the module's own display ceiling rather
than genuinely diverging (an idealized undamped resonance has no
steady state at all — energy climbs without bound — so this is exactly
where the "closed form" a real spring can't actually reach). Try the
**Sweep Plot**: pick "Drive frequency" as the swept parameter and
"Steady-state amplitude" as the series — that traces out the textbook
resonance curve, narrower and taller the smaller $\zeta$ is.

## The equations

$$ m\ddot{x} + c\dot{x} + kx = F_0\cos(\Omega t) \qquad \omega_0 = \sqrt{k/m}, \quad \zeta = \frac{c}{2\sqrt{mk}} $$

$$ x(t) = A(\Omega)\cos(\Omega t - \delta) \qquad A(\Omega) = \frac{F_0/m}{\sqrt{(\omega_0^2-\Omega^2)^2 + (c\Omega/m)^2}} \qquad \tan\delta = \frac{c\Omega/m}{\omega_0^2-\Omega^2} $$
