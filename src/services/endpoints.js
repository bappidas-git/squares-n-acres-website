/**
 * Endpoint registry — every API route the frontend uses
 * (00_MASTER_CONTEXT.md §5.14, entry shape §5.15).
 *
 * This file is the **only** place in `src/` that may contain an API path;
 * `scripts/check-endpoints.js` (part of `npm run lint`) enforces that.
 * Services call `http.request(endpoints.properties.list, { params })` and never
 * a string.
 *
 * CommonJS (D36b): `scripts/smoke-api.js` and
 * `scripts/generate-backend-guidelines.js` `require()` this file from Node.
 *
 * One entry:
 *   key         `<group>.<action>`, unique across the registry
 *   method      GET | POST | PUT | PATCH | DELETE
 *   path        relative to `REACT_APP_API_URL`, camelCase, `:param` placeholders
 *   auth        'public' | 'user' | 'manager' | 'admin' | 'sales'
 *   module      the admin area the endpoint belongs to (§7)
 *   description one line, used by the generated docs
 *   query       allowed parameters → type descriptor
 *   body        a key into `src/services/schemas/` (or null)
 *   response    a shape name documented in docs/API_CONTRACT.md
 *   example     a seed id or slug the smoke test and the generator use
 *
 * Query type descriptors: `string`, `int`, `number`, `bool`, `date`,
 * `enum:a,b,c`, `csv:int`, `csv:string`, `csv:enum:a,b,c`.
 */

const {
  AREA_UNITS,
  AVAILABILITY,
  ARTICLE_STATUS,
  CONSTRUCTION_STATUS,
  FACING,
  FAQ_CATEGORIES,
  FURNISHING,
  JOB_APPLICATION_STATUS,
  LEAD_PRIORITY,
  LEAD_SOURCES,
  LEAD_STATUS,
  LISTING_TYPES,
  LOCALITY_ZONES,
  MEDIA_PROVIDERS,
  MEDIA_TYPES,
  NEWSLETTER_STATUS,
  PAGE_STATUS,
  PARTNER_CATEGORIES,
  AMENITY_CATEGORIES,
  ROLES,
  SEGMENTS,
  SEO_ENTITY_TYPES,
  SEO_SCORE_BANDS,
  SORT_OPTIONS,
} = require('../config/enums');

const enumOf = (subject) => `enum:${subject.values.join(',')}`;
const csvEnumOf = (subject) => `csv:enum:${subject.values.join(',')}`;

/** Parameters every paginated list accepts (§5.6). */
const LIST_QUERY = {
  page: 'int',
  perPage: 'int',
  sort: 'string',
  order: 'enum:asc,desc',
  q: 'string',
};

/** The public property filters of §5.7. */
const PROPERTY_FILTERS = {
  listingType: enumOf(LISTING_TYPES),
  // A `segments` slug: an editor can add a segment, so it is not an enum (QA-52).
  segment: 'string',
  propertyTypeId: 'csv:int',
  localityId: 'csv:int',
  cityId: 'int',
  constructionStatus: csvEnumOf(CONSTRUCTION_STATUS),
  availability: enumOf(AVAILABILITY),
  bedrooms: 'csv:int',
  minPrice: 'number',
  maxPrice: 'number',
  minArea: 'number',
  maxArea: 'number',
  areaUnit: enumOf(AREA_UNITS),
  furnishing: csvEnumOf(FURNISHING),
  facing: csvEnumOf(FACING),
  developerId: 'int',
  amenityIds: 'csv:int',
  badgeIds: 'csv:int',
  isFeatured: 'bool',
  isVerified: 'bool',
  reraRegistered: 'bool',
  possessionBy: 'string',
  ids: 'csv:int',
};

const PROPERTY_LIST_QUERY = {
  ...LIST_QUERY,
  sort: enumOf(SORT_OPTIONS),
  ...PROPERTY_FILTERS,
};

/**
 * The uniform admin CRUD group of §5.14 ("same CRUD + bulk, + check-slug where
 * slugged"): list, create, get, update, patch, remove, bulk and — for slugged
 * resources — checkSlug.
 */
const adminResource = ({
  group,
  path,
  module,
  singular,
  plural,
  schema,
  response,
  slugged = true,
  auth = 'manager',
  readAuth = auth,
  query = {},
  // `withUsage` is served by the CRUD factory of the mock; the two resources
  // with a hand-written router (properties, users) have no delete guard and so
  // nothing to report.
  withUsage = true,
  example = 1,
}) => {
  const entry = (action, extra) => ({
    key: `${group}.${action}`,
    module,
    example,
    query: {},
    body: null,
    ...extra,
  });

  const group_ = {
    list: entry('list', {
      method: 'GET',
      path,
      auth: readAuth,
      description: `List ${plural} for the admin table`,
      query: { ...LIST_QUERY, isActive: 'bool', ids: 'csv:int', ...query },
      response: `${response}List`,
    }),
    create: entry('create', {
      method: 'POST',
      path,
      auth,
      description: `Create a ${singular}`,
      body: `${schema}.create`,
      response,
    }),
    get: entry('get', {
      method: 'GET',
      path: `${path}/:id`,
      auth: readAuth,
      // `withUsage=true` adds `usedBy` — what a delete would refuse over — so a
      // form can warn before a change instead of after it (D88).
      query: withUsage ? { withUsage: 'bool' } : {},
      description: `Read one ${singular} with every admin field`,
      response,
    }),
    update: entry('update', {
      method: 'PUT',
      path: `${path}/:id`,
      auth,
      description: `Replace a ${singular} with the full record from the form`,
      body: `${schema}.update`,
      response,
    }),
    patch: entry('patch', {
      method: 'PATCH',
      path: `${path}/:id`,
      auth,
      description: `Update the given fields of a ${singular} (toggles, order, SEO panel)`,
      body: `${schema}.patch`,
      response,
    }),
    remove: entry('remove', {
      method: 'DELETE',
      path: `${path}/:id`,
      auth,
      description: `Delete a ${singular}; 409 when it is still in use`,
      response: 'Null',
    }),
    bulk: entry('bulk', {
      method: 'POST',
      path: `${path}/bulk`,
      auth,
      description: `Apply one action to several ${plural}`,
      body: 'bulk',
      response: 'BulkResult',
    }),
  };

  if (slugged) {
    group_.checkSlug = entry('checkSlug', {
      method: 'GET',
      path: `${path}/check-slug`,
      auth,
      description: `Check whether a ${singular} slug is free and suggest an alternative`,
      query: { slug: 'string', excludeId: 'int' },
      response: 'SlugCheck',
    });
  }

  return group_;
};

/* ------------------------------------------------------------------ *
 * Public — properties
 * ------------------------------------------------------------------ */

const properties = {
  list: {
    key: 'properties.list',
    method: 'GET',
    path: '/properties',
    auth: 'public',
    module: 'properties',
    description: 'Public paginated property search with facets',
    query: PROPERTY_LIST_QUERY,
    body: null,
    response: 'PropertyList',
    example: 1,
  },
  featured: {
    key: 'properties.featured',
    method: 'GET',
    path: '/properties/featured',
    auth: 'public',
    module: 'properties',
    description: 'Featured properties, ordered by priority then recency',
    query: { perPage: 'int', ...PROPERTY_FILTERS },
    body: null,
    response: 'PropertyList',
    example: 1,
  },
  bySlug: {
    key: 'properties.bySlug',
    method: 'GET',
    path: '/properties/slug/:slug',
    auth: 'public',
    module: 'properties',
    description: 'Property details by slug; 404 when inactive',
    query: {},
    body: null,
    response: 'Property',
    example: 'lakeview-heights-3-bhk-whitefield',
  },
  similar: {
    key: 'properties.similar',
    method: 'GET',
    path: '/properties/:id/similar',
    auth: 'public',
    module: 'properties',
    description: 'Admin-selected similar properties, topped up to six by locality and type',
    query: { perPage: 'int' },
    body: null,
    response: 'PropertyList',
    example: 1,
  },
  view: {
    key: 'properties.view',
    method: 'POST',
    path: '/properties/:id/view',
    auth: 'public',
    module: 'properties',
    description: 'Count one property view; debounced per IP per hour',
    query: {},
    body: null,
    response: 'ViewCount',
    example: 1,
  },
  documentAccess: {
    key: 'properties.documentAccess',
    method: 'POST',
    path: '/properties/:id/documents/access',
    auth: 'public',
    module: 'properties',
    description:
      'The addresses of a listing’s files, for the token POST /leads answered a lead about it with',
    query: {},
    body: 'property.documentAccess',
    response: 'DocumentAccess',
    example: 1,
  },
  suggestions: {
    key: 'properties.suggestions',
    method: 'GET',
    path: '/properties/suggestions',
    auth: 'public',
    module: 'properties',
    description: 'Type-ahead suggestions for the hero and header search',
    query: { q: 'string' },
    body: null,
    response: 'Suggestions',
    example: 'whitefield',
  },
};

/* ------------------------------------------------------------------ *
 * Public — master data
 * ------------------------------------------------------------------ */

const localities = {
  list: {
    key: 'localities.list',
    method: 'GET',
    path: '/localities',
    auth: 'public',
    module: 'masterData',
    description: 'Localities with their active property count',
    query: {
      ...LIST_QUERY,
      zone: enumOf(LOCALITY_ZONES),
      cityId: 'int',
      isFeatured: 'bool',
      ids: 'csv:int',
    },
    body: null,
    response: 'LocalityList',
    example: 1,
  },
  bySlug: {
    key: 'localities.bySlug',
    method: 'GET',
    path: '/localities/slug/:slug',
    auth: 'public',
    module: 'masterData',
    description: 'Locality guide page by slug',
    query: {},
    body: null,
    response: 'Locality',
    example: 'whitefield',
  },
};

const cities = {
  list: {
    key: 'cities.list',
    method: 'GET',
    path: '/cities',
    auth: 'public',
    module: 'masterData',
    description: 'Cities the portal covers',
    query: { ...LIST_QUERY },
    body: null,
    response: 'CityList',
    example: 1,
  },
};

const developers = {
  list: {
    key: 'developers.list',
    method: 'GET',
    path: '/developers',
    auth: 'public',
    module: 'masterData',
    description: 'Developers with their active property count',
    query: { ...LIST_QUERY, isFeatured: 'bool', ids: 'csv:int' },
    body: null,
    response: 'DeveloperList',
    example: 1,
  },
  bySlug: {
    key: 'developers.bySlug',
    method: 'GET',
    path: '/developers/slug/:slug',
    auth: 'public',
    module: 'masterData',
    description: 'Developer page by slug',
    query: {},
    body: null,
    response: 'Developer',
    example: 'aurelia-estates',
  },
};

const segments = {
  list: {
    key: 'segments.list',
    method: 'GET',
    path: '/segments',
    auth: 'public',
    module: 'masterData',
    description:
      'Every segment, the inactive ones flagged — the layout of a listing filed under one depends on its kind',
    query: { ...LIST_QUERY, kind: enumOf(SEGMENTS) },
    body: null,
    response: 'SegmentList',
    example: 1,
  },
};

const propertyTypes = {
  list: {
    key: 'propertyTypes.list',
    method: 'GET',
    path: '/property-types',
    auth: 'public',
    module: 'masterData',
    description: 'Property types, optionally filtered by segment',
    query: { ...LIST_QUERY, segment: 'string' },
    body: null,
    response: 'PropertyTypeList',
    example: 1,
  },
};

const amenities = {
  list: {
    key: 'amenities.list',
    method: 'GET',
    path: '/amenities',
    auth: 'public',
    module: 'masterData',
    description: 'Amenities, optionally filtered by category',
    query: { ...LIST_QUERY, category: enumOf(AMENITY_CATEGORIES) },
    body: null,
    response: 'AmenityList',
    example: 1,
  },
};

const badges = {
  list: {
    key: 'badges.list',
    method: 'GET',
    path: '/badges',
    auth: 'public',
    module: 'masterData',
    description: 'Property badges',
    query: { ...LIST_QUERY },
    body: null,
    response: 'BadgeList',
    example: 1,
  },
};

const banks = {
  list: {
    key: 'banks.list',
    method: 'GET',
    path: '/banks',
    auth: 'public',
    module: 'masterData',
    description: 'Home-loan partners for the finance section and the EMI calculator',
    query: { ...LIST_QUERY },
    body: null,
    response: 'BankList',
    example: 1,
  },
};

/* ------------------------------------------------------------------ *
 * Public — articles
 * ------------------------------------------------------------------ */

const articles = {
  list: {
    key: 'articles.list',
    method: 'GET',
    path: '/articles',
    auth: 'public',
    module: 'articles',
    description: 'Published articles, newest or most read first',
    query: {
      ...LIST_QUERY,
      sort: 'enum:newest,popular',
      categoryId: 'int',
      categorySlug: 'string',
      tagId: 'int',
      tagSlug: 'string',
      authorId: 'int',
      authorSlug: 'string',
      isFeatured: 'bool',
      ids: 'csv:int',
    },
    body: null,
    response: 'ArticleList',
    example: 1,
  },
  bySlug: {
    key: 'articles.bySlug',
    method: 'GET',
    path: '/articles/slug/:slug',
    auth: 'public',
    module: 'articles',
    description: 'Article by slug; a matching preview token also returns drafts',
    query: { preview: 'string' },
    body: null,
    response: 'Article',
    example: 'karnataka-rera-guide-for-homebuyers',
  },
  trending: {
    key: 'articles.trending',
    method: 'GET',
    path: '/articles/trending',
    auth: 'public',
    module: 'articles',
    description: 'The six most read published articles',
    query: { perPage: 'int' },
    body: null,
    response: 'ArticleList',
    example: 1,
  },
  // Beyond the §5.14 catalogue, by the decision recorded for prompt 34: the
  // article page's previous/next pair is two rows, and the only way to get
  // them from `/articles` is to read the whole category into the browser.
  adjacent: {
    key: 'articles.adjacent',
    method: 'GET',
    path: '/articles/:id/adjacent',
    auth: 'public',
    module: 'articles',
    description: 'The published articles either side of this one by publishedAt',
    query: { categoryId: 'int' },
    body: null,
    response: 'ArticleAdjacent',
    example: 1,
  },
};

const articleCategories = {
  list: {
    key: 'articleCategories.list',
    method: 'GET',
    path: '/article-categories',
    auth: 'public',
    module: 'articles',
    description: 'Article categories with their published article count',
    query: { ...LIST_QUERY },
    body: null,
    response: 'ArticleCategoryList',
    example: 1,
  },
};

const articleTags = {
  list: {
    key: 'articleTags.list',
    method: 'GET',
    path: '/article-tags',
    auth: 'public',
    module: 'articles',
    description: 'Article tags with their published article count',
    query: { ...LIST_QUERY },
    body: null,
    response: 'ArticleTagList',
    example: 1,
  },
};

const authors = {
  list: {
    key: 'authors.list',
    method: 'GET',
    path: '/authors',
    auth: 'public',
    module: 'articles',
    description: 'Active authors, public fields only',
    query: { ...LIST_QUERY },
    body: null,
    response: 'AuthorList',
    example: 1,
  },
  bySlug: {
    key: 'authors.bySlug',
    method: 'GET',
    path: '/authors/slug/:slug',
    auth: 'public',
    module: 'articles',
    description: 'Author page by slug',
    query: {},
    body: null,
    response: 'Author',
    example: 'editorial-team',
  },
};

/* ------------------------------------------------------------------ *
 * Public — content
 * ------------------------------------------------------------------ */

const faqs = {
  list: {
    key: 'faqs.list',
    method: 'GET',
    path: '/faqs',
    auth: 'public',
    module: 'content',
    description: 'FAQs for the FAQ page, the home section and property pages',
    // `ids` is how a CMS `faq` block asks for the questions an editor picked,
    // in the order they picked them (§5.6, prompt 30).
    query: {
      ...LIST_QUERY,
      category: enumOf(FAQ_CATEGORIES),
      showOnHome: 'bool',
      propertyTypeId: 'int',
      ids: 'csv:int',
    },
    body: null,
    response: 'FaqList',
    example: 1,
  },
};

const testimonials = {
  list: {
    key: 'testimonials.list',
    method: 'GET',
    path: '/testimonials',
    auth: 'public',
    module: 'content',
    description: 'Active testimonials',
    query: { ...LIST_QUERY, isFeatured: 'bool', ids: 'csv:int' },
    body: null,
    response: 'TestimonialList',
    example: 1,
  },
};

const team = {
  list: {
    key: 'team.list',
    method: 'GET',
    path: '/team',
    auth: 'public',
    module: 'content',
    description: 'Team members shown on the About page',
    query: { ...LIST_QUERY, showOnAbout: 'bool', ids: 'csv:int' },
    body: null,
    response: 'TeamMemberList',
    example: 1,
  },
};

const partners = {
  list: {
    key: 'partners.list',
    method: 'GET',
    path: '/partners',
    auth: 'public',
    module: 'content',
    description: 'Partner logos, optionally filtered by category',
    query: { ...LIST_QUERY, category: enumOf(PARTNER_CATEGORIES) },
    body: null,
    response: 'PartnerList',
    example: 1,
  },
};

const pages = {
  list: {
    key: 'pages.list',
    method: 'GET',
    path: '/pages',
    auth: 'public',
    module: 'content',
    description: 'Published pages that belong in the header or footer navigation',
    query: { showInHeader: 'bool', showInFooter: 'bool', page: 'int', perPage: 'int' },
    body: null,
    response: 'PageNavList',
    example: 1,
  },
  bySlug: {
    key: 'pages.bySlug',
    method: 'GET',
    path: '/pages/slug/:slug',
    auth: 'public',
    module: 'content',
    description: 'Published CMS page by slug; a matching preview token also returns drafts',
    query: { preview: 'string' },
    body: null,
    response: 'Page',
    example: 'about',
  },
};

/**
 * The header's menus (QA-56): the bar is built from these and from the pages
 * placed in them (`pages.list?showInHeader=true`), so it is a collection an
 * editor manages rather than a list in `config/navigation.js`.
 */
const headerMenus = {
  list: {
    key: 'headerMenus.list',
    method: 'GET',
    path: '/header-menus',
    auth: 'public',
    module: 'content',
    description: 'The active header menus, left to right, with their submenus and links',
    query: { page: 'int', perPage: 'int' },
    body: null,
    response: 'HeaderMenuList',
    example: 1,
  },
};

const jobs = {
  list: {
    key: 'jobs.list',
    method: 'GET',
    path: '/jobs',
    auth: 'public',
    module: 'content',
    description: 'Open job postings',
    query: { ...LIST_QUERY, department: 'string' },
    body: null,
    response: 'JobList',
    example: 1,
  },
  bySlug: {
    key: 'jobs.bySlug',
    method: 'GET',
    path: '/jobs/slug/:slug',
    auth: 'public',
    module: 'content',
    description: 'Job posting by slug',
    query: {},
    body: null,
    response: 'Job',
    example: 'real-estate-advisor-bengaluru',
  },
  apply: {
    key: 'jobs.apply',
    method: 'POST',
    path: '/jobs/:id/apply',
    auth: 'public',
    module: 'content',
    description: 'Apply for a job posting; honeypot and rate limited',
    query: {},
    body: 'jobApplication.create',
    response: 'JobApplication',
    example: 1,
  },
};

const leads = {
  create: {
    key: 'leads.create',
    method: 'POST',
    path: '/leads',
    auth: 'public',
    module: 'leads',
    description: 'Capture a lead from any form on the site; honeypot and rate limited',
    query: {},
    body: 'lead.create',
    response: 'LeadCreated',
    example: 1,
  },
};

const newsletter = {
  subscribe: {
    key: 'newsletter.subscribe',
    method: 'POST',
    path: '/newsletter/subscribe',
    auth: 'public',
    module: 'content',
    description: 'Subscribe an e-mail address; a duplicate answers 200 instead of 409',
    query: {},
    body: 'newsletter.subscribe',
    response: 'Null',
    example: 1,
  },
};

const settings = {
  get: {
    key: 'settings.get',
    method: 'GET',
    path: '/settings',
    auth: 'public',
    module: 'settings',
    description: 'The public subset of the site settings',
    query: {},
    body: null,
    response: 'Settings',
    example: 1,
  },
};

const seo = {
  settings: {
    key: 'seo.settings',
    method: 'GET',
    path: '/seo/settings',
    auth: 'public',
    module: 'seo',
    description: 'The public subset of the SEO settings used by <Seo> and the sitemap',
    query: {},
    body: null,
    response: 'SeoSettings',
    example: 1,
  },
};

const redirects = {
  list: {
    key: 'redirects.list',
    method: 'GET',
    path: '/redirects',
    auth: 'public',
    module: 'seo',
    description: 'Active redirects, resolved client-side by RedirectHandler',
    query: {},
    body: null,
    response: 'RedirectList',
    example: 1,
  },
  resolve: {
    key: 'redirects.resolve',
    method: 'GET',
    path: '/redirects/resolve',
    auth: 'public',
    module: 'seo',
    description: 'The active rule for one path, or 404; the only place hits are counted',
    query: { path: 'string' },
    body: null,
    response: 'Redirect',
    example: null,
  },
};

const sitemap = {
  index: {
    key: 'sitemap.index',
    method: 'GET',
    path: '/sitemap.xml',
    auth: 'public',
    module: 'seo',
    description: 'Sitemap index listing every sub-sitemap',
    query: {},
    body: null,
    response: 'Xml',
    example: null,
  },
  properties: {
    key: 'sitemap.properties',
    method: 'GET',
    path: '/sitemap-properties.xml',
    auth: 'public',
    module: 'seo',
    description: 'Property URLs with lastmod, changefreq, priority and image entries',
    query: {},
    body: null,
    response: 'Xml',
    example: null,
  },
  localities: {
    key: 'sitemap.localities',
    method: 'GET',
    path: '/sitemap-localities.xml',
    auth: 'public',
    module: 'seo',
    description: 'Locality URLs',
    query: {},
    body: null,
    response: 'Xml',
    example: null,
  },
  developers: {
    key: 'sitemap.developers',
    method: 'GET',
    path: '/sitemap-developers.xml',
    auth: 'public',
    module: 'seo',
    description: 'Developer URLs',
    query: {},
    body: null,
    response: 'Xml',
    example: null,
  },
  articles: {
    key: 'sitemap.articles',
    method: 'GET',
    path: '/sitemap-articles.xml',
    auth: 'public',
    module: 'seo',
    description: 'Article, category, tag and author URLs',
    query: {},
    body: null,
    response: 'Xml',
    example: null,
  },
  pages: {
    key: 'sitemap.pages',
    method: 'GET',
    path: '/sitemap-pages.xml',
    auth: 'public',
    module: 'seo',
    description: 'CMS page URLs',
    query: {},
    body: null,
    response: 'Xml',
    example: null,
  },
  robots: {
    key: 'sitemap.robots',
    method: 'GET',
    path: '/robots.txt',
    auth: 'public',
    module: 'seo',
    description: 'robots.txt from seoSettings.robotsTxt',
    query: {},
    body: null,
    response: 'Text',
    example: null,
  },
  rss: {
    key: 'sitemap.rss',
    method: 'GET',
    path: '/rss.xml',
    auth: 'public',
    module: 'seo',
    description: 'RSS feed of the latest twenty published articles',
    query: {},
    body: null,
    response: 'Xml',
    example: null,
  },
  llms: {
    key: 'sitemap.llms',
    method: 'GET',
    path: '/llms.txt',
    auth: 'public',
    module: 'seo',
    description: 'llms.txt from seoSettings.llmsTxt',
    query: {},
    body: null,
    response: 'Text',
    example: null,
  },
};

/* ------------------------------------------------------------------ *
 * Auth
 * ------------------------------------------------------------------ */

const auth = {
  login: {
    key: 'auth.login',
    method: 'POST',
    path: '/auth/login',
    auth: 'public',
    module: 'auth',
    description: 'Exchange e-mail and password for a bearer token',
    query: {},
    body: 'auth.login',
    response: 'AuthSession',
    example: null,
  },
  logout: {
    key: 'auth.logout',
    method: 'POST',
    path: '/auth/logout',
    auth: 'user',
    module: 'auth',
    description: 'Revoke the current token',
    query: {},
    body: null,
    response: 'Null',
    example: null,
  },
  profile: {
    key: 'auth.profile',
    method: 'GET',
    path: '/auth/profile',
    auth: 'user',
    module: 'auth',
    description: 'The signed-in user; 401 when the token is missing, expired or revoked',
    query: {},
    body: null,
    response: 'User',
    example: null,
  },
  updateProfile: {
    key: 'auth.updateProfile',
    method: 'PUT',
    path: '/auth/profile',
    auth: 'user',
    module: 'auth',
    description: 'Update the signed-in user’s own name, phone and avatar',
    query: {},
    body: 'auth.profile',
    response: 'User',
    example: null,
  },
  updatePassword: {
    key: 'auth.updatePassword',
    method: 'PUT',
    path: '/auth/password',
    auth: 'user',
    module: 'auth',
    description: 'Change the signed-in user’s own password',
    query: {},
    body: 'auth.password',
    response: 'Null',
    example: null,
  },
};

/* ------------------------------------------------------------------ *
 * Admin — dashboard, properties, leads
 * ------------------------------------------------------------------ */

const dashboard = {
  get: {
    key: 'dashboard.get',
    method: 'GET',
    path: '/admin/dashboard',
    auth: 'user',
    module: 'dashboard',
    description: 'Role-aware dashboard aggregates, trends and recent activity',
    query: {},
    body: null,
    response: 'DashboardData',
    example: null,
  },
};

const adminProperties = {
  ...adminResource({
    group: 'adminProperties',
    path: '/admin/properties',
    module: 'properties',
    singular: 'property',
    plural: 'properties',
    schema: 'property',
    response: 'Property',
    withUsage: false,
    // Sales may read the admin list (read-only) but never write (§7).
    readAuth: 'user',
    query: {
      ...PROPERTY_FILTERS,
      sort: 'enum:updatedAt,price,viewCount,priorityOrder,title,seoScore',
      seoScoreBand: enumOf(SEO_SCORE_BANDS),
      createdBy: 'int',
    },
  }),
  // The admin read by slug, not by id: a public URL is all the preview link
  // carries, and an inactive listing answers 404 on the public route (§5.10).
  bySlug: {
    key: 'adminProperties.bySlug',
    method: 'GET',
    path: '/admin/properties/slug/:slug',
    auth: 'user',
    module: 'properties',
    description: 'Read one property by slug with every admin field, active or not',
    query: {},
    body: null,
    response: 'Property',
    example: 'lakeview-heights-3-bhk-whitefield',
  },
  duplicate: {
    key: 'adminProperties.duplicate',
    method: 'POST',
    path: '/admin/properties/:id/duplicate',
    auth: 'manager',
    module: 'properties',
    description: 'Copy a property as an inactive draft with a fresh slug',
    query: {},
    body: null,
    response: 'Property',
    example: 1,
  },
};

const adminLeads = {
  list: {
    key: 'adminLeads.list',
    method: 'GET',
    path: '/admin/leads',
    auth: 'user',
    module: 'leads',
    description: 'Lead list for the CRM; scoped to own and unassigned leads for sales',
    query: {
      ...LIST_QUERY,
      sort: 'enum:createdAt,updatedAt,followUpAt,status,priority',
      status: csvEnumOf(LEAD_STATUS),
      source: csvEnumOf(LEAD_SOURCES),
      priority: csvEnumOf(LEAD_PRIORITY),
      assignedTo: 'string',
      propertyId: 'int',
      from: 'date',
      to: 'date',
    },
    body: null,
    response: 'LeadList',
    example: 1,
  },
  get: {
    key: 'adminLeads.get',
    method: 'GET',
    path: '/admin/leads/:id',
    auth: 'user',
    module: 'leads',
    description: 'One lead with its notes and activity timeline',
    query: {},
    body: null,
    response: 'Lead',
    example: 1,
  },
  patch: {
    key: 'adminLeads.patch',
    method: 'PATCH',
    path: '/admin/leads/:id',
    auth: 'user',
    module: 'leads',
    description: 'Change status, priority, assignee, follow-up or lost reason',
    query: {},
    body: 'lead.patch',
    response: 'Lead',
    example: 1,
  },
  remove: {
    key: 'adminLeads.remove',
    method: 'DELETE',
    path: '/admin/leads/:id',
    auth: 'manager',
    module: 'leads',
    description: 'Delete a lead; forbidden for sales',
    query: {},
    body: null,
    response: 'Null',
    example: 1,
  },
  claim: {
    key: 'adminLeads.claim',
    method: 'POST',
    path: '/admin/leads/:id/claim',
    auth: 'user',
    module: 'leads',
    description: 'Assign an unassigned lead to the signed-in user',
    query: {},
    body: null,
    response: 'Lead',
    example: 1,
  },
  addNote: {
    key: 'adminLeads.addNote',
    method: 'POST',
    path: '/admin/leads/:id/notes',
    auth: 'user',
    module: 'leads',
    description: 'Append a note to a lead and return the lead',
    query: {},
    body: 'lead.note',
    response: 'Lead',
    example: 1,
  },
  removeNote: {
    key: 'adminLeads.removeNote',
    method: 'DELETE',
    path: '/admin/leads/:id/notes/:noteId',
    auth: 'user',
    module: 'leads',
    description: 'Delete one note from a lead',
    query: {},
    body: null,
    response: 'Lead',
    example: 1,
  },
  exportCsv: {
    key: 'adminLeads.exportCsv',
    method: 'GET',
    path: '/admin/leads/export',
    auth: 'user',
    module: 'leads',
    description: 'CSV export of the filtered lead list, scoped like the list endpoint',
    // The table's order too: `http.buildParams` drops a key the entry does not
    // list, so without these the file came out newest first whatever the
    // table was sorted by (QA-53).
    query: {
      sort: 'enum:createdAt,updatedAt,followUpAt,status,priority',
      order: 'enum:asc,desc',
      q: 'string',
      status: csvEnumOf(LEAD_STATUS),
      source: csvEnumOf(LEAD_SOURCES),
      priority: csvEnumOf(LEAD_PRIORITY),
      assignedTo: 'string',
      propertyId: 'int',
      from: 'date',
      to: 'date',
    },
    body: null,
    response: 'Csv',
    example: null,
  },
  bulk: {
    key: 'adminLeads.bulk',
    method: 'POST',
    path: '/admin/leads/bulk',
    auth: 'manager',
    module: 'leads',
    description: 'Change status, priority or assignee of several leads, or delete them',
    query: {},
    body: 'bulk',
    response: 'BulkResult',
    example: null,
  },
};

/* ------------------------------------------------------------------ *
 * Admin — master data, articles, content
 * ------------------------------------------------------------------ */

const adminLocalities = adminResource({
  group: 'adminLocalities',
  path: '/admin/localities',
  module: 'masterData',
  singular: 'locality',
  plural: 'localities',
  schema: 'locality',
  response: 'Locality',
  query: { cityId: 'int', zone: enumOf(LOCALITY_ZONES), isFeatured: 'bool' },
});

const adminCities = adminResource({
  group: 'adminCities',
  path: '/admin/cities',
  module: 'masterData',
  singular: 'city',
  plural: 'cities',
  schema: 'city',
  response: 'City',
});

const adminSegments = adminResource({
  group: 'adminSegments',
  path: '/admin/segments',
  module: 'masterData',
  singular: 'segment',
  plural: 'segments',
  schema: 'segment',
  response: 'Segment',
  query: { kind: enumOf(SEGMENTS) },
});

const adminPropertyTypes = adminResource({
  group: 'adminPropertyTypes',
  path: '/admin/property-types',
  module: 'masterData',
  singular: 'property type',
  plural: 'property types',
  schema: 'propertyType',
  response: 'PropertyType',
  query: { segment: 'string' },
});

const adminAmenities = adminResource({
  group: 'adminAmenities',
  path: '/admin/amenities',
  module: 'masterData',
  singular: 'amenity',
  plural: 'amenities',
  schema: 'amenity',
  response: 'Amenity',
  query: { category: enumOf(AMENITY_CATEGORIES) },
});

const adminBadges = adminResource({
  group: 'adminBadges',
  path: '/admin/badges',
  module: 'masterData',
  singular: 'badge',
  plural: 'badges',
  schema: 'badge',
  response: 'Badge',
});

const adminDevelopers = adminResource({
  group: 'adminDevelopers',
  path: '/admin/developers',
  module: 'masterData',
  singular: 'developer',
  plural: 'developers',
  schema: 'developer',
  response: 'Developer',
  query: { isFeatured: 'bool' },
});

const adminBanks = adminResource({
  group: 'adminBanks',
  path: '/admin/banks',
  module: 'masterData',
  singular: 'bank',
  plural: 'banks',
  schema: 'bank',
  response: 'Bank',
});

const adminArticles = {
  ...adminResource({
    group: 'adminArticles',
    path: '/admin/articles',
    module: 'articles',
    singular: 'article',
    plural: 'articles',
    schema: 'article',
    response: 'Article',
    query: {
      status: csvEnumOf(ARTICLE_STATUS),
      categoryId: 'int',
      tagId: 'int',
      authorId: 'int',
      isFeatured: 'bool',
      seoScoreBand: enumOf(SEO_SCORE_BANDS),
    },
  }),
  previewToken: {
    key: 'adminArticles.previewToken',
    method: 'GET',
    path: '/admin/articles/:id/preview-token',
    auth: 'manager',
    module: 'articles',
    description: 'A 24-hour preview token and URL for an unpublished article',
    query: {},
    body: null,
    response: 'PreviewToken',
    example: 1,
  },
};

const adminArticleCategories = adminResource({
  group: 'adminArticleCategories',
  path: '/admin/article-categories',
  module: 'articles',
  singular: 'article category',
  plural: 'article categories',
  schema: 'articleCategory',
  response: 'ArticleCategory',
});

const adminArticleTags = adminResource({
  group: 'adminArticleTags',
  path: '/admin/article-tags',
  module: 'articles',
  singular: 'article tag',
  plural: 'article tags',
  schema: 'articleTag',
  response: 'ArticleTag',
});

const adminAuthors = adminResource({
  group: 'adminAuthors',
  path: '/admin/authors',
  module: 'articles',
  singular: 'author',
  plural: 'authors',
  schema: 'author',
  response: 'Author',
});

const adminFaqs = adminResource({
  group: 'adminFaqs',
  path: '/admin/faqs',
  module: 'content',
  singular: 'FAQ',
  plural: 'FAQs',
  schema: 'faq',
  response: 'Faq',
  slugged: false,
  query: { category: enumOf(FAQ_CATEGORIES), showOnHome: 'bool', propertyTypeId: 'int' },
});

const adminTestimonials = adminResource({
  group: 'adminTestimonials',
  path: '/admin/testimonials',
  module: 'content',
  singular: 'testimonial',
  plural: 'testimonials',
  schema: 'testimonial',
  response: 'Testimonial',
  slugged: false,
  query: { isFeatured: 'bool', isSample: 'bool' },
});

const adminTeam = adminResource({
  group: 'adminTeam',
  path: '/admin/team',
  module: 'content',
  singular: 'team member',
  plural: 'team members',
  schema: 'teamMember',
  response: 'TeamMember',
  query: { showOnAbout: 'bool' },
});

const adminPartners = adminResource({
  group: 'adminPartners',
  path: '/admin/partners',
  module: 'content',
  singular: 'partner',
  plural: 'partners',
  schema: 'partner',
  response: 'Partner',
  slugged: false,
  query: { category: enumOf(PARTNER_CATEGORIES) },
});

const adminPages = {
  ...adminResource({
    group: 'adminPages',
    path: '/admin/pages',
    module: 'content',
    singular: 'page',
    plural: 'pages',
    schema: 'page',
    response: 'Page',
    query: { status: enumOf(PAGE_STATUS), template: 'string' },
  }),
  previewToken: {
    key: 'adminPages.previewToken',
    method: 'GET',
    path: '/admin/pages/:id/preview-token',
    auth: 'manager',
    module: 'content',
    description: 'A 24-hour preview token and URL for an unpublished page',
    query: {},
    body: null,
    response: 'PreviewToken',
    example: 1,
  },
};

const adminHeaderMenus = adminResource({
  group: 'adminHeaderMenus',
  path: '/admin/header-menus',
  module: 'content',
  singular: 'header menu',
  plural: 'header menus',
  schema: 'headerMenu',
  response: 'HeaderMenu',
  // A deleted menu takes its pages out of the header rather than refusing
  // (QA-56), so there is no usage to report.
  withUsage: false,
});

const adminJobs = adminResource({
  group: 'adminJobs',
  path: '/admin/jobs',
  module: 'content',
  singular: 'job posting',
  plural: 'job postings',
  schema: 'job',
  response: 'Job',
  query: { department: 'string' },
});

const adminJobApplications = {
  list: {
    key: 'adminJobApplications.list',
    method: 'GET',
    path: '/admin/job-applications',
    auth: 'manager',
    module: 'content',
    description: 'Applications received for the job postings',
    query: { ...LIST_QUERY, jobId: 'int', status: csvEnumOf(JOB_APPLICATION_STATUS) },
    body: null,
    response: 'JobApplicationList',
    example: 1,
  },
  patch: {
    key: 'adminJobApplications.patch',
    method: 'PATCH',
    path: '/admin/job-applications/:id',
    auth: 'manager',
    module: 'content',
    description: 'Move an application through the hiring statuses',
    query: {},
    body: 'jobApplication.patch',
    response: 'JobApplication',
    example: 1,
  },
  remove: {
    key: 'adminJobApplications.remove',
    method: 'DELETE',
    path: '/admin/job-applications/:id',
    auth: 'manager',
    module: 'content',
    description: 'Delete an application',
    query: {},
    body: null,
    response: 'Null',
    example: 1,
  },
};

const adminNewsletterSubscribers = {
  list: {
    key: 'adminNewsletterSubscribers.list',
    method: 'GET',
    path: '/admin/newsletter-subscribers',
    auth: 'manager',
    module: 'content',
    description: 'Newsletter subscribers',
    query: { ...LIST_QUERY, status: enumOf(NEWSLETTER_STATUS) },
    body: null,
    response: 'NewsletterSubscriberList',
    example: 1,
  },
  remove: {
    key: 'adminNewsletterSubscribers.remove',
    method: 'DELETE',
    path: '/admin/newsletter-subscribers/:id',
    auth: 'manager',
    module: 'content',
    description: 'Remove a subscriber',
    query: {},
    body: null,
    response: 'Null',
    example: 1,
  },
  exportCsv: {
    key: 'adminNewsletterSubscribers.exportCsv',
    method: 'GET',
    path: '/admin/newsletter-subscribers/export',
    auth: 'manager',
    module: 'content',
    description: 'CSV export of the filtered subscriber list',
    query: { q: 'string', status: enumOf(NEWSLETTER_STATUS) },
    body: null,
    response: 'Csv',
    example: null,
  },
};

/* ------------------------------------------------------------------ *
 * Admin — media, SEO, settings, users
 * ------------------------------------------------------------------ */

const adminMediaBase = adminResource({
  group: 'adminMedia',
  path: '/admin/media',
  module: 'media',
  singular: 'media item',
  plural: 'media items',
  schema: 'media',
  response: 'Media',
  slugged: false,
  query: {
    type: enumOf(MEDIA_TYPES),
    provider: enumOf(MEDIA_PROVIDERS),
    folder: 'string',
    // Where each file is used, on the list as well as on a single read: the
    // library prints a "Used in 3" badge per card, and one request for the
    // page beats one request per card (§5.14).
    withUsage: 'bool',
  },
});

/**
 * Media, with the parameters the library needs beyond the usual CRUD.
 *
 * `force` is the one rule this resource adds to §5.8: a `DELETE` of a file
 * something still shows is a 409 listing the usages, and `force=true` is the
 * editor's answer to that list (prompt 39 §5). The record goes; the Cloudinary
 * asset was never ours to delete. A bulk delete is all or nothing and reads
 * `force` the same way (QA-63).
 *
 * The list's `meta.folders` names every folder in the library, whatever the
 * filters and the page — the Folder filter's options (QA-63). `q` reads the
 * alt text, the title, the folder, the public id, the address and the tags.
 */
const adminMedia = {
  ...adminMediaBase,
  list: {
    ...adminMediaBase.list,
    description:
      'List media items for the library grid; `meta.folders` names every folder in the library, and `q` also reads the address and the tags',
  },
  remove: {
    ...adminMediaBase.remove,
    query: { force: 'bool' },
    description:
      'Delete a media record; 409 listing `usedIn` when the file is still in use, unless `force=true`',
  },
  bulk: {
    ...adminMediaBase.bulk,
    query: { force: 'bool' },
    description:
      'Apply one action to several media items; a delete is all or nothing — a 409 naming every file still in use (`data.refused`), unless `force=true`',
  },
};

const adminRedirects = {
  ...adminResource({
    group: 'adminRedirects',
    path: '/admin/redirects',
    module: 'seo',
    singular: 'redirect',
    plural: 'redirects',
    schema: 'redirect',
    response: 'Redirect',
    slugged: false,
  }),
  // A migration arrives as a spreadsheet, not as four hundred POSTs: the rows
  // are sent once and the answer counts what was created, updated and refused
  // (prompt 37 §4.12).
  import: {
    key: 'adminRedirects.import',
    method: 'POST',
    path: '/admin/redirects/import',
    auth: 'manager',
    module: 'seo',
    description: 'Create or update redirects from parsed CSV rows; invalid rows are skipped',
    query: {},
    body: 'redirect.import',
    response: 'RedirectImportSummary',
    example: null,
  },
  exportCsv: {
    key: 'adminRedirects.exportCsv',
    method: 'GET',
    path: '/admin/redirects/export',
    auth: 'manager',
    module: 'seo',
    description: 'Every redirect as a CSV file',
    query: {},
    body: null,
    response: 'Csv',
    example: null,
  },
};

const adminSeo = {
  settings: {
    key: 'adminSeo.settings',
    method: 'GET',
    path: '/admin/seo/settings',
    auth: 'manager',
    module: 'seo',
    description: 'The complete SEO settings singleton',
    query: {},
    body: null,
    response: 'SeoSettings',
    example: null,
  },
  updateSettings: {
    key: 'adminSeo.updateSettings',
    method: 'PUT',
    path: '/admin/seo/settings',
    auth: 'manager',
    module: 'seo',
    description: 'Replace the SEO settings; known keys are deep-merged',
    query: {},
    body: 'seoSettings.update',
    response: 'SeoSettings',
    example: null,
  },
  llmsPreview: {
    key: 'adminSeo.llmsPreview',
    method: 'GET',
    path: '/admin/seo/llms-preview',
    auth: 'manager',
    module: 'seo',
    description: 'The llms.txt the current data would generate, without storing it',
    query: {},
    body: null,
    response: 'LlmsPreview',
    example: null,
  },
  overview: {
    key: 'adminSeo.overview',
    method: 'GET',
    path: '/admin/seo/overview',
    auth: 'manager',
    module: 'seo',
    description: 'Lightweight SEO rows for the dashboard and the uniqueness checks',
    query: {
      ...LIST_QUERY,
      type: enumOf(SEO_ENTITY_TYPES),
      scoreBand: enumOf(SEO_SCORE_BANDS),
      index: 'bool',
    },
    body: null,
    response: 'SeoOverviewRowList',
    example: null,
  },
};

const adminSettings = {
  get: {
    key: 'adminSettings.get',
    method: 'GET',
    path: '/admin/settings',
    auth: 'manager',
    module: 'settings',
    description: 'The complete site settings singleton, including the lead branch',
    query: {},
    body: null,
    response: 'Settings',
    example: null,
  },
  update: {
    key: 'adminSettings.update',
    method: 'PUT',
    path: '/admin/settings',
    auth: 'admin',
    module: 'settings',
    description: 'Replace the site settings; known keys are deep-merged',
    query: {},
    body: 'settings.update',
    response: 'Settings',
    example: null,
  },
};

const adminUsers = adminResource({
  group: 'adminUsers',
  path: '/admin/users',
  module: 'users',
  singular: 'user',
  plural: 'users',
  schema: 'user',
  response: 'User',
  slugged: false,
  withUsage: false,
  auth: 'admin',
  // Reading the directory is what the lead CRM's assignment picker needs, and
  // `leads.assign` is admin **and** manager (§7); every write stays admin-only.
  readAuth: 'manager',
  query: { role: enumOf(ROLES) },
});

/* ------------------------------------------------------------------ *
 * Registry
 * ------------------------------------------------------------------ */

const endpoints = {
  properties,
  localities,
  cities,
  developers,
  segments,
  propertyTypes,
  amenities,
  badges,
  banks,
  articles,
  articleCategories,
  articleTags,
  authors,
  faqs,
  testimonials,
  team,
  partners,
  pages,
  headerMenus,
  jobs,
  leads,
  newsletter,
  settings,
  seo,
  redirects,
  sitemap,
  auth,
  dashboard,
  adminProperties,
  adminLeads,
  adminLocalities,
  adminCities,
  adminSegments,
  adminPropertyTypes,
  adminAmenities,
  adminBadges,
  adminDevelopers,
  adminBanks,
  adminArticles,
  adminArticleCategories,
  adminArticleTags,
  adminAuthors,
  adminFaqs,
  adminTestimonials,
  adminTeam,
  adminPartners,
  adminPages,
  adminHeaderMenus,
  adminJobs,
  adminJobApplications,
  adminNewsletterSubscribers,
  adminMedia,
  adminRedirects,
  adminSeo,
  adminSettings,
  adminUsers,
};

/** Every entry of the registry, flattened. */
const allEndpoints = () => Object.values(endpoints).flatMap((group) => Object.values(group));

/** One entry by its `group.action` key, or `undefined`. */
const findEndpoint = (key) => allEndpoints().find((entry) => entry.key === key);

module.exports = { endpoints, allEndpoints, findEndpoint };
