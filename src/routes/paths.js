/**
 * Every URL the app can navigate to, in one place.
 *
 * Components never write a route string: they call `PATHS.propertyDetails(slug)`
 * so that a route rename is one edit here rather than a search across `src/`.
 * The builders encode their segments, so a slug with an unexpected character
 * can never break a link.
 *
 * Route names follow `routes/index.js`; the HOM URLs all keep working (D11).
 *
 * Authored in CommonJS (D36b, extended in prompt 38): `src/seo/urls.js` reads
 * the map to build canonicals, and `scripts/check-links.js` has to `require`
 * that chain from Node with no bundler in front of it. `module.exports` is the
 * `PATHS` object itself, so `import PATHS from '../routes/paths'` and
 * `import { isReservedPath, isAdminPath } from '../routes/paths'` both keep
 * working.
 */

const seg = (value) => encodeURIComponent(String(value ?? ''));

/** Public routes. */
const publicPaths = {
  home: '/',

  properties: '/properties',
  propertyDetails: (slug) => `/properties/${seg(slug)}`,

  buy: '/buy',
  buyStatus: (status) => `/buy/${seg(status)}`,
  buyType: (slug) => `/buy/${seg(slug)}`,
  rent: '/rent',
  rentType: (slug) => `/rent/${seg(slug)}`,
  lease: '/lease',
  commercial: '/commercial',
  commercialType: (slug) => `/commercial/${seg(slug)}`,
  plots: '/plots',

  localities: '/localities',
  locality: (slug) => `/localities/${seg(slug)}`,
  builders: '/builders',
  builder: (slug) => `/builders/${seg(slug)}`,

  articles: '/insights/articles',
  article: (slug) => `/insights/articles/${seg(slug)}`,
  articleCategory: (slug) => `/insights/articles/category/${seg(slug)}`,
  articleTag: (slug) => `/insights/articles/tag/${seg(slug)}`,
  author: (slug) => `/insights/authors/${seg(slug)}`,
  faqs: '/insights/faqs',
  awareness: '/insights/real-estate-awareness',

  contact: '/contact',
  about: '/about',
  sellLet: '/sell-let',
  careers: '/careers',
  job: (slug) => `/careers/${seg(slug)}`,
  partnership: '/partnership',
  flexibleWorkspace: '/flexible-workspace',
  directLeaseRetails: '/direct-lease-retails',

  homeLoan: '/buyer-assistance/home-loan',
  legalAssistance: '/buyer-assistance/legal-assistance',
  interiorDesigning: '/buyer-assistance/interior-designing',

  // The three legal pages are CMS records; these are their seeded slugs (§6.10).
  privacy: '/privacy-policy',
  terms: '/terms-of-use',
  disclaimer: '/disclaimer',
  shortlist: '/shortlist',

  /**
   * A CMS page. Its slug may itself be a path (`buyer-assistance/home-loan`),
   * so the segments are encoded one by one and the separators survive.
   *
   * The `home` record is the home page — its two bands and its head are read
   * from it (D81) — so it lives at the root. Built as `/home`, its admin row,
   * its "View on the site" and every link to it led to a bare copy of those
   * two bands at an address nobody should reach (QA-56).
   */
  page: (slug) => {
    const path = String(slug ?? '')
      .split('/')
      .filter(Boolean)
      .map(seg)
      .join('/');
    return path === 'home' ? '/' : `/${path}`;
  },
};

/** Admin routes — never linked from the public site (D24). */
const adminPaths = {
  adminLogin: '/admin/login',
  adminRoot: '/admin',
  adminForbidden: '/admin/403',
  adminDashboard: '/admin/dashboard',
  adminProfile: '/admin/profile',

  adminProperties: '/admin/properties',
  adminPropertyNew: '/admin/properties/add',
  adminPropertyEdit: (id) => `/admin/properties/edit/${seg(id)}`,
  adminLeads: '/admin/leads',
  adminLead: (id) => `/admin/leads/${seg(id)}`,

  adminArticles: '/admin/articles',
  adminArticleNew: '/admin/articles/add',
  adminArticleEdit: (id) => `/admin/articles/edit/${seg(id)}`,
  adminArticleCategories: '/admin/articles/categories',
  adminArticleTags: '/admin/articles/tags',
  adminAuthors: '/admin/articles/authors',

  adminPages: '/admin/pages',
  adminPageNew: '/admin/pages/add',
  adminPageEdit: (id) => `/admin/pages/edit/${seg(id)}`,
  adminPageMenus: '/admin/pages/menus',
  adminFaqs: '/admin/faqs',

  adminLocalities: '/admin/master-data/localities',
  adminLocalityNew: '/admin/master-data/localities/add',
  adminLocalityEdit: (id) => `/admin/master-data/localities/edit/${seg(id)}`,
  adminCities: '/admin/master-data/cities',
  adminSegments: '/admin/master-data/segments',
  adminPropertyTypes: '/admin/master-data/property-types',
  adminAmenities: '/admin/master-data/amenities',
  adminBadges: '/admin/master-data/badges',
  adminDevelopers: '/admin/master-data/developers',
  adminDeveloperNew: '/admin/master-data/developers/add',
  adminDeveloperEdit: (id) => `/admin/master-data/developers/edit/${seg(id)}`,
  adminBanks: '/admin/master-data/banks',

  adminTestimonials: '/admin/testimonials',
  adminTeam: '/admin/team',
  adminPartners: '/admin/partners',
  adminJobs: '/admin/jobs',
  adminJobApplications: '/admin/jobs/applications',
  adminNewsletter: '/admin/newsletter',
  adminMedia: '/admin/media',

  adminSeo: '/admin/seo',
  adminSeoSettings: '/admin/seo/settings',
  adminRedirects: '/admin/seo/redirects',
  adminSeoGuide: '/admin/seo/guide',

  adminSettings: '/admin/settings',
  adminUsers: '/admin/settings/users',
};

/**
 * The first URL segments the CMS may never own (D11).
 *
 * Every one of them is answered by a static route registered **above** the CMS
 * catch-all, so a page whose slug started with one would either be shadowed or
 * would shadow a listing. `CmsPage` refuses them on the way in and
 * `PageFormPage` refuses them on the way out ("Reserved path"), which is the
 * difference between an editor learning about the clash at the keyboard and
 * learning about it from a visitor.
 *
 * It lives here rather than in `publicRoutes.js` because both of those import
 * it and `publicRoutes.js` lazily imports `CmsPage`: a constant with no
 * imports of its own is the one place that cannot become a cycle.
 */
const RESERVED_PATH_PREFIXES = [
  'properties',
  'buy',
  'rent',
  'lease',
  'commercial',
  'plots',
  'localities',
  'builders',
  'insights',
  'careers',
  'shortlist',
  'admin',
];

/**
 * Whether a page slug's first segment is one of {@link RESERVED_PATH_PREFIXES}.
 *
 * @param {string} slug
 * @returns {boolean}
 */
const isReservedPath = (slug) =>
  RESERVED_PATH_PREFIXES.includes(
    String(slug ?? '')
      .replace(/^\/+/, '')
      .split('/')[0]
      .toLowerCase()
  );

/**
 * Whether a pathname is the admin panel's: `/admin` or anything below it,
 * matched by segment, so a CMS page at `/administration` is not.
 *
 * @param {string} pathname
 * @returns {boolean}
 */
const isAdminPath = (pathname) => {
  const path = String(pathname ?? '');
  return path === adminPaths.adminRoot || path.startsWith(`${adminPaths.adminRoot}/`);
};

const PATHS = { ...publicPaths, ...adminPaths };

module.exports = PATHS;
module.exports.RESERVED_PATH_PREFIXES = RESERVED_PATH_PREFIXES;
module.exports.isReservedPath = isReservedPath;
module.exports.isAdminPath = isAdminPath;
