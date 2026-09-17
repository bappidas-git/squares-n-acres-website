/**
 * The `seo` object of §9.6 as **data**: its default shape, how a partial one is
 * filled in, how it reaches the API, and how a patch becomes form paths.
 *
 * Separate from the panel that edits it because half its callers never render
 * one. A form's `toPayload` needs `toSeoPayload`; a form's blank record needs
 * `createSeo`; neither should pull in the panel — nor, more to the point, the
 * panel's stylesheet, which is what makes the extracted CSS order ambiguous
 * across the admin chunks (`components/editor/RichTextField.jsx` documents the
 * same boundary).
 */

/** The §9.6 `seo` branch at its defaults — the shape every entity carries. */
export const createSeo = () => ({
  focusKeyword: '',
  secondaryKeywords: [],
  title: '',
  description: '',
  slug: '',
  canonicalUrl: '',
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
  og: { title: '', description: '', imageUrl: '' },
  twitter: { card: 'summary_large_image', title: '', description: '', imageUrl: '' },
  breadcrumbTitle: '',
  schema: { type: 'auto', custom: '', disabledAutoTypes: [] },
  sitemap: { include: true, priority: null, changefreq: '' },
  redirect: { enabled: false, toPath: '', statusCode: 301 },
  score: null,
  scoreBand: 'none',
  testsPassed: 0,
  testsTotal: 0,
  analysis: { basic: [], additional: [], titleReadability: [], contentReadability: [] },
  lastAnalyzedAt: null,
});

/**
 * A record's `seo` branch with every field of §9.6 present.
 *
 * A record saved before a field existed, a dialog that never carried one, a
 * blank form — the panel reads fifty fields and must never meet `undefined`.
 *
 * @param {object} [seo]
 * @returns {object}
 */
export function withSeoDefaults(seo) {
  const defaults = createSeo();
  const source = seo ?? {};

  return {
    ...defaults,
    ...source,
    robots: { ...defaults.robots, ...(source.robots ?? {}) },
    og: { ...defaults.og, ...(source.og ?? {}) },
    twitter: { ...defaults.twitter, ...(source.twitter ?? {}) },
    schema: { ...defaults.schema, ...(source.schema ?? {}) },
    sitemap: { ...defaults.sitemap, ...(source.sitemap ?? {}) },
    redirect: { ...defaults.redirect, ...(source.redirect ?? {}) },
    analysis: { ...defaults.analysis, ...(source.analysis ?? {}) },
  };
}

/** An empty control means "not set", and the contract spells that `null` (§9.6). */
const orNull = (value) => {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
};

/**
 * The `seo` branch as the API takes it.
 *
 * A form control that has been cleared holds `''`; the contract types
 * `canonicalUrl`, the two image URLs, the four social strings, the breadcrumb
 * title and the change frequency as **nullable**, and `''` is not a URL, not a
 * change frequency and not a title. One translation, in one place, so no host
 * form has to remember which of the fifty fields are which.
 *
 * @param {object} seo the §9.6 branch as the panel holds it
 * @param {string} [slug] the entity's own slug — D34, `seo.slug` mirrors it
 * @returns {object}
 */
export function toSeoPayload(seo, slug) {
  const full = withSeoDefaults(seo);

  return {
    ...full,
    slug: slug ?? full.slug ?? '',
    canonicalUrl: orNull(full.canonicalUrl),
    breadcrumbTitle: orNull(full.breadcrumbTitle),
    robots: { ...full.robots, maxImagePreview: full.robots.maxImagePreview || null },
    og: {
      title: orNull(full.og.title),
      description: orNull(full.og.description),
      imageUrl: orNull(full.og.imageUrl),
    },
    twitter: {
      card: full.twitter.card || 'summary_large_image',
      title: orNull(full.twitter.title),
      description: orNull(full.twitter.description),
      imageUrl: orNull(full.twitter.imageUrl),
    },
    sitemap: { ...full.sitemap, changefreq: orNull(full.sitemap.changefreq) },
  };
}

/**
 * A `seo` patch as the dotted paths a form writer takes.
 *
 * `{ title: 'x' }` becomes `{ 'seo.title': 'x' }`. The point is that each key
 * is written on its own: two patches arriving in the same tick — an editor's
 * keystroke and the analysis landing behind it — would otherwise each merge
 * onto the `seo` they read at render time, and the second would undo the first.
 *
 * @param {object} patch
 * @param {string} [prefix]
 * @returns {Record<string, unknown>}
 */
export const toSeoPaths = (patch, prefix = 'seo') =>
  Object.fromEntries(
    Object.entries(patch ?? {}).map(([key, value]) => [`${prefix}.${key}`, value])
  );

const seoValues = { createSeo, toSeoPaths, toSeoPayload, withSeoDefaults };

export default seoValues;
