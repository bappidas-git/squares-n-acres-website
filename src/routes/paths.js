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

  page: (slug) => `/${seg(slug)}`,
};

/** Admin routes — never linked from the public site (D24). */
const adminPaths = {
  adminLogin: '/admin/login',
  adminRoot: '/admin',
  adminDashboard: '/admin/dashboard',
  adminProperties: '/admin/properties',
  adminPropertyNew: '/admin/properties/add',
  adminPropertyEdit: (id) => `/admin/properties/edit/${seg(id)}`,
  adminLeads: '/admin/leads',
  adminLead: (id) => `/admin/leads/${seg(id)}`,
  adminArticles: '/admin/articles',
  adminArticleNew: '/admin/articles/add',
  adminArticleEdit: (id) => `/admin/articles/edit/${seg(id)}`,
  adminFaqs: '/admin/faqs',
  adminLocalities: '/admin/neighborhoods',
  adminPartners: '/admin/partners',
  adminSeo: '/admin/seo',
  adminSettings: '/admin/settings',
  adminUsers: '/admin/settings/users',
};

export const PATHS = { ...publicPaths, ...adminPaths };

export default PATHS;
