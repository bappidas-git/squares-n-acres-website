/**
 * CMS pages (00_MASTER_CONTEXT.md §6.10). The renderer arrives in prompt 30.
 */

import { COPY_SLUG_SUFFIX, copySeo, copyTitle } from '../utils/duplicateRecord';
import { PATH_SLUG_MAX_LENGTH } from './schemas/page';
import { endpoints } from './endpoints';
import http from './http';

/**
 * The navigation list: published pages that an editor placed in the header or
 * the footer, as `{ slug, title, headerMenu, footerColumn, order }`.
 *
 *   pageService.list({ showInHeader: true })
 */
export const list = (params, opts) => http.request(endpoints.pages.list, { params, ...opts });

/** Published pages only; `?preview=<token>` also returns drafts (D28). */
export const getBySlug = (slug, params, opts) =>
  http.request(endpoints.pages.bySlug, { pathParams: { slug }, params, ...opts });

export const adminList = (params, opts) =>
  http.request(endpoints.adminPages.list, { params, ...opts });

export const adminGet = (id, opts) =>
  http.request(endpoints.adminPages.get, { pathParams: { id }, ...opts });

export const create = (body, opts) => http.request(endpoints.adminPages.create, { body, ...opts });

export const update = (id, body, opts) =>
  http.request(endpoints.adminPages.update, { pathParams: { id }, body, ...opts });

export const patch = (id, body, opts) =>
  http.request(endpoints.adminPages.patch, { pathParams: { id }, body, ...opts });

export const remove = (id, opts) =>
  http.request(endpoints.adminPages.remove, { pathParams: { id }, ...opts });

export const bulk = (body, opts) => http.request(endpoints.adminPages.bulk, { body, ...opts });

export const checkSlug = (params, opts) =>
  http.request(endpoints.adminPages.checkSlug, { params, ...opts });

export const previewToken = (id, opts) =>
  http.request(endpoints.adminPages.previewToken, { pathParams: { id }, ...opts });

/** Read-only fields a copy may not carry: the API owns all three (§5.5). */
const DERIVED_FIELDS = ['id', 'createdAt', 'updatedAt'];

/** The length §6.10 gives a page's title. */
const TITLE_MAX_LENGTH = 150;

/**
 * `<slug>-copy`, trimmed so the suffix still fits the path-slug budget.
 *
 * A page's slug is a URL **path** (§6.10), so the suffix lands on its last
 * segment: `buyer-assistance/home-loan` copies to
 * `buyer-assistance/home-loan-copy`.
 *
 * The slug is taken as it stands rather than run through `slugifyPath` again:
 * it came from the API, which is what canonicalises it (§5.9), so there is
 * nothing left to normalise — and reaching for `utils/slug` here would pull it
 * into the public `CmsPage` chunk, which this service is also part of.
 *
 * @param {string} slug
 * @returns {string} `''` when there is nothing to build on
 */
const copySlugOf = (slug) => {
  const base = String(slug ?? '').trim();
  if (!base) return '';

  const room = PATH_SLUG_MAX_LENGTH - COPY_SLUG_SUFFIX.length;
  const trimmed = base.length <= room ? base : base.slice(0, room).replace(/[-/]+$/, '');
  return `${trimmed}${COPY_SLUG_SUFFIX}`;
};

/**
 * The slug to give a copy: `<slug>-copy`, or the first free variant of it.
 *
 * A page's slug is **required** by §6.10 and carries no default, so — unlike an
 * article's — it cannot be left to the API to derive: the copy has to choose one
 * and it has to be free. `check-slug` answers both questions in one call and
 * hands back the variant to take (§5.9).
 *
 * @param {object} record the page being copied
 * @param {object} [opts]
 * @returns {Promise<string>} `''` only for a record with no slug, which §6.10
 *   does not allow to exist; the API then names the field in its refusal
 */
async function freeCopySlug(record, opts) {
  const candidate = copySlugOf(record.slug);
  if (!candidate) return candidate;

  try {
    const { data } = await checkSlug({ slug: candidate }, opts);
    return data?.available === false && data?.suggestion ? data.suggestion : candidate;
  } catch {
    // The check is a nicety: a slug that is taken anyway comes back as the 409
    // the caller already reports (§5.9).
    return candidate;
  }
}

/**
 * A copy of one page, as a draft.
 *
 * §5.14 gives properties a `duplicate` endpoint and pages none, so the copy is
 * made from the record the client already holds: read it whole, drop the three
 * fields the API owns, and `POST` the rest as a draft that is in neither menu —
 * a page nobody has read should not be live, and should not have appeared in the
 * header the moment it existed.
 *
 * **The slug is chosen here, not left empty.** §5.9 has the API derive a slug
 * when the client does not choose one, but §6.10 makes a page's slug `required`
 * with no default, so an absent one is refused as surely as the empty string
 * that was sent before (`{ slug: ['The slug field is required.'], 'seo.slug':
 * ['The seo.slug format is invalid.'] }` — the empty string is not a path slug).
 * The copy therefore asks for `<slug>-copy` and takes `check-slug`'s free
 * variant when that is taken, which is what the property endpoint does
 * server-side. `seo.slug` is set to the same string, because the two are one URL
 * (D34).
 *
 * @param {number|string} id
 * @param {object} [opts] `{ signal }`
 * @returns {Promise<{data: object}>} the copy, as `POST` returned it
 */
export const duplicate = async (id, opts) => {
  const { data: record } = await adminGet(id, opts);

  const body = { ...record };
  for (const field of DERIVED_FIELDS) delete body[field];

  const slug = await freeCopySlug(record, opts);

  return create(
    {
      ...body,
      title: copyTitle(record.title, { maxLength: TITLE_MAX_LENGTH }),
      slug,
      status: 'draft',
      // Out of both menus, and so with no menu to be in: the form nulls the two
      // placements the same way when their switch is off.
      showInHeader: false,
      headerMenu: null,
      showInFooter: false,
      footerColumn: null,
      seo: copySeo(record.seo, { slug }),
    },
    opts
  );
};

const pageService = {
  list,
  getBySlug,
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

export default pageService;
