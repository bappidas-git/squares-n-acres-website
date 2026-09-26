/**
 * From an admin path to a permission (00_MASTER_CONTEXT.md §7).
 *
 * The role matrix is keyed by area and action (`PERMISSIONS.properties.edit`),
 * while HTTP speaks in paths and methods. This module is the translation, and
 * it is what lets one middleware guard **every** `/api/admin/*` route — the
 * hand-written routers of prompts 07–09 and the collections the generic JSON
 * Server router still serves — instead of each router repeating the matrix.
 *
 *   GET    /admin/properties            → properties.view
 *   POST   /admin/properties            → properties.create
 *   PUT    /admin/properties/1          → properties.edit
 *   DELETE /admin/properties/1          → properties.delete
 *   POST   /admin/properties/bulk       → properties.bulk
 *   GET    /admin/leads/export          → leads.export
 *   POST   /admin/leads/7/notes         → leads.edit
 *
 * Both spellings of a resource are mapped: the kebab-case paths of §5.14
 * (`/admin/property-types`) and the camelCase collection names of §6
 * (`/admin/propertyTypes`), which the generic router answers to today.
 *
 * A path this module does not know resolves to `null`, and
 * `mock-server/middleware/role.js` answers 403 — an admin route without a
 * declared permission is denied rather than served.
 */

const { PERMISSIONS } = require('../../src/config/rbac');

/** The action a method means when the path says nothing more specific. */
const METHOD_ACTIONS = {
  GET: 'view',
  HEAD: 'view',
  POST: 'create',
  PUT: 'edit',
  PATCH: 'edit',
  DELETE: 'delete',
};

/**
 * Path segments that name the action themselves. The last one on the path
 * wins, so `/leads/7/notes/2` is a note operation rather than a lead delete.
 */
const SEGMENT_ACTIONS = {
  bulk: 'bulk',
  export: 'export',
  duplicate: 'duplicate',
  'check-slug': 'create',
  notes: 'edit',
  claim: 'edit',
  // Refiling a folder's records changes them (prompt 51).
  rename: 'edit',
};

/**
 * What an area falls back to when it does not declare an action: a lead has no
 * `create` (leads arrive from the public site), so `POST /admin/leads/7/notes`
 * is a lead **edit**, which is exactly the permission sales users hold.
 */
const ACTION_FALLBACKS = {
  view: ['view'],
  create: ['create', 'edit', 'view'],
  edit: ['edit', 'view'],
  delete: ['delete', 'edit', 'view'],
  bulk: ['bulk', 'edit', 'view'],
  export: ['export', 'view'],
  duplicate: ['duplicate', 'create', 'edit', 'view'],
};

/**
 * Areas whose GET is not the area's `view`.
 *
 * Reading the staff directory is what naming an assignee needs, so it belongs
 * to everyone who may assign a lead; opening the Users screen, creating a
 * colleague or deleting one stays `users` — admin only (§7).
 */
const READ_ACTIONS = { users: 'list' };

/** The §7 area each admin resource belongs to, by first path segment. */
const RESOURCE_AREAS = {
  dashboard: 'dashboard',

  properties: 'properties',

  localities: 'masterData',
  cities: 'masterData',
  segments: 'masterData',
  'property-types': 'masterData',
  propertyTypes: 'masterData',
  amenities: 'masterData',
  badges: 'masterData',
  developers: 'masterData',
  banks: 'masterData',

  articles: 'articles',
  'article-categories': 'articles',
  articleCategories: 'articles',
  'article-tags': 'articles',
  articleTags: 'articles',
  authors: 'articles',

  pages: 'content',
  'header-menus': 'content',
  headerMenus: 'content',
  faqs: 'content',
  testimonials: 'content',
  team: 'content',
  teamMembers: 'content',
  partners: 'content',
  jobs: 'content',
  jobOpenings: 'content',
  'job-applications': 'content',
  jobApplications: 'content',
  'newsletter-subscribers': 'content',
  newsletterSubscribers: 'content',

  seo: 'seo',
  seoSettings: 'seo',
  redirects: 'seo',

  media: 'media',

  settings: 'settings',
  siteSettings: 'settings',

  users: 'users',

  leads: 'leads',
};

/** Whether the matrix declares an action for an area (`'*'` covers them all). */
const declares = (area, action) =>
  Boolean(PERMISSIONS[area] && (PERMISSIONS[area][action] || PERMISSIONS[area]['*']));

/** The first action of the fallback chain the area actually declares. */
function resolveAction(area, action) {
  const chain = ACTION_FALLBACKS[action] ?? [action, 'view'];
  return chain.find((candidate) => declares(area, candidate)) ?? action;
}

/**
 * The permission an admin request needs.
 *
 * @param {string} path the path **below** `/api/admin`, e.g. `/properties/1`
 * @param {string} method the HTTP method
 * @returns {{area: string, action: string}|null} `null` when no rule matches
 */
function resolvePermission(path, method) {
  const segments = String(path ?? '')
    .split('/')
    .filter(Boolean);

  if (segments.length === 0) return null;

  const area = RESOURCE_AREAS[segments[0]];
  if (!area) return null;

  const named = segments
    .slice(1)
    .reduce((found, segment) => SEGMENT_ACTIONS[segment] ?? found, undefined);

  const verb = String(method).toUpperCase();
  const read = verb === 'GET' || verb === 'HEAD' ? READ_ACTIONS[area] : undefined;
  const action = named ?? read ?? METHOD_ACTIONS[verb] ?? 'view';

  return { area, action: resolveAction(area, action) };
}

module.exports = {
  resolvePermission,
  RESOURCE_AREAS,
  READ_ACTIONS,
  SEGMENT_ACTIONS,
  METHOD_ACTIONS,
  ACTION_FALLBACKS,
};
