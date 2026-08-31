/**
 * Service worker (ADR 0005, docs/adr/0005-offline-via-service-worker.md).
 *
 * Precaches the whole app — shell, vendor/three/katex chunks, every
 * module's lazily-loaded chunk (§11 gives each its own chunk, so without
 * this "offline" would only mean "offline for a module you'd already
 * opened"), self-hosted fonts, and index.html — so the lecture hall with
 * dead wifi (§1) still works.
 *
 * Deliberately dependency-free (no imports, plain script) — see
 * tsconfig.sw.json's own comment and .eslintrc.cjs's `src/sw.ts` override
 * for why: it lets `tsc -p tsconfig.sw.json` emit this file directly with
 * no bundler, and keeps the boundary this file must respect (no DOM, no
 * React, no three, no module code — a "fifth layer" ARCHITECTURE.md §6
 * doesn't name) mechanically true rather than merely intended.
 *
 * TypeScript ships no built-in `lib` for the Service Worker API (unlike
 * plain Web Workers) and its `WebWorker` lib declares a `self` typed as
 * `WorkerGlobalScope`, which conflicts with a `ServiceWorkerGlobalScope`
 * redeclaration — so tsconfig.sw.json deliberately includes only `ES2020`
 * (no DOM, no WebWorker) and the handful of platform ambients this file
 * actually touches are declared below, by hand, kept intentionally
 * minimal rather than pulling in a community `@types/serviceworker`
 * dependency for a handful of calls.
 *
 * The two placeholders below are string-replaced by
 * scripts/generate-precache-manifest.mjs after `tsc` emits this file into
 * dist/ — this file never fetches its own manifest at runtime, so an
 * install never depends on a second network round-trip.
 */

interface Request {}
interface Response {}
declare function fetch(request: Request): Promise<Response>;

interface Cache {
  addAll(urls: string[]): Promise<void>;
}
interface CacheStorage {
  open(name: string): Promise<Cache>;
  match(request: Request): Promise<Response | undefined>;
  keys(): Promise<string[]>;
  delete(name: string): Promise<boolean>;
}
declare const caches: CacheStorage;

interface ExtendableEvent {
  waitUntil(promise: Promise<unknown>): void;
}
interface ExtendableMessageEvent {
  readonly data: unknown;
}
interface FetchEvent extends ExtendableEvent {
  readonly request: Request;
  respondWith(response: Response | Promise<Response>): void;
}
interface Clients {
  claim(): Promise<void>;
}
interface ServiceWorkerGlobalScope {
  addEventListener(type: 'install', listener: (event: ExtendableEvent) => void): void;
  addEventListener(type: 'activate', listener: (event: ExtendableEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void;
  addEventListener(type: 'message', listener: (event: ExtendableMessageEvent) => void): void;
  skipWaiting(): Promise<void>;
  readonly clients: Clients;
}
declare const self: ServiceWorkerGlobalScope;

const VERSION = '__PV_SW_VERSION__';
const PRECACHE_URLS: string[] = ['__PV_PRECACHE_URLS__'];
const CACHE_NAME = `pv-cache-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  // No self.skipWaiting() here — deliberately. A newly installed worker
  // sits in the `waiting` state until the user clicks the reload notice
  // (src/shell/serviceWorker/register.ts posts SKIP_WAITING below). This
  // is the literal mechanism behind ADR 0005's "never swap code under a
  // live demo" — an instructor mid-lecture must not have the page change
  // under them.
});

self.addEventListener('message', (event) => {
  const data = event.data as { type?: string } | undefined;
  if (data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Stale-cache cleanup — the concrete answer to "a stale worker
      // cannot pin an old build" (ADR 0005 / TASKS.md P-6): every
      // previous version's cache is dropped as soon as this version
      // actually takes over. Safe to call clients.claim() here: this
      // handler only runs once the user has already triggered
      // skipWaiting (their own reload click) or every old tab has
      // already closed — never mid-session against a live demo.
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('pv-cache-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  // Cache-first for everything: the whole app is precached (no CDN, no
  // backend — ARCHITECTURE.md §2), so nothing else is ever expected to
  // need a network round-trip on a cache hit.
  event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)));
});
