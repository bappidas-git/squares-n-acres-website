/**
 * Master data (00_MASTER_CONTEXT.md §5.14, §6.2–§6.6, §6.8, §6.9).
 *
 * Fifteen collections — localities, cities, segments, property types,
 * amenities, badges, developers, banks, article categories, article tags,
 * authors, FAQs, testimonials, team members and partners — each with a public
 * list, a public slug lookup where it has a public page, and the admin CRUD,
 * `bulk` and `check-slug` of §5.14.
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
const { isBuiltInSegment } = require('../../src/config/segments');
const { FAQ_CATEGORIES } = require('../../src/config/enums');
const { publicAuthor } = require('../lib/scope');
const { stripHtml, unsafeMarkup } = require('../lib/html');
const { validation } = require('../middleware/errors');

const sameId = (left, right) =>
  left !== null && left !== undefined && String(left) === String(right);

/** The active listings a `propertyCount` counts (§7 of this prompt). */
const activeProperties = (collections) =>
  (collections.properties ?? []).filter((property) => property.isActive);

/** The articles an `articleCount` counts: published and due (§6.8). */
const liveArticlesOf = (collections, now) =>
  (collections.articles ?? []).filter((article) => isLive(article, now));

/**
 * What a segment keeps once it exists (QA-52).
 *
 * Listings and property types store a segment's **slug**, so renaming one must
 * not re-slug it the way it re-slugs a locality: a different slug is refused,
 * and an empty or missing one is the stored one — a `PUT` that leaves it out
 * would otherwise have a new one derived from the new name. A built-in segment
 * keeps its `kind` too — `/commercial` and `/plots` are built on those three.
 *
 * @param {object} body the request body
 * @param {{existing?: object, method: string}} context
 * @returns {object} the body, carrying the stored slug
 */
function keepSegmentIdentity(body, { existing }) {
  if (!existing) return body;

  const sent = body.slug;
  if (sent !== undefined && sent !== null && sent !== '' && sent !== existing.slug) {
    throw validation({
      slug: ['A segment keeps its key: listings and property types are filed under it.'],
    });
  }
  body.slug = existing.slug;

  if (isBuiltInSegment(existing.slug) && body.kind !== undefined && body.kind !== existing.kind) {
    throw validation({
      kind: ['A built-in segment keeps its layout: the site’s own pages are built on it.'],
    });
  }

  return body;
}

/** What an answer carrying a script is told — the articles API's sentence (QA-55). */
const UNSAFE_ANSWER =
  'The text may not carry a script, an inline event handler or a javascript: link.';

/** A question as two questions are compared: case, spacing and the final "?" aside. */
const questionKey = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\s?？]+$/, '')
    .trim();

/**
 * What a FAQ write sends, tidied before it is checked (QA-59): the question
 * without the spaces a paste leaves around it — they were stored, and the
 * list, the site and the `FAQPage` markup all printed them.
 *
 * @param {object} body the request body
 * @returns {object} the same body
 */
function tidyFaq(body) {
  if (typeof body.question === 'string') body.question = body.question.trim();
  return body;
}

/**
 * The rules of a FAQ the schema cannot state (QA-59), answered as one 422:
 *
 * - **The answer has words.** `answer` is required, and an empty bullet or an
 *   empty heading is not an answer: `<ul><li><p></p></li></ul>` passed, and
 *   the site showed a question that opened onto nothing.
 * - **The answer runs nothing** — no script, inline handler or `javascript:`
 *   link, which the articles API has refused since QA-55. The editor never
 *   writes one; arriving here, it came from somewhere else.
 * - **The property type exists.** `exists:property_types,id` is the Laravel
 *   rule the guidelines already document; the mock stored `99999`, and the
 *   question then appeared on no listing at all.
 * - **A category asks a question once.** The same question twice in one tab
 *   is a double submission or a paste, and the site listed it twice.
 *
 * A `PATCH` is asked only about the fields it sends.
 *
 * @param {object} record the record about to be stored
 * @param {{method: string, body: object, existing?: object, db: object}} context
 * @returns {object} the same record
 */
function checkFaq(record, { method, body, existing, db }) {
  const touches = (field) =>
    method !== 'PATCH' || Object.prototype.hasOwnProperty.call(body ?? {}, field);
  const found = {};

  if (touches('answer') && typeof record.answer === 'string' && record.answer.trim() !== '') {
    if (unsafeMarkup(record.answer)) found.answer = [UNSAFE_ANSWER];
    else if (stripHtml(record.answer) === '') found.answer = ['The answer field is required.'];
  }

  if (
    touches('propertyTypeId') &&
    record.propertyTypeId !== null &&
    record.propertyTypeId !== undefined &&
    !(db.getCollection('propertyTypes') ?? []).some((type) =>
      sameId(type.id, record.propertyTypeId)
    )
  ) {
    found.propertyTypeId = ['The selected propertyTypeId is invalid.'];
  }

  if (touches('question') || touches('category')) {
    const key = questionKey(record.question);
    const twin = (db.getCollection('faqs') ?? []).find(
      (faq) =>
        !sameId(faq.id, existing?.id ?? record.id) &&
        faq.category === record.category &&
        questionKey(faq.question) === key
    );
    if (key && twin) {
      const tab = FAQ_CATEGORIES.labelOf(record.category) || record.category;
      found.question = [`This question is already under ${tab}.`];
    }
  }

  if (Object.keys(found).length > 0) throw validation(found);
  return record;
}

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
    basePath: 'segments',
    collection: 'segments',
    schema: 'segment',
    needs: ['properties', 'propertyTypes'],
    noun: { one: 'segment', many: 'segments' },
    deleteGuard: 'segment',
    // The public list answers every segment (the model's `publicNote`); a
    // segment has no public page, so there is no read by slug.
    routes: [
      'list',
      'adminList',
      'create',
      'get',
      'update',
      'patch',
      'remove',
      'bulk',
      'checkSlug',
    ],
    beforeValidate: keepSegmentIdentity,
    protect: (record) =>
      isBuiltInSegment(record.slug)
        ? 'A built-in segment cannot be deleted: the site’s own pages are built on it.'
        : null,
    afterRead: (record, { collections }) => ({
      ...record,
      builtIn: isBuiltInSegment(record.slug),
      propertyTypeCount: (collections.propertyTypes ?? []).filter(
        (type) => type.segment === record.slug
      ).length,
      propertyCount: activeProperties(collections).filter(
        (property) => property.segment === record.slug
      ).length,
    }),
    publicFilters: { kind: { field: 'kind' } },
    sorts: {
      order: 'order,name',
      name: 'name',
      propertyTypeCount: '-propertyTypeCount',
      propertyCount: '-propertyCount',
    },
    defaultSort: 'order',
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
    beforeValidate: tidyFaq,
    beforeSave: checkFaq,
    // A FAQ added at 3 is third, and no two FAQs share a number (QA-59).
    settleOrder: true,
    publicFilters: {
      category: { field: 'category' },
      showOnHome: { field: 'showOnHome', type: 'bool' },
      propertyTypeId: { field: 'propertyTypeId' },
    },
    sorts: {
      order: 'order,question',
      question: 'question',
      category: 'category,order',
      updatedAt: '-updatedAt',
    },
    defaultSort: 'order',
  },

  {
    basePath: 'testimonials',
    collection: 'testimonials',
    schema: 'testimonial',
    noun: { one: 'testimonial', many: 'testimonials' },
    deleteGuard: 'testimonial',
    publicFilters: { isFeatured: { field: 'isFeatured', type: 'bool' } },
    // Sample records are seeded placeholders (D41): the public site drops them
    // in a production build, and this is how an editor finds them to replace.
    adminFilters: { isSample: { field: 'isSample', type: 'bool' } },
    sorts: {
      order: 'order,name',
      name: 'name',
      rating: '-rating',
      createdAt: '-createdAt',
      updatedAt: '-updatedAt',
    },
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
        protect: resource.protect,
        beforeValidate: resource.beforeValidate,
        beforeSave: resource.beforeSave,
        settleOrder: resource.settleOrder ?? false,
        routes: resource.routes ?? null,
        noun: resource.noun,
      })
    );
  }

  return router;
};

module.exports.RESOURCES = RESOURCES;
