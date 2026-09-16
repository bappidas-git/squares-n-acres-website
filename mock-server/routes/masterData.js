/**
 * Master data (00_MASTER_CONTEXT.md §5.14, §6.2–§6.6, §6.8, §6.9).
 *
 * Fourteen collections — localities, cities, property types, amenities,
 * badges, developers, banks, article categories, article tags, authors, FAQs,
 * testimonials, team members and partners — each with a public list, a public
 * slug lookup where it has a slug, and the admin CRUD, `bulk` and `check-slug`
 * of §5.14.
 *
 * The shape of all that is `mock-server/lib/crud.js`; this file is the part
 * that differs per collection: the filters it accepts, what it embeds, what it
 * counts and what refuses to be deleted while something still points at it
 * (D88). Reading one entry top to bottom tells you everything the API does
 * with that resource.
 */

const express = require('express');

const { makeCrudRouter } = require('../lib/crud');
const { embedLocality } = require('../lib/embed');
const { isLive } = require('../lib/articleFilters');
const { publicAuthor } = require('../lib/scope');

const sameId = (left, right) =>
  left !== null && left !== undefined && String(left) === String(right);

/** The active listings a `propertyCount` counts (§7 of this prompt). */
const activeProperties = (collections) =>
  (collections.properties ?? []).filter((property) => property.isActive);

/** The articles an `articleCount` counts: published and due (§6.8). */
const liveArticlesOf = (collections, now) =>
  (collections.articles ?? []).filter((article) => isLive(article, now));

/** `{ id, name, slug }` of a record in `collection`. */
const refOf = (rows, id) => {
  const record = (rows ?? []).find((row) => sameId(row.id, id));
  return record ? { id: record.id, name: record.name ?? null, slug: record.slug ?? null } : null;
};

/**
 * One resource's configuration, minus the wiring every one of them shares.
 *
 * @type {Array<object>}
 */
const RESOURCES = [
  {
    basePath: 'localities',
    collection: 'localities',
    schema: 'locality',
    needs: ['cities', 'properties'],
    noun: { one: 'locality', many: 'localities' },
    deleteGuard: 'locality',
    afterRead: (record, { collections }) => ({
      ...record,
      city: embedLocality(refOf(collections.cities, record.cityId)),
      propertyCount: activeProperties(collections).filter((property) =>
        sameId(property.location?.localityId, record.id)
      ).length,
    }),
    publicFilters: {
      zone: { field: 'zone' },
      cityId: { field: 'cityId' },
      isFeatured: { field: 'isFeatured', type: 'bool' },
    },
    sorts: { order: 'order,name', name: 'name', propertyCount: '-propertyCount' },
    defaultSort: 'order',
  },

  {
    basePath: 'cities',
    collection: 'cities',
    schema: 'city',
    noun: { one: 'city', many: 'cities' },
    deleteGuard: 'city',
    sorts: { name: 'name', order: 'name' },
    defaultSort: 'name',
  },

  {
    basePath: 'property-types',
    collection: 'propertyTypes',
    schema: 'propertyType',
    needs: ['properties'],
    noun: { one: 'property type', many: 'property types' },
    deleteGuard: 'propertyType',
    afterRead: (record, { collections }) => ({
      ...record,
      propertyCount: activeProperties(collections).filter((property) =>
        sameId(property.propertyTypeId, record.id)
      ).length,
    }),
    publicFilters: { segment: { field: 'segment' } },
    sorts: { order: 'order,name', name: 'name', propertyCount: '-propertyCount' },
    defaultSort: 'order',
  },

  {
    basePath: 'amenities',
    collection: 'amenities',
    schema: 'amenity',
    needs: ['properties'],
    noun: { one: 'amenity', many: 'amenities' },
    deleteGuard: 'amenity',
    afterRead: (record, { collections }) => ({
      ...record,
      propertyCount: activeProperties(collections).filter((property) =>
        (property.amenityIds ?? []).some((id) => sameId(id, record.id))
      ).length,
    }),
    publicFilters: { category: { field: 'category' } },
    sorts: {
      order: 'order,name',
      name: 'name',
      category: 'category,order',
      propertyCount: '-propertyCount',
    },
    defaultSort: 'order',
  },

  {
    basePath: 'badges',
    collection: 'badges',
    schema: 'badge',
    needs: ['properties'],
    noun: { one: 'badge', many: 'badges' },
    deleteGuard: 'badge',
    afterRead: (record, { collections }) => ({
      ...record,
      propertyCount: activeProperties(collections).filter((property) =>
        (property.badgeIds ?? []).some((id) => sameId(id, record.id))
      ).length,
    }),
    sorts: { order: 'order,name', name: 'name', propertyCount: '-propertyCount' },
    defaultSort: 'order',
  },

  {
    basePath: 'developers',
    collection: 'developers',
    schema: 'developer',
    needs: ['properties'],
    noun: { one: 'developer', many: 'developers' },
    deleteGuard: 'developer',
    afterRead: (record, { collections }) => ({
      ...record,
      propertyCount: activeProperties(collections).filter((property) =>
        sameId(property.project?.developerId, record.id)
      ).length,
    }),
    publicFilters: { isFeatured: { field: 'isFeatured', type: 'bool' } },
    sorts: { order: 'order,name', name: 'name', propertyCount: '-propertyCount' },
    defaultSort: 'order',
  },

  {
    basePath: 'banks',
    collection: 'banks',
    schema: 'bank',
    noun: { one: 'bank', many: 'banks' },
    // A bank is a reference table for the EMI calculator: nothing points at a
    // row, so nothing blocks the delete (§4.2 of this prompt).
    deleteGuard: false,
    sorts: { order: 'order,name', name: 'name', interestRateMin: 'interestRateMin' },
    defaultSort: 'order',
  },

  {
    basePath: 'article-categories',
    collection: 'articleCategories',
    schema: 'articleCategory',
    needs: ['articles'],
    noun: { one: 'category', many: 'categories' },
    deleteGuard: 'articleCategory',
    afterRead: (record, { collections }) => ({
      ...record,
      articleCount: liveArticlesOf(collections).filter((article) =>
        sameId(article.categoryId, record.id)
      ).length,
    }),
    sorts: { order: 'order,name', name: 'name', articleCount: '-articleCount' },
    defaultSort: 'order',
  },

  {
    basePath: 'article-tags',
    collection: 'articleTags',
    schema: 'articleTag',
    needs: ['articles'],
    noun: { one: 'tag', many: 'tags' },
    deleteGuard: 'articleTag',
    afterRead: (record, { collections }) => ({
      ...record,
      articleCount: liveArticlesOf(collections).filter((article) =>
        (article.tagIds ?? []).some((id) => sameId(id, record.id))
      ).length,
    }),
    sorts: { name: 'name', articleCount: '-articleCount' },
    defaultSort: 'name',
  },

  {
    basePath: 'authors',
    collection: 'authors',
    schema: 'author',
    needs: ['articles'],
    noun: { one: 'author', many: 'authors' },
    deleteGuard: 'author',
    afterRead: (record, { collections }) => ({
      ...record,
      articleCount: liveArticlesOf(collections).filter((article) =>
        sameId(article.authorId, record.id)
      ).length,
    }),
    // Belt and braces with the model's `publicOmit`: an author's e-mail is
    // private, and this is the rule stated where it is enforced (§5.10).
    publicTransform: publicAuthor,
    sorts: { name: 'name', articleCount: '-articleCount' },
    defaultSort: 'name',
  },

  {
    basePath: 'faqs',
    collection: 'faqs',
    schema: 'faq',
    noun: { one: 'FAQ', many: 'FAQs' },
    deleteGuard: 'faq',
    publicFilters: {
      category: { field: 'category' },
      showOnHome: { field: 'showOnHome', type: 'bool' },
      propertyTypeId: { field: 'propertyTypeId' },
    },
    sorts: { order: 'order,question', question: 'question', category: 'category,order' },
    defaultSort: 'order',
  },

  {
    basePath: 'testimonials',
    collection: 'testimonials',
    schema: 'testimonial',
    noun: { one: 'testimonial', many: 'testimonials' },
    deleteGuard: 'testimonial',
    publicFilters: { isFeatured: { field: 'isFeatured', type: 'bool' } },
    sorts: { order: 'order,name', rating: '-rating', createdAt: '-createdAt' },
    defaultSort: 'order',
  },

  {
    basePath: 'team',
    collection: 'teamMembers',
    schema: 'teamMember',
    noun: { one: 'team member', many: 'team members' },
    deleteGuard: 'teamMember',
    publicFilters: { showOnAbout: { field: 'showOnAbout', type: 'bool' } },
    sorts: { order: 'order,name', name: 'name' },
    defaultSort: 'order',
  },

  {
    basePath: 'partners',
    collection: 'partners',
    schema: 'partner',
    noun: { one: 'partner', many: 'partners' },
    deleteGuard: 'partner',
    publicFilters: { category: { field: 'category' } },
    sorts: { order: 'order,name', name: 'name' },
    defaultSort: 'order',
  },
];

/**
 * The master-data router: one CRUD router per entry of {@link RESOURCES}.
 *
 * @param {{db: object, getModel: Function}} deps
 * @returns {import('express').Router}
 */
module.exports = ({ db, getModel }) => {
  const router = express.Router();

  for (const resource of RESOURCES) {
    router.use(
      makeCrudRouter({
        db,
        model: getModel(resource.collection),
        basePath: resource.basePath,
        schema: resource.schema,
        collections: resource.needs ?? [],
        afterRead: resource.afterRead,
        publicTransform: resource.publicTransform,
        publicFilters: resource.publicFilters,
        adminFilters: resource.adminFilters,
        sorts: resource.sorts,
        defaultSort: resource.defaultSort,
        deleteGuard: resource.deleteGuard,
        noun: resource.noun,
      })
    );
  }

  return router;
};

module.exports.RESOURCES = RESOURCES;
