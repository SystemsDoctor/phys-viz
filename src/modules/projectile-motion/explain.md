## What am I looking at?

A point mass launched from the origin with speed $v_0$ at angle $\theta$
above the horizontal, moving under gravity alone — no air resistance, no
spin, no bounce. The marker's position is not simulated step by step; it
is read directly off the closed-form kinematics equations at whatever
instant $t$ the timeline is at, so scrubbing the timeline forward and
backward is exact and instantaneous.

## What should I notice?

- The horizontal motion is uniform: the marker covers equal horizontal
  distance in equal time, regardless of $\theta$ or $g$.
- The vertical motion is exactly the free-fall you'd see from throwing
  something straight up — same $-\tfrac12 g t^2$ term — just added on
  top of that uniform horizontal drift.
- The trajectory (toggle "Trajectory trace") is a parabola. Its peak is
  where the vertical velocity component crosses zero, at $t = v_0
  \sin\theta / g$ — exactly halfway through the flight, which is why the
  parabola is symmetric about its peak.
- Raising $\theta$ toward $45°$ increases the range for a fixed $v_0$;
  past $45°$ the range falls again even though the max height keeps
  climbing. Try $30°$ and $60°$ at the same speed and gravity: they land
  at the same range but not the same height.
- Increasing $g$ (try the Moon vs. Earth) shortens the flight and shrinks
  both the range and the max height, without changing the launch angle
  that gives the longest range.
- The marker holds at the landing point once it reaches $y = 0$ instead
  of continuing on underground.

## The equations

Position as a function of time, measured from the launch point:

$$ x(t) = v_0 \cos\theta \; t \qquad\quad y(t) = v_0 \sin\theta \; t -
\tfrac{1}{2} g t^2 $$

Both scalars below follow from setting $y(t) = 0$ and solving for the
two closed-form quantities that don't require picking a specific $t$:

$$ R = \frac{v_0^2 \sin(2\theta)}{g} \qquad\quad H = \frac{(v_0
\sin\theta)^2}{2g} $$

where $R$ is the range (horizontal distance back to $y = 0$) and $H$ is
the maximum height.
