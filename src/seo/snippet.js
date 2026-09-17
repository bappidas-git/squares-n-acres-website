/**
 * How wide a title or a description is in Google's result — in characters and,
 * because Google truncates on pixels rather than on characters, in pixels.
 *
 * Two measurements, one answer (D85). In a browser the canvas measures the
 * real font. In Node, in Jest and in jsdom — which has a `document` but no 2D
 * context — a per-character width table stands in, so the numbers a test
 * asserts are the numbers every run produces. The table is the Helvetica
 * metric set, which is what Arial was drawn to match, in the usual 1/1000 em
 * units; a character the table does not know is charged the width of a digit,
 * which at the 14 px description size is the ~8 px per character the fallback
 * promises.
 */

/** The fonts Google renders a desktop result in (§9.1). */
export const TITLE_FONT_SIZE_PX = 20;
export const DESCRIPTION_FONT_SIZE_PX = 14;
export const FONT_FAMILY = 'Arial, sans-serif';

/** Where the result is cut off (§9.1). */
export const TITLE_MAX_PX = 580;
export const DESCRIPTION_MAX_PX = 920;

/** The character guides the panel draws its counter against (§9.1). */
export const TITLE_CHARS = { min: 50, max: 60, warnMin: 40, warnMax: 65 };
export const DESCRIPTION_CHARS = { min: 120, max: 160, warnMin: 100, warnMax: 180 };

/** Helvetica advance widths, 1/1000 em, for every printable ASCII character. */
const ASCII_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667,
  611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
  667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500,
  222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

/** The handful of non-ASCII characters an Indian property headline really uses. */
const EXTRA_WIDTHS = {
  ' ': 278,
  '°': 400,
  '·': 278,
  '×': 584,
  '–': 556,
  '—': 1000,
  '‘': 222,
  '’': 222,
  '“': 333,
  '”': 333,
  '•': 350,
  '…': 1000,
  '₹': 556,
};

/** What an unknown character costs: the width of a digit. */
const FALLBACK_WIDTH = 556;

/**
 * The width of a string from the table alone, in pixels.
 *
 * Exported because it is the reference implementation: `snippet.test.js`
 * asserts against it, and the canvas is only ever allowed to replace it in a
 * real browser.
 *
 * @param {string} text
 * @param {number} fontSizePx
 * @returns {number}
 */
export function widthFromTable(text, fontSizePx) {
  let units = 0;

  for (const character of String(text ?? '')) {
    const code = character.codePointAt(0);
    if (code >= 32 && code <= 126) units += ASCII_WIDTHS[code - 32];
    else units += EXTRA_WIDTHS[character] ?? FALLBACK_WIDTH;
  }

  return (units * fontSizePx) / 1000;
}

let canvasContext;

/**
 * The 2D context to measure with, or `null` when there is none.
 *
 * jsdom answers `getContext` with `null` and writes an implementation error to
 * the console while doing it, so the question is never asked there: D85 puts
 * Node and Jest on the width table, and the user-agent is how a runtime says
 * which of the two it is.
 */
function getCanvasContext() {
  if (canvasContext !== undefined) return canvasContext;
  canvasContext = null;

  try {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
      return canvasContext;
    }
    const agent = typeof navigator === 'undefined' ? '' : String(navigator.userAgent ?? '');
    if (agent.toLowerCase().includes('jsdom')) return canvasContext;

    const context = document.createElement('canvas').getContext('2d');
    if (context && typeof context.measureText === 'function') {
      context.font = `${TITLE_FONT_SIZE_PX}px ${FONT_FAMILY}`;
      if (Number(context.measureText('M')?.width) > 0) canvasContext = context;
    }
  } catch {
    canvasContext = null;
  }

  return canvasContext;
}

/**
 * The rendered width of a string, in pixels.
 *
 * @param {string} text
 * @param {number} [fontSizePx]
 * @returns {number} rounded to the whole pixel a comparison needs
 */
export function measureWidth(text, fontSizePx = TITLE_FONT_SIZE_PX) {
  const value = String(text ?? '');
  if (!value) return 0;

  const context = getCanvasContext();
  if (context) {
    context.font = `${fontSizePx}px ${FONT_FAMILY}`;
    const measured = Number(context.measureText(value)?.width);
    if (Number.isFinite(measured) && measured > 0) return Math.round(measured);
  }

  return Math.round(widthFromTable(value, fontSizePx));
}

/**
 * The width of a search-result title, in pixels (Arial 20 px).
 *
 * @param {string} text
 * @returns {number}
 */
export const titleWidth = (text) => measureWidth(text, TITLE_FONT_SIZE_PX);

/**
 * The width of a search-result description, in pixels (Arial 14 px).
 *
 * @param {string} text
 * @returns {number}
 */
export const descriptionWidth = (text) => measureWidth(text, DESCRIPTION_FONT_SIZE_PX);

/**
 * What the result will actually show: the string cut at the last whole word
 * that fits, with the ellipsis Google appends.
 *
 * @param {string} text
 * @param {number} maxPx
 * @param {number} [fontSizePx]
 * @returns {string}
 */
export function truncateToWidth(text, maxPx, fontSizePx = TITLE_FONT_SIZE_PX) {
  const value = String(text ?? '').trim();
  if (!value || measureWidth(value, fontSizePx) <= maxPx) return value;

  const budget = maxPx - measureWidth('…', fontSizePx);
  const characters = [...value];
  let cut = 0;
  let width = 0;

  for (let index = 0; index < characters.length; index += 1) {
    width += measureWidth(characters[index], fontSizePx);
    if (width > budget) break;
    cut = index + 1;
  }

  const head = characters.slice(0, cut).join('');
  const lastSpace = head.lastIndexOf(' ');
  const trimmed = (lastSpace > 0 ? head.slice(0, lastSpace) : head).replace(/[\s,;:.–—-]+$/, '');
  return `${trimmed}…`;
}

/** The title as the result will show it. */
export const truncateTitle = (text) => truncateToWidth(text, TITLE_MAX_PX, TITLE_FONT_SIZE_PX);

/** The description as the result will show it. */
export const truncateDescription = (text) =>
  truncateToWidth(text, DESCRIPTION_MAX_PX, DESCRIPTION_FONT_SIZE_PX);

/**
 * Everything the panel's counter and the `title-length` / `description-length`
 * tests need about one string, measured once.
 *
 * @param {string} text
 * @param {'title'|'description'} kind
 * @returns {{chars: number, pixels: number, maxPixels: number, guide: object, overflows: boolean}}
 */
export function measureSnippet(text, kind = 'title') {
  const isTitle = kind !== 'description';
  const value = String(text ?? '');
  const pixels = isTitle ? titleWidth(value) : descriptionWidth(value);
  const maxPixels = isTitle ? TITLE_MAX_PX : DESCRIPTION_MAX_PX;

  return {
    chars: [...value].length,
    pixels,
    maxPixels,
    guide: isTitle ? TITLE_CHARS : DESCRIPTION_CHARS,
    overflows: pixels > maxPixels,
  };
}

const snippet = {
  DESCRIPTION_CHARS,
  DESCRIPTION_FONT_SIZE_PX,
  DESCRIPTION_MAX_PX,
  TITLE_CHARS,
  TITLE_FONT_SIZE_PX,
  TITLE_MAX_PX,
  descriptionWidth,
  measureSnippet,
  measureWidth,
  titleWidth,
  truncateDescription,
  truncateTitle,
  truncateToWidth,
  widthFromTable,
};

export default snippet;
