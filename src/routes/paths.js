/**
 * Every URL the app can navigate to, in one place.
 *
 * Components never write a route string: they call `PATHS.propertyDetails(slug)`
 * so that a route rename is one edit here rather than a search across `src/`.
 * The builders encode their segments, so a slug with an unexpected character
 * can never break a link.
 *
 * Route names follow `routes/index.js`; the HOM URLs all keep working (D11).
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

  privacy: '/privacy-policy',
  terms: '/terms-and-conditions',
  disclaimer: '/disclaimer',
  shortlist: '/shortlist',

  /**
   * A CMS page. Its slug may itself be a path (`buyer-assistance/home-loan`),
   * so the segments are encoded one by one and the separators survive.
   */
  page: (slug) =>
    `/${String(slug ?? '')
      .split('/')
      .filter(Boolean)
      .map(seg)
      .join('/')}`,
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
  adminFaqs: '/admin/faqs',

  adminLocalities: '/admin/master-data/localities',
  adminLocalityNew: '/admin/master-data/localities/add',
  adminLocalityEdit: (id) => `/admin/master-data/localities/edit/${seg(id)}`,
  adminCities: '/admin/master-data/cities',
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

export const PATHS = { ...publicPaths, ...adminPaths };

export default PATHS;
