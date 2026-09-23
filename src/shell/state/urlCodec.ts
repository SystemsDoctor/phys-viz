/**
 * URL serialization — the bookmarkable-demo feature (ARCHITECTURE.md
 * §14). Hash routing, so GitHub Pages needs no rewrite rules.
 *
 *   #/m/<moduleId>?v=1&a=1,2,0&b=0,3,1&L=xp,proj&t=2.40&c=iso.o
 *
 * Rules:
 *  - `v=` schema version, always present, drives migration.
 *  - Params use urlKey; omit any param AT ITS DEFAULT VALUE.
 *  - `L=` comma-separated layer urlKeys that differ from default,
 *    `-` prefix means "turned off".
 *  - `t=` time, 2dp, omitted when 0.
 *  - `c=` camera, compactly encoded (`iso.o` = isometric, orthographic).
 *  - If the encoded string exceeds 1800 characters, fall back to
 *    `?z=<lz-string compressed blob>`.
 *
 * `encodeState`/`decodeState` operate on just the QUERY STRING (the part
 * after `#/m/<moduleId>` — the route itself carries the module id, so
 * the codec doesn't need to). `decodeState` always returns every
 * declared param/layer/time/camera/prefs field fully resolved (URL
 * value if present, module default otherwise) — not just the URL's
 * delta — so `decode(encode(defaults))` deep-equals `defaults` directly,
 * per the contract suite's assertion 8 (§18). Round-trips are exact for
 * every field EXCEPT `t=` (spec-mandated 2dp truncation) and a
 * preset-shorthand camera's radius/target (see `encodeCamera` below) —
 * both deliberate, documented lossy cases, not round-trip bugs.
 *
 * Camera is omitted entirely at the exact default (like every other
 * field); the short preset form (`<preset>.<proj>`) fires for a
 * named-preset orientation regardless of radius/target, since a preset
 * button re-fits those from scene content anyway; anything else uses
 * the fully explicit numeric form (`theta,phi,radius,tx,ty,tz.<proj>`).
 *
 * `prefs` (viewer display preferences, ADR 0009/§13) piggyback on the
 * same query string using `up=`/`th=`/`pj=`, each omitted at its
 * default — the specific key names aren't dictated by §14, only the
 * omit-at-default rule is.
 */
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { ParamDef, LayerDef } from '@/modules/types';
import type { AppState, ParamValue } from './store';
import { DEFAULT_CAMERA, DEFAULT_PREFS } from './store';
import { DEFAULT_MAX_T } from '../timeline';

export interface CodecContext {
  schemaVersion: number;
  params: ParamDef[];
  layers: LayerDef[];
  /** The camera state a fresh mount starts from — module's `defaultView` resolved to a full CameraState-shaped default, or DEFAULT_CAMERA if the module declares none. */
  defaultCamera?: AppState['camera'];
}

const MAX_LENGTH = 1800;

const PRESETS: Record<'iso' | '+x' | '+y' | '+z', { theta: number; phi: number }> = {
  '+x': { theta: Math.PI / 2, phi: Math.PI / 2 },
  '+y': { theta: 0, phi: 0 },
  '+z': { theta: 0, phi: Math.PI / 2 },
  iso: { theta: Math.PI / 4, phi: Math.acos(1 / Math.sqrt(3)) },
};

function encodeParamValue(value: ParamValue): string {
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(String).join(',');
  return encodeURIComponent(value);
}

/**
 * Guards a decoded `number`/`angle`/vector-component value against a
 * hand-edited or truncated bookmark URL (TASKS.md X-20): a non-finite
 * parse (`NaN`/`Infinity`, e.g. `?m1=` or `?m1=abc`) falls back to
 * `fallback` (the param's own declared default) rather than propagating
 * — every registered module's `update()`/`scalars()` treats its state as
 * trusted, not re-validating "can't happen" inputs (CLAUDE.md), so this
 * is the one place that trust boundary has to be enforced. A finite but
 * out-of-declared-range value is clamped to `[min, max]` rather than
 * rejected: this is the same "least surprising" behavior a `Slider`
 * control already has (dragging past an end pins at the end), so a
 * bookmark that carries a stale, since-narrowed range restores to the
 * nearest valid state instead of silently reviving an invalid one.
 * Recorded as ADR 0015.
 */
function clampDecodedNumber(value: number, fallback: number, min?: number, max?: number): number {
  if (!Number.isFinite(value)) return fallback;
  let clamped = value;
  if (min !== undefined) clamped = Math.max(min, clamped);
  if (max !== undefined) clamped = Math.min(max, clamped);
  return clamped;
}

function decodeParamValue(def: ParamDef, raw: string): ParamValue {
  switch (def.kind) {
    case 'toggle':
      return raw === '1';
    case 'vector': {
      const parts = raw.split(',').map(Number);
      return [0, 1, 2].map((i) =>
        clampDecodedNumber(parts[i], def.default[i], -def.range, def.range),
      ) as [number, number, number];
    }
    case 'number':
      return clampDecodedNumber(Number(raw), def.default, def.min, def.max);
    case 'angle':
      return clampDecodedNumber(Number(raw), def.default, def.min, def.max);
    case 'select': {
      // X-35: a hand-edited/stale value that no longer matches any
      // declared option falls back to the default, same as an
      // out-of-range number — never propagated as an opaque string a
      // module's Select control (and any switch on it) never expected.
      const decoded = decodeURIComponent(raw);
      return def.options.some((o) => o.value === decoded) ? decoded : def.default;
    }
    case 'expression':
      return decodeURIComponent(raw);
  }
}

function cameraEqual(a: AppState['camera'], b: AppState['camera']): boolean {
  return (
    a.theta === b.theta &&
    a.phi === b.phi &&
    a.radius === b.radius &&
    a.projection === b.projection &&
    a.target[0] === b.target[0] &&
    a.target[1] === b.target[1] &&
    a.target[2] === b.target[2]
  );
}

function encodeCamera(
  camera: AppState['camera'],
  defaultCamera: AppState['camera'],
): string | null {
  // Untouched default: omit entirely, like every other field.
  if (cameraEqual(camera, defaultCamera)) return null;

  const projLetter = camera.projection === 'ortho' ? 'o' : 'p';

  // A named preset is orientation-only (theta/phi) by design: clicking a
  // preset button re-fits radius/target from scene content, so encoding
  // *only* the preset name and re-deriving radius/target on load (the
  // same way the preset button itself would) is not lossy in practice —
  // it reproduces "the user is looking at +X", which is what a bookmark
  // is for. Radius/target are only carried explicitly for a free-orbited
  // view, where there is no preset to re-derive them from.
  for (const [name, dir] of Object.entries(PRESETS)) {
    if (camera.theta === dir.theta && camera.phi === dir.phi) return `${name}.${projLetter}`;
  }
  return `${camera.theta},${camera.phi},${camera.radius},${camera.target[0]},${camera.target[1]},${camera.target[2]}.${projLetter}`;
}

function decodeCamera(raw: string, defaultCamera: AppState['camera']): AppState['camera'] {
  const dot = raw.lastIndexOf('.');
  const body = dot === -1 ? raw : raw.slice(0, dot);
  const projLetter = dot === -1 ? 'o' : raw.slice(dot + 1);
  const projection = projLetter === 'p' ? 'persp' : 'ortho';

  if (body in PRESETS) {
    const dir = PRESETS[body as keyof typeof PRESETS];
    return {
      theta: dir.theta,
      phi: dir.phi,
      radius: defaultCamera.radius,
      target: [...defaultCamera.target],
      projection,
    };
  }
  const parts = body.split(',').map(Number);
  // X-35: `?? default` only catches a MISSING component (undefined); a
  // present-but-garbled one (`c=NaN,0,5` or a truncated bookmark) parses
  // to `NaN`/`Infinity`, which isn't nullish and reached `camera.setState`
  // unguarded. Route every component through the same finite-number
  // guard `clampDecodedNumber` already gives ordinary params. Radius
  // additionally gets a small positive floor — zero or negative puts the
  // camera behind or on top of its own target.
  return {
    theta: clampDecodedNumber(parts[0], defaultCamera.theta),
    phi: clampDecodedNumber(parts[1], defaultCamera.phi),
    radius: clampDecodedNumber(parts[2], defaultCamera.radius, 0.01),
    target: [
      clampDecodedNumber(parts[3], 0),
      clampDecodedNumber(parts[4], 0),
      clampDecodedNumber(parts[5], 0),
    ],
    projection,
  };
}

export function encodeState(state: AppState, ctx: CodecContext): string {
  const defaultCamera = ctx.defaultCamera ?? DEFAULT_CAMERA;
  const query = new URLSearchParams();
  query.set('v', String(ctx.schemaVersion));

  for (const p of ctx.params) {
    const value = state.params[p.key];
    if (value === undefined) continue;
    if (encodeParamValue(value) === encodeParamValue(p.default)) continue;
    query.set(p.urlKey, encodeParamValue(value));
  }

  const layerTokens: string[] = [];
  for (const l of ctx.layers) {
    const value = state.layers[l.key] ?? l.default;
    if (value === l.default) continue;
    layerTokens.push(value ? l.urlKey : `-${l.urlKey}`);
  }
  if (layerTokens.length > 0) query.set('L', layerTokens.join(','));

  if (state.time.t !== 0) query.set('t', state.time.t.toFixed(2));

  const cameraToken = encodeCamera(state.camera, defaultCamera);
  if (cameraToken) query.set('c', cameraToken);

  if (state.prefs.upAxis !== DEFAULT_PREFS.upAxis) query.set('up', state.prefs.upAxis);
  if (state.prefs.theme !== DEFAULT_PREFS.theme) query.set('th', state.prefs.theme);
  if (state.prefs.projector !== DEFAULT_PREFS.projector) query.set('pj', '1');
  if (state.prefs.showGrid !== DEFAULT_PREFS.showGrid)
    query.set('gr', state.prefs.showGrid ? '1' : '0');
  if (state.prefs.gridPlaneXY !== DEFAULT_PREFS.gridPlaneXY) query.set('gxy', '1');
  if (state.prefs.gridPlaneXZ !== DEFAULT_PREFS.gridPlaneXZ) query.set('gxz', '1');
  if (state.prefs.gridPlaneYZ !== DEFAULT_PREFS.gridPlaneYZ) query.set('gyz', '1');

  const full = `?${query.toString()}`;
  if (full.length <= MAX_LENGTH) return full;

  // Rare: only a sandbox module with long expression params should ever
  // hit this. Compress the whole query string as one blob instead.
  const blob = compressToEncodedURIComponent(query.toString());
  return `?z=${blob}`;
}

export interface DecodedState extends Partial<AppState> {
  /** The `v=` the URL was actually encoded at — may be older than `ctx.schemaVersion`; the caller (ModuleView) is what runs migrations to bridge the gap. */
  schemaVersion: number;
  /**
   * X-35: true when `v=` was present but not a trustworthy integer in
   * `[0, ctx.schemaVersion]` — garbled (`v=abc`/`v=NaN`) or from a
   * NEWER schema this build doesn't know how to read. Every other field
   * on this object is then just `ctx`'s defaults (params/layers/camera
   * decoding is skipped entirely, since it would mean guessing at a
   * format this code doesn't recognize). The caller (ModuleView) shows
   * the same "couldn't be fully updated — showing defaults" notice §14
   * already uses for an unmigratable OLDER version.
   */
  unrecognizedVersion?: boolean;
}

/** X-35: caps how large a `z=` blob's INPUT and its decompressed OUTPUT
 * may be, so a hand-crafted link can't force a multi-megabyte
 * decompression (lz-string has no built-in ratio limit) — a sub-audit
 * measured an 8.3K-character blob inflating past 10M characters. Well
 * above MAX_LENGTH (1800), which is what a real bookmark's compressed
 * form should need. */
const MAX_BLOB_LENGTH = 20_000;
const MAX_DECOMPRESSED_LENGTH = 200_000;

function decodeStateInner(search: string, ctx: CodecContext): DecodedState {
  const defaultCamera = ctx.defaultCamera ?? DEFAULT_CAMERA;
  const rawQuery = search.startsWith('?') ? search.slice(1) : search;
  let query = new URLSearchParams(rawQuery);

  const blob = query.get('z');
  if (blob !== null) {
    if (blob.length > MAX_BLOB_LENGTH) return defaultsOnly(ctx);
    const decompressed = decompressFromEncodedURIComponent(blob);
    if (decompressed !== null && decompressed.length > MAX_DECOMPRESSED_LENGTH) {
      return defaultsOnly(ctx);
    }
    query = new URLSearchParams(decompressed ?? '');
  }

  const versionRaw = query.get('v');
  let schemaVersion = ctx.schemaVersion;
  if (versionRaw !== null) {
    const parsed = Number(versionRaw);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= ctx.schemaVersion) {
      schemaVersion = parsed;
    } else {
      // Garbled, or from a schema newer than this build knows how to
      // read — don't guess at decoding the rest of the query against a
      // format we can't identify.
      return { ...defaultsOnly(ctx), unrecognizedVersion: true };
    }
  }
  const out: DecodedState = { schemaVersion };

  // Fully resolved, not just the URL delta: every declared param/layer
  // key is present (default-filled, then overridden from the URL), so
  // decode(encode(defaults)) deep-equals defaults directly — assertion
  // 8's own wording — with no separate "merge onto defaults" step the
  // caller has to remember to do.
  const params: Record<string, ParamValue> = {};
  for (const p of ctx.params) {
    const raw = query.get(p.urlKey);
    params[p.key] = raw !== null ? decodeParamValue(p, raw) : p.default;
  }
  out.params = params;

  const layers: Record<string, boolean> = {};
  for (const l of ctx.layers) layers[l.key] = l.default;
  const layerToken = query.get('L');
  if (layerToken) {
    const byUrlKey = new Map(ctx.layers.map((l) => [l.urlKey, l.key]));
    for (const token of layerToken.split(',')) {
      const off = token.startsWith('-');
      const urlKey = off ? token.slice(1) : token;
      const key = byUrlKey.get(urlKey);
      if (key) layers[key] = !off;
    }
  }
  out.layers = layers;

  const t = query.get('t');
  // X-35: raw `Number(t)` let NaN/negative/1e308 reach every module's
  // update() unguarded. Clamp to the timeline's own [0, DEFAULT_MAX_T]
  // bound — the same range ModuleView's own playback loop already
  // enforces.
  out.time = {
    t: t !== null ? clampDecodedNumber(Number(t), 0, 0, DEFAULT_MAX_T) : 0,
    playing: false,
    speed: 1,
    direction: 1,
  };

  const c = query.get('c');
  out.camera = c !== null ? decodeCamera(c, defaultCamera) : defaultCamera;

  const up = query.get('up');
  const th = query.get('th');
  const pj = query.get('pj');
  const gr = query.get('gr');
  const gxy = query.get('gxy');
  const gxz = query.get('gxz');
  const gyz = query.get('gyz');
  out.prefs = {
    upAxis: up === 'z' ? 'z' : DEFAULT_PREFS.upAxis,
    theme: th === 'dark' ? 'dark' : DEFAULT_PREFS.theme,
    projector: pj === '1',
    showGrid: gr === null ? DEFAULT_PREFS.showGrid : gr === '1',
    gridPlaneXY: gxy === '1',
    gridPlaneXZ: gxz === '1',
    gridPlaneYZ: gyz === '1',
  };

  return out;
}

/** Every declared field at its module default, `v=` reported as current
 * (no migration attempted) — the fallback `decodeState` returns for a
 * blob that fails the `z=` size caps, or (via the caller above) an
 * unrecognized `v=`. */
function defaultsOnly(ctx: CodecContext): DecodedState {
  const defaultCamera = ctx.defaultCamera ?? DEFAULT_CAMERA;
  const params: Record<string, ParamValue> = {};
  for (const p of ctx.params) params[p.key] = p.default;
  const layers: Record<string, boolean> = {};
  for (const l of ctx.layers) layers[l.key] = l.default;
  return {
    schemaVersion: ctx.schemaVersion,
    params,
    layers,
    time: { t: 0, playing: false, speed: 1, direction: 1 },
    camera: defaultCamera,
    prefs: { ...DEFAULT_PREFS },
  };
}

/**
 * X-35: a hand-edited or truncated bookmark can fail in ways none of the
 * per-field guards above catch (e.g. `?f=50%`'s lone `%` throwing
 * `URIError` out of `decodeURIComponent` — X-20's note that expression
 * input is covered by `kernel/expr`'s typed errors was wrong, because
 * that throw happens first, before the string ever reaches the parser).
 * §14's own rule is "an unmigratable link loads defaults with a
 * non-blocking notice, never an error" — extended here to cover ANY
 * decode failure, not just a recognized-but-old schema version.
 */
export function decodeState(search: string, ctx: CodecContext): DecodedState {
  try {
    return decodeStateInner(search, ctx);
  } catch {
    return { ...defaultsOnly(ctx), unrecognizedVersion: true };
  }
}
