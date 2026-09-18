/**
 * The accessibility audit that runs *inside* a page.
 *
 * `scripts/a11y-audit.js` opens every public URL and every admin screen in a
 * real Chrome and asks the page itself what is wrong with it. That question
 * can only be answered in the page: contrast depends on what actually painted
 * behind the text, an accessible name depends on the DOM around the control,
 * and a tap target is a rectangle nobody can measure from a static file.
 *
 * Nothing here is a framework. The checks are the ones prompt 42 names —
 * contrast of visible text, missing `alt`, unlabelled controls, buttons with
 * no accessible name, duplicate ids, tap targets, the `h1` count, landmarks,
 * positive `tabindex`, horizontal overflow and mobile body text — written by
 * hand because the master context allows no new dependency (§3.3: no
 * `axe-core`, no `jest-axe`).
 *
 * **Two audiences, one file.** The pure colour maths is exported for Node
 * tests (`scripts/__tests__/inPageAudit.test.js`); the DOM half is shipped to
 * the browser by {@link buildAuditSource}, which stringifies the functions and
 * hands Chrome one self-contained expression. That is why every function below
 * is a plain declaration that closes over nothing: a closure would not survive
 * the trip.
 *
 * Levels: `error` fails the run (missing alt/label/name, duplicate ids, an
 * `h1` count that is not one, text under its contrast minimum, horizontal
 * scroll, no `main`); `warn` is reported and triaged by hand.
 *
 * @module scripts/lib/inPageAudit
 */

/* ------------------------------------------------------------------ *
 * Colour — pure, and unit-tested in Node
 * ------------------------------------------------------------------ */

/**
 * A CSS colour as `{ r, g, b, a }`, or `null` when it is not a colour.
 *
 * `getComputedStyle` always answers in `rgb()` / `rgba()` (modern Chrome may
 * use the space-separated form, and `color(srgb …)` for wide-gamut authors),
 * so those are the forms parsed. Named colours and hex literals never reach
 * here — and a hex literal could not live in this file anyway (§2.4).
 *
 * @param {string} value
 * @returns {{r: number, g: number, b: number, a: number}|null}
 */
function parseColor(value) {
  const text = String(value || '').trim();
  if (!text || text === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  const rgb = /^rgba?\(([^)]+)\)$/i.exec(text);
  if (rgb) {
    const parts = rgb[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map((part) => (part.endsWith('%') ? (Number.parseFloat(part) * 255) / 100 : Number(part)));
    if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null;
    const alpha = parts.length > 3 ? parts[3] : 1;
    return { r: parts[0], g: parts[1], b: parts[2], a: alpha > 1 ? alpha / 100 : alpha };
  }

  const srgb = /^color\(srgb\s+([^)]+)\)$/i.exec(text);
  if (srgb) {
    const parts = srgb[1]
      .split(/[\s/]+/)
      .filter(Boolean)
      .map(Number);
    if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null;
    return {
      r: parts[0] * 255,
      g: parts[1] * 255,
      b: parts[2] * 255,
      a: parts.length > 3 ? parts[3] : 1,
    };
  }

  return null;
}

/**
 * `top` painted over `bottom` — the source-over compositing the browser did.
 *
 * @param {{r: number, g: number, b: number, a: number}} top
 * @param {{r: number, g: number, b: number, a: number}} bottom
 * @returns {{r: number, g: number, b: number, a: number}}
 */
function compositeOver(top, bottom) {
  const alpha = top.a + bottom.a * (1 - top.a);
  if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const channel = (t, b) => (t * top.a + b * bottom.a * (1 - top.a)) / alpha;
  return {
    r: channel(top.r, bottom.r),
    g: channel(top.g, bottom.g),
    b: channel(top.b, bottom.b),
    a: alpha,
  };
}

/**
 * WCAG relative luminance of an opaque colour.
 *
 * @param {{r: number, g: number, b: number}} colour
 * @returns {number}
 */
function relativeLuminance(colour) {
  const channel = (raw) => {
    const value = Math.min(255, Math.max(0, raw)) / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(colour.r) + 0.7152 * channel(colour.g) + 0.0722 * channel(colour.b);
}

/**
 * The WCAG contrast ratio of two opaque colours, 1–21.
 *
 * @param {{r: number, g: number, b: number}} a
 * @param {{r: number, g: number, b: number}} b
 * @returns {number}
 */
function contrastRatio(a, b) {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * The minimum this text needs: 3 for WCAG "large text", 4.5 for the rest.
 *
 * Large is 18pt (24px), or 14pt (18.66px) when the face is bold.
 *
 * @param {number} fontSizePx
 * @param {number|string} fontWeight
 * @returns {number}
 */
function requiredRatio(fontSizePx, fontWeight) {
  const weight = Number(fontWeight) || (String(fontWeight) === 'bold' ? 700 : 400);
  const large = fontSizePx >= 24 || (fontSizePx >= 18.66 && weight >= 700);
  return large ? 3 : 4.5;
}

/* ------------------------------------------------------------------ *
 * DOM helpers — shipped to the browser by `buildAuditSource`
 * ------------------------------------------------------------------ */

/**
 * A short, human-readable path to an element, for the report.
 *
 * @param {Element} element
 * @returns {string}
 */
function describeElement(element) {
  const steps = [];
  let node = element;

  while (node && node.nodeType === 1 && steps.length < 4) {
    let step = node.tagName.toLowerCase();
    if (node.id) {
      // `[id=…]` rather than `#…`: the report is written into `docs/`, which
      // `scripts/check-traces.js` scans for hex colour literals, and an id of
      // six hex characters behind a `#` is exactly what that looks like.
      steps.unshift(`${step}[id=${node.id}]`);
      break;
    }
    const className = typeof node.className === 'string' ? node.className.trim() : '';
    if (className) step += `.${className.split(/\s+/).slice(0, 2).join('.')}`;
    steps.unshift(step);
    node = node.parentElement;
  }

  return steps.join(' > ');
}

/**
 * `getComputedStyle`, memoised for the length of one audit.
 *
 * The contrast walk asks for the style of every ancestor and every positioned
 * sibling of every run of text on the page, which on a long listing is tens of
 * thousands of calls and most of a second each time the layout has to be
 * recomputed. The object `getComputedStyle` returns is live, so holding on to
 * it is free and correct.
 *
 * @param {Element} element
 * @returns {CSSStyleDeclaration}
 */
function styleOf(element) {
  if (!window.__snaStyles) window.__snaStyles = new WeakMap();
  let style = window.__snaStyles.get(element);
  if (!style) {
    style = window.getComputedStyle(element);
    window.__snaStyles.set(element, style);
  }
  return style;
}

/**
 * `getBoundingClientRect`, memoised for the length of one audit.
 *
 * Unlike a computed style a rect is a snapshot, so the cache is thrown away at
 * the start of every pass — nothing moves while one is running.
 *
 * @param {Element} element
 * @returns {DOMRect}
 */
function rectOf(element) {
  if (!window.__snaRects) window.__snaRects = new WeakMap();
  let rect = window.__snaRects.get(element);
  if (!rect) {
    rect = element.getBoundingClientRect();
    window.__snaRects.set(element, rect);
  }
  return rect;
}

/**
 * Whether an element puts ink on the screen.
 *
 * Deliberately says nothing about the accessibility tree: a scrim marked
 * `aria-hidden` is invisible to a screen reader and perfectly visible behind
 * the text sitting on it, and the contrast walk needs the second answer.
 *
 * @param {Element} element
 * @returns {boolean}
 */
function isPainted(element) {
  const style = styleOf(element);
  if (style.display === 'none' || style.visibility !== 'visible') return false;
  if (Number(style.opacity) === 0) return false;

  const rect = rectOf(element);
  if (rect.width <= 1 || rect.height <= 1) return false;
  // `right < 0` catches the off-screen parking of the skip link and the
  // sr-only pattern. A negative *bottom* only means the page is scrolled past
  // the element, which says nothing about whether it is visible — measuring
  // that as "hidden" reported a page's `<h1>` as missing.
  if (rect.right < 0) return false;

  return true;
}

/**
 * Whether an element is painted *and* announced.
 *
 * Visually-hidden text (the 1×1 clip pattern) and anything parked off-screen
 * are "not visible": they are read aloud, not looked at, so contrast and tap
 * size do not apply to them.
 *
 * @param {Element} element
 * @returns {boolean}
 */
function isVisibleElement(element) {
  if (!isPainted(element)) return false;
  return !element.closest('[hidden], [aria-hidden="true"], [inert]');
}

/** Whether `outer` completely covers `inner`. */
function coversRect(outer, inner) {
  return (
    outer.left <= inner.left + 1 &&
    outer.top <= inner.top + 1 &&
    outer.right >= inner.right - 1 &&
    outer.bottom >= inner.bottom - 1
  );
}

/**
 * The text a screen reader would announce for an element's own content.
 *
 * `textContent` is not that text: it includes the decorative glyphs and the
 * icon labels marked `aria-hidden`, which is exactly the difference between a
 * button that announces "Close" and one that announces nothing at all.
 *
 * @param {Element} element
 * @returns {string}
 */
function announcedText(element) {
  let text = '';

  element.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      text += node.nodeValue;
      return;
    }
    if (node.nodeType !== 1) return;
    if (node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('hidden')) return;
    const label = node.getAttribute('aria-label');
    text += label && label.trim() ? ` ${label} ` : announcedText(node);
  });

  return text.replace(/\s+/g, ' ').trim();
}

/**
 * The accessible name of a control, or `''` when it has none.
 *
 * A deliberate subset of the accname algorithm: the parts that catch the
 * mistakes a hand-written component actually makes — an icon button with no
 * `aria-label`, an input whose `<label>` lost its `for`, a link whose only
 * content is an image with no `alt`.
 *
 * @param {Element} element
 * @returns {string}
 */
function accessibleNameOf(element) {
  const label = element.getAttribute('aria-label');
  if (label && label.trim()) return label.trim();

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => {
        const target = document.getElementById(id);
        return target ? announcedText(target) : '';
      })
      .filter(Boolean)
      .join(' ');
    if (text) return text;
  }

  if (element.labels && element.labels.length) {
    const text = Array.from(element.labels)
      .map((node) => announcedText(node))
      .filter(Boolean)
      .join(' ');
    if (text) return text;
  }

  const own = announcedText(element);
  if (own) return own;

  const image = element.querySelector('img[alt], svg[aria-label], [role="img"][aria-label]');
  if (image) {
    const alternative = image.getAttribute('alt') || image.getAttribute('aria-label') || '';
    if (alternative.trim()) return alternative.trim();
  }

  const title = element.getAttribute('title');
  if (title && title.trim()) return title.trim();

  if (element.tagName === 'INPUT' && /^(submit|reset|button)$/i.test(element.type)) {
    if (element.value && element.value.trim()) return element.value.trim();
  }

  return '';
}

/**
 * The colour actually painted behind an element's text.
 *
 * Walks up compositing translucent backgrounds until it reaches something
 * opaque, and gives up honestly the moment the answer stops being a colour: a
 * background image, a gradient, or — the case that matters on this site — a
 * photograph painted by an `<img>` the text sits on top of, as every hero
 * overlay and every locality card does. A photograph's contrast cannot be
 * computed from the CSS, only looked at, so those are reported as
 * "unknown" and checked by eye in the manual grid.
 *
 * @param {Element} element
 * @param {Array<{node: Element, rect: DOMRect}>} [media] the page's painted
 *   images, collected once by the caller
 * @returns {{colour: {r: number, g: number, b: number, a: number}, unknown: boolean}}
 */
function backgroundBehind(element, media) {
  let stack = { r: 0, g: 0, b: 0, a: 0 };
  let node = element;
  let cameFrom = null;
  const rect = rectOf(element);
  const boxes = media || [];

  // Each layer found is *under* everything found so far, so it composites
  // beneath the accumulated stack; the walk stops as soon as the stack is
  // opaque, because nothing further back can show through it.
  const stackOver = (layer) => {
    stack = compositeOver(stack, layer);
    return stack.a >= 0.999;
  };

  while (node && node.nodeType === 1) {
    const style = styleOf(node);

    // Layers painted between this node's own background and the text: the
    // positioned siblings of the branch we came up through (a card's scrim),
    // and the pictures this node contains (the photograph under it).
    if (cameFrom) {
      // Backwards from the branch we came up through: positioned siblings paint
      // in document order, so the one nearest the text is the one on top, and
      // anything *after* the branch is in front of the text rather than behind
      // it.
      const siblings = Array.from(node.children);
      for (let index = siblings.indexOf(cameFrom) - 1; index >= 0; index -= 1) {
        const sibling = siblings[index];
        if (sibling.contains(element)) continue;

        const siblingStyle = styleOf(sibling);
        if (siblingStyle.position === 'static') continue;
        if (!isPainted(sibling)) continue;
        if (!coversRect(rectOf(sibling), rect)) continue;

        if (siblingStyle.backgroundImage && siblingStyle.backgroundImage !== 'none') {
          return { colour: stack, unknown: true };
        }
        const siblingLayer = parseColor(siblingStyle.backgroundColor);
        if (siblingLayer && siblingLayer.a > 0 && stackOver(siblingLayer)) {
          return { colour: stack, unknown: false };
        }
      }
    }

    for (let index = 0; index < boxes.length; index += 1) {
      const box = boxes[index];
      if (box.node.contains(element)) continue;
      if (!node.contains(box.node)) continue;
      if (coversRect(box.rect, rect)) return { colour: stack, unknown: true };
    }

    if (style.backgroundImage && style.backgroundImage !== 'none') {
      return { colour: stack, unknown: true };
    }

    const layer = parseColor(style.backgroundColor);
    if (layer && layer.a > 0 && stackOver(layer)) return { colour: stack, unknown: false };

    cameFrom = node;
    node = node.parentElement;
  }

  // Nothing opaque anywhere: the canvas is the browser's own white.
  return { colour: compositeOver(stack, { r: 255, g: 255, b: 255, a: 1 }), unknown: false };
}

/** Whether an element carries text of its own (not only through children). */
function hasOwnText(element) {
  return Array.from(element.childNodes).some(
    (node) => node.nodeType === 3 && node.nodeValue.trim().length > 0
  );
}

/** Whether a control is disabled, and so exempt from the contrast minimum. */
function isDisabled(element) {
  return Boolean(
    element.disabled ||
    element.getAttribute('aria-disabled') === 'true' ||
    element.closest('[disabled], [aria-disabled="true"], fieldset[disabled]')
  );
}

/* ------------------------------------------------------------------ *
 * The audit
 * ------------------------------------------------------------------ */

/**
 * Every finding this document has, as `{ level, rule, message, selector, … }`.
 *
 * Runs in the page. `options.touchTargets` turns the 44 px rule on (the phone
 * widths); `options.minBodyFontSize` is the mobile floor for body copy.
 *
 * @param {{touchTargets?: boolean, minBodyFontSize?: number, maxNodes?: number}} [options]
 * @returns {{findings: Array<object>, stats: object}}
 */
function audit(options) {
  const settings = Object.assign(
    { touchTargets: false, minBodyFontSize: 0, maxNodes: 4000 },
    options || {}
  );
  // Rects are a snapshot of a layout that does not move while this runs.
  window.__snaRects = new WeakMap();

  const findings = [];
  const add = (level, rule, message, element, extra) =>
    findings.push(
      Object.assign(
        {
          level,
          rule,
          message,
          selector: element ? describeElement(element) : '',
        },
        extra || {}
      )
    );

  /* — Document-level — */

  const docWidth = document.documentElement.scrollWidth;
  const viewportWidth = window.innerWidth;

  /**
   * Whether the page really scrolls sideways — asked by trying it.
   *
   * `documentElement.scrollWidth` is not the question. Chromium counts a wide
   * element inside its **own** `overflow-x: auto` scroller towards the root's
   * scroll width, so `/admin/properties` reports 721 px of overflow in a
   * 1280 px viewport while the page does not move a pixel: the table scrolls,
   * the document does not, and a data table that scrolls inside its own box is
   * the correct design rather than the defect §8.1 forbids (NEW-48).
   *
   * So: remember where we are, ask the window to go as far right as it can,
   * read back whether it went, and put it back. A page that cannot scroll
   * answers 0 and nothing moved for the next rule to see.
   */
  const reachedX = (() => {
    const before = window.scrollX;
    try {
      // `behavior: 'instant'` is load-bearing, not decoration. `global.css`
      // sets `scroll-behavior: smooth` on the document, and a smooth scroll
      // is asynchronous: the position read on the next line would still be
      // the starting one, the rule would answer 0 for every page, and a real
      // sideways scroll would go unreported — a worse failure than the false
      // positive this replaced.
      window.scrollTo({ left: document.documentElement.clientWidth, behavior: 'instant' });
      return window.scrollX;
    } finally {
      window.scrollTo({ left: before, behavior: 'instant' });
    }
  })();

  if (reachedX > 1) {
    add(
      'error',
      'horizontal-scroll',
      `The page scrolls ${reachedX}px sideways in a ${viewportWidth}px viewport ` +
        `(document ${docWidth}px).`,
      null,
      { scrollWidth: docWidth, innerWidth: viewportWidth, scrolledBy: reachedX }
    );
  }

  const language = document.documentElement.getAttribute('lang');
  if (!language) add('error', 'html-lang', 'The document has no lang attribute.', null);

  const headings = Array.from(document.querySelectorAll('h1')).filter(isVisibleElement);
  if (headings.length !== 1) {
    add(
      'error',
      'h1-count',
      `The page has ${headings.length} visible <h1> elements, not 1.`,
      null,
      {
        texts: headings.slice(0, 4).map((node) => announcedText(node).slice(0, 60)),
      }
    );
  }

  if (!document.querySelector('main, [role="main"]')) {
    add('error', 'landmark-main', 'The page has no <main> landmark for the skip link to reach.');
  }
  ['header, [role="banner"]', 'footer, [role="contentinfo"]'].forEach((selector) => {
    if (!document.querySelector(selector)) {
      add('warn', 'landmark-missing', `No element matches ${selector}.`);
    }
  });

  const navigations = Array.from(document.querySelectorAll('nav, [role="navigation"]')).filter(
    isVisibleElement
  );
  if (navigations.length > 1) {
    const named = navigations.filter(
      (node) => node.getAttribute('aria-label') || node.getAttribute('aria-labelledby')
    );
    if (named.length !== navigations.length) {
      add(
        'warn',
        'nav-label',
        `${navigations.length - named.length} of ${navigations.length} navigation landmarks have no accessible name.`,
        navigations.find((node) => !named.includes(node))
      );
    }
  }

  const seen = new Map();
  document.querySelectorAll('[id]').forEach((node) => {
    const id = node.id;
    seen.set(id, (seen.get(id) || 0) + 1);
  });
  seen.forEach((count, id) => {
    if (count > 1) add('error', 'duplicate-id', `id "${id}" is used ${count} times.`, null, { id });
  });

  document.querySelectorAll('[tabindex]').forEach((node) => {
    if (Number(node.getAttribute('tabindex')) > 0) {
      add(
        'warn',
        'positive-tabindex',
        'tabindex is greater than 0, which reorders the tab ring.',
        node
      );
    }
  });

  /* — Images — */

  document.querySelectorAll('img').forEach((image) => {
    if (image.hasAttribute('alt')) return;
    if (image.getAttribute('aria-hidden') === 'true' || image.getAttribute('role') === 'none') {
      return;
    }
    add('error', 'image-alt', 'An <img> has no alt attribute.', image, {
      src: String(image.getAttribute('src') || '').slice(0, 120),
    });
  });

  /* — Form controls — */

  const CONTROLS = 'input, select, textarea';
  document.querySelectorAll(CONTROLS).forEach((control) => {
    const type = String(control.type || '').toLowerCase();
    if (type === 'hidden' || type === 'submit' || type === 'reset' || type === 'button') return;
    if (!isVisibleElement(control)) return;
    if (accessibleNameOf(control)) return;

    add('error', 'control-label', `A <${control.tagName.toLowerCase()}> has no label.`, control, {
      name: control.getAttribute('name') || '',
      placeholder: control.getAttribute('placeholder') || '',
    });
  });

  /* — Buttons, links and custom controls — */

  const NAMED =
    'button, a[href], [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="switch"], summary';
  document.querySelectorAll(NAMED).forEach((control) => {
    if (!isVisibleElement(control)) return;

    const name = accessibleNameOf(control);
    if (!name) {
      add(
        'error',
        'control-name',
        `A <${control.tagName.toLowerCase()}> has no accessible name.`,
        control
      );
      return;
    }

    // WCAG 2.5.3, Label in Name: somebody using voice control says the words
    // they can see, so an `aria-label` that replaces the visible text with
    // different words makes the control unspeakable.
    const label = control.getAttribute('aria-label');
    if (!label) return;
    const visible = announcedText(control);
    if (!visible) return;

    const simplify = (text) =>
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
    if (simplify(label).includes(simplify(visible))) return;

    add('warn', 'label-in-name', `The name "${label}" does not contain "${visible}".`, control, {
      label,
      visible: visible.slice(0, 60),
    });
  });

  /* — Contrast — */

  let inspected = 0;
  let unknownBackgrounds = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  const elements = [];
  while (walker.nextNode() && elements.length < settings.maxNodes) {
    elements.push(walker.currentNode);
  }

  // Collected once: every painted picture on the page, so the contrast walk
  // can tell "white on white" from "white on a photograph".
  const mediaBoxes = [];
  document.querySelectorAll('img, video, canvas, picture').forEach((node) => {
    if (!isPainted(node)) return;
    mediaBoxes.push({ node, rect: rectOf(node) });
  });

  elements.forEach((element) => {
    if (!hasOwnText(element)) return;
    const tag = element.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'OPTION') return;
    // `isPainted`, not `isVisibleElement`: contrast is about the eye, and text
    // marked `aria-hidden` is still on the screen. It is reported one level
    // down, though — WCAG exempts *incidental* text, and a tool cannot tell a
    // breadcrumb's "/" (decoration, like a border) from a rank numeral that is
    // the only thing showing the rank. Both surface; a person decides.
    if (!isPainted(element)) return;
    const decorative = !isVisibleElement(element);

    const style = styleOf(element);
    const foreground = parseColor(style.color);
    if (!foreground) return;

    const fontSize = Number.parseFloat(style.fontSize) || 16;
    const background = backgroundBehind(element, mediaBoxes);
    if (background.unknown) {
      unknownBackgrounds += 1;
      if (settings.minBodyFontSize && fontSize < settings.minBodyFontSize) {
        add('warn', 'font-size', `Text renders at ${fontSize}px on a phone.`, element, {
          fontSize,
          text: announcedText(element).slice(0, 40),
        });
      }
      return;
    }

    inspected += 1;

    const blended =
      foreground.a >= 0.999 ? foreground : compositeOver(foreground, background.colour);
    const ratio = contrastRatio(blended, background.colour);
    const required = requiredRatio(fontSize, style.fontWeight);

    if (ratio + 0.005 < required) {
      // The two colours go into the finding as `rgb()`: a report that says
      // "3.63:1" and nothing else cannot be acted on, and a hex literal cannot
      // be written into `docs/` (§2.4, enforced by `check-traces`).
      const asRgb = (colour) =>
        `rgb(${Math.round(colour.r)}, ${Math.round(colour.g)}, ${Math.round(colour.b)})`;

      add(
        isDisabled(element) || decorative ? 'warn' : 'error',
        'contrast',
        `Text contrast is ${ratio.toFixed(2)}:1, below the ${required}:1 minimum.`,
        element,
        {
          ratio: Number(ratio.toFixed(2)),
          required,
          fontSize,
          foreground: asRgb(blended),
          background: asRgb(background.colour),
          decorative,
          text: (announcedText(element) || element.textContent || '').trim().slice(0, 60),
        }
      );
    }

    if (settings.minBodyFontSize && fontSize < settings.minBodyFontSize) {
      add('warn', 'font-size', `Text renders at ${fontSize}px on a phone.`, element, {
        fontSize,
        text: announcedText(element).slice(0, 40),
      });
    }
  });

  /* — Placeholders — */

  document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((control) => {
    if (!isVisibleElement(control)) return;
    const placeholder = window.getComputedStyle(control, '::placeholder');
    const colour = parseColor(placeholder.color);
    if (!colour) return;
    const background = backgroundBehind(control, mediaBoxes);
    if (background.unknown) return;
    const ratio = contrastRatio(compositeOver(colour, background.colour), background.colour);
    if (ratio + 0.005 < 4.5) {
      add(
        'error',
        'placeholder-contrast',
        `Placeholder contrast is ${ratio.toFixed(2)}:1.`,
        control,
        {
          ratio: Number(ratio.toFixed(2)),
        }
      );
    }
  });

  /* — Tap targets — */

  let targets = 0;
  if (settings.touchTargets) {
    const TAPPABLE =
      'a[href], button, select, textarea, input:not([type="hidden"]), [role="button"], [role="tab"], [role="switch"], [role="menuitem"], [role="checkbox"], [role="radio"], [tabindex]:not([tabindex="-1"])';

    // A scrollable panel that was made focusable so a keyboard can reach its
    // scrollbar is not something anybody taps.
    const CONTAINER_ROLES = ['tabpanel', 'region', 'group', 'document', 'application'];

    document.querySelectorAll(TAPPABLE).forEach((control) => {
      if (!isVisibleElement(control)) return;
      if (isDisabled(control)) return;
      if (CONTAINER_ROLES.includes(control.getAttribute('role'))) return;

      const style = styleOf(control);
      // An inline link inside a sentence is text, not a target: WCAG exempts
      // it, and padding one to 44px would break the paragraph it lives in.
      if (control.tagName === 'A' && style.display === 'inline') return;

      targets += 1;

      // A checkbox or radio is activated by its label as much as by the box,
      // so the target is the two of them together — measuring the 20px box on
      // its own would report a failure a finger never meets.
      let rect = rectOf(control);
      if (/^(checkbox|radio)$/i.test(control.type) && control.labels?.length) {
        for (let index = 0; index < control.labels.length; index += 1) {
          const label = control.labels[index];
          if (!isPainted(label)) continue;
          const box = rectOf(label);
          rect = {
            left: Math.min(rect.left, box.left),
            top: Math.min(rect.top, box.top),
            right: Math.max(rect.right, box.right),
            bottom: Math.max(rect.bottom, box.bottom),
            width: 0,
            height: 0,
          };
          rect.width = rect.right - rect.left;
          rect.height = rect.bottom - rect.top;
        }
      }

      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (width >= 44 && height >= 44) return;

      add('warn', 'target-size', `Tap target is ${width}×${height}px, under 44×44.`, control, {
        width,
        height,
        name: accessibleNameOf(control).slice(0, 40),
      });
    });
  }

  return {
    findings,
    stats: {
      elements: elements.length,
      textNodesInspected: inspected,
      textOverImages: unknownBackgrounds,
      tapTargets: targets,
      scrollWidth: docWidth,
      innerWidth: viewportWidth,
      scrollY: Math.round(window.scrollY),
      headings: headings.length,
      lang: language || '',
    },
  };
}

/**
 * What the focused element looks like — the other half of the focus check.
 *
 * `scripts/a11y-audit.js` presses Tab and calls this after each stop, because
 * only a real key press moves focus and only the page can see what the ring
 * ended up being.
 *
 * @returns {{selector: string, tag: string, name: string, focusVisible: boolean,
 *   outlineWidth: number, hasRing: boolean, inViewport: boolean}|null}
 */
function readFocusRing() {
  const element = document.activeElement;
  if (!element || element === document.body || element === document.documentElement) return null;

  const style = window.getComputedStyle(element);
  const outlineWidth = Number.parseFloat(style.outlineWidth) || 0;
  // No cache here: `readFocusRing` runs once per Tab stop, and the ring it is
  // looking for is a style that changed a moment ago.
  const hasOutline = outlineWidth > 0 && style.outlineStyle !== 'none';
  const hasShadow = style.boxShadow && style.boxShadow !== 'none';
  const rect = element.getBoundingClientRect();

  // A search box, a number-with-unit group and the editor shell all draw their
  // ring on the wrapper with `:focus-within`, which is a perfectly visible
  // indicator and not something the focused field itself reports. Only an
  // `outline` counts up there — a `box-shadow` is as likely to be the card's
  // resting elevation as a focus ring.
  let wrapperRing = 0;
  let ancestor = element.parentElement;
  for (let step = 0; step < 3 && ancestor; step += 1) {
    const ancestorStyle = window.getComputedStyle(ancestor);
    const width = Number.parseFloat(ancestorStyle.outlineWidth) || 0;
    if (width > 0 && ancestorStyle.outlineStyle !== 'none') {
      wrapperRing = width;
      break;
    }
    ancestor = ancestor.parentElement;
  }

  let focusVisible = false;
  try {
    focusVisible = element.matches(':focus-visible');
  } catch {
    focusVisible = false;
  }

  return {
    selector: describeElement(element),
    tag: element.tagName.toLowerCase(),
    name: accessibleNameOf(element).slice(0, 60),
    focusVisible,
    outlineWidth: outlineWidth || wrapperRing,
    hasRing: hasOutline || Boolean(hasShadow) || wrapperRing > 0,
    ringOnWrapper: !hasOutline && wrapperRing > 0,
    inViewport: rect.top >= 0 && rect.bottom <= window.innerHeight + rect.height,
  };
}

/* ------------------------------------------------------------------ *
 * Injection
 * ------------------------------------------------------------------ */

/** Everything the two entry points call, in dependency order. */
const HELPERS = [
  parseColor,
  compositeOver,
  relativeLuminance,
  contrastRatio,
  requiredRatio,
  describeElement,
  styleOf,
  rectOf,
  isPainted,
  isVisibleElement,
  coversRect,
  announcedText,
  accessibleNameOf,
  backgroundBehind,
  hasOwnText,
  isDisabled,
];

/**
 * One self-contained expression that evaluates to `audit` or `readFocusRing`.
 *
 * Puppeteer's `page.evaluate(fn)` stringifies the function it is given and
 * nothing else, so a helper called from inside it would be `undefined` in the
 * page. Shipping the helpers with the entry point is the whole job.
 *
 * @param {'audit'|'readFocusRing'} [entry]
 * @returns {string}
 */
function buildAuditSource(entry = 'audit') {
  const main = entry === 'readFocusRing' ? readFocusRing : audit;
  const body = [...HELPERS, main].map((fn) => fn.toString()).join('\n\n');
  return `(() => {\n${body}\n\nreturn ${main.name};\n})()`;
}

module.exports = {
  audit,
  buildAuditSource,
  compositeOver,
  contrastRatio,
  parseColor,
  readFocusRing,
  relativeLuminance,
  requiredRatio,
};
