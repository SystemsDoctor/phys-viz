import '@testing-library/jest-dom/vitest';

// jsdom has no ResizeObserver. A few shell components (plots, in
// particular) use it purely for responsive resize, which no test here
// needs to actually exercise — a no-op stub is enough to let them
// mount without throwing.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

// jsdom also has no window.matchMedia (uPlot uses it for devicePixelRatio
// change detection). A stub MediaQueryList that never actually matches
// or fires is enough for components to construct without throwing.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// jsdom implements zero canvas 2D rendering (`getContext('2d')` throws
// "not implemented") — it explicitly points at installing the `canvas`
// npm package, but that's a native binding that doesn't have a prebuilt
// binary for every Node version and fails a from-source build without a
// full MSVC toolchain (hit exactly that on this machine). uPlot only
// needs `getContext` to return *something* with the right method/
// property shape for its drawing calls to no-op through — the actual
// pixels are never asserted on in these tests, only that mounting and
// updating a plot doesn't throw. A hand-rolled stub covering the calls
// uPlot makes is more portable than a native dependency for that bar.
function makeStubCanvasContext(): Partial<CanvasRenderingContext2D> {
  const noop = (): void => {};
  return {
    clearRect: noop,
    fillRect: noop,
    strokeRect: noop,
    save: noop,
    restore: noop,
    translate: noop,
    scale: noop,
    rotate: noop,
    setTransform: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    rect: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    clip: noop,
    setLineDash: noop,
    fillText: noop,
    strokeText: noop,
    drawImage: noop,
    measureText: () => ({ width: 0 }) as TextMetrics,
  };
}
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = ((): unknown =>
    makeStubCanvasContext()) as typeof HTMLCanvasElement.prototype.getContext;
}

// jsdom has no Path2D either.
if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = class {
    moveTo(): void {}
    lineTo(): void {}
    arc(): void {}
    closePath(): void {}
    rect(): void {}
  } as unknown as typeof Path2D;
}
