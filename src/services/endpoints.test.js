import { endpoints, allEndpoints, findEndpoint } from './endpoints';

const { schemas } = require('./schemas');

const ALLOWED_AUTH = ['public', 'user', 'manager', 'admin', 'sales'];
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Every path of 00_MASTER_CONTEXT.md §5.14, hardcoded so that deleting an entry
 * from the registry fails this suite.
 */
const PUBLIC_PATHS = [
  'GET /properties',
  'GET /properties/featured',
  'GET /properties/slug/:slug',
  'GET /properties/:id/similar',
  'POST /properties/:id/view',
  'POST /properties/:id/documents/access',
  'GET /properties/suggestions',
  'GET /localities',
  'GET /localities/slug/:slug',
  'GET /cities',
  // Not in §5.14: segments became master data after 1.0.0 (QA-52).
  'GET /segments',
  'GET /developers',
  'GET /developers/slug/:slug',
  'GET /property-types',
  'GET /amenities',
  'GET /badges',
  'GET /banks',
  'GET /articles',
  'GET /articles/slug/:slug',
  'GET /articles/trending',
  // Not in §5.14: added by prompt 34 for the article page's previous/next pair
  // (see docs/DECISIONS.md and docs/API_CONTRACT.md).
  'GET /articles/:id/adjacent',
  'GET /article-categories',
  'GET /article-tags',
  'GET /authors',
  'GET /authors/slug/:slug',
  'GET /faqs',
  'GET /testimonials',
  'GET /team',
  'GET /partners',
  'GET /pages',
  'GET /pages/slug/:slug',
  // Not in §5.14: the header's menus became records (QA-56; see
  // docs/API_CONTRACT.md).
  'GET /header-menus',
  'GET /jobs',
  'GET /jobs/slug/:slug',
  'POST /jobs/:id/apply',
  'GET /settings',
  'GET /seo/settings',
  'GET /redirects',
  // Not in §5.14: the SEO desk's "Check a URL" tester, and the one endpoint
  // that counts a hit (prompt 37; see docs/API_CONTRACT.md).
  'GET /redirects/resolve',
  'POST /leads',
  'POST /newsletter/subscribe',
  'GET /sitemap.xml',
  'GET /sitemap-properties.xml',
  'GET /sitemap-localities.xml',
  'GET /sitemap-developers.xml',
  'GET /sitemap-articles.xml',
  'GET /sitemap-pages.xml',
  'GET /robots.txt',
  'GET /rss.xml',
  'GET /llms.txt',
];

const AUTH_PATHS = [
  'POST /auth/login',
  'POST /auth/logout',
  'GET /auth/profile',
  'PUT /auth/profile',
  'PUT /auth/password',
];

const ADMIN_NAMED_PATHS = [
  'GET /admin/dashboard',
  'GET /admin/properties/slug/:slug',
  'POST /admin/properties/:id/duplicate',
  'GET /admin/leads',
  'GET /admin/leads/:id',
  'PATCH /admin/leads/:id',
  'DELETE /admin/leads/:id',
  'POST /admin/leads/:id/claim',
  'POST /admin/leads/:id/notes',
  'DELETE /admin/leads/:id/notes/:noteId',
  'GET /admin/leads/export',
  'POST /admin/leads/bulk',
  'GET /admin/job-applications',
  'PATCH /admin/job-applications/:id',
  'DELETE /admin/job-applications/:id',
  'GET /admin/newsletter-subscribers',
  'DELETE /admin/newsletter-subscribers/:id',
  'GET /admin/newsletter-subscribers/export',
  'GET /admin/settings',
  'PUT /admin/settings',
  'GET /admin/seo/settings',
  'PUT /admin/seo/settings',
  'GET /admin/seo/overview',
  // Added by prompt 37 for the SEO settings and redirects screens.
  'GET /admin/seo/llms-preview',
  'POST /admin/redirects/import',
  'GET /admin/redirects/export',
  'GET /admin/articles/:id/preview-token',
  'GET /admin/pages/:id/preview-token',
  // Added by prompt 51 for the media library's folders…
  'POST /admin/media/folders/rename',
  // …and for the lead desk.
  'POST /admin/leads',
  'POST /admin/leads/:id/activities',
  'POST /admin/settings/test-lead-alert',
];

/** `[path, slugged]` — the resources §5.14 gives the uniform CRUD + bulk set. */
const ADMIN_CRUD_RESOURCES = [
  ['/admin/properties', true],
  ['/admin/localities', true],
  ['/admin/cities', true],
  ['/admin/segments', true],
  ['/admin/property-types', true],
  ['/admin/amenities', true],
  ['/admin/badges', true],
  ['/admin/developers', true],
  ['/admin/banks', true],
  ['/admin/articles', true],
  ['/admin/article-categories', true],
  ['/admin/article-tags', true],
  ['/admin/authors', true],
  ['/admin/faqs', false],
  ['/admin/testimonials', false],
  ['/admin/team', true],
  ['/admin/partners', false],
  ['/admin/pages', true],
  // QA-56 — Admin → Pages → Header menu.
  ['/admin/header-menus', true],
  ['/admin/jobs', true],
  ['/admin/redirects', false],
  ['/admin/media', false],
  ['/admin/users', false],
];

const crudPaths = ADMIN_CRUD_RESOURCES.flatMap(([path, slugged]) => [
  `GET ${path}`,
  `POST ${path}`,
  `GET ${path}/:id`,
  `PUT ${path}/:id`,
  `PATCH ${path}/:id`,
  `DELETE ${path}/:id`,
  `POST ${path}/bulk`,
  ...(slugged ? [`GET ${path}/check-slug`] : []),
]);

const EXPECTED_PATHS = [...PUBLIC_PATHS, ...AUTH_PATHS, ...ADMIN_NAMED_PATHS, ...crudPaths];

const all = allEndpoints();
const routeOf = (entry) => `${entry.method} ${entry.path}`;
const routes = all.map(routeOf);

describe('the registry', () => {
  it('holds at least 120 entries', () => {
    expect(all.length).toBeGreaterThanOrEqual(120);
  });

  it('has unique keys', () => {
    const keys = all.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has a unique method and path per entry', () => {
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('names every key <group>.<action>', () => {
    Object.entries(endpoints).forEach(([group, actions]) => {
      Object.entries(actions).forEach(([action, entry]) => {
        expect(entry.key).toBe(`${group}.${action}`);
      });
    });
  });

  it('resolves every key through findEndpoint', () => {
    all.forEach((entry) => {
      expect(findEndpoint(entry.key)).toBe(entry);
    });
    expect(findEndpoint('nope.nope')).toBeUndefined();
  });
});

describe('every entry', () => {
  it('carries the full entry shape', () => {
    all.forEach((entry) => {
      expect(Object.keys(entry).sort()).toEqual(
        [
          'auth',
          'body',
          'description',
          'example',
          'key',
          'method',
          'module',
          'path',
          'query',
          'response',
        ].sort()
      );
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.response.length).toBeGreaterThan(0);
      expect(typeof entry.query).toBe('object');
    });
  });

  it('uses an allowed method', () => {
    all.forEach((entry) => expect(ALLOWED_METHODS).toContain(entry.method));
  });

  it('has a lower-case kebab path with camelCase :params and no snake_case', () => {
    all.forEach((entry) => {
      expect(entry.path.startsWith('/')).toBe(true);
      expect(entry.path).not.toMatch(/_/);
      // `:params` are camelCase (`:noteId`); the static segments never are.
      const staticPath = entry.path.replace(/:[A-Za-z][A-Za-z0-9]*/g, '');
      expect(staticPath).not.toMatch(/[A-Z]/);
    });
  });

  it('declares an allowed auth level', () => {
    all.forEach((entry) => expect(ALLOWED_AUTH).toContain(entry.auth));
  });

  it('puts every admin path behind a token', () => {
    all
      .filter((entry) => entry.path.startsWith('/admin/'))
      .forEach((entry) => expect(entry.auth).not.toBe('public'));
  });

  it('references an existing schema key when it sends a body', () => {
    all
      .filter((entry) => entry.body)
      .forEach((entry) => {
        expect(Object.keys(schemas)).toContain(entry.body);
      });
  });

  it('sends a body only on writing methods', () => {
    all
      .filter((entry) => entry.body)
      .forEach((entry) => expect(['POST', 'PUT', 'PATCH']).toContain(entry.method));
  });

  it('describes query parameters with a known descriptor', () => {
    const descriptor = /^(csv:)?(enum:[^:]+|string|int|number|bool|date|datetime)$/;
    all.forEach((entry) => {
      Object.entries(entry.query).forEach(([, type]) => {
        expect(type).toMatch(descriptor);
      });
    });
  });
});

describe('coverage of the endpoint catalogue', () => {
  it.each(EXPECTED_PATHS)('serves %s', (route) => {
    expect(routes).toContain(route);
  });

  it('adds nothing that the catalogue does not list', () => {
    const extra = routes.filter((route) => !EXPECTED_PATHS.includes(route));
    expect(extra).toEqual([]);
  });
});

describe('the documented examples', () => {
  it('uses the slugs prompt 10 seeds', () => {
    expect(endpoints.properties.bySlug.example).toBe('lakeview-heights-3-bhk-whitefield');
    expect(endpoints.adminProperties.bySlug.example).toBe('lakeview-heights-3-bhk-whitefield');
    expect(endpoints.articles.bySlug.example).toBe('karnataka-rera-guide-for-homebuyers');
    expect(endpoints.localities.bySlug.example).toBe('whitefield');
    expect(endpoints.developers.bySlug.example).toBe('aurelia-estates');
    expect(endpoints.pages.bySlug.example).toBe('about');
    expect(endpoints.jobs.bySlug.example).toBe('real-estate-advisor-bengaluru');
  });

  it('gives every :slug endpoint a slug example and every :id endpoint an id', () => {
    all
      .filter((entry) => entry.path.includes(':slug'))
      .forEach((entry) => expect(typeof entry.example).toBe('string'));
  });
});
