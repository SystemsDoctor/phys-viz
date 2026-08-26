/**
 * ModuleView route — `#/m/:id`. Lazily loads the module via
 * `loadModule(id)`, mounts the Viewport, and renders the auto-generated
 * control panel, layer manager, timeline, plots, readouts, and explain
 * panel around it. Wrapped in ModuleErrorBoundary (§9, §16).
 *
 * Owns everything ARCHITECTURE.md §13 says the shell (not a module)
 * must: the render loop subscribes to the Zustand store OUTSIDE React
 * and calls `instance.update()` directly; React only re-renders the
 * chrome (panels) around the canvas. Also owns: seeding state from the
 * URL (+ running migrations when the URL's v= is older than the
 * module's schemaVersion), syncing state back to the URL (debounced,
 * always `replace` — see hashRouter.ts's history-discipline note),
 * driving `stepped`/`parametric` time, group visibility per layer
 * toggle, and drag-to-param wiring (M3-6) via Viewport's picking.
 */
import React from 'react';
import { Link } from 'wouter';
import type { PhysicsModule, ModuleInstance, ModuleState } from '@/modules/types';
import { loadModule, loadExplain } from '@/modules/registry';
import { Viewport } from '@/scene/Viewport';
import { ParamPanel } from '../params';
import { LayerManager } from '../layers';
import { Timeline, DEFAULT_MAX_T } from '../timeline';
import { FixedStepAccumulator, SteppedScrubber, FIXED_DT } from '../timeline/driver';
import { ReadoutTable } from '../readouts';
import { TimeSeriesPlot } from '../plots/TimeSeriesPlot';
import { SweepPlot } from '../plots/SweepPlot';
import { ExplainPanel } from '../explain';
import { ModuleErrorBoundary } from '../errors';
import { usePresenterKeymap, KeymapOverlay } from '../presenter';
import { useAppStore, paramDefaults, DEFAULT_APP_STATE } from '../state/store';
import type { AppState, ParamValue } from '../state/store';
import { encodeState, decodeState } from '../state/urlCodec';
import { runMigrations } from '../state/migrations';
import { useHashSearch, navigateHash } from './hashRouter';
import { formatQuantity, DIMENSIONLESS } from '@/kernel/units';

const URL_SYNC_DEBOUNCE_MS = 250; // §14 hardening note, applies to every field written on this path, not just camera
const CAMERA_CYCLE = ['iso', '+x', '+y', '+z'] as const; // V key (§16)

function defaultCameraFor(module: PhysicsModule): AppState['camera'] {
  const preset = module.defaultView?.preset ?? 'iso';
  const projection = module.defaultView?.projection ?? 'ortho';
  // Mirrors urlCodec's own PRESETS table so a fresh mount's camera is
  // recognized as "the default" (and so gets omitted from the URL)
  // rather than immediately looking like a user-orbited state.
  const DIRS: Record<string, { theta: number; phi: number }> = {
    '+x': { theta: Math.PI / 2, phi: Math.PI / 2 },
    '+y': { theta: 0, phi: 0 },
    '+z': { theta: 0, phi: Math.PI / 2 },
    iso: { theta: Math.PI / 4, phi: Math.acos(1 / Math.sqrt(3)) },
  };
  const dir = DIRS[preset] ?? DIRS.iso;
  return { theta: dir.theta, phi: dir.phi, radius: 8, target: [0, 0, 0], projection };
}

export function ModuleView(props: { moduleId: string }): React.ReactElement {
  const { moduleId } = props;
  const [phase, setPhase] = React.useState<'loading' | 'not-found' | 'load-error' | 'ready'>(
    'loading',
  );
  const [module, setModule] = React.useState<PhysicsModule | null>(null);
  const [loadError, setLoadError] = React.useState<Error | null>(null);
  const [resetToken, setResetToken] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    setModule(null);
    loadModule(moduleId)
      .then((m) => {
        if (cancelled) return;
        setModule(m);
        setPhase('ready');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const err = e instanceof Error ? e : new Error(String(e));
        if (err.message.startsWith('Unknown module')) setPhase('not-found');
        else {
          setLoadError(err);
          setPhase('load-error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [moduleId]);

  if (phase === 'loading') return <div className="pv-loading">Loading…</div>;
  if (phase === 'not-found')
    return (
      <div className="pv-not-found">
        <p>
          No module named &ldquo;{moduleId}&rdquo;. <Link to="/">Back to the gallery</Link>
        </p>
      </div>
    );
  if (phase === 'load-error')
    return (
      <div className="pv-not-found">
        <p>
          Couldn&apos;t load &ldquo;{moduleId}&rdquo;: {loadError?.message}.{' '}
          <Link to="/">Back to the gallery</Link>
        </p>
      </div>
    );
  if (!module) return <></>; // unreachable given the phase checks above; keeps TS narrowing happy

  return (
    <ModuleErrorBoundary
      moduleId={moduleId}
      onReset={() => {
        navigateHash(`/m/${moduleId}`, { replace: true });
        setResetToken((k) => k + 1);
      }}
    >
      <ModuleViewInner key={`${moduleId}-${resetToken}`} module={module} />
    </ModuleErrorBoundary>
  );
}

function ModuleViewInner(props: { module: PhysicsModule }): React.ReactElement {
  const { module } = props;
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const panelRef = React.useRef<HTMLElement>(null);
  const viewportRef = React.useRef<Viewport | null>(null);
  const instanceRef = React.useRef<ModuleInstance | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [seeded, setSeeded] = React.useState(false);
  const [externalError, setExternalError] = React.useState<Error | null>(null);
  const [scalars, setScalars] = React.useState<Record<string, number>>({});
  const [series, setSeries] = React.useState<{ x: number; y: number }[]>([]);
  const [migrationNotice, setMigrationNotice] = React.useState<string | null>(null);
  const [explainSource, setExplainSource] = React.useState<string | null>(null);
  // Layout (ADR 0011, §15): the overlay panel can be collapsed so the
  // user can see the un-occluded scene; purely a per-visit viewing
  // convenience, not persisted or URL-serialized.
  const [panelCollapsed, setPanelCollapsed] = React.useState(false);

  // Recenter (ADR 0011/0012): the floating panel overlays the canvas's
  // right side, so a symmetric camera frustum centers content under the
  // panel, not in the visible pane. Shifts the rendered frame (a
  // `Viewport.centerInVisibleArea` "lens shift", not a scene/target
  // change) by how many pixels of the canvas's own right edge the panel
  // currently occludes — 0 when collapsed, absent, or genuinely stacked
  // below the canvas (the <640px layout), detected by actual geometry
  // rather than a duplicated CSS breakpoint constant.
  const centerInVisibleArea = React.useCallback(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    const panel = panelRef.current;
    if (!viewport || !canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    let occludedRightPx = 0;
    if (panel) {
      const panelRect = panel.getBoundingClientRect();
      const verticallyOverlapping =
        panelRect.top < canvasRect.bottom && panelRect.bottom > canvasRect.top;
      if (verticallyOverlapping) {
        occludedRightPx = Math.max(0, canvasRect.right - panelRect.left);
      }
    }
    viewport.centerInVisibleArea(occludedRightPx);
  }, []);

  const search = useHashSearch();
  const initialSearchRef = React.useRef(search);
  const defaultCamera = React.useMemo(() => defaultCameraFor(module), [module]);

  // Seed the store once, from the URL (migrated if needed) merged onto
  // this module's own param/layer defaults.
  React.useEffect(() => {
    const codecCtx = {
      schemaVersion: module.manifest.schemaVersion,
      params: module.params,
      layers: module.layers,
      defaultCamera,
    };
    const decoded = decodeState(initialSearchRef.current, codecCtx);
    let params = decoded.params ?? paramDefaults(module.params);
    if (decoded.schemaVersion < module.manifest.schemaVersion) {
      const result = runMigrations(
        module.manifest.id,
        decoded.schemaVersion,
        module.manifest.schemaVersion,
        params,
      );
      if (result.migrated) {
        params = result.params as typeof params;
      } else {
        // §14: an unmigratable link loads defaults with a non-blocking
        // notice, never an error.
        params = paramDefaults(module.params);
        setMigrationNotice(
          `This link was made for an older version of "${module.manifest.title}" and couldn't be fully updated — showing defaults instead.`,
        );
      }
    }
    useAppStore.getState().hydrate({
      moduleId: module.manifest.id,
      params,
      layers: decoded.layers ?? {},
      time: decoded.time ?? DEFAULT_APP_STATE.time,
      camera: decoded.camera ?? defaultCamera,
      ui: DEFAULT_APP_STATE.ui,
    });
    setSeeded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module]);

  // explain.md (§9) is optional and loaded lazily — its content never
  // pulls into the initial bundle (registry.ts's explainModules glob is
  // not `eager`).
  React.useEffect(() => {
    let cancelled = false;
    setExplainSource(null);
    loadExplain(module.manifest.id).then((source) => {
      if (!cancelled) setExplainSource(source);
    });
    return () => {
      cancelled = true;
    };
  }, [module]);

  // Construct the Viewport + module instance once; dispose on unmount.
  // Gated on `seeded`: Viewport/glyph creation and the panels below all
  // read store.getState().params, which must already hold real values
  // (not DEFAULT_APP_STATE's {}) — otherwise a control like VectorPad
  // indexes into an undefined value on its very first render, before
  // ANY effect (including this one) has had a chance to run. Hit
  // exactly this in a real browser (Playwright), invisible to the
  // jsdom-mocked unit tests since they never render past the mocked
  // loadModule() boundary.
  React.useEffect(() => {
    if (!seeded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const viewport = new Viewport({
      canvas,
      upAxis: useAppStore.getState().prefs.upAxis,
      projectorMode: useAppStore.getState().prefs.projector,
      showGrid: useAppStore.getState().prefs.showGrid,
      reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    });
    viewportRef.current = viewport;

    // Seed the camera from state.camera (the module's own defaultView,
    // resolved by defaultCameraFor — or a decoded URL's bookmarked
    // orientation) — a fresh Viewport otherwise starts at its own
    // internal placeholder angle, never the module's declared preset.
    viewport.camera.setState(useAppStore.getState().camera);

    // Global 2D lock (ADR 0007, extended globally by ADR 0011): orbit
    // suppressed and projection forced orthographic by default — pan/
    // zoom stay live — regardless of the module's own `dimensions`
    // (previously only `dimensions: 2` modules got this, which is why
    // the "Free rotation" setting had no visible effect anywhere else).
    // "Free rotation" in the settings menu (ui.rotationReleased) opts
    // back into full orbit + the module's own declared projection for
    // ANY module. Checked immediately at mount, not left to the
    // live-prefs effect below, since the setting can already be on.
    if (!useAppStore.getState().ui.rotationReleased) {
      viewport.camera.setLockedToPlane(true);
      viewport.camera.setProjection('ortho');
    }
    centerInVisibleArea();

    // Draggable vector params (M3-6): the module never calls
    // ctx.draggable() itself (§10 — modules do no pointer/mouse code);
    // the shell registers a pick target on the module's behalf for
    // every `draggable: true` vector param, using the SAME ctx the
    // module's own glyphs attach to, so the pick target and the drawn
    // arrow it belongs to move together automatically.
    const draggableHandles = module.params
      .filter(
        (p): p is typeof p & { kind: 'vector'; draggable: true } =>
          p.kind === 'vector' && p.draggable === true,
      )
      .map((p) =>
        viewport.ctx.draggable({
          paramKey: p.key,
          getPoint: () => useAppStore.getState().params[p.key] as [number, number, number],
        }),
      );

    try {
      instanceRef.current = module.create(viewport.ctx);
    } catch (e) {
      setExternalError(e instanceof Error ? e : new Error(String(e)));
    }
    setMounted(true);

    return () => {
      for (const h of draggableHandles) h.dispose();
      instanceRef.current?.dispose();
      instanceRef.current = null;
      viewport.dispose();
      viewportRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, seeded]);

  const moduleStateOf = React.useCallback(
    (s: AppState): ModuleState => ({ params: s.params, layers: s.layers, t: s.time.t }),
    [],
  );

  const runUpdate = React.useCallback(
    (s: AppState) => {
      const instance = instanceRef.current;
      if (!instance) return;
      try {
        instance.update(moduleStateOf(s));
        const values = instance.scalars(moduleStateOf(s));
        setScalars(values);
        const plottableKey = module.scalars.find((sc) => sc.plottable)?.key;
        if (plottableKey && module.manifest.timeModel !== 'static') {
          setSeries((prev) => {
            const next = [...prev, { x: s.time.t, y: values[plottableKey] }];
            return next.length > 500 ? next.slice(next.length - 500) : next;
          });
        }
      } catch (e) {
        setExternalError(e instanceof Error ? e : new Error(String(e)));
      }
    },
    [module, moduleStateOf],
  );

  // Drive instance.update() from the store, OUTSIDE React (§13) — this
  // subscription, not a render, is what keeps the scene in sync.
  React.useEffect(() => {
    if (!mounted) return;
    runUpdate(useAppStore.getState());
    return useAppStore.subscribe((s) => runUpdate(s));
  }, [mounted, runUpdate]);

  // Layer visibility -> scene groups.
  React.useEffect(() => {
    if (!mounted) return;
    const apply = (s: AppState): void => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      for (const def of module.layers)
        viewport.setGroupVisible(def.key, s.layers[def.key] ?? def.default);
    };
    apply(useAppStore.getState());
    return useAppStore.subscribe(apply);
  }, [mounted, module.layers]);

  // Re-center whenever the panel's own occlusion changes (collapsed vs.
  // expanded) — otherwise collapsing/expanding leaves the frame shifted
  // for a pane that's no longer covered (or now is).
  React.useEffect(() => {
    if (!mounted) return;
    centerInVisibleArea();
  }, [mounted, panelCollapsed, centerInVisibleArea]);

  // Live prefs (M3-41/42, ADR 0011): up-axis, projector mode, the
  // reference grid, and free rotation can all change while a module is
  // already mounted (the settings menu is global, not per-route), so
  // the already-constructed Viewport needs to react — none of these are
  // ViewportOptions fixed at construction time.
  React.useEffect(() => {
    if (!mounted) return;
    let lastUpAxis = useAppStore.getState().prefs.upAxis;
    let lastProjector = useAppStore.getState().prefs.projector;
    let lastShowGrid = useAppStore.getState().prefs.showGrid;
    let lastRotationReleased = useAppStore.getState().ui.rotationReleased;
    return useAppStore.subscribe((s) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      if (s.prefs.upAxis !== lastUpAxis) {
        lastUpAxis = s.prefs.upAxis;
        viewport.camera.setUpAxis(s.prefs.upAxis, true);
      }
      if (s.prefs.projector !== lastProjector) {
        lastProjector = s.prefs.projector;
        viewport.setProjectorMode(s.prefs.projector);
      }
      if (s.prefs.showGrid !== lastShowGrid) {
        lastShowGrid = s.prefs.showGrid;
        viewport.setGridVisible(s.prefs.showGrid);
      }
      if (s.ui.rotationReleased !== lastRotationReleased) {
        lastRotationReleased = s.ui.rotationReleased;
        if (s.ui.rotationReleased) {
          // Restore full orbit AND the module's own natural projection
          // (persp for a module that declared one) — applies to every
          // module, not just `dimensions: 2` ones (ADR 0011).
          viewport.camera.setLockedToPlane(false);
          viewport.camera.setProjection(defaultCamera.projection);
        } else {
          // Re-lock: animate back to the module's own default view (its
          // defaultView preset, or '+z' if it declared none) via the
          // same ~400ms eased transition camera presets use, THEN force
          // orthographic and freeze rotation once the tween settles —
          // locking immediately would freeze it mid-transition.
          const preset = module.defaultView?.preset ?? '+z';
          viewport.camera.goTo(preset, 400);
          window.setTimeout(() => {
            viewport.camera.setLockedToPlane(true);
            viewport.camera.setProjection('ortho');
          }, 420);
        }
      }
    });
  }, [mounted, module, defaultCamera]);

  // Time driving: parametric advances t directly; stepped drives a
  // fixed-timestep accumulator while playing, and reset()+chunked
  // fast-forward (SteppedScrubber) whenever t is set externally (scrub,
  // Timeline's step buttons, or the initial URL-decoded t).
  // A module may override the shell's default fixed timestep (ADR 0010,
  // resolving contract gap C-1); resolved once here rather than re-read
  // per frame, since manifest.stepDt never changes for a mounted module.
  const stepDt = module.manifest.stepDt ?? FIXED_DT;
  const accumulatorRef = React.useRef(new FixedStepAccumulator(stepDt));
  const scrubberRef = React.useRef(new SteppedScrubber(stepDt));
  const lastTRef = React.useRef(useAppStore.getState().time.t);
  const programmaticRef = React.useRef(false);

  React.useEffect(() => {
    if (!mounted || module.manifest.timeModel === 'static') return;
    let frameId = 0;
    let lastMs = 0;

    function tick(nowMs: number): void {
      const dt = lastMs ? (nowMs - lastMs) / 1000 : 0;
      lastMs = nowMs;
      const s = useAppStore.getState();
      const instance = instanceRef.current;

      // Predict mode (§9, M3-27): freeze time at t=0 until the student
      // commits — no scrub, no play, no stepped fast-forward, while
      // active. LayerManager already gates individual reveal-tagged
      // layers behind their own "Reveal" button; this is the other
      // half of the same feature.
      if (s.ui.predictMode) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      if (scrubberRef.current.inProgress) {
        const progress = scrubberRef.current.tick((fixedDt) =>
          instance?.step?.(fixedDt, moduleStateOf(s)),
        );
        programmaticRef.current = true;
        useAppStore.getState().patchTime({ t: progress.t });
      } else if (s.time.playing) {
        // Clamp playback to the timeline's own [0, DEFAULT_MAX_T] bound
        // and stop once a bound is reached — a bare `<input type="range"
        // max={maxT}>` only clamps where the thumb is DRAWN, it never
        // stops the underlying `t` (and thus playback) from growing past
        // it, so without this the run never actually finished.
        if (module.manifest.timeModel === 'stepped') {
          const taken = accumulatorRef.current.advance(dt, s.time.speed, (fixedDt) =>
            instance?.step?.(fixedDt, moduleStateOf(s)),
          );
          if (taken > 0) {
            const rawT = s.time.t + taken * stepDt;
            programmaticRef.current = true;
            if (rawT >= DEFAULT_MAX_T) {
              useAppStore.getState().patchTime({ t: DEFAULT_MAX_T, playing: false });
            } else {
              useAppStore.getState().patchTime({ t: rawT });
            }
          }
        } else {
          const rawT = s.time.t + dt * s.time.speed * s.time.direction;
          programmaticRef.current = true;
          if (rawT >= DEFAULT_MAX_T) {
            useAppStore.getState().patchTime({ t: DEFAULT_MAX_T, playing: false });
          } else if (s.time.direction === -1 && rawT <= 0) {
            // Only reverse playback can reach the lower bound — forward
            // playback starting at t=0 must not immediately stop itself.
            useAppStore.getState().patchTime({ t: 0, playing: false });
          } else {
            useAppStore.getState().patchTime({ t: rawT });
          }
        }
      }
      frameId = requestAnimationFrame(tick);
    }
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [mounted, module, moduleStateOf, stepDt]);

  // An externally-set t (scrub, step buttons, URL-decoded initial t)
  // triggers a stepped module's reset()+fast-forward. Playback's own
  // programmatic t writes above are excluded via `programmaticRef`.
  React.useEffect(() => {
    if (!mounted || module.manifest.timeModel !== 'stepped') return;
    return useAppStore.subscribe((s) => {
      if (programmaticRef.current) {
        programmaticRef.current = false;
        lastTRef.current = s.time.t;
        return;
      }
      if (s.time.t === lastTRef.current) return;
      lastTRef.current = s.time.t;
      const instance = instanceRef.current;
      if (!instance?.reset) return;
      scrubberRef.current.begin(s.time.t, () => instance.reset?.(moduleStateOf(s)));
    });
  }, [mounted, module, moduleStateOf]);

  // State -> URL, debounced, always `replace` (see hashRouter.ts). A
  // PLAIN debounce (clearTimeout + reset on every change) starves
  // forever under continuous churn — while time is playing, t changes
  // every rAF frame and keeps resetting the SAME timer, so a param
  // edit made mid-playback would never reach the URL either, not just
  // t itself. A max-wait ceiling forces a sync periodically regardless
  // of ongoing churn, same idea as lodash's debounce({maxWait}).
  const MAX_WAIT_MS = 1000;
  React.useEffect(() => {
    if (!mounted) return;
    let timeoutId = 0;
    let firstPendingAt: number | null = null;
    const codecCtx = {
      schemaVersion: module.manifest.schemaVersion,
      params: module.params,
      layers: module.layers,
      defaultCamera,
    };
    const flush = (s: AppState): void => {
      window.clearTimeout(timeoutId);
      firstPendingAt = null;
      navigateHash(`/m/${module.manifest.id}${encodeState(s, codecCtx)}`, { replace: true });
    };
    return useAppStore.subscribe((s) => {
      const now = Date.now();
      if (firstPendingAt === null) firstPendingAt = now;
      window.clearTimeout(timeoutId);
      if (now - firstPendingAt >= MAX_WAIT_MS) {
        flush(s);
        return;
      }
      timeoutId = window.setTimeout(() => flush(s), URL_SYNC_DEBOUNCE_MS);
    });
  }, [mounted, module, defaultCamera]);

  // Drag-to-param (M3-6): all pointer handling lives here, never in a
  // module. pointerdown ray-casts against every registered draggable
  // target (Viewport.pick); a hit starts a drag that projects
  // subsequent pointer moves onto the camera-facing plane through the
  // dragged point's current value (Viewport.screenPointOnPlane) — the
  // usual "drag a point across the screen" plane choice, avoiding any
  // depth ambiguity a world-axis-aligned plane would have.
  React.useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    let dragging: { paramKey: string; planeNormal: readonly [number, number, number] } | null =
      null;

    function toCanvasPx(e: PointerEvent): [number, number] {
      const rect = canvas!.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    }

    function onPointerDown(e: PointerEvent): void {
      const [x, y] = toCanvasPx(e);
      const hit = viewport!.pick(x, y);
      if (!hit) return;
      canvas!.setPointerCapture(e.pointerId);
      dragging = { paramKey: hit.paramKey, planeNormal: viewport!.cameraForward() };
    }

    function onPointerMove(e: PointerEvent): void {
      if (!dragging) return;
      const [x, y] = toCanvasPx(e);
      const current = useAppStore.getState().params[dragging.paramKey] as
        [number, number, number] | undefined;
      if (!current) return;
      const point = viewport!.screenPointOnPlane(x, y, current, dragging.planeNormal);
      if (point) useAppStore.getState().setParam(dragging.paramKey, [point[0], point[1], point[2]]);
    }

    function onPointerUp(): void {
      dragging = null;
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, [mounted]);

  // Keyboard map (§16). Presenter mode's visual side is a CSS class
  // below, driven by ui.presenterMode; this only wires the keys.
  const cameraCycleIndexRef = React.useRef(0);
  const keymapHandlers = React.useMemo<Record<string, () => void>>(() => {
    const handlers: Record<string, () => void> = {
      ' ': () =>
        useAppStore.getState().patchTime({ playing: !useAppStore.getState().time.playing }),
      ArrowRight: () =>
        useAppStore.getState().patchTime({ t: useAppStore.getState().time.t + 0.1 }),
      ArrowLeft: () =>
        useAppStore.getState().patchTime({ t: Math.max(0, useAppStore.getState().time.t - 0.1) }),
      'Shift+ArrowRight': () =>
        useAppStore.getState().patchTime({ t: useAppStore.getState().time.t + 1 }),
      'Shift+ArrowLeft': () =>
        useAppStore.getState().patchTime({ t: Math.max(0, useAppStore.getState().time.t - 1) }),
      r: () =>
        useAppStore.getState().reset({
          params: paramDefaults(module.params),
          layers: Object.fromEntries(module.layers.map((l) => [l.key, l.default])),
        }),
      p: () =>
        useAppStore.getState().patchUi({ presenterMode: !useAppStore.getState().ui.presenterMode }),
      f: () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      },
      c: () => navigator.clipboard?.writeText(window.location.href),
      v: () => {
        cameraCycleIndexRef.current = (cameraCycleIndexRef.current + 1) % CAMERA_CYCLE.length;
        viewportRef.current?.camera.goTo(CAMERA_CYCLE[cameraCycleIndexRef.current]);
      },
    };
    module.layers.slice(0, 9).forEach((layer, i) => {
      handlers[String(i + 1)] = () =>
        useAppStore
          .getState()
          .setLayer(layer.key, !(useAppStore.getState().layers[layer.key] ?? layer.default));
    });
    return handlers;
  }, [module]);
  usePresenterKeymap(keymapHandlers);

  const state = useAppStore();

  // Canvas aria-label (§16): a text description of the current scene
  // for a screen reader, regenerated from the module's own declared
  // scalars — no per-module phrasing template (C-2 flags where the
  // phrasing comes from as an open question; this is the generic
  // fallback every module gets without writing anything).
  const canvasLabel = module.scalars
    .filter((s) => s.readout !== false)
    .map(
      (s) =>
        `${s.label}: ${formatQuantity({ value: scalars[s.key] ?? NaN, dim: s.unit ?? DIMENSIONLESS }).trim()}`,
    )
    .join(', ');

  // Sweep plot (M3-16): the shell's other generic plot type, wired
  // against the first param with a numeric range and the first
  // plottable scalar — no per-module declaration of "which param sweeps
  // against which scalar" exists in the contract, so this is the
  // generic default every module gets.
  // SweepPlot needs a genuine numeric range — an 'angle' param is
  // legitimately allowed to leave min/max unbounded (unlike 'number',
  // where they're required), so this can't just filter on kind.
  const sweepParam = module.params.find(
    (p) =>
      (p.kind === 'number' || p.kind === 'angle') && p.min !== undefined && p.max !== undefined,
  );
  const sweepScalar = module.scalars.find((s) => s.plottable);

  // Panel reorganization (ADR 0011): a param tagged `forLayer` only
  // matters once that layer is checked, so it's nested under that
  // layer's own disclosure instead of sitting in the flat always-on
  // list — "what do I want to visualize" (LayerManager) comes first,
  // then each checked item's own numeric/display options.
  const alwaysParams = module.params.filter((p) => p.forLayer === undefined);
  const paramsByLayer = new Map(
    module.layers.map((l) => [l.key, module.params.filter((p) => p.forLayer === l.key)]),
  );
  const setParamValue = (key: string, value: unknown): void =>
    useAppStore.getState().setParam(key, value as ParamValue);

  if (!seeded) return <div className="pv-loading">Loading…</div>;

  return (
    <div className={state.ui.presenterMode ? 'pv-module-view pv-presenter' : 'pv-module-view'}>
      {!state.ui.presenterMode && (
        <p className="pv-module-view__back">
          <Link to="/">&larr; Gallery</Link> / {module.manifest.title}
        </p>
      )}
      {migrationNotice && (
        <p className="pv-module-view__notice" role="status">
          {migrationNotice}
        </p>
      )}
      <div className="pv-module-view__layout">
        <canvas
          ref={canvasRef}
          className="pv-viewport-canvas"
          role="img"
          aria-label={canvasLabel || module.manifest.title}
        />
        <KeymapOverlay />
        {!state.ui.presenterMode && (
          <div className="pv-view-controls">
            <button
              type="button"
              className="pv-view-controls__btn"
              onClick={() => {
                viewportRef.current?.camera.goTo(module.defaultView?.preset ?? 'iso', 400);
                centerInVisibleArea();
              }}
            >
              Recenter view
            </button>
          </div>
        )}
        <aside
          ref={panelRef}
          className={
            panelCollapsed
              ? 'pv-module-view__panel pv-module-view__panel--collapsed'
              : 'pv-module-view__panel'
          }
        >
          <button
            type="button"
            className="pv-module-view__panel-collapse"
            aria-expanded={!panelCollapsed}
            aria-label={panelCollapsed ? 'Show panel' : 'Hide panel'}
            onClick={() => setPanelCollapsed((v) => !v)}
          >
            {panelCollapsed ? '«' : '»'}
          </button>
          <div
            className={
              panelCollapsed
                ? 'pv-module-view__panel-body pv-module-view__panel-body--hidden'
                : 'pv-module-view__panel-body'
            }
          >
            {alwaysParams.length > 0 && (
              <ParamPanel defs={alwaysParams} values={state.params} onChange={setParamValue} />
            )}
            {module.layers.some((l) => l.reveal) && (
              <button
                type="button"
                className="pv-release-rotation"
                onClick={() => {
                  const entering = !useAppStore.getState().ui.predictMode;
                  useAppStore.getState().patchUi({ predictMode: entering });
                  if (entering) useAppStore.getState().patchTime({ t: 0, playing: false });
                }}
              >
                {state.ui.predictMode ? 'Exit predict mode' : 'Predict, then reveal'}
              </button>
            )}
            {module.layers.length > 0 && (
              <LayerManager
                defs={module.layers}
                values={state.layers}
                predictMode={state.ui.predictMode}
                onChange={(key, value) => useAppStore.getState().setLayer(key, value)}
              />
            )}
            {module.layers.map((layer) => {
              const active = state.layers[layer.key] ?? layer.default;
              const params = paramsByLayer.get(layer.key) ?? [];
              if (!active || params.length === 0) return null;
              return (
                <details key={layer.key} open className="pv-layer-details">
                  <summary>{layer.label}</summary>
                  <ParamPanel defs={params} values={state.params} onChange={setParamValue} />
                </details>
              );
            })}
            <Timeline
              timeModel={module.manifest.timeModel}
              t={state.time.t}
              playing={state.time.playing}
              speed={state.time.speed}
              direction={state.time.direction}
              maxT={DEFAULT_MAX_T}
              onChange={(patch) => useAppStore.getState().patchTime(patch)}
            />
            <ReadoutTable defs={module.scalars} values={scalars} pinned={state.ui.presenterMode} />
            {series.length > 1 && module.scalars.find((s) => s.plottable) && (
              <TimeSeriesPlot
                series={series}
                xLabel="t"
                yLabel={module.scalars.find((s) => s.plottable)?.label ?? ''}
              />
            )}
            {sweepParam && sweepScalar && (
              <SweepPlot
                sweepParam={sweepParam}
                scalar={sweepScalar}
                evaluate={(v) => {
                  const instance = instanceRef.current;
                  if (!instance) return 0;
                  const s = useAppStore.getState();
                  // scalars() is documented pure (§10) — safe to call with
                  // a one-off shadow state without touching the real one.
                  return instance.scalars({
                    ...moduleStateOf(s),
                    params: { ...s.params, [sweepParam.key]: v },
                  })[sweepScalar.key];
                }}
              />
            )}
            {explainSource && <ExplainPanel source={explainSource} />}
          </div>
        </aside>
      </div>
      {externalError && (
        <p className="pv-module-view__error" role="alert">
          {externalError.message}
        </p>
      )}
    </div>
  );
}
