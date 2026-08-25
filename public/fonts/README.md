# Self-hosted fonts

Per ARCHITECTURE.md §15 and §19: self-host IBM Plex Sans and IBM Plex
Mono here rather than pulling them from a CDN. A CDN dependency fails in
exactly the situation that matters most — a lecture hall with
captive-portal wifi.

TODO(M0): download the woff2 files for IBM Plex Sans and IBM Plex Mono
(regular/medium/semibold as needed) from
https://github.com/IBM/plex and place them in this directory, then add
the matching `@font-face` rules to `src/design/tokens.css`.
