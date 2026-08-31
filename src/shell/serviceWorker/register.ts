/**
 * Service worker registration + update detection (ADR 0005).
 *
 * Deliberately not a Zustand store field: "an update is available" is a
 * one-shot session event, closer in shape to `ui.predictMode`'s
 * transience than to a persisted `prefs` value, so a tiny module-level
 * pub/sub is enough — `UpdateNotice` is the only subscriber.
 */

const listeners = new Set<() => void>();
let updateAvailable = false;

export function subscribeUpdateAvailable(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isUpdateAvailable(): boolean {
  return updateAvailable;
}

function notify(): void {
  updateAvailable = true;
  for (const listener of listeners) listener();
}

/** Registers the service worker in production; disabled in dev (P-4) so no developer ever chases a phantom cached bundle (ADR 0005). */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  if (import.meta.env.DEV) {
    // Defensive: if a previous production preview left a worker
    // registered against this origin, dev must not inherit it.
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) reg.unregister();
    });
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            // `controller` already existing means this page was already
            // being served by a previous worker — i.e. this is an update,
            // not the very first install, which never needs a notice.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              notify();
            }
          });
        });
      })
      .catch(() => {
        // Registration failures (e.g. an intermediary stripping the
        // worker script) must not break the app — it just runs online-only.
      });
  });
}

/**
 * Called by the user's own click on the "reload" notice — never
 * automatically. The `controllerchange` reload listener is attached HERE,
 * not at startup: `controllerchange` also fires the very first time a page
 * (previously uncontrolled) gets claimed by a freshly activated worker —
 * registering this listener unconditionally in `registerServiceWorker()`
 * would reload every first-time visitor before they clicked anything.
 * Scoping it to this call, `{ once: true }`, guarantees the reload only
 * ever happens as a direct consequence of the user's own click.
 */
export function applyUpdate(): void {
  navigator.serviceWorker.getRegistration().then((registration) => {
    const waiting = registration?.waiting;
    if (!waiting) return;
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
      once: true,
    });
    waiting.postMessage({ type: 'SKIP_WAITING' });
  });
}
