/**
 * Denormalised read objects (00_MASTER_CONTEXT.md §5.5).
 *
 * Writes send ids (`localityId`, `amenityIds[]`, `categoryId`); reads embed the
 * display object the UI needs, so a card never has to fetch master data to
 * render a locality name. The builders here produce exactly the shapes §5.5
 * lists; the routes of prompts 08 and 09 call them on the way out.
 *
 * `source` is an object of collections — the runtime database by default, a
 * plain `{ localities: [...] }` literal in tests.
 */

/** The runtime database's state, resolved lazily so requiring this file is free. */
function resolveSource(source) {
  if (source) return source;
  return require('../db').getState();
}

const rows = (source, name) => (Array.isArray(source?.[name]) ? source[name] : []);

const byId = (source, name, id) =>
  id === null || id === undefined
    ? null
    : (rows(source, name).find((record) => record.id === id) ?? null);

const pick = (record, keys) =>
  record === null || record === undefined
    ? null
    : Object.fromEntries(keys.map((key) => [key, record[key] ?? null]));

/** `{ id, name, slug }` — the shape every master-data embed starts from. */
const ref = (record) => pick(record, ['id', 'name', 'slug']);

/** `{ id, name, slug }` for a locality. */
function embedLocality(locality) {
  return ref(locality);
}

/** `{ id, name, slug, logoUrl }` for a developer. */
function embedDeveloper(developer) {
  return pick(developer, ['id', 'name', 'slug', 'logoUrl']);
}

/**
 * A property with its `propertyType`, `amenities`, `badges`,
 * `location.locality`, `location.city` and `project.developer` embedded.
 *
 * @param {object} property
 * @param {object} [source] collections to resolve the ids against
 * @returns {object} a copy — the stored record is never mutated
 */
function embedProperty(property, source) {
  if (!property) return property;
  const db = resolveSource(source);
  const amenityIds = property.amenityIds ?? [];
  const badgeIds = property.badgeIds ?? [];

  return {
    ...property,
    propertyType: pick(byId(db, 'propertyTypes', property.propertyTypeId), [
      'id',
      'name',
      'slug',
      'segment',
    ]),
    amenities: amenityIds
      .map((id) => byId(db, 'amenities', id))
      .filter(Boolean)
      .map((amenity) => pick(amenity, ['id', 'name', 'slug', 'icon', 'category'])),
    badges: badgeIds
      .map((id) => byId(db, 'badges', id))
      .filter(Boolean)
      .map((badge) => pick(badge, ['id', 'name', 'slug', 'color', 'icon'])),
    location: {
      ...property.location,
      locality: embedLocality(byId(db, 'localities', property.location?.localityId)),
      city: ref(byId(db, 'cities', property.location?.cityId)),
    },
    project: {
      ...property.project,
      developer: embedDeveloper(byId(db, 'developers', property.project?.developerId)),
    },
  };
}

/**
 * A lead with `property` (`{ id, title, slug }`) and `assignedUser`
 * (`{ id, name }`) embedded.
 */
function embedLead(lead, source) {
  if (!lead) return lead;
  const db = resolveSource(source);

  return {
    ...lead,
    property: pick(byId(db, 'properties', lead.propertyId), ['id', 'title', 'slug']),
    assignedUser: pick(byId(db, 'adminUsers', lead.assignedTo), ['id', 'name']),
  };
}

/** An article with `category`, `tags[]` and `author` embedded. */
function embedArticle(article, source) {
  if (!article) return article;
  const db = resolveSource(source);
  const tagIds = article.tagIds ?? [];

  return {
    ...article,
    category: ref(byId(db, 'articleCategories', article.categoryId)),
    tags: tagIds
      .map((id) => byId(db, 'articleTags', id))
      .filter(Boolean)
      .map(ref),
    author: pick(byId(db, 'authors', article.authorId), [
      'id',
      'name',
      'slug',
      'avatarUrl',
      'designation',
    ]),
  };
}

/** A job application with `job` (`{ id, title, slug }`) embedded. */
function embedJobApplication(application, source) {
  if (!application) return application;
  const db = resolveSource(source);

  return {
    ...application,
    job: pick(byId(db, 'jobOpenings', application.jobId), ['id', 'title', 'slug']),
  };
}

module.exports = {
  embedProperty,
  embedLead,
  embedArticle,
  embedLocality,
  embedDeveloper,
  embedJobApplication,
};
