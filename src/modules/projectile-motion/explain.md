## What am I looking at?

A point mass launched under gravity alone — no air resistance, no spin,
no bounce. The marker's position is not simulated step by step; it is
read directly off the closed-form kinematics equations at whatever
instant $t$ the timeline is at, so scrubbing the timeline forward and
backward is exact and instantaneous.

The launch can be defined two ways — pick one with the radio buttons:

- **Angle + speed**: a launch **speed** $v_0$, an **elevation** angle
  $\theta$ above the horizontal, and an **azimuth** angle $\phi$ that
  rotates the horizontal launch direction (zero azimuth keeps everything
  in the default 2D plane).
- **Velocity vector**: the launch velocity $\vec{v}_0$ given directly as
  a vector — both its direction and its magnitude at once. It defaults
  to the same 2D plane as the angle option (its third component is
  zero).

Either way, the **start position** $\vec{r}_0$ can be moved off the
origin too, in all three dimensions — try dragging it in the viewport.

## What should I notice?

- The horizontal motion is uniform: the marker covers equal horizontal
  distance in equal time, regardless of the launch direction or $g$.
- The vertical motion (measured along whichever axis is "up") is exactly
  the free-fall you'd see from throwing something straight up — same
  $-\tfrac12 g t^2$ term — just added on top of uniform drift in the
  other two directions.
- **Azimuth changes where the trajectory points, but never its shape**:
  range, max height, and flight time are unaffected by rotating the
  launch direction within the horizontal plane — only elevation and
  speed decide those. Uncheck "2D-only" in the settings menu (or set a
  nonzero azimuth) to orbit the camera and see the parabola tip sideways
  out of the default plane.
- The trajectory (toggle "Trajectory trace") is a parabola. Its peak is
  where the vertical velocity component crosses zero — exactly halfway
  through the flight (when starting at the ground plane), which is why
  the parabola is symmetric about its peak.
- Raising elevation toward $45°$ increases the range for a fixed speed;
  past $45°$ the range falls again even though the max height keeps
  climbing. Try $30°$ and $60°$ at the same speed and gravity: they land
  at the same range but not the same height.
- Moving the start position up shifts the whole flight higher and makes
  it last longer; moving it down (below the ground reference plane) has
  the marker freeze immediately rather than launching from below ground.
- The marker holds at the landing point (the world's vertical $=0$
  plane) once it gets there, instead of continuing on underground.

## The equations

Position as a function of time, measured in world coordinates (`up` is
whichever axis the viewer has set — see PHYSICS_CONVENTIONS.md):

$$ \vec{r}(t) = \vec{r}_0 + \vec{v}_0 t - \tfrac{1}{2} g t^2 \hat{u} $$

In angle mode, $\vec{v}_0$ is built from speed and the two launch angles:

$$ \vec{v}_0 = v_0\Big(\cos\theta\big(\cos\phi\, \hat{f} + \sin\phi\, \hat{s}\big) + \sin\theta\, \hat{u}\Big) $$

where $\hat{u}$ is the up axis, $\hat{f}$ is the fixed horizontal
reference direction ($\phi = 0$), and $\hat{s} = \hat{u}\times\hat{f}$
is the other horizontal axis. Time of flight, range, and max height
(measured from the ground reference plane) follow from solving for
when the vertical component returns to zero:

$$ t_{\text{flight}} = \frac{v_{0,\text{vertical}} + \sqrt{v_{0,\text{vertical}}^2 + 2 g y_0}}{g} $$

$$ R = |\vec{v}_{0,\text{horizontal}}| \cdot t_{\text{flight}} \qquad\quad H = y_0 + \frac{v_{0,\text{vertical}}^2}{2g} $$
