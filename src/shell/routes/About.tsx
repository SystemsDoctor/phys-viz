/**
 * About route — project description, licensing (README.md / LICENSE),
 * and a link to docs/PHYSICS_CONVENTIONS.md for the colour/notation
 * legend. Static prose; no module code involved.
 */
import React from 'react';
import { Link } from 'wouter';

export function About(): React.ReactElement {
  return (
    <div className="pv-about">
      <p>
        <Link to="/">&larr; Back to the gallery</Link>
      </p>
      <h1>About PhysViz</h1>
      <p>
        PhysViz is a library of interactive, rotatable, toggleable physics visualizations for
        undergraduate mechanics and engineering courses — a static, client-only site with no server,
        no accounts, and no tracking.
      </p>
      <h2>Licensing</h2>
      <p>
        Code is licensed under the{' '}
        <a href="https://opensource.org/license/mit/" target="_blank" rel="noreferrer">
          MIT License
        </a>
        . Each module&apos;s explanatory text and figures (its <code>explain.md</code>) are licensed
        separately under{' '}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
          CC BY-SA 4.0
        </a>{' '}
        — code and educational content can be reused and adapted on their own, appropriate terms.
      </p>
      <h2>Colour and notation conventions</h2>
      <p>
        Every module uses the same semantic colour language for physical quantities (position,
        velocity, acceleration, force, and so on) — see <code>docs/PHYSICS_CONVENTIONS.md</code> in
        the repository for the full legend.
      </p>
    </div>
  );
}
