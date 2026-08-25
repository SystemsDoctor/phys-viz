# 5. Offline support via a service worker

Date: 2026-08-25

## Status

Accepted

Resolves the fourth open decision in ARCHITECTURE.md §23.

## Context

The primary user is an instructor at the front of a room (§1). The
failure that matters most is the lecture hall with dead or
captive-portal wifi, which is also why fonts are self-hosted (§19). A
site that needs the network to load a module chunk fails in exactly that
moment.

The site is already static, client-only, and has no backend, no
accounts, and no analytics (§2). Everything it serves is cacheable.

## Decision

Ship a **service worker** that precaches the full application shell and
makes the site fully usable offline: HTML, CSS, fonts, KaTeX, the
vendor/three/katex chunks, **and every module chunk**.

Precaching the lazily-loaded module chunks is the non-obvious part and
it is required. §11 makes each module its own chunk so the _initial_ load
stays O(1) in module count — but a module that has never been visited is
not in the HTTP cache, so without explicit precaching, "offline" would
mean "offline for the one module you happened to open earlier."

Cache strategy: cache-first for hashed immutable assets, with an
explicit version bump on deploy. When a new deployment is detected, the
page shows a non-blocking "new version available — reload" notice rather
than swapping code underneath a live demo.

## Consequences

- Never update the service worker silently mid-session. An instructor
  mid-lecture must not have the page reload or the behaviour change
  under them; that is precisely the "no fiddling mid-lecture" need in
  §1. The reload is always the user's click.
- Precaching every module chunk means the _first_ visit downloads the
  whole library in the background. That is acceptable and is the deal
  offline requires, but it puts the §17 per-module chunk budget
  (≤80 KB gzipped) under real pressure as the library grows: at 50
  modules that is the difference between a 4 MB and a 20 MB warm cache.
  Track total precache size as a CI-visible number.
- A stale service worker is the classic way to ship a fix nobody
  receives. The version bump must be tied to the build, and the update
  notice must be verified as part of the deploy check, not assumed.
- Local development needs the worker disabled or scoped off, or every
  developer will chase a phantom cached bundle at some point.
- No backend is introduced. This stays within §2: static files, served
  by GitHub Pages, cached by the browser.
