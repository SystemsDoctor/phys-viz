## What am I looking at?

Seven independent demonstrations, toggled as layers, sharing one rigid
box you can resize. Only the last one ("Dzhanibekov effect") actually
runs a simulation — everything else is a picture computed directly from
the current numbers, redrawn instantly if you change them.

## What should I notice?

**Torque**: drag $\vec{r}$ and $\vec{F}$. The dashed line is the moment
arm $d$ — the perpendicular distance from the pivot to the force's line
of action — and $|\vec\tau| = |\vec r||\vec F|\sin\theta = Fd$ either way
you compute it.

**Parallel axis**: the same box, two parallel axes. Moving the offset
axis away from the center of mass only ever _increases_ the moment of
inertia — $I$ about any axis is smallest through the center of mass.

**L vs ω**: spin the box about one of its own edges (not a principal
axis) and $\vec L$ visibly stops pointing along $\vec\omega$. This is
why a wobbling object needs a _net torque_ just to keep spinning at a
constant rate about an off-axis direction.

**Inertia ellipsoid**: the three principal axes and the ellipsoid whose
semi-axes are $\propto 1/\sqrt{I_i}$ — the long way through the ellipsoid
is the axis the box is _easiest_ to spin about.

**Precession**: a fast top released tilted doesn't fall — it precesses
around the vertical at a rate set by gravity fighting its own spin
angular momentum, with a small nutation ripple layered on top.

**Rolling**: the small point at the contact is the _instantaneous axis_
— it has zero velocity at that instant, even though the wheel's center
is moving at $v = \omega R$. The traced curve through a marked rim point
is a cycloid.

**Dzhanibekov effect**: spin the box about its _intermediate_-inertia
axis (not the largest or smallest) and watch it tumble unpredictably —
a torque-free rigid body's spin about the middle principal axis is
unstable. This is the one panel with no closed form, so it's the one
genuinely `stepped` piece of this module; scrubbing its timeline
re-integrates from $t=0$ rather than reversing.

## The equations

$$ \vec\tau = \vec{r} \times \vec{F} $$

$$ I_{d} = I_{cm} + m d_\perp^2 $$

$$ \vec{L} = I\vec\omega $$

$$ \Omega = \frac{mg\ell}{I_3\dot\psi} $$

$$ v = \omega R $$

$$ I\frac{d\vec\omega}{dt} = \vec\tau - \vec\omega \times (I\vec\omega) $$
