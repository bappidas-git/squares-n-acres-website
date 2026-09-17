/**
 * From an overview row to the record behind it (§9.1, §6.14).
 *
 * `GET /admin/seo/overview` answers with eight collections flattened into one
 * list, which is exactly what the desk needs to rank a site — and exactly not
 * enough to edit one. A row carries `seo`, not the listing's amenities or the
 * article's body, and the analysis reads the whole record: a keyword is "in the
 * content" or it is not.
 *
 * So the desk keeps one table of how to reach the record a row stands for: the
 * admin read, the `PATCH` that writes the branch back, the public page it is
 * about, the admin screen that edits it, and — for the two types that have one
 * — the preview token an unpublished record needs (D28).
 *
 * One table, because every screen of this folder asks the same question. The
 * dialog loads a record with it, the bulk tools walk every row through it, and
 * the issues tab links to it.
 */

import PATHS from '../../../routes/paths';
import articleService from '../../../services/articleService';
import masterDataService from '../../../services/masterDataService';
import pageService from '../../../services/pageService';
import propertyService from '../../../services/propertyService';
import { PREVIEW_QUERY } from '../properties/publicUrl';
import { SEO_ENTITY_TYPES } from '../../../config/enums';
import { SITE } from '../../../config/site';
import { publicPathFor } from '../../../seo/urls';

/** A master-data collection as the three functions the desk needs. */
const fromCollection = (collection) => ({
  get: (id, opts) => collection.adminGet(id, opts),
  patch: (id, body, opts) => collection.patch(id, body, opts),
});

/**
 * @type {Record<string, {
 *   label: string,          // singular, for a dialog title
 *   get: (id: number|string, opts?: object) => Promise<{data: object}>,
 *   patch: (id: number|string, body: object, opts?: object) => Promise<{data: object}>,
 *   adminPath: (id: number|string) => string,   // the screen that edits it
 *   previewToken?: (id: number|string, opts?: object) => Promise<{data: {token: string}}>,
 *   adminPreview?: boolean, // supports `?preview=admin` instead of a token
 * }>}
 */
export const SEO_ENTITY_SERVICES = {
  property: {
    label: 'Property',
    get: (id, opts) => propertyService.adminGet(id, opts),
    patch: (id, body, opts) => propertyService.patch(id, body, opts),
    adminPath: (id) => PATHS.adminPropertyEdit(id),
    adminPreview: true,
  },
  article: {
    label: 'Article',
    get: (id, opts) => articleService.adminGet(id, opts),
    patch: (id, body, opts) => articleService.patch(id, body, opts),
    adminPath: (id) => PATHS.adminArticleEdit(id),
    previewToken: (id, opts) => articleService.previewToken(id, opts),
  },
  page: {
    label: 'Page',
    get: (id, opts) => pageService.adminGet(id, opts),
    patch: (id, body, opts) => pageService.patch(id, body, opts),
    adminPath: (id) => PATHS.adminPageEdit(id),
    previewToken: (id, opts) => pageService.previewToken(id, opts),
  },
  locality: {
    label: 'Locality',
    ...fromCollection(masterDataService.localities),
    adminPath: (id) => PATHS.adminLocalityEdit(id),
  },
  developer: {
    label: 'Developer',
    ...fromCollection(masterDataService.developers),
    adminPath: (id) => PATHS.adminDeveloperEdit(id),
  },
  articleCategory: {
    label: 'Article category',
    ...fromCollection(masterDataService.articleCategories),
    // The taxonomy screens edit in a dialog, so the deep link is the list.
    adminPath: () => PATHS.adminArticleCategories,
  },
  author: {
    label: 'Author',
    ...fromCollection(masterDataService.authors),
    adminPath: () => PATHS.adminAuthors,
  },
  propertyType: {
    label: 'Property type',
    ...fromCollection(masterDataService.propertyTypes),
    adminPath: () => PATHS.adminPropertyTypes,
  },
};

/** The service table for a row's type, or `null` for a type this build has no screen for. */
export const serviceFor = (type) => SEO_ENTITY_SERVICES[type] ?? null;

/** The plural label the filters and the type chips read (§6.17). */
export const typeLabel = (type) => SEO_ENTITY_TYPES.labelOf(type) || type;

/** The singular label a dialog title reads. */
export const entityLabel = (type) => SEO_ENTITY_SERVICES[type]?.label ?? typeLabel(type);

/**
 * Whether a row is live on the public site.
 *
 * Articles and pages have a `status`; everything else has `isActive`. A row
 * that declares neither — the API sends `null` for both — is live.
 *
 * @param {{isActive?: boolean|null, status?: string|null}} row
 * @returns {boolean}
 */
export function isPublished(row) {
  if (typeof row?.status === 'string') return row.status === 'published';
  return row?.isActive !== false;
}

/**
 * The address "Open page" opens, on **this** deployment.
 *
 * Not the row's own `url`, which the API builds from `seoSettings.siteUrl` —
 * the address the site will have in production, and the wrong one to open from
 * a laptop running the dev server. The path is the same either way; only the
 * origin differs, and `SITE.url` is the origin this build is served from (D31).
 *
 * @param {{type: string, slug?: string|null, seo?: object}} row
 * @returns {string|null} `null` when the record has no slug yet
 */
export function publicUrlOfRow(row) {
  const path = publicPathFor(row?.type, { slug: row?.slug, seo: row?.seo });
  return path ? `${SITE.url}${path}` : null;
}

/**
 * The address that shows an editor a record nobody else can see yet.
 *
 * Three answers, because the three mechanisms are different (§5.10, D28):
 * a listing takes `?preview=admin`, an article and a page take a token the API
 * has to be asked for, and everything else has no draft state at all — a
 * locality is switched off, and switching it on is the only way to see it.
 *
 * @param {object} row an overview row
 * @returns {Promise<string|null>}
 */
export async function previewUrlOfRow(row) {
  const url = publicUrlOfRow(row);
  if (!url) return null;
  if (isPublished(row)) return url;

  const service = serviceFor(row?.type);
  if (service?.adminPreview) return `${url}${PREVIEW_QUERY}`;
  if (!service?.previewToken) return null;

  const { data } = await service.previewToken(row.id);
  return data?.token ? `${url}?preview=${data.token}` : null;
}

export default SEO_ENTITY_SERVICES;
