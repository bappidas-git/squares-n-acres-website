// Loaded by CRA's Jest before every test file.
// `jest-dom` adds the DOM matchers the component tests use
// (`toBeInTheDocument`, `toHaveAttribute`, `toHaveFocus`, …).
import '@testing-library/jest-dom';

// CRA loads `.env.development` for `start` and `build`, never for `test`, and
// `src/services/http.js` refuses to load without an API base (D48). Jest runs
// against stubs rather than a server, so any well-formed base will do; §3.5
// keeps the real values in the env files.
process.env.REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
process.env.REACT_APP_SITE_URL = process.env.REACT_APP_SITE_URL || 'http://localhost:3000';

// ── jsdom gaps ────────────────────────────────────────────────────────────
//
// ProseMirror measures the document it is editing, and MUI asks the browser
// which breakpoint it is at. jsdom implements neither: `Range` has no geometry
// and there is no `matchMedia`. Without these four stubs every test that mounts
// `RichTextEditor` — or any component under `useBreakpoint` — throws before it
// renders anything.

const emptyRect = () => ({
  bottom: 0,
  height: 0,
  left: 0,
  right: 0,
  top: 0,
  width: 0,
  x: 0,
  y: 0,
  toJSON() {
    return this;
  },
});

if (typeof Range !== 'undefined') {
  Range.prototype.getBoundingClientRect = Range.prototype.getBoundingClientRect || emptyRect;
  Range.prototype.getClientRects =
    Range.prototype.getClientRects ||
    function getClientRects() {
      return Object.assign([], { item: () => null });
    };
}

if (typeof document !== 'undefined' && typeof document.createRange !== 'function') {
  document.createRange = () => ({
    setStart: () => {},
    setEnd: () => {},
    commonAncestorContainer: document.body,
    getBoundingClientRect: emptyRect,
    getClientRects: () => Object.assign([], { item: () => null }),
  });
}

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

if (typeof Element !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = () => {};
}
