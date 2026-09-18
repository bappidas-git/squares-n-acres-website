/**
 * The §7 matrix, over every admin route, for every role (prompt 45).
 *
 * The matrix is enforced in three places — the route guard, the navigation and
 * the API — and the failure that matters is not any one of them being wrong: it
 * is two of them disagreeing. A sidebar entry that leads to a 403 wastes a
 * click; a route the guard opens and the API refuses wastes a screen; a route
 * the guard refuses and the API serves is a hole.
 *
 * So this suite renders `RoleRoute` for **every** entry of `adminRouteConfig.js`
 * as each of the three roles and asserts what actually appears — the screen or
 * the 403 — and then checks that answer against the other two enforcement
 * points:
 *
 *   - `canAccessAdminRoute()` / `hasRouteAccess()`, which the login redirect
 *     uses to decide where to send somebody (§7);
 *   - `getNavItemsForRole()`, so no role is shown a link it may not follow;
 *   - `mock-server/lib/routePermissions.resolvePermission()`, which is the
 *     permission the API derives from the same path — the third place, and the
 *     only one that refuses a request rather than hiding a button.
 *
 * The route's own element is not rendered: every screen is `React.lazy` and
 * wants an API. What is under test is the gate, so the gate is given a sentinel
 * to let through.
 */

import { screen } from '@testing-library/react';

import ADMIN_ROUTES, { adminRoutePath, canAccessAdminRoute } from '../routes/adminRouteConfig';
import RoleRoute from '../components/admin/RoleRoute';
import renderWith from '../test-utils';
import { ROLES, can, getNavItemsForRole, hasRouteAccess } from '../config/rbac';

const { resolvePermission } = require('../../mock-server/lib/routePermissions');

const EVERY_ROLE = [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES];

/**
 * The role that is signed in, switched per test.
 *
 * `jest.mock` factories are hoisted above every declaration in the file and may
 * not close over a local — except one whose name begins with `mock`, which is
 * the escape hatch `babel-plugin-jest-hoist` leaves open for exactly this.
 */
let mockSignedInRole = 'admin';

jest.mock('../contexts/AdminAuthContext', () => {
  const rbac = require('../config/rbac');
  return {
    __esModule: true,
    useAdminAuth: () => ({
      role: mockSignedInRole,
      can: (area, action) => rbac.can(mockSignedInRole, area, action),
    }),
  };
});

const asRole = (role) => {
  mockSignedInRole = role;
};

/** Renders the gate of one route entry and says what came out. */
function open(route) {
  const view = renderWith(
    <RoleRoute permission={route.permission}>
      <div data-testid="screen">{route.title}</div>
    </RoleRoute>
  );
  const forbidden = screen.queryByText("You don't have access to this page.") !== null;
  const opened = screen.queryByTestId('screen') !== null;
  view.unmount();
  return { forbidden, opened };
}

/**
 * Every path the sidebar offers a role.
 *
 * The group and its entries are destructured rather than read through
 * `item.children`, which `testing-library/no-node-access` reads as a DOM walk.
 */
function linksOf(role) {
  return getNavItemsForRole(role).flatMap((item) => {
    const { path, children = [] } = item;
    return [...(path ? [path] : []), ...children.map((child) => child.path)];
  });
}

/** The permission the API derives for the resource a screen edits. */
const apiPermissionOf = (route) => {
  if (!route.permission) return null;
  // `/admin/master-data/localities/edit/:id` is `/localities/1` to the API.
  const [area] = route.permission;
  const resource = route.path.replace(/^master-data\//, '').split('/')[0];
  const method = { view: 'GET', create: 'POST', edit: 'PATCH', delete: 'DELETE' }[
    route.permission[1]
  ];
  const resolved = resolvePermission(`/${resource}`, method ?? 'GET');
  return resolved && resolved.area === area ? resolved : null;
};

afterEach(() => {
  asRole(ROLES.ADMIN);
});

describe('the route table', () => {
  it('gives every screen either a permission or a documented reason not to', () => {
    const open_ = ADMIN_ROUTES.filter((route) => !route.permission);
    // `/admin/403` is the answer to a route a role may not open, not a route of
    // its own to be guarded.
    expect(open_.map((route) => route.path)).toEqual(['403']);
  });

  it('names an area the matrix declares, for every guarded screen', () => {
    for (const route of ADMIN_ROUTES) {
      if (!route.permission) continue;
      const [area, action] = route.permission;
      expect(EVERY_ROLE.some((role) => can(role, area, action))).toBe(true);
    }
  });

  it('is not empty, and every path is unique', () => {
    expect(ADMIN_ROUTES.length).toBeGreaterThan(40);
    const paths = ADMIN_ROUTES.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe.each(EVERY_ROLE)('as %s', (role) => {
  beforeEach(() => asRole(role));

  it.each(ADMIN_ROUTES.map((route) => [route.path, route]))(
    '/admin/%s renders the screen or the 403, and never both',
    (_path, route) => {
      const { forbidden, opened } = open(route);

      expect(forbidden).toBe(!opened);

      const allowed = route.permission ? can(role, route.permission[0], route.permission[1]) : true;
      expect(opened).toBe(allowed);
    }
  );

  it('agrees with the login redirect on every route', () => {
    for (const route of ADMIN_ROUTES) {
      const allowed = route.permission ? can(role, route.permission[0], route.permission[1]) : true;
      expect(canAccessAdminRoute(role, adminRoutePath(route))).toBe(allowed);
    }
  });

  it('shows no sidebar link that leads to a 403', () => {
    const links = linksOf(role);

    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(canAccessAdminRoute(role, link)).toBe(true);
      expect(hasRouteAccess(role, link)).toBe(true);
    }
  });

  it('is offered every area it may open, so nothing is hidden by accident', () => {
    const links = linksOf(role);

    // Every list screen the role may open is reachable from the sidebar. The
    // form and detail screens are reached from their list, not from the menu.
    const listScreens = ADMIN_ROUTES.filter(
      (route) =>
        route.permission &&
        !route.path.includes(':') &&
        !route.path.endsWith('/add') &&
        route.path !== '403'
    );

    for (const route of listScreens) {
      if (!can(role, route.permission[0], route.permission[1])) continue;
      expect(links).toContain(adminRoutePath(route));
    }
  });

  it('gets the same answer from the API for the resource each screen edits', () => {
    for (const route of ADMIN_ROUTES) {
      const api = apiPermissionOf(route);
      if (!api) continue;
      expect(can(role, api.area, api.action)).toBe(
        can(role, route.permission[0], route.permission[1])
      );
    }
  });
});

describe('the three roles differ where §7 says they do', () => {
  const opens = (role, path) => {
    const route = ADMIN_ROUTES.find((entry) => entry.path === path);
    asRole(role);
    return open(route).opened;
  };

  it('keeps users to the administrator', () => {
    expect(opens(ROLES.ADMIN, 'settings/users')).toBe(true);
    expect(opens(ROLES.MANAGER, 'settings/users')).toBe(false);
    expect(opens(ROLES.SALES, 'settings/users')).toBe(false);
  });

  it('lets a manager read the settings screen', () => {
    expect(opens(ROLES.MANAGER, 'settings')).toBe(true);
    expect(opens(ROLES.SALES, 'settings')).toBe(false);
  });

  it('lets sales open the property list and the read-only form', () => {
    expect(opens(ROLES.SALES, 'properties')).toBe(true);
    expect(opens(ROLES.SALES, 'properties/edit/:id')).toBe(true);
    expect(opens(ROLES.SALES, 'properties/add')).toBe(false);
  });

  it('keeps sales out of articles, pages, media, SEO and master data', () => {
    for (const path of [
      'articles',
      'pages',
      'faqs',
      'media',
      'seo',
      'seo/settings',
      'seo/redirects',
      'master-data/localities',
      'testimonials',
      'team',
      'partners',
      'jobs',
      'newsletter',
    ]) {
      expect(opens(ROLES.SALES, path)).toBe(false);
    }
  });

  it('gives every role the dashboard, the leads and their own profile', () => {
    for (const role of EVERY_ROLE) {
      expect(opens(role, 'dashboard')).toBe(true);
      expect(opens(role, 'leads')).toBe(true);
      expect(opens(role, 'profile')).toBe(true);
      expect(opens(role, '403')).toBe(true);
    }
  });
});
