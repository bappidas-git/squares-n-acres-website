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
 * The contact card of a listing.
 *
 * An `agent` may name a team member instead of repeating their details; the
 * record then stores only `teamMemberId`, and the read fills in whatever the
 * editor left empty. A field typed on the property always wins — that is how a
 * listing gives one project its own direct line.
 *
 * @param {object|null} agent
 * @param {object} source
 * @returns {object|null}
 */
function embedAgent(agent, source) {
  if (!agent) return agent ?? null;

  const member = byId(source, 'teamMembers', agent.teamMemberId);
  if (!member) return { ...agent };

  return {
    ...agent,
    name: agent.name ?? member.name ?? null,
    phone: agent.phone ?? member.phone ?? null,
    whatsapp: agent.whatsapp ?? member.whatsapp ?? null,
    email: agent.email ?? member.email ?? null,
    photoUrl: agent.photoUrl ?? member.photoUrl ?? null,
  };
}

/** Whether a master-data record is switched on (`isActive` defaults to true). */
const isLive = (record) => Boolean(record) && record.isActive !== false;

/**
 * A reference to a record whose page is not public: its name still labels
 * the listing, but without a slug nothing links to a page that answers 404
 * (QA-60). Every link the site draws from a listing's locality or developer
 * — the guide button, the builder button, the breadcrumb, the JSON-LD — is
 * already drawn only when there is a slug.
 */
const withoutPage = (reference) => (reference ? { ...reference, slug: null } : reference);

/**
 * A property with its `propertyType`, `amenities`, `badges`,
 * `location.locality`, `location.city`, `project.developer` and `agent`
 * display fields embedded.
 *
 * The public read (`publicRead`) shows what the admin has switched on and
 * nothing else (QA-60): an amenity or a badge an editor deactivated — "Price
 * Drop" once the offer is over — was still printed on every card and listing
 * page that carried it, and a deactivated locality or developer was still
 * linked from every one of its listings, to a page that answers 404. The
 * admin read keeps them all, so the property form never drops a tick it
 * cannot see.
 *
 * @param {object} property
 * @param {object} [source] collections to resolve the ids against
 * @param {{publicRead?: boolean}} [options]
 * @returns {object} a copy — the stored record is never mutated
 */
function embedProperty(property, source, { publicRead = false } = {}) {
  if (!property) return property;
  const db = resolveSource(source);
  const amenityIds = property.amenityIds ?? [];
  const badgeIds = property.badgeIds ?? [];
  const shown = (record) => Boolean(record) && (!publicRead || isLive(record));

  const locality = byId(db, 'localities', property.location?.localityId);
  const developer = byId(db, 'developers', property.project?.developerId);
  const linkable = (record, reference) =>
    publicRead && record && !isLive(record) ? withoutPage(reference) : reference;

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
      .filter(shown)
      .map((amenity) => pick(amenity, ['id', 'name', 'slug', 'icon', 'category'])),
    badges: badgeIds
      .map((id) => byId(db, 'badges', id))
      .filter(shown)
      .map((badge) => pick(badge, ['id', 'name', 'slug', 'color', 'icon'])),
    location: {
      ...property.location,
      locality: linkable(locality, embedLocality(locality)),
      city: ref(byId(db, 'cities', property.location?.cityId)),
    },
    project: {
      ...property.project,
      developer: linkable(developer, embedDeveloper(developer)),
    },
    agent: embedAgent(property.agent, db),
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
  embedAgent,
  embedLead,
  embedArticle,
  embedLocality,
  embedDeveloper,
  embedJobApplication,
};
