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

const DashboardPage = lazy(() => import('../pages/admin/dashboard/DashboardPage'));
const PropertiesListPage = lazy(() => import('../pages/admin/properties/PropertiesListPage'));
const PropertyFormPage = lazy(() => import('../pages/admin/properties/PropertyFormPage'));
const LeadsListPage = lazy(() => import('../pages/admin/leads/LeadsListPage'));
const LeadDetailPage = lazy(() => import('../pages/admin/leads/LeadDetailPage'));
const ArticlesListPage = lazy(() => import('../pages/admin/articles/ArticlesListPage'));
const ArticleFormPage = lazy(() => import('../pages/admin/articles/ArticleFormPage'));
const ArticleCategoriesPage = lazy(() => import('../pages/admin/articles/CategoriesPage'));
const ArticleTagsPage = lazy(() => import('../pages/admin/articles/TagsPage'));
const AuthorsPage = lazy(() => import('../pages/admin/articles/AuthorsPage'));
const LocalitiesPage = lazy(() => import('../pages/admin/master-data/LocalitiesPage'));
const LocalityFormPage = lazy(() => import('../pages/admin/master-data/LocalityFormPage'));
const CitiesPage = lazy(() => import('../pages/admin/master-data/CitiesPage'));
const PropertyTypesPage = lazy(() => import('../pages/admin/master-data/PropertyTypesPage'));
const AmenitiesPage = lazy(() => import('../pages/admin/master-data/AmenitiesPage'));
const BadgesPage = lazy(() => import('../pages/admin/master-data/BadgesPage'));
const DevelopersPage = lazy(() => import('../pages/admin/master-data/DevelopersPage'));
const DeveloperFormPage = lazy(() => import('../pages/admin/master-data/DeveloperFormPage'));
const BanksPage = lazy(() => import('../pages/admin/master-data/BanksPage'));
const PagesListPage = lazy(() => import('../pages/admin/pages/PagesListPage'));
const PageFormPage = lazy(() => import('../pages/admin/pages/PageFormPage'));
const FaqsPage = lazy(() => import('../pages/admin/content/FaqsPage'));
const TestimonialsPage = lazy(() => import('../pages/admin/content/TestimonialsPage'));
const TeamPage = lazy(() => import('../pages/admin/content/TeamPage'));
const PartnersPage = lazy(() => import('../pages/admin/content/PartnersPage'));
const JobsPage = lazy(() => import('../pages/admin/content/JobsPage'));
const JobApplicationsPage = lazy(() => import('../pages/admin/content/JobApplicationsPage'));
const NewsletterSubscribersPage = lazy(
  () => import('../pages/admin/content/NewsletterSubscribersPage')
);
const AdminSeo = lazy(() => import('../pages/admin/AdminSeo'));
const AdminSettings = lazy(() => import('../pages/admin/AdminSettings'));
const ProfilePage = lazy(() => import('../pages/admin/settings/ProfilePage'));
const UsersPage = lazy(() => import('../pages/admin/settings/UsersPage'));

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
  page('dashboard', 'Dashboard', ['dashboard', 'view'], <DashboardPage />),

  page('properties', 'Properties', ['properties', 'view'], <PropertiesListPage />),
  page('properties/add', 'Add property', ['properties', 'create'], <PropertyFormPage />),
  // Sales open the form read-only (§7), so editing is gated on `view`.
  page('properties/edit/:id', 'Edit property', ['properties', 'view'], <PropertyFormPage />),

  page('leads', 'Leads', ['leads', 'view'], <LeadsListPage />),
  page('leads/:id', 'Lead details', ['leads', 'view'], <LeadDetailPage />),

  page('articles', 'Articles', ['articles', 'view'], <ArticlesListPage />),
  page('articles/add', 'Add article', ['articles', 'create'], <ArticleFormPage />),
  page('articles/edit/:id', 'Edit article', ['articles', 'edit'], <ArticleFormPage />),
  page(
    'articles/categories',
    'Article categories',
    ['articles', 'view'],
    <ArticleCategoriesPage />
  ),
  page('articles/tags', 'Article tags', ['articles', 'view'], <ArticleTagsPage />),
  page('articles/authors', 'Authors', ['articles', 'view'], <AuthorsPage />),

  page('pages', 'Pages', ['content', 'view'], <PagesListPage />),
  page('pages/add', 'Add page', ['content', 'create'], <PageFormPage />),
  page('pages/edit/:id', 'Edit page', ['content', 'edit'], <PageFormPage />),
  page('faqs', 'FAQs', ['content', 'view'], <FaqsPage />),

  page('master-data/localities', 'Localities', ['masterData', 'view'], <LocalitiesPage />),
  page(
    'master-data/localities/add',
    'Add locality',
    ['masterData', 'create'],
    <LocalityFormPage />
  ),
  page(
    'master-data/localities/edit/:id',
    'Edit locality',
    ['masterData', 'edit'],
    <LocalityFormPage />
  ),
  page('master-data/cities', 'Cities', ['masterData', 'view'], <CitiesPage />),
  page(
    'master-data/property-types',
    'Property types',
    ['masterData', 'view'],
    <PropertyTypesPage />
  ),
  page('master-data/amenities', 'Amenities', ['masterData', 'view'], <AmenitiesPage />),
  page('master-data/badges', 'Badges', ['masterData', 'view'], <BadgesPage />),
  page('master-data/developers', 'Developers', ['masterData', 'view'], <DevelopersPage />),
  page(
    'master-data/developers/add',
    'Add developer',
    ['masterData', 'create'],
    <DeveloperFormPage />
  ),
  page(
    'master-data/developers/edit/:id',
    'Edit developer',
    ['masterData', 'edit'],
    <DeveloperFormPage />
  ),
  page('master-data/banks', 'Banks', ['masterData', 'view'], <BanksPage />),

  page('testimonials', 'Testimonials', ['content', 'view'], <TestimonialsPage />),
  page('team', 'Team', ['content', 'view'], <TeamPage />),
  page('partners', 'Partners', ['content', 'view'], <PartnersPage />),
  page('jobs', 'Jobs', ['content', 'view'], <JobsPage />),
  page('jobs/applications', 'Job applications', ['content', 'view'], <JobApplicationsPage />),
  page('newsletter', 'Newsletter subscribers', ['content', 'view'], <NewsletterSubscribersPage />),

  soon('media', 'Media library', ['media', 'view'], 39),

  page('seo', 'SEO dashboard', ['seo', 'view'], <AdminSeo />),
  soon('seo/settings', 'SEO settings', ['seo', 'view'], 37),
  soon('seo/redirects', 'Redirects', ['seo', 'view'], 37),
  soon('seo/guide', 'SEO guide', ['seo', 'view'], 37),

  page('settings', 'Site settings', ['settings', 'view'], <AdminSettings />),
  page('settings/users', 'Users', ['users', 'view'], <UsersPage />),

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
