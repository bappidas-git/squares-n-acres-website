/**
 * Master data — localities, cities, segments, property types, amenities,
 * badges, developers, banks — and the small content collections that behave the same
 * way: article categories, article tags, authors, FAQs, testimonials, team
 * members and partners (00_MASTER_CONTEXT.md §6.2–§6.9, §5.14).
 *
 * The public lists of the seven property collections are loaded once per
 * session by `MasterDataContext` (D93); the admin screens of prompts 14–17 and
 * 33 use the `admin*` half.
 *
 * Every collection follows the same registry-driven shape, so one factory
 * builds them all rather than ninety hand-written one-liners.
 */

import { endpoints } from './endpoints';
import http from './http';

/**
 * Wraps one public group and its admin twin.
 *
 * @param {object} read the public registry group (may be `null` for admin-only)
 * @param {object} write the admin registry group
 */
const collection = (read, write) => ({
  ...(read?.list ? { list: (params, opts) => http.request(read.list, { params, ...opts }) } : {}),
  ...(read?.bySlug
    ? { bySlug: (slug, opts) => http.request(read.bySlug, { pathParams: { slug }, ...opts }) }
    : {}),
  adminList: (params, opts) => http.request(write.list, { params, ...opts }),
  adminGet: (id, opts) => http.request(write.get, { pathParams: { id }, ...opts }),
  create: (body, opts) => http.request(write.create, { body, ...opts }),
  update: (id, body, opts) => http.request(write.update, { pathParams: { id }, body, ...opts }),
  patch: (id, body, opts) => http.request(write.patch, { pathParams: { id }, body, ...opts }),
  remove: (id, opts) => http.request(write.remove, { pathParams: { id }, ...opts }),
  bulk: (body, opts) => http.request(write.bulk, { body, ...opts }),
  ...(write.checkSlug
    ? { checkSlug: (params, opts) => http.request(write.checkSlug, { params, ...opts }) }
    : {}),
});

/**
 * One collection as the admin kit expects a service: `list` is the admin list,
 * `get` the admin read, and `checkSlug` takes the arguments `SlugField` hands
 * it rather than a params object.
 *
 *   const config = { service: adminCrud(masterDataService.localities), … };
 *
 * @param {object} resource one of the collections below
 */
export const adminCrud = (resource) => ({
  list: (params, opts) => resource.adminList(params, opts),
  get: (id, opts) => resource.adminGet(id, opts),
  create: (body, opts) => resource.create(body, opts),
  update: (id, body, opts) => resource.update(id, body, opts),
  patch: (id, body, opts) => resource.patch(id, body, opts),
  remove: (id, opts) => resource.remove(id, opts),
  bulk: (body, opts) => resource.bulk(body, opts),
  ...(resource.checkSlug
    ? {
        checkSlug: (slug, { excludeId, signal } = {}) =>
          resource.checkSlug({ slug, excludeId }, { signal }),
      }
    : {}),
});

export const localities = collection(endpoints.localities, endpoints.adminLocalities);
export const cities = collection(endpoints.cities, endpoints.adminCities);
export const segments = collection(endpoints.segments, endpoints.adminSegments);
export const propertyTypes = collection(endpoints.propertyTypes, endpoints.adminPropertyTypes);
export const amenities = collection(endpoints.amenities, endpoints.adminAmenities);
export const badges = collection(endpoints.badges, endpoints.adminBadges);
export const developers = collection(endpoints.developers, endpoints.adminDevelopers);
export const banks = collection(endpoints.banks, endpoints.adminBanks);
// An article's taxonomy behaves exactly like the rest of the master data — a
// slugged name with a count of what points at it and a delete guard (§6.8) —
// so it is read and written through the same three collections rather than
// through `articleService`, which owns the articles themselves.
export const articleCategories = collection(
  endpoints.articleCategories,
  endpoints.adminArticleCategories
);
export const articleTags = collection(endpoints.articleTags, endpoints.adminArticleTags);
export const authors = collection(endpoints.authors, endpoints.adminAuthors);
export const faqs = collection(endpoints.faqs, endpoints.adminFaqs);
export const testimonials = collection(endpoints.testimonials, endpoints.adminTestimonials);
export const team = collection(endpoints.team, endpoints.adminTeam);
export const partners = collection(endpoints.partners, endpoints.adminPartners);

const masterDataService = {
  localities,
  cities,
  segments,
  propertyTypes,
  amenities,
  badges,
  developers,
  banks,
  articleCategories,
  articleTags,
  authors,
  faqs,
  testimonials,
  team,
  partners,
};

export default masterDataService;
