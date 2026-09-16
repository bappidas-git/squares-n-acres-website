/**
 * Articles, their taxonomy and their authors (00_MASTER_CONTEXT.md §5.14, §6.8).
 *
 * `list({ ids })` is what the detail page uses for `relatedArticleIds`: the
 * API returns the given ids in the given order, so the editor's ordering
 * survives (§5.7 `ids`).
 */

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
};

export default articleService;
