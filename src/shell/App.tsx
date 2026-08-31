/**
 * App — shell root. LAYER 2 (ARCHITECTURE.md §9).
 *
 * May import kernel, scene, modules/types, modules/registry, and react.
 * Must NOT import a concrete module implementation directly — modules
 * are loaded through `@/modules/registry`'s `loadModule()`.
 *
 * Hash routing (§19 — GitHub Pages needs no rewrite rules for it) via a
 * custom location hook (./routes/hashRouter.ts), not wouter's own
 * useHashLocation — see that file's doc comment for why: §14's URL
 * format puts the query string INSIDE the hash fragment
 * (`#/m/id?v=1&...`), which wouter's own hash hook doesn't produce or
 * parse.
 */
import React, { useEffect, useRef } from 'react';
import { Router, Switch, Route, Redirect } from 'wouter';
import { Gallery } from './routes/Gallery';
import { ModuleView } from './routes/ModuleView';
import { About } from './routes/About';
import { useHashLocation } from './routes/hashRouter';
import { mountDemoScene } from '@/scene/demoScene';
import { SettingsMenu } from './settings';
import { UpdateNotice } from './serviceWorker/UpdateNotice';
import { useAppStore } from './state/store';
import { loadPrefs } from './state/prefsStorage';

/**
 * M2's throwaway "exercise every glyph" scene (ARCHITECTURE.md §20 M2)
 * — superseded as the app's actual content by real module routes, but
 * kept reachable at this unlisted path since it's still what
 * tests/e2e/perf.spec.ts and smoke.spec.ts measure against for M2's
 * acceptance evidence. Not part of the module registry, not linked
 * from the gallery — `_`-prefixed in spirit, same as `_template`.
 */
function DemoSceneDevRoute(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return mountDemoScene(canvas);
  }, []);
  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  );
}

export function App(): React.ReactElement {
  // Load persisted display prefs once, before anything else reads
  // them (a module mount's own store.hydrate() preserves whatever
  // prefs are already in the store — see store.ts — so this has to
  // land first).
  useEffect(() => {
    useAppStore.setState({ prefs: loadPrefs() });
  }, []);

  const prefs = useAppStore((s) => s.prefs);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', prefs.theme);
    document.documentElement.classList.toggle('projector-mode', prefs.projector);
  }, [prefs.theme, prefs.projector]);

  return (
    <Router hook={useHashLocation}>
      <SettingsMenu />
      <UpdateNotice />
      <Switch>
        <Route path="/" component={Gallery} />
        <Route path="/about" component={About} />
        <Route path="/_dev/demo-scene" component={DemoSceneDevRoute} />
        <Route path="/m/:id">{(params) => <ModuleView moduleId={params.id} />}</Route>
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </Router>
  );
}
