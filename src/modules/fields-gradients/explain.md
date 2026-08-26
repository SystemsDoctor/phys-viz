## What am I looking at?

A scalar heightmap $f(x,y)$ and a separate vector field $\vec F(x,y,z)$ —
type your own into the control panel. They're kept independent
deliberately: $\vec F = \nabla f$ would always have zero curl, which
would leave the curl paddlewheel motionless.

## What should I notice?

**Heightmap**: the colour bands are level curves — each band is a range
of constant height, so a band boundary is a genuine contour line.

**Gradient**: at the probe point, $\nabla f$ points straight across the
level-curve tangent, always at 90°, however you drag the probe or edit
$f$.

**Directional derivative**: rotate $\hat u$ and watch $D_{\hat u}f$
swing between $+|\nabla f|$ (aligned with the gradient) and
$-|\nabla f|$ (opposite it), passing through zero exactly when $\hat u$
is tangent to the level curve.

**Shrinking-box divergence**: drag the box smaller and
$\Phi/V$ (flux divided by volume) converges onto $\nabla\cdot\vec F$
evaluated at the box's center — that convergence, not the formula
alone, is *what divergence means*.

**Divergence theorem**: the same box's total surface flux and the volume
integral of its divergence agree to within quadrature error. With the
default field, the box's faces are flat and $\vec F$ is a low-degree
polynomial on them, so this pair is already indistinguishable even at
$n=1$ or $2$ — raise $n$ and nothing visibly changes, because there's
nothing left to converge.

**Curl paddlewheel**: drag the probe. The double-headed arrow is the
curl axis (a pseudovector — the double head marks it as one); the
curved arrow spins faster where $|\nabla\times\vec F|$ is larger, and
sits still wherever the field has no local rotation.

**Flux through a user-shaped surface**: the boundary circle never
moves — only `Cap depth` reshapes the surface stretched across it, from
a flat disk to a deep bowl. Unlike the box, the cap is *trig*-
parametrized, so this is where raising $n$ actually earns its keep:
watch `|circulation − curl flux|` visibly shrink as you raise the
quadrature-points slider, converging on the same number regardless of
how deep the cap is bowled — Stokes' theorem doesn't care about the
surface, only its boundary.

## The equations

$$ \nabla f \perp \text{level curve} $$

$$ D_{\hat u}f = \nabla f \cdot \hat u $$

$$ \nabla\cdot\vec F = \lim_{V\to0}\frac{1}{V}\oint_S \vec F\cdot d\vec A $$

$$ \oint_S \vec F\cdot d\vec A = \iiint_V (\nabla\cdot\vec F)\,dV $$

$$ \oint_C \vec F\cdot d\vec l = \iint_S (\nabla\times\vec F)\cdot d\vec A $$
