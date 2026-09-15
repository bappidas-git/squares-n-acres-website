/**
 * Centralized Role-Based Access Control (RBAC) Configuration
 *
 * All role and permission logic lives here.
 * Components consume this config — never hardcode role checks.
 *
 * When adding new roles or menu items, update ONLY this file.
 */

// Role definitions
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  SALES: 'sales',
};

/**
 * Route permission map.
 * Each key is a route path prefix, value is the list of roles allowed to access it.
 * Order matters — more specific paths should come first.
 */
export const ROUTE_PERMISSIONS = {
  '/admin/dashboard': [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES],
  '/admin/properties': [ROLES.ADMIN, ROLES.MANAGER],
  '/admin/leads': [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES],
  '/admin/articles': [ROLES.ADMIN, ROLES.MANAGER],
  '/admin/seo': [ROLES.ADMIN],
  '/admin/faqs': [ROLES.ADMIN, ROLES.MANAGER],
  '/admin/neighborhoods': [ROLES.ADMIN, ROLES.MANAGER],
  '/admin/partners': [ROLES.ADMIN, ROLES.MANAGER],
  '/admin/settings': [ROLES.ADMIN],
};

/**
 * Sidebar navigation items with role-based visibility.
 * `roles` array controls which roles can see each item.
 */
export const NAV_ITEMS = [
  {
    label: 'Dashboard',
    icon: 'mdi:view-dashboard-outline',
    path: '/admin/dashboard',
    roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES],
  },
  {
    label: 'Properties',
    icon: 'mdi:home-city-outline',
    roles: [ROLES.ADMIN, ROLES.MANAGER],
    children: [
      { label: 'All Properties', path: '/admin/properties' },
      { label: 'Add New', path: '/admin/properties/add' },
    ],
  },
  {
    label: 'Leads',
    icon: 'mdi:account-group-outline',
    path: '/admin/leads',
    badge: true,
    roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES],
  },
  {
    label: 'Articles',
    icon: 'mdi:newspaper-variant-outline',
    roles: [ROLES.ADMIN, ROLES.MANAGER],
    children: [
      { label: 'All Articles', path: '/admin/articles' },
      { label: 'Add New', path: '/admin/articles/add' },
    ],
  },
  {
    label: 'SEO Manager',
    icon: 'mdi:magnify',
    path: '/admin/seo',
    roles: [ROLES.ADMIN],
  },
  {
    label: 'FAQs',
    icon: 'mdi:help-circle-outline',
    path: '/admin/faqs',
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    label: 'Neighborhoods',
    icon: 'mdi:map-marker-radius-outline',
    path: '/admin/neighborhoods',
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    label: 'Partners',
    icon: 'mdi:handshake-outline',
    path: '/admin/partners',
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    label: 'Site Settings',
    icon: 'mdi:cog-outline',
    path: '/admin/settings',
    roles: [ROLES.ADMIN],
  },
];

/**
 * Check if a given role has access to a specific route path.
 */
export const hasRouteAccess = (role, pathname) => {
  if (!role || !pathname) return false;

  // Find the most specific matching route permission
  const matchingRoute = Object.keys(ROUTE_PERMISSIONS)
    .sort((a, b) => b.length - a.length) // longer (more specific) first
    .find((routePrefix) => pathname.startsWith(routePrefix));

  if (!matchingRoute) return false;

  return ROUTE_PERMISSIONS[matchingRoute].includes(role);
};

/**
 * Filter navigation items based on user role.
 */
export const getNavItemsForRole = (role) => {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
};

/**
 * Get the default redirect path after login for a given role.
 */
export const getDefaultRoute = (role) => {
  switch (role) {
    case ROLES.ADMIN:
    case ROLES.MANAGER:
    case ROLES.SALES:
      return '/admin/dashboard';
    default:
      return '/admin/login';
  }
};
