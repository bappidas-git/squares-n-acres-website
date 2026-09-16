import React, { lazy } from 'react';
import { matchPath } from 'react-router-dom';

import AdminPlaceholderPage from '../components/admin/AdminPlaceholderPage';
import Forbidden from '../components/admin/Forbidden';
import PATHS from './paths';
import { can, hasRouteAccess } from '../config/rbac';

/**
 * Every admin route, in one table (§7, D32).
 *
 * One entry describes a screen completely: where it lives, what the topbar and
 * `document.title` call it, which §7 permission opens it, and what renders
 * there. `routes/adminRoutes.js` turns the table into `<Route>`s,
 * `AdminTopbar` reads the titles from it, and the login redirect asks it
 * whether a role may be sent to the location it came from — so a new screen is
 * one row, not four edits.
 *
 * Screens a later prompt writes are already routed: they render
 * `AdminPlaceholderPage` and name the prompt that replaces them. Nothing may
 * still point at the placeholder after prompt 43.
 */

const Dashboard = lazy(() => import('../pages/admin/Dashboard'));
const AdminProperties = lazy(() => import('../pages/admin/AdminProperties'));
const AddProperty = lazy(() => import('../pages/admin/AddProperty'));
const EditProperty = lazy(() => import('../pages/admin/EditProperty'));
const AdminLeads = lazy(() => import('../pages/admin/AdminLeads'));
const LeadDetail = lazy(() => import('../pages/admin/LeadDetail'));
const AdminArticles = lazy(() => import('../pages/admin/AdminArticles'));
const ArticleForm = lazy(() => import('../pages/admin/ArticleForm'));
const FaqManager = lazy(() => import('../pages/admin/FaqManager'));
const AdminNeighborhoods = lazy(() => import('../pages/admin/AdminNeighborhoods'));
const AdminPartners = lazy(() => import('../pages/admin/AdminPartners'));
const AdminSeo = lazy(() => import('../pages/admin/AdminSeo'));
const AdminSettings = lazy(() => import('../pages/admin/AdminSettings'));
const ProfilePage = lazy(() => import('../pages/admin/settings/ProfilePage'));

/** A screen that exists. */
const page = (path, title, permission, element) => ({ path, title, permission, element });

/** A screen prompt `owner` writes; the route, title and guard already work. */
const soon = (path, title, permission, owner) => ({
  path,
  title,
  permission,
  owner,
  element: <AdminPlaceholderPage title={title} prompt={owner} />,
});

/**
 * @type {Array<{
 *   path: string,            // relative to `/admin`
 *   title: string,           // topbar + document title
 *   permission: [string, string]|null,  // `[area, action]` of `config/rbac.js`
 *   element: React.ReactElement,
 *   owner?: number,          // the prompt that replaces the placeholder
 * }>}
 */
export const ADMIN_ROUTES = [
  page('dashboard', 'Dashboard', ['dashboard', 'view'], <Dashboard />),

  page('properties', 'Properties', ['properties', 'view'], <AdminProperties />),
  page('properties/add', 'Add property', ['properties', 'create'], <AddProperty />),
  // Sales open the form read-only (§7), so editing is gated on `view`.
  page('properties/edit/:id', 'Edit property', ['properties', 'view'], <EditProperty />),

  page('leads', 'Leads', ['leads', 'view'], <AdminLeads />),
  page('leads/:id', 'Lead details', ['leads', 'view'], <LeadDetail />),

  page('articles', 'Articles', ['articles', 'view'], <AdminArticles />),
  page('articles/add', 'Add article', ['articles', 'create'], <ArticleForm />),
  page('articles/edit/:id', 'Edit article', ['articles', 'edit'], <ArticleForm />),
  soon('articles/categories', 'Article categories', ['articles', 'view'], 33),
  soon('articles/tags', 'Article tags', ['articles', 'view'], 33),
  soon('articles/authors', 'Authors', ['articles', 'view'], 33),

  soon('pages', 'Pages', ['content', 'view'], 30),
  soon('pages/add', 'Add page', ['content', 'create'], 30),
  soon('pages/edit/:id', 'Edit page', ['content', 'edit'], 30),
  page('faqs', 'FAQs', ['content', 'view'], <FaqManager />),

  page('master-data/localities', 'Localities', ['masterData', 'view'], <AdminNeighborhoods />),
  soon('master-data/localities/add', 'Add locality', ['masterData', 'create'], 14),
  soon('master-data/localities/edit/:id', 'Edit locality', ['masterData', 'edit'], 14),
  soon('master-data/cities', 'Cities', ['masterData', 'view'], 14),
  soon('master-data/property-types', 'Property types', ['masterData', 'view'], 15),
  soon('master-data/amenities', 'Amenities', ['masterData', 'view'], 15),
  soon('master-data/badges', 'Badges', ['masterData', 'view'], 15),
  soon('master-data/developers', 'Developers', ['masterData', 'view'], 16),
  soon('master-data/developers/add', 'Add developer', ['masterData', 'create'], 16),
  soon('master-data/developers/edit/:id', 'Edit developer', ['masterData', 'edit'], 16),
  soon('master-data/banks', 'Banks', ['masterData', 'view'], 15),

  soon('testimonials', 'Testimonials', ['content', 'view'], 17),
  soon('team', 'Team', ['content', 'view'], 17),
  page('partners', 'Partners', ['content', 'view'], <AdminPartners />),
  soon('jobs', 'Jobs', ['content', 'view'], 31),
  soon('jobs/applications', 'Job applications', ['content', 'view'], 31),
  soon('newsletter', 'Newsletter subscribers', ['content', 'view'], 31),

  soon('media', 'Media library', ['media', 'view'], 39),

  page('seo', 'SEO dashboard', ['seo', 'view'], <AdminSeo />),
  soon('seo/settings', 'SEO settings', ['seo', 'view'], 37),
  soon('seo/redirects', 'Redirects', ['seo', 'view'], 37),
  soon('seo/guide', 'SEO guide', ['seo', 'view'], 37),

  page('settings', 'Site settings', ['settings', 'view'], <AdminSettings />),
  soon('settings/users', 'Users', ['users', 'view'], 13),

  page('profile', 'My profile', ['profile', 'view'], <ProfilePage />),
  // Reachable by any signed-in role: it is the answer to a route they may not
  // open, not a route of its own to be guarded.
  page('403', 'Access denied', null, <Forbidden />),
];

/** The absolute path of a route entry, e.g. `/admin/leads/:id`. */
export const adminRoutePath = (route) => `${PATHS.adminRoot}/${route.path}`;

/**
 * The route table entry a pathname resolves to, `undefined` when none does.
 *
 * @param {string} pathname
 */
export const findAdminRoute = (pathname) =>
  ADMIN_ROUTES.find((route) => matchPath({ path: adminRoutePath(route), end: true }, pathname));

/**
 * The topbar / `document.title` label of a pathname.
 *
 * @param {string} pathname
 * @returns {string}
 */
export const getAdminPageTitle = (pathname) => findAdminRoute(pathname)?.title ?? 'Admin';

/**
 * Whether a role may open an admin pathname — the same answer `RoleRoute`
 * gives, so the login redirect never lands anyone on a 403.
 *
 * @param {string} role
 * @param {string} pathname
 * @returns {boolean}
 */
export const canAccessAdminRoute = (role, pathname) => {
  if (!role || !pathname) return false;
  const route = findAdminRoute(pathname);
  if (!route) return hasRouteAccess(role, pathname);
  if (!route.permission) return true;
  return can(role, route.permission[0], route.permission[1]);
};

export default ADMIN_ROUTES;
