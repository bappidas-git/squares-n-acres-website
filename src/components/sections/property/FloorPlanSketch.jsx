/**
 * A stand-in floor plan: the look of a drawing without being one.
 *
 * A public read carries no address for a floor plan's drawing (QA-51 OPEN-1 —
 * the product owner gated the drawings as well as their PDFs), so the gate
 * blurs this instead of the real thing. The visitor still sees what they are
 * being offered, and the sketch keeps the drawing's 4:3 box, so nothing moves
 * when the real one arrives.
 *
 * Decorative, and drawn in `currentColor`: the section that places it sizes
 * and tints it through `className`, which also keeps this component free of a
 * stylesheet of its own (the CSS-order rule of `build:ci`).
 *
 * @param {object} props
 * @param {string} [props.className]
 */
export default function FloorPlanSketch({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {/* The walls, with the door openings left out of them. */}
      <g fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="square">
        <path d="M24 24 H376 V276 H24 Z" />
        <path d="M168 24 V138 M168 186 V276" />
        <path d="M24 132 H92 M140 132 H168" />
        <path d="M168 164 H250 M298 164 H376" />
        <path d="M290 24 V106" />
        <path d="M290 106 H322 M364 106 H376" />
      </g>
      {/* The doors: a leaf and its swing. */}
      <g fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M168 186 L212 186 M168 138 A48 48 0 0 1 212 186" />
        <path d="M92 132 L92 176 M140 132 A48 48 0 0 1 92 176" />
        <path d="M250 164 L250 212 M298 164 A48 48 0 0 1 250 212" />
        <path d="M322 106 L322 146 M364 106 A42 42 0 0 1 322 146" />
      </g>
      {/* A window in each outside wall. */}
      <g stroke="currentColor" strokeWidth="3">
        <path d="M56 20 H128 M56 28 H128" />
        <path d="M200 272 H300 M200 280 H300" />
        <path d="M372 190 V250 M380 190 V250" />
        <path d="M20 180 V240 M28 180 V240" />
      </g>
    </svg>
  );
}
