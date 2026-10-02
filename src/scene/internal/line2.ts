/**
 * Shared helpers for the `Line2`/`LineGeometry`/`LineMaterial` glyph
 * family (ADR 0020, X-49).
 *
 * `LineGeometry.setPositions()`/`setColors()` always allocate a fresh
 * `InstancedInterleavedBuffer` plus new attribute wrappers (three.js's
 * own implementation) — fine once at construction, but glyphs that move
 * every frame would churn the GC on a projector (`kernel/math`'s
 * scratch-pool doc comment is explicit about that). These helpers let a
 * glyph call `setPositions()` ONCE at its fixed capacity and from then
 * on write straight into the already-allocated typed array.
 *
 * Layout: the underlying buffer holds one 6-float record per SEGMENT
 * (start xyz, end xyz) — a polyline of N points is N-1 records.
 */
import type { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';

type InterleavedLike = { data: { array: Float32Array; needsUpdate: boolean } };

function interleaved(geometry: LineSegmentsGeometry, name: string): InterleavedLike {
  return geometry.attributes[name] as unknown as InterleavedLike;
}

/** Raw 6-floats-per-segment position array (start xyz, end xyz). */
export function rawPositionBuffer(geometry: LineSegmentsGeometry): Float32Array {
  return interleaved(geometry, 'instanceStart').data.array;
}
export function markPositionBufferDirty(geometry: LineSegmentsGeometry): void {
  interleaved(geometry, 'instanceStart').data.needsUpdate = true;
}

/** Raw 6-floats-per-segment colour array (start rgb, end rgb). */
export function rawColorBuffer(geometry: LineSegmentsGeometry): Float32Array {
  return interleaved(geometry, 'instanceColorStart').data.array;
}
export function markColorBufferDirty(geometry: LineSegmentsGeometry): void {
  interleaved(geometry, 'instanceColorStart').data.needsUpdate = true;
}

/**
 * Writes polyline vertex `i` (of `pointCount`) into a raw segment-record
 * buffer from `rawPositionBuffer`/`rawColorBuffer`: it is the START of
 * record `i` and the END of record `i - 1`.
 */
export function setPolylineVertex(
  buffer: Float32Array,
  i: number,
  pointCount: number,
  a: number,
  b: number,
  c: number,
): void {
  if (i < pointCount - 1) {
    const o = i * 6;
    buffer[o] = a;
    buffer[o + 1] = b;
    buffer[o + 2] = c;
  }
  if (i > 0) {
    const o = (i - 1) * 6 + 3;
    buffer[o] = a;
    buffer[o + 1] = b;
    buffer[o + 2] = c;
  }
}
