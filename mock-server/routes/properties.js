/**
 * Properties — the public search and the admin desk (00_MASTER_CONTEXT.md
 * §5.7, §5.14, §6.1, §10).
 *
 *   GET  /api/properties                 search, facets, every §5.7 filter
 *   GET  /api/properties/featured        `isFeatured`, by priority
 *   GET  /api/properties/suggestions     the header's type-ahead
 *   GET  /api/properties/slug/:slug      the detail page (404 when inactive)
 *   GET  /api/properties/:id/similar     admin picks first, then the fill rule
 *   POST /api/properties/:id/view        one counted view per IP per hour
 *   …and the admin CRUD, `duplicate`, `bulk` and `check-slug` of §5.14.
 *
 * Public reads see active listings only and lose the audit columns and an
 * agent's direct line (`lib/scope.js`); admin reads see the record as stored.
 * Both embed the display objects of §5.5 on the page they return rather than
 * on the whole collection.
 *
 * Authentication and the role matrix are applied to `/admin/*` by
 * `mock-server/app.js` before this router runs, so a sales user reaches the
 * list (`properties.view`) and never the writes (`properties.edit`).
 */

const express = require('express');

const schemas = require('../../src/services/schemas');
const { applyPropertyFilters, applyPropertySort, priceOf } = require('../lib/propertyFilters');
const { checkSlug, ensureUniqueSlug, slugify } = require('../lib/slug');
const { computeFacets } = require('../lib/facets');
const { conflict, notFound, validation } = require('../middleware/errors');
const { countView } = require('../lib/viewCounter');
const { clientIp } = require('../middleware/rateLimit');
const { embedProperty } = require('../lib/embed');
const { inCsv, matchesQ } = require('../lib/filters');
const { maxId, nextId } = require('../lib/ids');
const {
  paginate,
  toPositiveInt,
  DEFAULT_PER_PAGE_ADMIN,
  DEFAULT_PER_PAGE_PUBLIC,
} = require('../lib/paginate');
const { publicProperty } = require('../lib/scope');
const { validateBody } = require('../middleware/validate');
const {
  buildDefaults,
  deepPatch,
  mergeDefaults,
  sanitize,
  serverManagedValues,
} = require('../middleware/timestamps');

/** The collections the embeds and the facets resolve ids against. */
const SOURCE_COLLECTIONS = [
  'properties',
  'propertyTypes',
  'amenities',
  'badges',
  'localities',
  'cities',
  'developers',
  'teamMembers',
];

/** The nested arrays whose entries carry an id the server assigns (§5.5). */
const NESTED_ID_ARRAYS = [
  'images',
  'unitConfigurations',
  'floorPlans',
  'documents',
  'nearbyPlaces',
  'constructionTimeline',
  'faqs',
];

/** `POST /admin/properties/bulk` (§5.8). */
const BULK_ACTIONS = {
  activate: { isActive: true },
  deactivate: { isActive: false },
  feature: { isFeatured: true },
  unfeature: { isFeatured: false },
  verify: { isVerified: true },
  unverify: { isVerified: false },
  delete: null,
};

/** How many listings `/properties/:id/similar` answers with (§5.14). */
const SIMILAR_LIMIT = 6;

/** How many entries each group of `/properties/suggestions` holds (§5.14). */
const SUGGESTION_LIMIT = 5;

/** `q` must be this long before the type-ahead answers with anything. */
const SUGGESTION_MIN_LENGTH = 2;

const first = (value) => (Array.isArray(value) ? value[0] : value);

const sameId = (left, right) => String(left) === String(right);

/**
 * Gives every entry of the nested arrays an id, keeping the ones it has.
 *
 * The form posts a new image without an id; the API assigns `max + 1` inside
 * that array, so ids stay stable for the entries that already had one.
 */
function assignNestedIds(body) {
  for (const field of NESTED_ID_ARRAYS) {
    const entries = body?.[field];
    if (!Array.isArray(entries)) continue;

    let highest = maxId(entries);
    body[field] = entries.map((entry) => {
      if (!entry || typeof entry !== 'object') return entry;
      if (Number.isInteger(entry.id)) return entry;
      highest += 1;
      return { ...entry, id: highest };
    });
  }
  return body;
}

/**
 * Enforces "exactly one cover" (§6.1): the marked one, else the first image.
 */
function ensureSingleCover(images) {
  if (!Array.isArray(images) || images.length === 0) return images;

  const coverIndex = images.findIndex((image) => image?.isCover);
  const chosen = coverIndex === -1 ? 0 : coverIndex;
  return images.map((image, index) => ({ ...image, isCover: index === chosen }));
}

/**
 * The properties router.
 *
 * @param {{db: object, getModel: Function}} deps
 * @returns {import('express').Router}
 */
module.exports = ({ db, getModel }) => {
  const router = express.Router();
  const model = getModel('properties');

  const rows = () => db.getCollection('properties');
  const find = (id) => rows().find((property) => sameId(property?.id, id));

  /** The collections the embeds need, read fresh for every request. */
  const source = () =>
    Object.fromEntries(SOURCE_COLLECTIONS.map((name) => [name, db.getCollection(name)]));

  const active = () => rows().filter((property) => property.isActive);

  const present = (property, { admin, collections = source() }) => {
    const embedded = embedProperty(property, collections);
    return admin ? embedded : publicProperty(embedded);
  };

  /** `perPage`, with `all` reserved for the admin routes (§5.6). */
  const pageSize = (query, admin) => {
    if (admin && String(first(query.perPage)) === 'all') return null;
    return toPositiveInt(
      first(query.perPage),
      admin ? DEFAULT_PER_PAGE_ADMIN : DEFAULT_PER_PAGE_PUBLIC
    );
  };

  /** The `{ data, meta }` of a property list, with the §5.7 facets. */
  function listResponse(res, items, query, { admin, facets = true }) {
    const collections = source();
    // `ids` asks for those listings in that order — a sort would undo it (§5.7).
    const sorted =
      inCsv(query.ids).length > 0
        ? items.slice()
        : applyPropertySort(items, query.sort, query.order);
    const { data, meta } = paginate(sorted, {
      page: first(query.page),
      perPage: pageSize(query, admin),
    });

    res.ok(
      data.map((property) => present(property, { admin, collections })),
      facets ? { ...meta, facets: computeFacets(sorted, collections) } : meta
    );
  }

  /**
   * Turns a request body into a stored property.
   *
   * `POST` starts from the model defaults, `PUT` from the defaults plus the
   * server-managed values of the record it replaces, and `PATCH` from the
   * record itself — the §5.8 semantics, with the property-specific invariants
   * (slug, cover image, nested ids, `publishedAt`) applied on top.
   */
  function buildRecord(body, { existing = null, method, user }) {
    const clean = sanitize(assignNestedIds({ ...body }), model.fields);
    const now = new Date().toISOString();

    let record;
    if (method === 'POST') {
      record = {
        ...mergeDefaults(buildDefaults(model.fields), clean),
        id: nextId(rows()),
        viewCount: 0,
        enquiryCount: 0,
        publishedAt: null,
        createdBy: user?.id ?? null,
        updatedBy: user?.id ?? null,
        createdAt: now,
        updatedAt: now,
      };
    } else if (method === 'PUT') {
      record = {
        ...mergeDefaults(
          { ...buildDefaults(model.fields), ...serverManagedValues(existing, model.fields) },
          clean
        ),
        id: existing.id,
        createdBy: existing.createdBy ?? null,
        updatedBy: user?.id ?? null,
        createdAt: existing.createdAt,
        updatedAt: now,
      };
    } else {
      record = {
        ...existing,
        ...deepPatch(existing, clean),
        updatedBy: user?.id ?? null,
        updatedAt: now,
      };
    }

    record.images = ensureSingleCover(record.images);

    // A listing is published the first time it goes live, and keeps that date
    // when it is switched off and on again (§6.1).
    if (record.isActive && !record.publishedAt) record.publishedAt = now;

    return record;
  }

  /**
   * The slug of a write: the one the client chose, or one made from the title.
   *
   * An explicit duplicate is a 409 (§5.9); an empty one is de-duplicated
   * silently, which is what lets the form leave the field alone.
   */
  function resolveSlug(body, { existing = null }) {
    const requested = slugify(body?.slug ?? '');
    const excludeId = existing?.id ?? null;

    if (requested) {
      const { available } = checkSlug(rows(), requested, excludeId);
      if (!available) {
        throw conflict('The slug has already been taken.', {
          slug: ['The slug has already been taken.'],
        });
      }
      return requested;
    }

    const fallback = slugify(body?.title ?? existing?.title ?? '');
    return ensureUniqueSlug(rows(), fallback, excludeId);
  }

  /** The entity slug and `seo.slug` are always the same string (§5.9). */
  function applySlug(record, slug) {
    record.slug = slug;
    record.seo = { ...(record.seo ?? {}), slug };
    return record;
  }

  /* ---------------------------------------------------------------- *
   * Public
   * ---------------------------------------------------------------- */

  router.get('/properties', (req, res) => {
    const items = applyPropertyFilters(active(), req.query, { source: source() });
    listResponse(res, items, req.query, { admin: false });
  });

  router.get('/properties/featured', (req, res) => {
    const featured = active().filter((property) => property.isFeatured);
    const sorted = applyPropertySort(featured, 'relevance');
    const { data, meta } = paginate(sorted, {
      page: first(req.query.page),
      perPage: pageSize(req.query, false),
    });

    const collections = source();
    res.ok(
      data.map((property) => present(property, { admin: false, collections })),
      meta
    );
  });

  router.get('/properties/suggestions', (req, res) => {
    const q = String(first(req.query.q) ?? '').trim();
    const empty = { localities: [], properties: [], propertyTypes: [], developers: [] };

    if (q.length < SUGGESTION_MIN_LENGTH) {
      res.ok(empty);
      return;
    }

    const collections = source();
    const listings = active();
    const take = (items) => items.slice(0, SUGGESTION_LIMIT);

    const localities = take(
      collections.localities
        .filter((locality) => locality.isActive !== false && matchesQ(locality, ['name'], q))
        .map((locality) => ({
          id: locality.id,
          name: locality.name,
          slug: locality.slug,
          propertyCount: listings.filter((property) =>
            sameId(property.location?.localityId, locality.id)
          ).length,
        }))
    );

    const properties = take(
      listings
        .filter((property) => matchesQ(property, ['title', 'projectName'], q))
        .map((property) => ({
          id: property.id,
          title: property.title,
          slug: property.slug,
          localityName:
            collections.localities.find((locality) =>
              sameId(locality.id, property.location?.localityId)
            )?.name ?? null,
          price: priceOf(property),
        }))
    );

    const propertyTypes = take(
      collections.propertyTypes
        .filter((type) => type.isActive !== false && matchesQ(type, ['name'], q))
        .map((type) => ({ id: type.id, name: type.name, slug: type.slug }))
    );

    const developers = take(
      collections.developers
        .filter((developer) => developer.isActive !== false && matchesQ(developer, ['name'], q))
        .map((developer) => ({ id: developer.id, name: developer.name, slug: developer.slug }))
    );

    res.ok({ localities, properties, propertyTypes, developers });
  });

  router.get('/properties/slug/:slug', (req, res, next) => {
    const property = active().find((row) => row.slug === req.params.slug);
    if (!property) {
      next(notFound());
      return;
    }
    res.ok(present(property, { admin: false }));
  });

  router.get('/properties/:id/similar', (req, res, next) => {
    const property = find(req.params.id);
    if (!property || !property.isActive) {
      next(notFound());
      return;
    }

    const pool = active().filter((row) => !sameId(row.id, property.id));

    // The editor's own picks come first, in their order; inactive or deleted
    // ids simply do not appear (§7 of prompt 08).
    const chosen = (property.similarPropertyIds ?? [])
      .map((id) => pool.find((row) => sameId(row.id, id)))
      .filter(Boolean);

    const taken = new Set(chosen.map((row) => row.id));
    const related = pool.filter(
      (row) =>
        !taken.has(row.id) &&
        row.listingType === property.listingType &&
        (sameId(row.location?.localityId, property.location?.localityId) ||
          sameId(row.propertyTypeId, property.propertyTypeId))
    );

    const filled = [...chosen, ...applyPropertySort(related, 'relevance')].slice(0, SIMILAR_LIMIT);
    const { meta } = paginate(filled, { perPage: null });

    const collections = source();
    res.ok(
      filled.map((row) => present(row, { admin: false, collections })),
      meta
    );
  });

  router.post('/properties/:id/view', (req, res, next) => {
    const property = find(req.params.id);
    if (!property || !property.isActive) {
      next(notFound());
      return;
    }

    if (!countView(clientIp(req), property.id)) {
      res.ok({ viewCount: property.viewCount ?? 0 });
      return;
    }

    // A view is not an edit: `updatedAt` stays where it is, or every visit
    // would reshuffle the `relevance` order of the listing.
    const now = new Date().toISOString();
    property.viewCount = (property.viewCount ?? 0) + 1;

    const views = db.getCollection('propertyViews');
    views.push({
      id: nextId(views),
      propertyId: property.id,
      viewedAt: now,
      referrer: typeof req.body?.referrer === 'string' ? req.body.referrer : null,
    });
    db.write();

    res.ok({ viewCount: property.viewCount });
  });

  /* ---------------------------------------------------------------- *
   * Admin
   * ---------------------------------------------------------------- */

  router.get('/admin/properties', (req, res) => {
    const items = applyPropertyFilters(rows(), req.query, { admin: true, source: source() });
    listResponse(res, items, req.query, { admin: true });
  });

  router.post('/admin/properties', (req, res, next) => {
    try {
      const body = assignNestedIds({ ...(req.body ?? {}) });
      validateBody(schemas.getSchema('property.create'), body, { fillDefaults: true });

      const slug = resolveSlug(body, {});
      const record = applySlug(buildRecord(body, { method: 'POST', user: req.user }), slug);

      rows().push(record);
      db.write();

      res.created(present(record, { admin: true }));
    } catch (error) {
      next(error);
    }
  });

  // Before `/admin/properties/:id`, or `slug` is read as an id (§5.9).
  router.get('/admin/properties/slug/:slug', (req, res, next) => {
    const property = rows().find((row) => row.slug === req.params.slug);
    if (!property) {
      next(notFound());
      return;
    }
    res.ok(present(property, { admin: true }));
  });

  router.get('/admin/properties/check-slug', (req, res) => {
    const slug = String(first(req.query.slug) ?? '');
    const excludeId = first(req.query.excludeId) ?? null;
    res.ok(checkSlug(rows(), slug, excludeId));
  });

  router.post('/admin/properties/bulk', (req, res, next) => {
    try {
      const body = { ...(req.body ?? {}) };
      validateBody(schemas.bulk, body);

      if (!Object.prototype.hasOwnProperty.call(BULK_ACTIONS, body.action)) {
        throw validation({ action: ['The selected action is invalid.'] });
      }

      const ids = body.ids.map(String);
      const targets = rows().filter((property) => ids.includes(String(property.id)));
      const now = new Date().toISOString();

      if (body.action === 'delete') {
        for (const property of targets) removeProperty(property);
      } else {
        const change = BULK_ACTIONS[body.action];
        for (const property of targets) {
          Object.assign(property, change, { updatedBy: req.user?.id ?? null, updatedAt: now });
          if (property.isActive && !property.publishedAt) property.publishedAt = now;
        }
        db.write();
      }

      const affected = targets.length;
      const noun = affected === 1 ? 'property' : 'properties';
      const verb = body.action === 'delete' ? 'deleted' : 'updated';
      res.message(`${affected} ${noun} ${verb}.`, { affected });
    } catch (error) {
      next(error);
    }
  });

  router.get('/admin/properties/:id', (req, res, next) => {
    const property = find(req.params.id);
    if (!property) {
      next(notFound());
      return;
    }
    res.ok(present(property, { admin: true }));
  });

  router.put('/admin/properties/:id', (req, res, next) => {
    try {
      const existing = find(req.params.id);
      if (!existing) throw notFound();

      const body = assignNestedIds({ ...(req.body ?? {}) });
      validateBody(schemas.getSchema('property.update'), body);

      const slug = resolveSlug(body, { existing });
      const record = applySlug(
        buildRecord(body, { existing, method: 'PUT', user: req.user }),
        slug
      );

      const list = rows();
      list[list.indexOf(existing)] = record;
      db.write();

      res.ok(present(record, { admin: true }));
    } catch (error) {
      next(error);
    }
  });

  router.patch('/admin/properties/:id', (req, res, next) => {
    try {
      const existing = find(req.params.id);
      if (!existing) throw notFound();

      const body = assignNestedIds({ ...(req.body ?? {}) });
      validateBody(schemas.getSchema('property.patch'), body, { partial: true });

      // A `PATCH` re-slugs only when it says so: renaming a listing must not
      // silently move its public URL (§5.9).
      const slugged =
        body.slug === undefined
          ? existing.slug
          : resolveSlug({ slug: body.slug, title: body.title ?? existing.title }, { existing });

      const record = applySlug(
        buildRecord(body, { existing, method: 'PATCH', user: req.user }),
        slugged
      );

      const list = rows();
      list[list.indexOf(existing)] = record;
      db.write();

      res.ok(present(record, { admin: true }));
    } catch (error) {
      next(error);
    }
  });

  router.post('/admin/properties/:id/duplicate', (req, res, next) => {
    try {
      const existing = find(req.params.id);
      if (!existing) throw notFound();

      const now = new Date().toISOString();
      const slug = ensureUniqueSlug(rows(), `${existing.slug}-copy`);
      const copy = {
        ...JSON.parse(JSON.stringify(existing)),
        id: nextId(rows()),
        title: `${existing.title} (Copy)`,
        isActive: false,
        isFeatured: false,
        viewCount: 0,
        enquiryCount: 0,
        publishedAt: null,
        createdBy: req.user?.id ?? null,
        updatedBy: req.user?.id ?? null,
        createdAt: now,
        updatedAt: now,
      };

      // The copy is a different page, so three parts of the original's `seo`
      // branch are not its to inherit — the same three `src/utils/
      // duplicateRecord.js` `copySeo()` clears for the articles and the pages
      // that are duplicated in the browser (§9.6, §5.14):
      //
      //   - the score and the analysis are an answer about the original's text;
      //   - `canonicalUrl` names one page, and inherited it would quietly
      //     canonicalise the copy to the original;
      //   - `redirect` would send every visitor of the copy somewhere else.
      //
      // `analysis` is reset to the model's own object of four lists rather than
      // to `[]`: §9.6 types it as an object, and a panel reading
      // `analysis.basic` on an array gets `undefined`.
      copy.seo = {
        ...copy.seo,
        canonicalUrl: null,
        redirect: { enabled: false, toPath: '', statusCode: 301 },
        score: null,
        scoreBand: 'none',
        testsPassed: 0,
        testsTotal: 0,
        analysis: { basic: [], additional: [], titleReadability: [], contentReadability: [] },
        lastAnalyzedAt: null,
      };

      applySlug(copy, slug);
      rows().push(copy);
      db.write();

      res.created(present(copy, { admin: true }));
    } catch (error) {
      next(error);
    }
  });

  router.delete('/admin/properties/:id', (req, res, next) => {
    const existing = find(req.params.id);
    if (!existing) {
      next(notFound());
      return;
    }

    removeProperty(existing);
    res.message('Deleted');
  });

  /** Deletes a property and the references other listings hold to it. */
  function removeProperty(property) {
    for (const other of rows()) {
      if (!Array.isArray(other.similarPropertyIds)) continue;
      if (!other.similarPropertyIds.some((id) => sameId(id, property.id))) continue;
      other.similarPropertyIds = other.similarPropertyIds.filter((id) => !sameId(id, property.id));
    }

    db.removeRecord('properties', property.id);
  }

  // Properties are served here and nowhere else: an unknown sub-path is a 404
  // rather than a generic CRUD answer from JSON Server (§6 of prompt 08).
  const gone = (req, res, next) => next(notFound());
  router.use('/properties', gone);
  router.use('/admin/properties', gone);

  return router;
};
