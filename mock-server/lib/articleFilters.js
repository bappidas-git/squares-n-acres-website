/**
 * Article visibility, filters and sorting (00_MASTER_CONTEXT.md §5.14, §6.8).
 *
 * One rule governs the whole module: an article is public when it says it is
 * published **and** its `publishedAt` has arrived. That makes `scheduled` a
 * real state rather than a label — an article scheduled for Tuesday 06:30
 * appears on Tuesday at 06:30 without anybody restarting the server — and it
 * is why the counters (`articleCount` on a category, a tag, an author), the
 * sitemap, the RSS feed and the dashboard all ask here instead of testing
 * `status === 'published'` themselves.
 *
 * Companion to `lib/propertyFilters.js` and `lib/leadFilters.js` of prompt 08.
 */

const { inCsv, matchesQ } = require('./filters');
const { sortItems } = require('./sort');

/** The sorts `GET /articles` accepts (§5.14). */
const PUBLIC_SORTS = {
  newest: { spec: 'publishedAt', order: 'desc' },
  popular: { spec: 'viewCount', order: 'desc' },
};

const first = (value) => (Array.isArray(value) ? value[0] : value);

const sameId = (left, right) =>
  left !== null && left !== undefined && String(left) === String(right);

/** Whether a moment has arrived; a missing date never has. */
const hasArrived = (value, now) => {
  if (!value) return false;
  const moment = Date.parse(value);
  return Number.isFinite(moment) && moment <= now;
};

/**
 * Whether the public site may show this article.
 *
 * @param {object} article
 * @param {number} [now]
 * @returns {boolean}
 */
function isLive(article, now = Date.now()) {
  if (!article) return false;
  if (article.status !== 'published' && article.status !== 'scheduled') return false;
  return hasArrived(article.publishedAt, now);
}

/**
 * The articles the public site may show, in the order they came in.
 *
 * @param {Array<object>} articles
 * @param {number} [now]
 * @returns {Array<object>}
 */
const liveArticles = (articles, now = Date.now()) =>
  (Array.isArray(articles) ? articles : []).filter((article) => isLive(article, now));

/**
 * Promotes every `scheduled` article whose moment has passed to `published`,
 * in place.
 *
 * The state is derived, so this is a convenience rather than a rule: the
 * article was already visible through {@link isLive}. It runs on read so that
 * the admin list, the SEO overview and the dashboard agree with the public
 * site about what is published without a cron job the mock has no way to run.
 *
 * @param {Array<object>} articles the stored rows, mutated in place
 * @param {number} [now]
 * @returns {boolean} true when something changed and the caller must persist
 */
function promoteScheduled(articles, now = Date.now()) {
  let changed = false;

  for (const article of Array.isArray(articles) ? articles : []) {
    if (article?.status !== 'scheduled' || !hasArrived(article.publishedAt, now)) continue;
    article.status = 'published';
    changed = true;
  }

  return changed;
}

/**
 * The §5.14 filters of `GET /articles`.
 *
 * `categorySlug`, `tagSlug` and `authorSlug` exist because the blog routes are
 * `/insights/articles/category/:slug` — resolving them here saves the frontend
 * a round-trip it would otherwise make on every category page.
 *
 * @param {Array<object>} articles already restricted to what the caller may see
 * @param {object} query
 * @param {{source?: object}} [options] collections to resolve the slugs against
 * @returns {Array<object>}
 */
function applyArticleFilters(articles, query = {}, { source = {} } = {}) {
  const categories = source.articleCategories ?? [];
  const tags = source.articleTags ?? [];
  const authors = source.authors ?? [];

  const idOfSlug = (rows, slug) => rows.find((row) => row.slug === slug)?.id ?? null;

  const categoryId = query.categorySlug
    ? idOfSlug(categories, String(first(query.categorySlug)))
    : (first(query.categoryId) ?? null);
  const tagId = query.tagSlug
    ? idOfSlug(tags, String(first(query.tagSlug)))
    : (first(query.tagId) ?? null);
  const authorId = query.authorSlug
    ? idOfSlug(authors, String(first(query.authorSlug)))
    : (first(query.authorId) ?? null);

  // A slug nothing matches is an empty result, not an unfiltered one.
  const missing =
    (query.categorySlug && categoryId === null) ||
    (query.tagSlug && tagId === null) ||
    (query.authorSlug && authorId === null);
  if (missing) return [];

  let result = articles;

  if (categoryId !== null && categoryId !== undefined && categoryId !== '') {
    result = result.filter((article) => sameId(article.categoryId, categoryId));
  }
  if (tagId !== null && tagId !== undefined && tagId !== '') {
    result = result.filter((article) => (article.tagIds ?? []).some((id) => sameId(id, tagId)));
  }
  if (authorId !== null && authorId !== undefined && authorId !== '') {
    result = result.filter((article) => sameId(article.authorId, authorId));
  }

  if (query.isFeatured !== undefined && query.isFeatured !== '') {
    const wanted = String(first(query.isFeatured)).toLowerCase();
    if (wanted === 'true' || wanted === '1') result = result.filter((a) => Boolean(a.isFeatured));
    if (wanted === 'false' || wanted === '0') result = result.filter((a) => !a.isFeatured);
  }

  const q = first(query.q);
  if (q) {
    result = result.filter((article) => matchesQ(article, ['title', 'excerpt', 'contentText'], q));
  }

  const ids = inCsv(query.ids);
  if (ids.length > 0) {
    return ids.map((id) => result.find((article) => sameId(article.id, id))).filter(Boolean);
  }

  return result;
}

/**
 * The §5.14 sort of `GET /articles`: `newest` (the default) or `popular`.
 *
 * @param {Array<object>} articles
 * @param {string} [sort]
 * @param {string} [order]
 * @returns {Array<object>}
 */
function applyArticleSort(articles, sort, order) {
  const key = PUBLIC_SORTS[String(first(sort) ?? '')] ? String(first(sort)) : 'newest';
  const { spec, order: fallback } = PUBLIC_SORTS[key];
  const wanted = String(first(order) ?? '').toLowerCase();

  return sortItems(articles, spec, wanted === 'asc' || wanted === 'desc' ? wanted : fallback);
}

module.exports = {
  isLive,
  liveArticles,
  promoteScheduled,
  applyArticleFilters,
  applyArticleSort,
  PUBLIC_SORTS,
};
