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
 *   POST /api/properties/:id/documents/access
 *                                        the gated files, for a lead's token
 *   …and the admin CRUD, `duplicate`, `bulk` and `check-slug` of §5.14.
 *
 * Public reads see active listings only and lose the audit columns, an agent's
 * direct line and the address of every file kept behind the lead form
 * (`lib/scope.js`); admin reads see the record as stored.
 * Both embed the display objects of §5.5 on the page they return rather than
 * on the whole collection.
 *
 * Authentication and the role matrix are applied to `/admin/*` by
 * `mock-server/app.js` before this router runs, so a sales user reaches the
 * list (`properties.view`) and never the writes (`properties.edit`).
 */

const express = require('express');

const schemas = require('../../src/services/schemas');
const { AVAILABILITY } = require('../../src/config/enums');
const {
  PUBLISH_FIELDS,
  notReadyMessage,
  publishGaps,
  publishProblems,
} = require('../../src/config/propertyRules');
const { ApiError } = require('../middleware/errors');
const { applyPropertyFilters, applyPropertySort, priceOf } = require('../lib/propertyFilters');
const { checkSlug, ensureUniqueSlug, slugify } = require('../lib/slug');
const { computeFacets } = require('../lib/facets');
const { conflict, forbidden, notFound, validation } = require('../middleware/errors');
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
const { propertyFiles, publicProperty } = require('../lib/scope');
const { verifyAccess } = require('../lib/fileAccess');
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

/**
 * The bulk actions that carry a value in `payload` (prompt 51): what the desk
 * changes across a batch of listings on a busy day — availability after a
 * sale, the advisor when somebody leaves, a locality, a type or a developer
 * entered wrongly on a dozen listings.
 *
 * `key` is the payload's key; `collection`, where an id must exist; `nullable`,
 * whether `null` clears it. `read` and `write` reach the field on the record.
 */
const PAYLOAD_ACTIONS = {
  availability: {
    key: 'availability',
    read: (property) => property.availability ?? null,
    write: (property, value) => {
      property.availability = value;
    },
  },
  assignAgent: {
    key: 'agentId',
    collection: 'teamMembers',
    nullable: true,
    activeOnly: true,
    read: (property) => property.agent?.teamMemberId ?? null,
    write: (property, value) => {
      property.agent = { ...(property.agent ?? {}), teamMemberId: value };
    },
  },
  setLocality: {
    key: 'localityId',
    collection: 'localities',
    read: (property) => property.location?.localityId ?? null,
    // A locality belongs to a city: the listing moves with it.
    write: (property, value, record) => {
      property.location = {
        ...(property.location ?? {}),
        localityId: value,
        cityId: record?.cityId ?? property.location?.cityId ?? null,
      };
    },
  },
  setPropertyType: {
    key: 'propertyTypeId',
    collection: 'propertyTypes',
    read: (property) => property.propertyTypeId ?? null,
    write: (property, value) => {
      property.propertyTypeId = value;
    },
  },
  setDeveloper: {
    key: 'developerId',
    collection: 'developers',
    nullable: true,
    read: (property) => property.project?.developerId ?? null,
    write: (property, value) => {
      property.project = { ...(property.project ?? {}), developerId: value };
    },
  },
};

/** How many listings `/properties/:id/similar` answers with (§5.14). */
const SIMILAR_LIMIT = 6;

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);

/**
 * The publish rules (`src/config/propertyRules.js`), asked of a write that
 * leaves a listing live: every create and replace, and a `PATCH` that
 * publishes it or touches what the rules read (QA-62).
 *
 * The form refused a half-written listing all along; the list's eye toggle,
 * its row menu and its bulk bar never went through the form, and put one on
 * the site with no photograph, no description and no price.
 *
 * @param {object} record the record about to be stored
 * @param {{method: string, body: object}} context
 * @throws {ApiError} 422 keyed by field, the message naming what is missing
 */
function refuseUnready(record, { method, body }) {
  if (record?.isActive !== true) return;
  if (method === 'PATCH' && !PUBLISH_FIELDS.some((field) => hasOwn(body, field))) return;

  const problems = publishProblems(record);
  if (Object.keys(problems).length === 0) return;

  const gaps = publishGaps(problems, record);
  throw new ApiError(
    422,
    notReadyMessage(record, gaps),
    Object.fromEntries(Object.entries(problems).map(([field, message]) => [field, [message]])),
    { notReady: [{ id: record.id ?? null, title: record.title, gaps }] }
  );
}

/**
 * The bulk "activate" asks the same rules of every listing it would put on the
 * site — all or nothing, like the articles' bulk "publish" (QA-55), so the
 * editor sees one list of what is missing rather than half a batch published.
 * A listing that is already live is not asked: activating it changes nothing.
 *
 * @param {string} action
 * @param {Array<object>} targets the stored records the ids name
 * @throws {ApiError} 422 naming each listing and what it lacks
 */
function refuseUnreadyBatch(action, targets) {
  if (action !== 'activate') return;

  const refused = targets
    .filter((property) => property.isActive !== true)
    .map((property) => ({
      property,
      gaps: publishGaps(publishProblems(property), property),
    }))
    .filter(({ gaps }) => gaps.length > 0);

  if (refused.length === 0) return;

  const message =
    refused.length === 1
      ? notReadyMessage(refused[0].property, refused[0].gaps)
      : `${refused.length} of the selected properties are not ready to go live, so none was activated.`;

  throw new ApiError(
    422,
    message,
    { ids: refused.map(({ property, gaps }) => `“${property.title}”: ${gaps.join(', ')}.`) },
    {
      notReady: refused.map(({ property, gaps }) => ({
        id: property.id,
        title: property.title,
        gaps,
      })),
    }
  );
}

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
    const embedded = embedProperty(property, collections, { publicRead: !admin });
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
   *
   * A title with no Latin letter or digit in it — "व्हाइटफील्ड में 3 BHK" has
   * some, "व्हाइटफील्ड में फ्लैट" none — makes no slug at all, and an empty
   * slug is no address: the listing keeps the slug it has, or is given
   * `property-<id>`, as every other collection is (QA-60).
   *
   * @param {object} body the request body
   * @param {{existing?: object|null, id?: number|string|null}} context
   * @returns {string}
   */
  function resolveSlug(body, { existing = null, id = null }) {
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
    const derived = ensureUniqueSlug(rows(), fallback, excludeId);
    if (derived) return derived;
    if (existing?.slug) return existing.slug;
    return ensureUniqueSlug(rows(), `property-${id ?? existing?.id ?? ''}`, excludeId);
  }

  /**
   * A replace that names the version it was made from — the `updatedAt` its
   * client read — is refused when the listing has been saved since (QA-62).
   *
   * `PUT` sends the whole record, so a form opened before somebody else's save
   * wrote every field back as it had read it: the other editor's changes went,
   * silently — a form left open un-featured a listing starred from the list
   * meanwhile. The check is optional: a body without `updatedAt` replaces as
   * before, which is also how the form's "Save mine anyway" goes through.
   *
   * @param {object} existing the stored record
   * @param {object} body the request body
   * @throws {ApiError} 409 with `data.conflict: 'stale'` and who saved it last
   */
  function refuseStaleReplace(existing, body) {
    const expected = typeof body?.updatedAt === 'string' ? body.updatedAt : null;
    if (!expected || !existing.updatedAt || expected === existing.updatedAt) return;

    const editor = db
      .getCollection('adminUsers')
      .find((user) => sameId(user?.id, existing.updatedBy));
    throw conflict(
      editor?.name
        ? `${editor.name} saved this listing after you opened it.`
        : 'This listing was saved by somebody else after you opened it.',
      undefined,
      {
        conflict: 'stale',
        current: {
          updatedAt: existing.updatedAt,
          updatedBy: editor ? { id: editor.id, name: editor.name } : null,
        },
      }
    );
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
    // The registry and the contract give this route the §5.7 filters, and it
    // used to ignore every one of them: `?listingType=rent` answered with the
    // featured sales too (QA-62).
    const featured = applyPropertyFilters(
      active().filter((property) => property.isFeatured),
      req.query,
      { source: source() }
    );
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

  /**
   * The addresses of a listing's files, for the visitor who shared their
   * details about it.
   *
   * The token is the one `POST /leads` issued with a lead about this listing
   * (`lib/fileAccess.js`); it must still be valid, name this listing, and the
   * lead it was issued for must still exist. The answer holds every file with
   * an address — the brochure, the documents (the open ones too, so the page
   * can render one list), and the drawings and PDFs of the floor plans and the
   * active unit configurations.
   */
  router.post('/properties/:id/documents/access', (req, res, next) => {
    try {
      const property = find(req.params.id);
      if (!property || !property.isActive) throw notFound();

      const body = { ...(req.body ?? {}) };
      validateBody(schemas.getSchema('property.documentAccess'), body);

      const grant = verifyAccess(body.token, property.id);
      const lead = grant && db.getCollection('leads').find((row) => sameId(row.id, grant.leadId));
      if (!grant || !lead) {
        throw forbidden('Share your details to open the files of this listing.');
      }

      res.ok(propertyFiles(property));
    } catch (error) {
      next(error);
    }
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
      validateBody(schemas.getSchema('property.create'), body, {
        fillDefaults: true,
        lookup: db.getCollection,
      });

      const built = buildRecord(body, { method: 'POST', user: req.user });
      refuseUnready(built, { method: 'POST', body });
      const record = applySlug(built, resolveSlug(body, { id: built.id }));

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

  /**
   * One of {@link PAYLOAD_ACTIONS} across a batch, validated before anything is
   * written: an id that names nothing, an advisor who is switched off, or a
   * type from another segment refuses the whole batch with 422 — a type moves
   * a listing between residential and commercial only through the form, where
   * the fields that differ are asked for.
   *
   * @returns {number} how many listings changed; one already so is not counted
   */
  function applyPayloadAction(action, payload, targets, user) {
    const rule = PAYLOAD_ACTIONS[action];
    const field = `payload.${rule.key}`;
    const value = payload?.[rule.key];

    if (value === undefined || (value === null && !rule.nullable)) {
      throw validation({ [field]: [`The ${field} field is required.`] });
    }

    let record = null;
    if (action === 'availability') {
      if (!AVAILABILITY.has(value)) {
        throw validation({ [field]: ['The selected availability is invalid.'] });
      }
    } else if (value !== null) {
      if (!Number.isInteger(value)) {
        throw validation({ [field]: [`The ${field} must be an integer.`] });
      }
      record = db.getCollection(rule.collection).find((row) => sameId(row.id, value)) ?? null;
      if (!record) throw validation({ [field]: [`The selected ${field} is invalid.`] });
      if (rule.activeOnly && record.isActive === false) {
        throw validation({ [field]: [`${record.name} is switched off in Team.`] });
      }
    }

    if (action === 'setPropertyType' && record) {
      const other = targets.filter((property) => property.segment !== record.segment);
      if (other.length > 0) {
        throw validation({
          [field]: [
            `${record.name} is a ${record.segment} type, and ${other.length} of the selected ${
              other.length === 1 ? 'listing is' : 'listings are'
            } not — change ${other.length === 1 ? 'it' : 'those'} in the form.`,
          ],
        });
      }
    }

    const now = new Date().toISOString();
    let affected = 0;
    for (const property of targets) {
      if (sameId(rule.read(property) ?? '', value ?? '')) continue;
      rule.write(property, value, record);
      Object.assign(property, { updatedBy: user?.id ?? null, updatedAt: now });
      affected += 1;
    }
    if (affected > 0) db.write();
    return affected;
  }

  router.get('/admin/properties/check-slug', (req, res) => {
    const slug = String(first(req.query.slug) ?? '');
    const excludeId = first(req.query.excludeId) ?? null;
    res.ok(checkSlug(rows(), slug, excludeId));
  });

  router.post('/admin/properties/bulk', (req, res, next) => {
    try {
      const body = { ...(req.body ?? {}) };
      validateBody(schemas.bulk, body);

      if (hasOwn(PAYLOAD_ACTIONS, body.action)) {
        const ids = body.ids.map(String);
        const targets = rows().filter((property) => ids.includes(String(property.id)));
        const affected = applyPayloadAction(body.action, body.payload, targets, req.user);
        const noun = affected === 1 ? 'property' : 'properties';
        res.message(`${affected} ${noun} updated.`, { affected });
        return;
      }

      if (!Object.prototype.hasOwnProperty.call(BULK_ACTIONS, body.action)) {
        throw validation({ action: ['The selected action is invalid.'] });
      }

      const ids = body.ids.map(String);
      const targets = rows().filter((property) => ids.includes(String(property.id)));
      const now = new Date().toISOString();
      refuseUnreadyBatch(body.action, targets);

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
      refuseStaleReplace(existing, body);
      validateBody(schemas.getSchema('property.update'), body, { lookup: db.getCollection });

      const slug = resolveSlug(body, { existing });
      const record = applySlug(
        buildRecord(body, { existing, method: 'PUT', user: req.user }),
        slug
      );
      refuseUnready(record, { method: 'PUT', body });

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
      validateBody(schemas.getSchema('property.patch'), body, {
        partial: true,
        lookup: db.getCollection,
      });

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
      refuseUnready(record, { method: 'PATCH', body });

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
