<!--
  The "what am I looking at" panel (ARCHITECTURE.md §9). Optional but
  strongly encouraged — a visualization without a caption teaches less.
  Keep it short: what the student sees, what to notice, and the
  governing equation in KaTeX.

  Plain markdown, not MDX (ADR 0002): prose plus KaTeX, no components.
-->

## What am I looking at?

A puck slides across a rotating platform with **no real force acting on
it at all** — frictionless, force-free. In the **lab frame**, that means
exactly what Newton's first law says it should: a straight line at
constant speed, shown by the green velocity arrow (constant length,
constant direction) and the straight trace. The grey mark painted on the
platform visibly orbits, showing the platform spinning underneath.

Switch to the **rotating frame** and the picture changes completely,
even though nothing about the puck's actual motion has: this is the same
puck, the same instant, just redrawn in the coordinates of an observer
standing on the platform. The grey mark now sits still — by definition,
since it's part of the frame this observer calls "fixed" — but the
puck's path curves, because the platform is turning underneath the
straight line the puck is actually tracing.

## What should I notice?

The rotating observer, working only within their own (non-inertial)
frame, has to explain that curving path somehow — Newton's laws don't
hold as written in a rotating frame unless you add two extra
acceleration terms: **centrifugal** ($\vec{a}_{cf} = -\omega^2\vec{r}\,'$,
pointing toward the axis) and **Coriolis** ($\vec{a}_{Cor} =
-2\vec{\omega}\times\vec{v}\,'$, perpendicular to the observer's own
velocity). The three acceleration arrows at the puck are drawn tip to
tail on purpose: centrifugal, then Coriolis from its tip, then the
dashed "observed" acceleration $\vec{a}\,'$ closing the triangle exactly
back to the puck. That closed loop **is** the physics — since the real
acceleration is zero, the fictitious terms have nowhere to go but cancel
it exactly. The `residual` readout is that same statement as a number:
it should read (numerically) zero everywhere along the trajectory.

Set $\omega = 0$: the rotating frame stops rotating, collapses onto the
lab frame exactly, and the fictitious terms vanish. This module holds
$\omega$ constant, so the **Euler term** ($\vec{\alpha}\times\vec{r}\,'$)
never appears here — spin the platform up or down and it would.

## The equations

$$ \vec{r}(t) = \vec{r}_0 + \vec{v}_0\,t \qquad \vec{a}(t) = 0 $$

$$ \vec{r}\,'(t) = R(-\omega t)\,\vec{r}(t) \qquad \vec{v}\,' = R(-\omega t)\,\vec{v} - \vec{\omega}\times\vec{r}\,' $$

$$ 0 = \vec{a}\,' + \underbrace{2\vec{\omega}\times\vec{v}\,'}_{\text{Coriolis}} + \underbrace{\vec{\omega}\times(\vec{\omega}\times\vec{r}\,')}_{\text{centrifugal}} $$
