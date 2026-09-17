/**
 * Articles, their taxonomy and their authors (00_MASTER_CONTEXT.md §5.14, §6.8).
 *
 * `list({ ids })` is what the detail page uses for `relatedArticleIds`: the
 * API returns the given ids in the given order, so the editor's ordering
 * survives (§5.7 `ids`).
 */

import { copySeo, copyTitle } from '../utils/duplicateRecord';
import { endpoints } from './endpoints';
import http from './http';

/* Public */

export const list = (params, opts) => http.request(endpoints.articles.list, { params, ...opts });

export const getBySlug = (slug, params, opts) =>
  http.request(endpoints.articles.bySlug, { pathParams: { slug }, params, ...opts });

/** The six most-read published articles. */
export const trending = (params, opts) =>
  http.request(endpoints.articles.trending, { params, ...opts });

export const categories = (params, opts) =>
  http.request(endpoints.articleCategories.list, { params, ...opts });

export const tags = (params, opts) => http.request(endpoints.articleTags.list, { params, ...opts });

export const authors = (params, opts) => http.request(endpoints.authors.list, { params, ...opts });

export const authorBySlug = (slug, opts) =>
  http.request(endpoints.authors.bySlug, { pathParams: { slug }, ...opts });

/* Admin */

export const adminList = (params, opts) =>
  http.request(endpoints.adminArticles.list, { params, ...opts });

export const adminGet = (id, opts) =>
  http.request(endpoints.adminArticles.get, { pathParams: { id }, ...opts });

export const create = (body, opts) =>
  http.request(endpoints.adminArticles.create, { body, ...opts });

export const update = (id, body, opts) =>
  http.request(endpoints.adminArticles.update, { pathParams: { id }, body, ...opts });

export const patch = (id, body, opts) =>
  http.request(endpoints.adminArticles.patch, { pathParams: { id }, body, ...opts });

export const remove = (id, opts) =>
  http.request(endpoints.adminArticles.remove, { pathParams: { id }, ...opts });

export const bulk = (body, opts) => http.request(endpoints.adminArticles.bulk, { body, ...opts });

export const checkSlug = (params, opts) =>
  http.request(endpoints.adminArticles.checkSlug, { params, ...opts });

/** A 24-hour token that opens the public URL on an unpublished draft (D28). */
export const previewToken = (id, opts) =>
  http.request(endpoints.adminArticles.previewToken, { pathParams: { id }, ...opts });

/**
 * Read-only and computed fields a copy may not carry: the API derives all of
 * them and ignores them if sent (§5.5, §6.8).
 */
const DERIVED_FIELDS = [
  'id',
  'createdAt',
  'updatedAt',
  'contentText',
  'wordCount',
  'readingTimeMinutes',
  'viewCount',
  'category',
  'tags',
  'author',
];

/** The length §6.8 gives an article's title. */
const TITLE_MAX_LENGTH = 100;

/**
 * A copy of one article, as a draft.
 *
 * §5.14 gives properties a `duplicate` endpoint and articles none, so the copy
 * is made from the record the client already holds: read it whole, drop the
 * fields the API owns, and `POST` the rest with a new title and the status
 * forced back to `draft`. A copy nobody has read yet must not be live,
 * featured, or carrying the original's publication date.
 *
 * **The slug is left out of the body, not sent empty.** §5.9 has the API derive
 * a slug from the title when the client does not choose one and de-duplicate it,
 * so the copy lands on `<slug>-copy`; but an empty *string* is not "no slug" to
 * the validator — it is a slug that does not match the slug pattern, and the
 * request is refused with a 422 on a field nobody typed into. The same goes for
 * the `seo.slug` that mirrors it (D34).
 *
 * The `seo` branch travels with the copy except for the parts that name *one*
 * page: see `utils/duplicateRecord`'s `copySeo`.
 *
 * @param {number|string} id
 * @param {object} [opts] `{ signal }`
 * @returns {Promise<{data: object}>} the copy, as `POST` returned it
 */
export const duplicate = async (id, opts) => {
  const { data: record } = await adminGet(id, opts);

  const body = { ...record };
  for (const field of DERIVED_FIELDS) delete body[field];
  delete body.slug;

  return create(
    {
      ...body,
      title: copyTitle(record.title, { maxLength: TITLE_MAX_LENGTH }),
      status: 'draft',
      publishedAt: null,
      isFeatured: false,
      seo: copySeo(record.seo),
    },
    opts
  );
};

const articleService = {
  list,
  getBySlug,
  trending,
  categories,
  tags,
  authors,
  authorBySlug,
  adminList,
  adminGet,
  create,
  update,
  patch,
  remove,
  bulk,
  checkSlug,
  previewToken,
  duplicate,
};

export default articleService;
