## What am I looking at?

Two carts on a frictionless track, closing on each other and colliding
once. Cart 1 starts on the left, cart 2 on the right; each is drawn with
a velocity arrow, and a grey marker tracks their center of mass. The
"Restitution coefficient" slider sweeps the collision from perfectly
elastic ($e=1$) to perfectly inelastic ($e=0$, the carts stick together
and move off as one).

## What should I notice?

Watch the **total momentum** readout: it never changes, no matter what
$e$ is set to — momentum is conserved in every collision, elastic or
not. **Kinetic energy** is different: it's only conserved at $e=1$;
dial $e$ down and some of it is lost (to sound, heat, deformation —
whatever the real collision isn't modeling).

Try equal masses with $e=1$: the two velocities swap exactly. Try a
big mass difference: the heavy cart barely notices the light one.

Turn on "View in center-of-mass frame." The picture recenters on the
grey marker, and its velocity arrow shrinks to nothing — in its own
frame, the center of mass never moves. That's true throughout the
whole collision, not just before or after it, because momentum
conservation fixes the center-of-mass velocity independently of $e$.

## The equations

Momentum conservation:

$$ m_1 u_1 + m_2 u_2 = m_1 v_1' + m_2 v_2' $$

Restitution (separation speed after = $e$ × approach speed before):

$$ v_2' - v_1' = e\,(u_1 - u_2) $$

Solving the two together:

$$ v_1' = u_1 - \frac{(1+e)\,m_2\,(u_1-u_2)}{m_1+m_2} $$

$$ v_2' = u_2 + \frac{(1+e)\,m_1\,(u_1-u_2)}{m_1+m_2} $$

Center-of-mass velocity, constant for all $t$ regardless of $e$:

$$ v_{cm} = \frac{m_1 u_1 + m_2 u_2}{m_1 + m_2} $$
