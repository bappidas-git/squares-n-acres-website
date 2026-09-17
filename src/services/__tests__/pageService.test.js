/**
 * `pageService.duplicate` (NEW-36).
 *
 * The copy is assembled in the browser (§5.14 gives pages no copy endpoint), so
 * what it sends is the whole contract for the feature — and the bug this covers
 * was a payload the API could only ever refuse: `slug: ''` and `seo.slug: ''`,
 * neither of which is a path slug (§6.10), on a field that is `required` and has
 * no default.
 */

import http from '../http';
import pageService from '../pageService';

jest.mock('../http');

const RECORD = {
  id: 6,
  slug: 'buyer-assistance/home-loan',
  title: 'Home Loans in Bengaluru',
  template: 'service',
  status: 'published',
  heroImageUrl: 'https://images.test/hero.jpg',
  blocks: [
    { id: 1, type: 'hero', order: 1, data: { title: 'Home loans' } },
    { id: 2, type: 'richText', order: 2, data: { html: '<p>Body.</p>' } },
  ],
  leadSource: 'home-loan',
  order: 3,
  showInFooter: true,
  footerColumn: 'services',
  showInHeader: true,
  headerMenu: 'buyer-assistance',
  seo: {
    focusKeyword: 'home loan bengaluru',
    title: 'Home loans',
    description: 'How to.',
    slug: 'buyer-assistance/home-loan',
    canonicalUrl: 'https://www.example.test/buyer-assistance/home-loan',
    redirect: { enabled: true, toPath: '/contact', statusCode: 301 },
    og: { title: null, description: null, imageUrl: 'https://images.test/og.jpg' },
    score: 74,
    scoreBand: 'ok',
    testsPassed: 10,
    testsTotal: 14,
    analysis: {
      basic: [{ id: 'a', status: 'pass', message: 'ok' }],
      additional: [],
      titleReadability: [],
      contentReadability: [],
    },
    lastAnalyzedAt: '2026-09-01T06:00:00.000Z',
  },
  createdAt: '2026-04-01T06:00:00.000Z',
  updatedAt: '2026-09-15T06:00:00.000Z',
};

/**
 * The body the one `POST` of a duplicate carried.
 *
 * @param {object} [options]
 * @param {object} [options.record] the page being copied
 * @param {{available: boolean, suggestion: string}|null} [options.slugCheck]
 *   what `check-slug` answers; `null` makes the call fail
 */
const duplicateBody = async ({ record = RECORD, slugCheck } = {}) => {
  http.request.mockImplementation((endpoint, options) => {
    if (endpoint.key === 'adminPages.checkSlug') {
      if (slugCheck === null) return Promise.reject(new Error('offline'));
      return Promise.resolve({
        data: slugCheck ?? { available: true, suggestion: options.params.slug },
      });
    }
    if (endpoint.method === 'GET') return Promise.resolve({ data: record });
    return Promise.resolve({ data: { ...options.body, id: 99 } });
  });

  await pageService.duplicate(record.id);
  const post = http.request.mock.calls.find(([endpoint]) => endpoint.method === 'POST');
  return post[1].body;
};

beforeEach(() => jest.clearAllMocks());

describe('pageService.duplicate', () => {
  it('sends a real path slug, never the empty string a page may not carry', async () => {
    const body = await duplicateBody();

    expect(body.slug).toBe('buyer-assistance/home-loan-copy');
    // The bug: both of these used to be `''`, which is not a path slug.
    expect(body.slug).not.toBe('');
    expect(body.seo.slug).toBe('buyer-assistance/home-loan-copy');
  });

  it('takes the free variant `check-slug` suggests when `-copy` is taken', async () => {
    const body = await duplicateBody({
      slugCheck: { available: false, suggestion: 'buyer-assistance/home-loan-copy-2' },
    });

    expect(body.slug).toBe('buyer-assistance/home-loan-copy-2');
    expect(body.seo.slug).toBe('buyer-assistance/home-loan-copy-2');
  });

  it('still posts its candidate when the availability check cannot be made', async () => {
    const body = await duplicateBody({ slugCheck: null });

    expect(body.slug).toBe('buyer-assistance/home-loan-copy');
  });

  it('does not invent a slug for a record §6.10 does not allow to exist', async () => {
    // A stored page always has one — it is `required` with no default — so a
    // record without it is malformed, and the API naming the field in its
    // refusal is a better answer than a slug nobody chose.
    const body = await duplicateBody({ record: { ...RECORD, slug: '' } });

    expect(body.slug).toBe('');
  });

  it('is a draft in neither menu, with no menu to be in', async () => {
    const body = await duplicateBody();

    expect(body.status).toBe('draft');
    expect(body.showInHeader).toBe(false);
    expect(body.headerMenu).toBeNull();
    expect(body.showInFooter).toBe(false);
    expect(body.footerColumn).toBeNull();
    expect(body.title).toBe('Home Loans in Bengaluru (Copy)');
  });

  it('leaves out the three fields the API owns (§5.5)', async () => {
    const body = await duplicateBody();

    for (const field of ['id', 'createdAt', 'updatedAt']) {
      expect(body).not.toHaveProperty(field);
    }
  });

  it('keeps the blocks, the template and the editorial SEO fields', async () => {
    const body = await duplicateBody();

    expect(body.blocks).toEqual(RECORD.blocks);
    expect(body.template).toBe('service');
    expect(body.leadSource).toBe('home-loan');
    expect(body.heroImageUrl).toBe(RECORD.heroImageUrl);
    expect(body.seo.focusKeyword).toBe('home loan bengaluru');
    expect(body.seo.og.imageUrl).toBe('https://images.test/og.jpg');
  });

  it('drops the canonical and the redirect, which name the original and not the copy', async () => {
    const body = await duplicateBody();

    expect(body.seo.canonicalUrl).toBeNull();
    expect(body.seo.redirect).toEqual({ enabled: false, toPath: '', statusCode: 301 });
  });

  it('clears the score and the analysis, which are an answer about the original', async () => {
    const body = await duplicateBody();

    expect(body.seo.score).toBeNull();
    expect(body.seo.scoreBand).toBe('none');
    expect(body.seo.testsPassed).toBe(0);
    expect(body.seo.testsTotal).toBe(0);
    expect(body.seo.analysis).toEqual({
      basic: [],
      additional: [],
      titleReadability: [],
      contentReadability: [],
    });
    expect(body.seo.lastAnalyzedAt).toBeNull();
  });

  it('shortens a title that would not fit with " (Copy)" after it', async () => {
    const body = await duplicateBody({ record: { ...RECORD, title: 'P'.repeat(148) } });

    expect(body.title.length).toBeLessThanOrEqual(150);
    expect(body.title.endsWith(' (Copy)')).toBe(true);
  });

  it('keeps the `-copy` suffix inside the path-slug budget', async () => {
    const long = `${'a'.repeat(60)}/${'b'.repeat(59)}`; // 120 characters
    const body = await duplicateBody({ record: { ...RECORD, slug: long } });

    expect(body.slug.length).toBeLessThanOrEqual(120);
    expect(body.slug.endsWith('-copy')).toBe(true);
  });
});
