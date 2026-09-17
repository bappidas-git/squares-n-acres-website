/**
 * What a copy of a record may carry (00_MASTER_CONTEXT.md §5.9, §9.6).
 *
 * Two resources are duplicated in the browser rather than by an endpoint of
 * their own — articles and CMS pages, neither of which §5.14 gives a `duplicate`
 * route — and both have to answer the same two questions: what is the copy
 * called, and how much of the original's `seo` branch belongs to a different
 * URL. The answers live here so the two services cannot drift apart, and so the
 * reasoning is written down once.
 *
 *   copyTitle('A guide', { maxLength: 150 })   // 'A guide (Copy)'
 *   copySeo(record.seo)                        // no `slug`: the API derives it
 *   copySeo(record.seo, { slug: 'a-guide-copy' })
 */

/** What a copy is called. */
export const COPY_SUFFIX = ' (Copy)';

/** What a copy's slug ends in, which is what the API would append itself (§5.9). */
export const COPY_SLUG_SUFFIX = '-copy';

/**
 * `"<title> (Copy)"`, shortened so the result still fits the field.
 *
 * A title one character short of its limit plus the suffix is over it, and the
 * API refuses the write with a 422 on a field nobody typed into.
 *
 * @param {string} title
 * @param {{maxLength: number}} options the field's own ceiling (§6.8, §6.10)
 * @returns {string}
 */
export function copyTitle(title, { maxLength }) {
  const base = String(title ?? '');
  const room = maxLength - COPY_SUFFIX.length;
  return `${base.length <= room ? base : base.slice(0, room).trimEnd()}${COPY_SUFFIX}`;
}

/**
 * The `seo` branch a copy starts from (§9.6).
 *
 * The keywords, the title, the description, the social cards, the schema and the
 * sitemap settings are editorial and belong to a copy as much as the body does.
 * Three things do not:
 *
 *   - `slug` mirrors the entity slug (D34), so it is either left out for the API
 *     to derive or set to the slug the caller has chosen — never inherited;
 *   - `canonicalUrl` and `redirect` each name **one** page, and the copy is a
 *     different page: inherited, they would quietly canonicalise the copy to the
 *     original or redirect it away, and no admin screen shows either field until
 *     the SEO panel of prompt 36;
 *   - the score and the analysis are an answer about the original's text, so they
 *     are cleared for the panel to compute again — which is what §5.14 has the
 *     property `duplicate` endpoint do.
 *
 * @param {object|null|undefined} seo
 * @param {{slug?: string}} [options] the copy's slug; omitted leaves the key out
 * @returns {object}
 */
export function copySeo(seo, { slug } = {}) {
  const { slug: _inherited, ...rest } = seo ?? {};

  return {
    ...rest,
    ...(slug === undefined ? {} : { slug }),
    canonicalUrl: null,
    redirect: { enabled: false, toPath: '', statusCode: 301 },
    score: null,
    scoreBand: 'none',
    testsPassed: 0,
    testsTotal: 0,
    analysis: { basic: [], additional: [], titleReadability: [], contentReadability: [] },
    lastAnalyzedAt: null,
  };
}
