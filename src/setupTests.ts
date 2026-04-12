import '@testing-library/jest-dom'

// Polyfill DOMMatrix for pdfjs-dist in jsdom environment
if (typeof globalThis.DOMMatrix === 'undefined') {
  // @ts-expect-error minimal stub for pdfjs-dist canvas module
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {
      return new Proxy(this, {
        get: (_target, prop) => {
          if (typeof prop === 'string' && /^[a-f]$/.test(prop)) return 0;
          return undefined;
        },
      });
    }
    static fromMatrix() { return new DOMMatrix(); }
    static fromFloat32Array() { return new DOMMatrix(); }
    static fromFloat64Array() { return new DOMMatrix(); }
  };
}

// Polyfill Path2D for pdfjs-dist in jsdom environment
if (typeof globalThis.Path2D === 'undefined') {
  // @ts-expect-error minimal stub for pdfjs-dist
  globalThis.Path2D = class Path2D {
    addPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
    arc() {}
    arcTo() {}
    rect() {}
  };
}
