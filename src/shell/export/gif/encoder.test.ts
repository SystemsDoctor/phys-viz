import { describe, it, expect } from 'vitest';
import { encodeGif, type GifFrame } from './encoder';
import type { RGB } from './quantize';

/**
 * A minimal GIF LZW decoder + frame parser, used ONLY by these tests to
 * verify `encoder.ts` round-trips correctly — not shipped, not a
 * dependency, just the textbook inverse of encoder.ts's `lzwCompress`.
 * Deliberately independent of encoder.ts's own internals (no shared
 * helper functions) so a bug in one isn't masked by the same bug in the
 * other.
 */
function lzwDecompress(bytes: Uint8Array, minCodeSize: number): number[] {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;

  let dict: number[][] = [];
  let codeSize = 0;
  let nextCode = 0;
  function resetDict(): void {
    dict = [];
    for (let i = 0; i < clearCode; i++) dict.push([i]);
    dict.push([]); // clear code placeholder
    dict.push([]); // eoi code placeholder
    nextCode = eoiCode + 1;
    codeSize = minCodeSize + 1;
  }
  resetDict();

  let bitBuffer = 0;
  let bitCount = 0;
  let pos = 0;
  function readCode(): number | null {
    while (bitCount < codeSize) {
      if (pos >= bytes.length) return null;
      bitBuffer |= bytes[pos++] << bitCount;
      bitCount += 8;
    }
    const code = bitBuffer & ((1 << codeSize) - 1);
    bitBuffer >>= codeSize;
    bitCount -= codeSize;
    return code;
  }

  const out: number[] = [];
  let prev: number[] | null = null;
  for (;;) {
    const code = readCode();
    if (code === null) break;
    if (code === clearCode) {
      resetDict();
      prev = null;
      continue;
    }
    if (code === eoiCode) break;

    let entry: number[];
    if (code < dict.length && dict[code].length > 0) {
      entry = dict[code];
    } else if (code === nextCode && prev !== null) {
      entry = [...prev, prev[0]];
    } else {
      throw new Error(`bad LZW code ${code}`);
    }
    out.push(...entry);
    if (prev !== null && nextCode < 4096) {
      dict[nextCode] = [...prev, entry[0]];
      nextCode++;
      if (nextCode >= 1 << codeSize && codeSize < 12) codeSize++;
    }
    prev = entry;
  }
  return out;
}

interface ParsedGif {
  width: number;
  height: number;
  globalColorTable: RGB[];
  frameIndices: number[][];
}

function parseGif(bytes: Uint8Array): ParsedGif {
  expect(String.fromCharCode(...bytes.slice(0, 6))).toBe('GIF89a');
  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  const packed = bytes[10];
  const hasGct = (packed & 0x80) !== 0;
  const gctSize = 1 << ((packed & 0x07) + 1);
  let pos = 13;
  const globalColorTable: RGB[] = [];
  if (hasGct) {
    for (let i = 0; i < gctSize; i++) {
      globalColorTable.push({ r: bytes[pos], g: bytes[pos + 1], b: bytes[pos + 2] });
      pos += 3;
    }
  }

  const frameIndices: number[][] = [];
  while (pos < bytes.length) {
    const marker = bytes[pos];
    if (marker === 0x3b) break; // trailer
    if (marker === 0x21) {
      // Extension: label byte, then sub-blocks until a zero-length one.
      pos += 2;
      for (;;) {
        const len = bytes[pos];
        pos += 1 + len;
        if (len === 0) break;
      }
      continue;
    }
    if (marker === 0x2c) {
      pos += 1; // 0x2c
      pos += 8; // left, top, width, height (2 bytes each)
      pos += 1; // packed byte (no local color table in our encoder)
      const minCodeSize = bytes[pos];
      pos += 1;
      const dataBytes: number[] = [];
      for (;;) {
        const len = bytes[pos];
        pos += 1;
        if (len === 0) break;
        for (let i = 0; i < len; i++) dataBytes.push(bytes[pos + i]);
        pos += len;
      }
      frameIndices.push(lzwDecompress(new Uint8Array(dataBytes), minCodeSize));
      continue;
    }
    throw new Error(`unexpected block marker 0x${marker.toString(16)} at offset ${pos}`);
  }

  return { width, height, globalColorTable, frameIndices };
}

const PALETTE: RGB[] = [
  { r: 0, g: 0, b: 0 },
  { r: 255, g: 0, b: 0 },
  { r: 0, g: 255, b: 0 },
  { r: 0, g: 0, b: 255 },
];

describe('encodeGif', () => {
  it('produces the correct magic header and trailer byte', () => {
    const bytes = encodeGif({
      width: 2,
      height: 1,
      palette: PALETTE,
      frames: [{ indices: new Uint8Array([0, 1]) }],
      frameDelaySeconds: 0.1,
    });
    expect(String.fromCharCode(...bytes.slice(0, 6))).toBe('GIF89a');
    expect(bytes[bytes.length - 1]).toBe(0x3b);
  });

  it('round-trips a single small frame through LZW exactly', () => {
    const indices = new Uint8Array([0, 1, 2, 3, 0, 1, 2, 3, 3, 3, 3, 0]);
    const bytes = encodeGif({
      width: 4,
      height: 3,
      palette: PALETTE,
      frames: [{ indices }],
      frameDelaySeconds: 0.1,
    });
    const parsed = parseGif(bytes);
    expect(parsed.width).toBe(4);
    expect(parsed.height).toBe(3);
    expect(parsed.frameIndices).toHaveLength(1);
    expect(parsed.frameIndices[0]).toEqual(Array.from(indices));
  });

  it('round-trips a repetitive frame that exercises dictionary growth', () => {
    // A long run forces the LZW dictionary well past its initial size —
    // a naive implementation that never grows codeSize breaks here.
    const width = 64;
    const height = 64;
    const indices = new Uint8Array(width * height);
    for (let i = 0; i < indices.length; i++) indices[i] = (i * 7 + Math.floor(i / 13)) % 4;
    const bytes = encodeGif({
      width,
      height,
      palette: PALETTE,
      frames: [{ indices }],
      frameDelaySeconds: 0.1,
    });
    const parsed = parseGif(bytes);
    expect(parsed.frameIndices[0]).toEqual(Array.from(indices));
  });

  it('round-trips multiple frames independently and is byte-identical across two identical encodes (P-G)', () => {
    const frames: GifFrame[] = [
      { indices: new Uint8Array([0, 0, 1, 1]) },
      { indices: new Uint8Array([2, 2, 3, 3]) },
      { indices: new Uint8Array([1, 2, 3, 0]) },
    ];
    const opts = { width: 2, height: 2, palette: PALETTE, frames, frameDelaySeconds: 1 / 12 };
    const bytesA = encodeGif(opts);
    const bytesB = encodeGif(opts);
    expect(bytesA).toEqual(bytesB);

    const parsed = parseGif(bytesA);
    expect(parsed.frameIndices).toHaveLength(3);
    frames.forEach((f, i) => expect(parsed.frameIndices[i]).toEqual(Array.from(f.indices)));
  });

  it('writes the global colour table padded to a power of two, and every declared palette entry exactly', () => {
    const bytes = encodeGif({
      width: 1,
      height: 1,
      palette: PALETTE, // 4 entries — already a power of two
      frames: [{ indices: new Uint8Array([0]) }],
      frameDelaySeconds: 0.1,
    });
    const parsed = parseGif(bytes);
    expect(parsed.globalColorTable).toEqual(PALETTE);
  });

  it('clamps the delay to a minimum of 1 centisecond', () => {
    const bytes = encodeGif({
      width: 1,
      height: 1,
      palette: PALETTE,
      frames: [{ indices: new Uint8Array([0]) }],
      frameDelaySeconds: 0,
    });
    // Graphic control extension delay is little-endian at a fixed offset
    // right after the global colour table + app extension in this tiny
    // fixture; assert via the parser's own structural walk instead of a
    // hardcoded offset by re-deriving it isn't necessary here — the
    // round-trip tests above already prove structural correctness, so a
    // direct byte scan for the GCE marker (0x21 0xF9) is enough.
    let found = -1;
    for (let i = 0; i < bytes.length - 3; i++) {
      if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9) {
        found = bytes[i + 4] | (bytes[i + 5] << 8);
        break;
      }
    }
    expect(found).toBe(1);
  });
});
