/**
 * The §9.6 `seo` object, built once and reused by every entity that owns a
 * public URL.
 *
 * The seed fills `title`, `description`, `focusKeyword` and
 * `secondaryKeywords` — the four fields an editor would write — and leaves the
 * analysis half (`score`, `scoreBand`, `testsPassed`, `testsTotal`,
 * `analysis`, `lastAnalyzedAt`) at its "never analysed" default. Those are
 * computed by the SEO engine in prompts 36–37 and stored on save; inventing
 * scores here would put numbers on the dashboard that no analyser produced.
 */

/** Characters Google shows of a title before it truncates (§9.5 guidance). */
const TITLE_LIMIT = 60;

/** The description window the snippet analyser treats as "good" (§9.6). */
const DESCRIPTION_MIN = 120;
const DESCRIPTION_MAX = 160;

/**
 * @param {object} input
 * @param {string} input.title the entity half of the title, without the site name
 * @param {string} input.description the meta description
 * @param {string} input.focusKeyword lowercase, the phrase the page targets
 * @param {string[]} [input.secondaryKeywords]
 * @param {string} input.slug mirrors the entity slug (D34)
 * @returns {object} the complete §9.6 object
 */
function makeSeo({ title, description, focusKeyword, secondaryKeywords = [], slug }) {
  return {
    focusKeyword,
    secondaryKeywords,
    title,
    description,
    slug,
    canonicalUrl: null,
    robots: {
      index: true,
      follow: true,
      noarchive: false,
      nosnippet: false,
      noimageindex: false,
      maxSnippet: null,
      maxImagePreview: 'large',
      maxVideoPreview: null,
    },
    og: { title: null, description: null, imageUrl: null },
    twitter: { card: 'summary_large_image', title: null, description: null, imageUrl: null },
    breadcrumbTitle: null,
    schema: { type: 'auto', custom: '', disabledAutoTypes: [] },
    sitemap: { include: true, priority: null, changefreq: null },
    redirect: { enabled: false, toPath: '', statusCode: 301 },
    score: null,
    scoreBand: 'none',
    testsPassed: 0,
    testsTotal: 0,
    analysis: { basic: [], additional: [], titleReadability: [], contentReadability: [] },
    lastAnalyzedAt: null,
  };
}

/**
 * Trims a meta description into the 120–160 character window without cutting a
 * word in half, padding with `tail` when the text is short.
 *
 * @param {string} text
 * @param {string} [tail] appended (once) when `text` is under the minimum
 * @returns {string}
 */
function fitDescription(text, tail = '') {
  let value = String(text).replace(/\s+/g, ' ').trim();

  if (value.length < DESCRIPTION_MIN && tail) {
    value = `${value.replace(/\.$/, '')}. ${tail}`.replace(/\s+/g, ' ').trim();
  }

  if (value.length <= DESCRIPTION_MAX) return value;

  const cut = value.slice(0, DESCRIPTION_MAX + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > DESCRIPTION_MIN ? lastSpace : DESCRIPTION_MAX)}`
    .replace(/[\s,;–—-]+$/, '')
    .trim();
}

module.exports = { makeSeo, fitDescription, TITLE_LIMIT, DESCRIPTION_MIN, DESCRIPTION_MAX };
