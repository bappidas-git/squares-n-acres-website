/**
 * The colour maths behind `npm run a11y:audit`.
 *
 * The DOM half of `scripts/lib/inPageAudit.js` can only be exercised in a
 * browser, but the arithmetic it reaches its verdicts with is pure — and a
 * contrast checker that is quietly wrong is worse than none at all, because
 * every page it passes has been "checked". These are the WCAG worked examples,
 * plus the two compositing cases this site actually produces: a translucent
 * scrim over a card, and a colour written the modern way.
 *
 *   npm run test:scripts
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildAuditSource,
  compositeOver,
  contrastRatio,
  parseColor,
  relativeLuminance,
  requiredRatio,
} = require('../lib/inPageAudit');

const WHITE = { r: 255, g: 255, b: 255, a: 1 };
const BLACK = { r: 0, g: 0, b: 0, a: 1 };

test('parseColor reads every form getComputedStyle answers in', () => {
  assert.deepEqual(parseColor('rgb(31, 31, 31)'), { r: 31, g: 31, b: 31, a: 1 });
  assert.deepEqual(parseColor('rgba(31, 31, 31, 0.6)'), { r: 31, g: 31, b: 31, a: 0.6 });
  // Chrome's space-separated form, and its wide-gamut one.
  assert.deepEqual(parseColor('rgb(31 31 31 / 0.5)'), { r: 31, g: 31, b: 31, a: 0.5 });
  assert.deepEqual(parseColor('color(srgb 0 0 0)'), { r: 0, g: 0, b: 0, a: 1 });
});

test('parseColor treats "transparent" and nothing as nothing', () => {
  assert.equal(parseColor('transparent').a, 0);
  assert.equal(parseColor('').a, 0);
  assert.equal(parseColor(null).a, 0);
});

test('parseColor refuses what it cannot read rather than guessing', () => {
  assert.equal(parseColor('rebeccapurple'), null);
  assert.equal(parseColor('rgb(a, b, c)'), null);
});

test('relativeLuminance matches the two ends of the WCAG scale', () => {
  assert.equal(relativeLuminance(WHITE), 1);
  assert.equal(relativeLuminance(BLACK), 0);
});

test('contrastRatio matches the WCAG worked examples', () => {
  assert.equal(Number(contrastRatio(BLACK, WHITE).toFixed(2)), 21);
  assert.equal(contrastRatio(WHITE, WHITE), 1);
  // Mid grey on white, the value every checker agrees on.
  assert.equal(Number(contrastRatio({ r: 119, g: 119, b: 119 }, WHITE).toFixed(2)), 4.48);
});

test('contrastRatio does not care which colour is given first', () => {
  const grey = { r: 95, g: 99, b: 104 };
  assert.equal(contrastRatio(grey, WHITE), contrastRatio(WHITE, grey));
});

test('compositeOver paints a scrim the way the browser does', () => {
  // The site's own case: `--color-overlay` over a light card.
  const scrim = { r: 31, g: 31, b: 31, a: 0.6 };
  const card = { r: 239, g: 239, b: 241, a: 1 };
  const painted = compositeOver(scrim, card);

  assert.equal(Math.round(painted.r), 114);
  assert.equal(Math.round(painted.b), 115);
  assert.equal(painted.a, 1);
});

test('compositeOver leaves an opaque layer alone and keeps nothing nothing', () => {
  assert.deepEqual(compositeOver(BLACK, WHITE), { r: 0, g: 0, b: 0, a: 1 });
  assert.equal(compositeOver({ r: 0, g: 0, b: 0, a: 0 }, { r: 0, g: 0, b: 0, a: 0 }).a, 0);
});

test('requiredRatio applies the WCAG definition of large text', () => {
  assert.equal(requiredRatio(16, 400), 4.5);
  assert.equal(requiredRatio(24, 400), 3);
  // 14pt counts as large only when the face is bold.
  assert.equal(requiredRatio(19, 400), 4.5);
  assert.equal(requiredRatio(19, 700), 3);
  assert.equal(requiredRatio(19, 'bold'), 3);
});

test('buildAuditSource ships a self-contained expression, helpers included', () => {
  const source = buildAuditSource('audit');

  // Every helper the entry point calls has to travel with it: a name missing
  // here is a `ReferenceError` in the page and a crawl that reports nothing.
  for (const helper of [
    'function parseColor',
    'function compositeOver',
    'function contrastRatio',
    'function requiredRatio',
    'function describeElement',
    'function styleOf',
    'function rectOf',
    'function isPainted',
    'function isVisibleElement',
    'function coversRect',
    'function announcedText',
    'function accessibleNameOf',
    'function backgroundBehind',
    'function hasOwnText',
    'function isDisabled',
  ]) {
    assert.ok(source.includes(helper), `${helper} is missing from the injected source`);
  }

  assert.ok(source.startsWith('(() => {'));
  assert.ok(source.trimEnd().endsWith('})()'));
  assert.ok(source.includes('return audit;'));
});

test('buildAuditSource can ship the focus reader instead', () => {
  const source = buildAuditSource('readFocusRing');
  assert.ok(source.includes('return readFocusRing;'));
  assert.ok(source.includes('function accessibleNameOf'));
});

test('the horizontal-scroll probe scrolls instantly, not smoothly', () => {
  const source = buildAuditSource('audit');

  // `global.css` sets `scroll-behavior: smooth` on the document. A smooth
  // scroll is asynchronous, so a probe that asks the window to move and then
  // reads `scrollX` on the next line reads the position it started from —
  // every page answers 0 and a real sideways scroll is never reported. That
  // is a worse failure than the `scrollWidth` false positive this replaced
  // (NEW-48), and it is invisible: the rule simply stops finding anything.
  //
  // Measured in Chromium 141 on a 390px viewport over a 3000px document:
  // `window.scrollTo(clientWidth, y)` answers 0, `behavior: 'instant'`
  // answers 390. The assertion is on the source because the behaviour itself
  // needs a browser, and the browser is optional (D16).
  assert.match(
    source,
    /window\.scrollTo\(\{\s*left: document\.documentElement\.clientWidth,\s*behavior: 'instant'\s*\}\)/,
    'the probe must pass `behavior: "instant"` so `scroll-behavior: smooth` cannot swallow it'
  );
  assert.doesNotMatch(
    source,
    /window\.scrollTo\(document\.documentElement\.clientWidth/,
    'a positional scrollTo inherits `scroll-behavior: smooth` and reads back the old position'
  );
});
