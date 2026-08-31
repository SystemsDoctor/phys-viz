/**
 * A minimal, from-scratch GIF89a encoder (ADR 0006, P-7). Original
 * implementation of the public GIF89a/LZW specification — not a vendored
 * third-party file — kept deliberately small and dependency-free so it
 * can be loaded on demand (§17) with no CDN, no npm package.
 *
 * Pure: given palette-indexed frames and a fixed palette, produces bytes.
 * All rendering/quantization happens in capture.ts / quantize.ts.
 */
import type { RGB } from './quantize';

export interface GifFrame {
  /** One palette index per pixel, row-major, length === width * height. */
  indices: Uint8Array;
}

export interface EncodeGifOptions {
  width: number;
  height: number;
  /** 1-256 entries. Padded to the next power of two internally (GIF requires the colour table size to be a power of two). */
  palette: readonly RGB[];
  frames: readonly GifFrame[];
  /** Per-frame display delay in seconds (GIF's own unit is 1/100s). */
  frameDelaySeconds: number;
}

class ByteWriter {
  private bytes: number[] = [];
  u8(v: number): void {
    this.bytes.push(v & 0xff);
  }
  u16le(v: number): void {
    this.bytes.push(v & 0xff, (v >> 8) & 0xff);
  }
  bytesRaw(vs: number[]): void {
    for (const v of vs) this.bytes.push(v & 0xff);
  }
  ascii(s: string): void {
    for (let i = 0; i < s.length; i++) this.bytes.push(s.charCodeAt(i));
  }
  toUint8Array(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

/** GIF-flavoured LZW: variable code length (min..12 bits), LSB-first bit packing, clear/end-of-information codes. Returns the raw compressed code stream (not yet chopped into 255-byte sub-blocks). */
function lzwCompress(indices: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  const MAX_CODE = 4096;

  let dict = new Map<string, number>();
  let nextCode = 0;
  let codeSize = 0;

  function resetDict(): void {
    dict = new Map();
    for (let i = 0; i < clearCode; i++) dict.set(String(i), i);
    nextCode = eoiCode + 1;
    codeSize = minCodeSize + 1;
  }

  let bitBuffer = 0;
  let bitCount = 0;
  const out: number[] = [];
  function writeCode(code: number): void {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      out.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  }

  resetDict();
  writeCode(clearCode);

  let w: string | null = null;
  for (let i = 0; i < indices.length; i++) {
    const k = indices[i];
    if (w === null) {
      w = String(k);
      continue;
    }
    const wk: string = `${w},${k}`;
    if (dict.has(wk)) {
      w = wk;
      continue;
    }
    writeCode(dict.get(w)!);
    if (nextCode < MAX_CODE) {
      dict.set(wk, nextCode++);
      if (nextCode > 1 << codeSize && codeSize < 12) codeSize++;
    } else {
      writeCode(clearCode);
      resetDict();
    }
    w = String(k);
  }
  if (w !== null) writeCode(dict.get(w)!);
  writeCode(eoiCode);
  if (bitCount > 0) out.push(bitBuffer & 0xff);

  return new Uint8Array(out);
}

function writeSubBlocks(w: ByteWriter, data: Uint8Array): void {
  let offset = 0;
  while (offset < data.length) {
    const len = Math.min(255, data.length - offset);
    w.u8(len);
    for (let i = 0; i < len; i++) w.u8(data[offset + i]);
    offset += len;
  }
  w.u8(0); // block terminator
}

/** Smallest power of two >= n, clamped to [2, 256]. GIF's colour table size must be a power of two. */
function paletteTableSize(n: number): number {
  let size = 2;
  while (size < n && size < 256) size *= 2;
  return size;
}

export function encodeGif(opts: EncodeGifOptions): Uint8Array {
  const { width, height, frames } = opts;
  const tableSize = paletteTableSize(opts.palette.length);
  // Bits needed to index the (power-of-two) colour table, clamped to
  // GIF's [2, 8] range for the LZW minimum code size.
  const colorBits = Math.max(2, Math.ceil(Math.log2(tableSize)));
  const w = new ByteWriter();

  w.ascii('GIF89a');
  w.u16le(width);
  w.u16le(height);
  // Packed: global colour table flag=1, colour resolution=colorBits-1, sort=0, table size=colorBits-1.
  w.u8(0x80 | ((colorBits - 1) << 4) | (colorBits - 1));
  w.u8(0); // background colour index
  w.u8(0); // pixel aspect ratio

  for (let i = 0; i < tableSize; i++) {
    const c = opts.palette[i] ?? { r: 0, g: 0, b: 0 };
    w.u8(c.r);
    w.u8(c.g);
    w.u8(c.b);
  }

  // NETSCAPE2.0 application extension: loop forever.
  w.bytesRaw([0x21, 0xff, 0x0b]);
  w.ascii('NETSCAPE2.0');
  w.bytesRaw([0x03, 0x01, 0x00, 0x00, 0x00]);

  const delayCentiseconds = Math.max(1, Math.round(opts.frameDelaySeconds * 100));

  for (const frame of frames) {
    // Graphic control extension.
    w.bytesRaw([0x21, 0xf9, 0x04, 0x00]);
    w.u16le(delayCentiseconds);
    w.bytesRaw([0x00, 0x00]);

    // Image descriptor.
    w.u8(0x2c);
    w.u16le(0);
    w.u16le(0);
    w.u16le(width);
    w.u16le(height);
    w.u8(0x00); // no local colour table, not interlaced

    w.u8(colorBits); // LZW minimum code size
    const compressed = lzwCompress(frame.indices, colorBits);
    writeSubBlocks(w, compressed);
  }

  w.u8(0x3b); // trailer
  return w.toUint8Array();
}
