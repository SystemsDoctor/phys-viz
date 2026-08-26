/**
 * Custom hash-location integration for wouter (ARCHITECTURE.md §14, §19
 * "Use hash routing"). NOT wouter's own `useHashLocation` — that hook
 * puts params in the real URL query string before `#` (`?v=1#/m/id`),
 * but §14's format puts them INSIDE the hash fragment
 * (`#/m/id?v=1&a=1,2,0`), which wouter's route-pattern matching can't
 * parse directly (a trailing `?...` breaks its `:id`-style patterns,
 * which are anchored to the end of the string). So this hook reports
 * only the PATH portion of the hash to wouter for route matching, and
 * `useHashSearch` is the companion for reading the query portion
 * (there is no `location.search` equivalent for hash-embedded params).
 *
 * History discipline (M3-24): `navigateHash`'s `replace` option is the
 * whole policy surface. The convention this app follows: a real
 * navigation (gallery -> module, module -> module) pushes, so the back
 * button retraces actual navigation; everything else that touches the
 * URL while already on a module route (param twiddling, camera sync,
 * layer toggles, time scrubbing) replaces, so tweaking a slider doesn't
 * bury the back button under hundreds of history entries. ModuleView's
 * state->URL sync effect always passes `replace: true` for exactly this
 * reason — only route-level navigation (`<Link>`/`setLocation`) pushes.
 */
import { useSyncExternalStore } from 'react';

function currentHashPath(): string {
  const hash = window.location.hash.slice(1); // drop leading '#'
  const qIndex = hash.indexOf('?');
  const path = qIndex === -1 ? hash : hash.slice(0, qIndex);
  return path || '/';
}

function currentHashSearch(): string {
  const hash = window.location.hash.slice(1);
  const qIndex = hash.indexOf('?');
  return qIndex === -1 ? '' : hash.slice(qIndex); // includes the leading '?'
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

export function navigateHash(to: string, options?: { replace?: boolean }): void {
  const url = new URL(window.location.href);
  url.hash = to.startsWith('/') ? to : `/${to}`;
  if (options?.replace) window.history.replaceState(window.history.state, '', url.href);
  else window.history.pushState(null, '', url.href);
  // wouter's location hooks (and this one) drive React re-renders off
  // 'hashchange' via useSyncExternalStore — pushState/replaceState don't
  // fire it natively, so dispatch it ourselves.
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** wouter-compatible location hook (path only — see the module comment for why). */
export function useHashLocation(): [string, typeof navigateHash] {
  const path = useSyncExternalStore(subscribe, currentHashPath, () => '/');
  return [path, navigateHash];
}

/** The query-string portion of the current hash, including its leading '?' (empty string if none). */
export function useHashSearch(): string {
  return useSyncExternalStore(subscribe, currentHashSearch, () => '');
}
