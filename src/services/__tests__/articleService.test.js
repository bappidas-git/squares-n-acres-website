/**
 * `articleService.duplicate` (prompt 33).
 *
 * The copy is assembled in the browser (§5.14 gives articles no copy endpoint),
 * so what it sends is the whole contract for the feature.
 */

import articleService from '../articleService';
import http from '../http';

jest.mock('../http');

const RECORD = {
  id: 4,
  slug: 'khata-transfer-checklist',
  title: 'Khata Transfer: The Complete Bengaluru Checklist',
  excerpt: 'What the BBMP asks for.',
  content: '<p>Body.</p>',
  contentText: 'Body.',
  wordCount: 1,
  readingTimeMinutes: 1,
  viewCount: 412,
  featuredImage: { url: 'https://images.test/k.jpg', alt: 'Khata', caption: null },
  categoryId: 3,
  category: { id: 3, name: 'Legal & RERA', slug: 'legal-rera' },
  tagIds: [1, 2],
  tags: [{ id: 1, name: 'khata', slug: 'khata' }],
  authorId: 1,
  author: { id: 1, name: 'Editorial Team', slug: 'editorial-team' },
  status: 'published',
  publishedAt: '2026-05-27T06:30:00.000Z',
  isFeatured: true,
  relatedArticleIds: [2],
  relatedPropertyIds: [],
  faqs: [{ question: 'Q?', answer: '<p>A.</p>' }],
  tableOfContents: true,
  seo: {
    focusKeyword: 'khata transfer',
    title: 'Khata transfer',
    description: 'How to.',
    slug: 'khata-transfer-checklist',
    canonicalUrl: 'https://www.example.test/insights/articles/khata-transfer-checklist',
    redirect: { enabled: true, toPath: '/insights/articles/other', statusCode: 301 },
    og: { title: null, description: null, imageUrl: 'https://images.test/og.jpg' },
    score: 82,
    scoreBand: 'good',
    testsPassed: 12,
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

/** The body the one `POST` of a duplicate carried. */
const duplicateBody = async (record = RECORD) => {
  http.request.mockImplementation((endpoint, options) => {
    if (endpoint.method === 'GET') return Promise.resolve({ data: record });
    return Promise.resolve({ data: { ...options.body, id: 99 } });
  });

  await articleService.duplicate(record.id);
  const post = http.request.mock.calls.find(([endpoint]) => endpoint.method === 'POST');
  return post[1].body;
};

beforeEach(() => jest.clearAllMocks());

describe('articleService.duplicate', () => {
  it('sends no slug at all, so the API derives one from the copy’s title (§5.9)', async () => {
    const body = await duplicateBody();

    // Present-but-empty is not "absent": an empty string fails the slug pattern
    // and the write is refused with a 422.
    expect('slug' in body).toBe(false);
    expect('slug' in body.seo).toBe(false);
  });

  it('is a draft nobody has read: not live, not featured, no publication date', async () => {
    const body = await duplicateBody();

    expect(body.status).toBe('draft');
    expect(body.isFeatured).toBe(false);
    expect(body.publishedAt).toBeNull();
    expect(body.title).toBe('Khata Transfer: The Complete Bengaluru Checklist (Copy)');
  });

  it('leaves out the fields the API derives (§5.5)', async () => {
    const body = await duplicateBody();

    for (const field of [
      'id',
      'createdAt',
      'updatedAt',
      'contentText',
      'wordCount',
      'readingTimeMinutes',
      'viewCount',
      'category',
      'tags',
      'author',
    ]) {
      expect(body).not.toHaveProperty(field);
    }
  });

  it('keeps the content, the classification and the editorial SEO fields', async () => {
    const body = await duplicateBody();

    expect(body.content).toBe(RECORD.content);
    expect(body.categoryId).toBe(3);
    expect(body.tagIds).toEqual([1, 2]);
    expect(body.authorId).toBe(1);
    expect(body.faqs).toEqual(RECORD.faqs);
    expect(body.seo.focusKeyword).toBe('khata transfer');
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
    const long = 'K'.repeat(98);
    const body = await duplicateBody({ ...RECORD, title: long });

    expect(body.title.length).toBeLessThanOrEqual(100);
    expect(body.title.endsWith(' (Copy)')).toBe(true);
  });
});
