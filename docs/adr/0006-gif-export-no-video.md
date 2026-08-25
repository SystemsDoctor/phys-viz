# 6. GIF export, no video export

Date: 2026-08-25

## Status

Accepted

Resolves the fifth open decision in ARCHITECTURE.md §23.

## Context

Instructors ask for a way to take a visualization out of the browser and
into slides, a handout, or an LMS page. §23 flagged this as "requested
often, moderate effort, no architectural risk."

GIF and video pull in different amounts of machinery. A GIF can be
encoded in pure JavaScript from canvas frames, with no codecs and no
server. Video means either `MediaRecorder` (whose output container and
codec vary by browser, which is a support burden) or a WASM encoder
(megabytes of payload, against a 250 KB initial-bundle budget in §17).

A GIF also matches the actual use: a short, silent, looping clip
dropped into a slide.

## Decision

Support **GIF export**. Do **not** support video export — no WebM, no
MP4, no `MediaRecorder`, no WASM encoder.

Encoding is done client-side by a small self-hosted pure-JS encoder,
loaded **on demand** so it never touches the initial bundle. Export
renders from module state deterministically, not by screen-recording
whatever the display happened to do.

## Consequences

- Determinism (§12) is what makes this sound: for a `parametric` module,
  the exporter can evaluate `update({t})` on a fixed time grid and get
  the same frames every time. For a `stepped` module it drives the same
  fixed timestep the shell uses (§12), so an exported clip matches what
  the class saw. This is only true because §12 forbids unseeded
  randomness and variable-dt integration — export is another reason
  those rules pay.
- The export path must not compromise the render loop. Frame capture is
  a deliberate, user-initiated mode, not something the 60 fps path pays
  for; the zero-allocation budget in §17 applies to normal playback, and
  export is allowed to allocate because it is not playback.
- Needs explicit bounds — duration, frame rate, and pixel dimensions —
  with the resulting file size shown before encoding starts. GIF is a
  palette-limited format and a careless export is tens of megabytes.
- GIF's 256-colour palette interacts with §15: the Okabe–Ito semantic
  colours must survive quantization, because colour _is_ data here. Check
  an exported GIF against the palette, and prefer the projector token
  variant for export since it is higher contrast.
- If someone later needs video, that is a new ADR superseding this one,
  and the honest answer will probably remain "screen-record it with the
  tool your institution already licenses."
