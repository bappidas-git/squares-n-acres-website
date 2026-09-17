/**
 * Role-based access control — the §7 matrix of
 * `prompts/00_MASTER_CONTEXT.md`, in one place.
 *
 * It is enforced three times: `ProtectedRoute` + `RoleRoute` around every admin
 * route, the navigation (`getNavItemsForRole`), and the API (403). Components
 * never compare a role by hand — they ask `can(role, area, action)`.
 *
 * CommonJS (D36b) so that Node scripts can read the navigation and the matrix
 * without a bundler; React keeps importing the named exports.
 *
 * `ROLES` here is the constant map routes and guards use (`ROLES.ADMIN`). The
 * labelled role enum for dropdowns lives in `src/config/enums.js`.
 */

const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  SALES: 'sales',
};

const ALL_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES];
const ADMIN_MANAGER = [ROLES.ADMIN, ROLES.MANAGER];
const ADMIN_ONLY = [ROLES.ADMIN];

/**
 * `PERMISSIONS[area][action] = [roles]` — the §7 matrix.
 *
 * `'*'` is the fallback for every action of an area. Server-side scoping does
 * the rest: a sales user sees and edits only leads assigned to them or
 * unassigned, and their export is scoped the same way (D15).
 */
const PERMISSIONS = {
  dashboard: {
    view: ALL_ROLES,
  },
  properties: {
    view: ALL_ROLES,
    create: ADMIN_MANAGER,
    edit: ADMIN_MANAGER,
    delete: ADMIN_MANAGER,
    bulk: ADMIN_MANAGER,
    duplicate: ADMIN_MANAGER,
  },
  masterData: {
    view: ADMIN_MANAGER,
    create: ADMIN_MANAGER,
    edit: ADMIN_MANAGER,
    delete: ADMIN_MANAGER,
  },
  leads: {
    view: ALL_ROLES,
    edit: ALL_ROLES,
    claim: [ROLES.SALES],
    assign: ADMIN_MANAGER,
    delete: ADMIN_MANAGER,
    bulk: ADMIN_MANAGER,
    export: ALL_ROLES,
  },
  articles: {
    view: ADMIN_MANAGER,
    create: ADMIN_MANAGER,
    edit: ADMIN_MANAGER,
    delete: ADMIN_MANAGER,
    bulk: ADMIN_MANAGER,
  },
  content: {
    view: ADMIN_MANAGER,
    create: ADMIN_MANAGER,
    edit: ADMIN_MANAGER,
    delete: ADMIN_MANAGER,
    bulk: ADMIN_MANAGER,
  },
  seo: {
    view: ADMIN_MANAGER,
    create: ADMIN_MANAGER,
    edit: ADMIN_MANAGER,
    delete: ADMIN_MANAGER,
    bulk: ADMIN_MANAGER,
  },
  media: {
    view: ADMIN_MANAGER,
    create: ADMIN_MANAGER,
    edit: ADMIN_MANAGER,
    delete: ADMIN_MANAGER,
    bulk: ADMIN_MANAGER,
  },
  settings: {
    view: ADMIN_MANAGER,
    edit: ADMIN_ONLY,
  },
  users: {
    // Naming an assignee means reading the staff list, and a manager may
    // assign a lead (`leads.assign`) without being allowed anywhere near the
    // Users screen — so the directory read is its own permission and `view`,
    // which `/admin/settings/users` is gated on, stays with `'*'`.
    list: ADMIN_MANAGER,
    '*': ADMIN_ONLY,
  },
  profile: {
    '*': ALL_ROLES,
  },
};

/**
 * Route permission map. `hasRouteAccess` matches the longest prefix, so
 * `/admin/settings/users` wins over `/admin/settings`.
 */
const ROUTE_PERMISSIONS = {
  '/admin/dashboard': ALL_ROLES,
  // Sales reach the list and the read-only form; writes are blocked by `can()`.
  '/admin/properties': ALL_ROLES,
  '/admin/leads': ALL_ROLES,
  '/admin/articles': ADMIN_MANAGER,
  '/admin/pages': ADMIN_MANAGER,
  '/admin/faqs': ADMIN_MANAGER,
  '/admin/master-data': ADMIN_MANAGER,
  '/admin/testimonials': ADMIN_MANAGER,
  '/admin/team': ADMIN_MANAGER,
  '/admin/partners': ADMIN_MANAGER,
  '/admin/jobs': ADMIN_MANAGER,
  '/admin/newsletter': ADMIN_MANAGER,
  '/admin/media': ADMIN_MANAGER,
  '/admin/seo': ADMIN_MANAGER,
  // Managers may read the settings; the form is disabled for them (§7).
  '/admin/settings': ADMIN_MANAGER,
  '/admin/settings/users': ADMIN_ONLY,
  '/admin/profile': ALL_ROLES,
};

/**
 * The admin sidebar. A child without its own `roles` inherits the group's.
 * Routes that a later prompt still has to build render the admin 404 until
 * then.
 */
const NAV_ITEMS = [
  {
    label: 'Dashboard',
    icon: 'mdi:view-dashboard-outline',
    path: '/admin/dashboard',
    roles: ALL_ROLES,
  },
  {
    label: 'Properties',
    icon: 'mdi:home-city-outline',
    roles: ALL_ROLES,
    children: [
      { label: 'All properties', path: '/admin/properties', roles: ALL_ROLES },
      { label: 'Add property', path: '/admin/properties/add', roles: ADMIN_MANAGER },
    ],
  },
  {
    label: 'Leads',
    icon: 'mdi:account-group-outline',
    path: '/admin/leads',
    badge: true,
    roles: ALL_ROLES,
  },
  {
    label: 'Articles',
    icon: 'mdi:newspaper-variant-outline',
    roles: ADMIN_MANAGER,
    children: [
      { label: 'All articles', path: '/admin/articles' },
      { label: 'Add article', path: '/admin/articles/add' },
      { label: 'Categories', path: '/admin/articles/categories' },
      { label: 'Tags', path: '/admin/articles/tags' },
      { label: 'Authors', path: '/admin/articles/authors' },
    ],
  },
  {
    label: 'Pages',
    icon: 'mdi:file-document-outline',
    path: '/admin/pages',
    roles: ADMIN_MANAGER,
  },
  {
    label: 'FAQs',
    icon: 'mdi:help-circle-outline',
    path: '/admin/faqs',
    roles: ADMIN_MANAGER,
  },
  {
    label: 'Master data',
    icon: 'mdi:database-outline',
    roles: ADMIN_MANAGER,
    children: [
      { label: 'Localities', path: '/admin/master-data/localities' },
      { label: 'Cities', path: '/admin/master-data/cities' },
      { label: 'Property types', path: '/admin/master-data/property-types' },
      { label: 'Amenities', path: '/admin/master-data/amenities' },
      { label: 'Badges', path: '/admin/master-data/badges' },
      { label: 'Developers', path: '/admin/master-data/developers' },
      { label: 'Banks', path: '/admin/master-data/banks' },
    ],
  },
  {
    label: 'Content',
    icon: 'mdi:folder-multiple-outline',
    roles: ADMIN_MANAGER,
    children: [
      { label: 'Testimonials', path: '/admin/testimonials' },
      { label: 'Team', path: '/admin/team' },
      { label: 'Partners', path: '/admin/partners' },
      { label: 'Jobs', path: '/admin/jobs' },
      { label: 'Job applications', path: '/admin/jobs/applications' },
      { label: 'Newsletter', path: '/admin/newsletter' },
    ],
  },
  {
    label: 'Media',
    icon: 'mdi:image-multiple-outline',
    path: '/admin/media',
    roles: ADMIN_MANAGER,
  },
  {
    label: 'SEO',
    icon: 'mdi:magnify',
    roles: ADMIN_MANAGER,
    children: [
      { label: 'Dashboard', path: '/admin/seo' },
      { label: 'Settings', path: '/admin/seo/settings' },
      { label: 'Redirects', path: '/admin/seo/redirects' },
      { label: 'Guide', path: '/admin/seo/guide' },
    ],
  },
  {
    label: 'Settings',
    icon: 'mdi:cog-outline',
    roles: ADMIN_MANAGER,
    children: [
      { label: 'Site settings', path: '/admin/settings', roles: ADMIN_MANAGER },
      { label: 'Users', path: '/admin/settings/users', roles: ADMIN_ONLY },
    ],
  },
  {
    label: 'Profile',
    icon: 'mdi:account-circle-outline',
    path: '/admin/profile',
    roles: ALL_ROLES,
  },
];

/**
 * Whether a role may open a route.
 *
 * @param {string} role
 * @param {string} pathname
 * @returns {boolean}
 */
const hasRouteAccess = (role, pathname) => {
  if (!role || !pathname) return false;

  const matchingRoute = Object.keys(ROUTE_PERMISSIONS)
    .sort((a, b) => b.length - a.length) // longer (more specific) first
    .find((routePrefix) => pathname.startsWith(routePrefix));

  if (!matchingRoute) return false;

  return ROUTE_PERMISSIONS[matchingRoute].includes(role);
};

/**
 * Whether a role may perform an action in an admin area.
 *
 * @param {string} role one of `ROLES`
 * @param {string} area a key of `PERMISSIONS`
 * @param {string} action an action of that area
 * @returns {boolean}
 */
const can = (role, area, action) => {
  if (!role || !area || !action) return false;
  const areaPermissions = PERMISSIONS[area];
  if (!areaPermissions) return false;
  const allowed = areaPermissions[action] ?? areaPermissions['*'];
  return Array.isArray(allowed) && allowed.includes(role);
};

/**
 * The navigation a role sees: groups the role may open, each with only the
 * children it may open. A group whose children all disappear is dropped.
 *
 * @param {string} role
 * @returns {Array<object>}
 */
const getNavItemsForRole = (role) => {
  if (!role) return [];

  return NAV_ITEMS.filter((item) => item.roles.includes(role))
    .map((item) => {
      if (!item.children) return item;
      const children = item.children.filter((child) => (child.roles ?? item.roles).includes(role));
      return { ...item, children };
    })
    .filter((item) => !item.children || item.children.length > 0);
};

/**
 * Where a role lands after signing in — always the dashboard (D32).
 *
 * @param {string} role
 * @returns {string}
 */
const getDefaultRoute = (role) => (ALL_ROLES.includes(role) ? '/admin/dashboard' : '/admin/login');

module.exports = {
  ROLES,
  PERMISSIONS,
  ROUTE_PERMISSIONS,
  NAV_ITEMS,
  hasRouteAccess,
  can,
  getNavItemsForRole,
  getDefaultRoute,
};
