# Self-hosted fonts

Per ARCHITECTURE.md §15 and §19: self-host IBM Plex Sans and IBM Plex
Mono here rather than pulling them from a CDN. A CDN dependency fails in
exactly the situation that matters most — a lecture hall with
captive-portal wifi.

Latin-subset woff2 only (no woff fallback — the target browsers all
support woff2), sourced from the `@fontsource/ibm-plex-sans` and
`@fontsource/ibm-plex-mono` npm packages (which just repackage the
upstream https://github.com/IBM/plex releases) and copied here as
static files with no npm dependency on either package:

- `ibm-plex-sans-latin-{400,500,600}-normal.woff2` — regular, medium, semibold
- `ibm-plex-mono-latin-{400,500}-normal.woff2` — regular, medium

`@font-face` rules are in `src/design/tokens.css`.

Licensed under the SIL Open Font License 1.1 — see `LICENSE-OFL.txt`.
