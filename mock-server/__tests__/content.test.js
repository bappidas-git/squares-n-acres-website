/**
 * Articles, pages, master data, settings, SEO, the dashboard, the newsletter,
 * careers and redirects, end to end (00_MASTER_CONTEXT.md §5.14, §6.8–§6.16).
 *
 * Run with `npm run test:mock`. The harness and what it guarantees are
 * described in `./helpers.js`: a real server over a private copy of the seed.
 *
 * What these assertions are about is the behaviour a status code cannot show —
 * that a scheduled article becomes public on its own, that a settings `PUT`
 * keeps the keys it did not mention, that deleting a locality eleven listings
 * point at is refused with the list of them.
 */

const assert = require('node:assert/strict');
const { after, describe, it } = require('node:test');

const {
  ADMIN,
  MANAGER,
  SALES,
  SEED,
  cleanupTempFiles,
  silenceRequestLog,
  withServer,
} = require('./helpers');
const { resetPreviewTokens } = require('../lib/previewTokens');
const { resetViews } = require('../lib/viewCounter');
const { placeOrder } = require('../lib/crud');
const { isOpen } = require('../routes/jobs');

silenceRequestLog();

after(cleanupTempFiles);

/** A copy of the seed with `changes` applied to one collection. */
function seedWith(changes) {
  const copy = JSON.parse(JSON.stringify(SEED));
  for (const [collection, mutate] of Object.entries(changes)) mutate(copy[collection], copy);
  return copy;
}

/** An ISO timestamp `minutes` away from now. */
const fromNow = (minutes) => new Date(Date.now() + minutes * 60_000).toISOString();

const ids = (response) => response.body.data.map((row) => row.id);

/* ------------------------------------------------------------------ *
 * Articles
 * ------------------------------------------------------------------ */

describe('GET /articles', () => {
  it('shows a scheduled article once its moment has passed, and stores that', async () => {
    const seed = seedWith({
      articles: (articles) => {
        articles[0].status = 'scheduled';
        articles[0].publishedAt = fromNow(-1);
        articles[1].status = 'scheduled';
        articles[1].publishedAt = fromNow(60);
      },
    });

    await withServer({ seed }, async ({ request, login, db }) => {
      const list = await request('GET', '/articles?perPage=all');
      assert.ok(ids(list).includes(1), 'the article whose moment passed is public');
      assert.ok(!ids(list).includes(2), 'the one still waiting is not');

      // The read settles the state, so the admin desk agrees with the site.
      assert.equal(db.getCollection('articles').find((row) => row.id === 1).status, 'published');
      assert.equal(db.getCollection('articles').find((row) => row.id === 2).status, 'scheduled');

      const token = await login(ADMIN);
      const admin = await request('GET', '/admin/articles?status=scheduled&perPage=all', { token });
      assert.deepEqual(ids(admin), [2]);
    });
  });

  it('never shows a draft, and returns list rows without the body text', async () => {
    const seed = seedWith({ articles: (articles) => void (articles[0].status = 'draft') });

    await withServer({ seed }, async ({ request }) => {
      const list = await request('GET', '/articles?perPage=all');
      assert.ok(!ids(list).includes(1));

      const [row] = list.body.data;
      assert.ok(!('content' in row) && !('contentText' in row), 'a summary carries no body');
      assert.ok(row.category && row.author && Array.isArray(row.tags), 'embeds are present');
      assert.equal(typeof row.readingTimeMinutes, 'number');
    });
  });

  it('filters by category, tag and author slug, and sorts by newest or popular', async () => {
    await withServer(async ({ request }) => {
      const byCategory = await request('GET', '/articles?categorySlug=legal-rera&perPage=all');
      assert.deepEqual(ids(byCategory), [1]);

      const unknown = await request('GET', '/articles?categorySlug=no-such-category');
      assert.equal(unknown.body.meta.total, 0, 'a slug nothing matches filters everything out');

      const popular = await request('GET', '/articles?sort=popular&perPage=all');
      const views = popular.body.data.map((row) => row.viewCount);
      assert.deepEqual(
        views,
        [...views].sort((a, b) => b - a)
      );

      const trending = await request('GET', '/articles/trending');
      assert.ok(trending.body.data.length <= 6);
    });
  });

  it('counts a read once per visitor per hour and never counts a preview', async () => {
    resetViews();
    resetPreviewTokens();

    await withServer(async ({ request, login }) => {
      const first = await request('GET', '/articles/slug/karnataka-rera-guide-for-homebuyers');
      const again = await request('GET', '/articles/slug/karnataka-rera-guide-for-homebuyers');
      assert.equal(again.body.data.viewCount, first.body.data.viewCount);

      const token = await login(ADMIN);
      const issued = await request('GET', '/admin/articles/1/preview-token', { token });
      const preview = await request(
        'GET',
        `/articles/slug/karnataka-rera-guide-for-homebuyers?preview=${issued.body.data.token}`
      );
      assert.equal(preview.body.data.viewCount, first.body.data.viewCount);
    });
  });
});

describe('GET /articles/:id/adjacent', () => {
  it('answers with the pieces published either side, and null at the ends', async () => {
    await withServer(async ({ request }) => {
      // The fixture publishes 1, then 2, then 3, each in its own category.
      const first = await request('GET', '/articles/1/adjacent');
      assert.equal(first.status, 200);
      assert.equal(first.body.data.prev, null, 'nothing was published before the first');
      assert.equal(first.body.data.next.id, 2);

      const middle = await request('GET', '/articles/2/adjacent');
      assert.equal(middle.body.data.prev.id, 1);
      assert.equal(middle.body.data.next.id, 3);

      const last = await request('GET', '/articles/3/adjacent');
      assert.equal(last.body.data.prev.id, 2);
      assert.equal(last.body.data.next, null);

      // A summary row, not the whole article: the pair is two links.
      assert.ok(!('content' in middle.body.data.prev));
      assert.equal(typeof middle.body.data.prev.title, 'string');
    });
  });

  it('narrows the pool to one category, and never reaches a draft', async () => {
    const seed = seedWith({
      articles: (articles) => {
        articles[1].categoryId = articles[0].categoryId;
        articles[2].categoryId = articles[0].categoryId;
        articles[2].status = 'draft';
      },
    });

    await withServer({ seed }, async ({ request }) => {
      const within = await request('GET', '/articles/2/adjacent?categoryId=3');
      assert.equal(within.body.data.prev.id, 1, 'the piece before it in the same category');
      assert.equal(within.body.data.next, null, 'the draft after it is not published');

      const elsewhere = await request('GET', '/articles/1/adjacent?categoryId=4');
      assert.equal(elsewhere.body.data.prev, null);
      assert.equal(elsewhere.body.data.next, null);
    });
  });

  it('is a 404 for an unknown id and for an article nobody may read', async () => {
    const seed = seedWith({ articles: (articles) => void (articles[0].status = 'draft') });

    await withServer({ seed }, async ({ request }) => {
      assert.equal((await request('GET', '/articles/9999/adjacent')).status, 404);
      assert.equal((await request('GET', '/articles/1/adjacent')).status, 404);
    });
  });
});

describe('preview tokens', () => {
  it('opens a draft for the holder and nobody else', async () => {
    resetPreviewTokens();
    const seed = seedWith({ articles: (articles) => void (articles[0].status = 'draft') });

    await withServer({ seed }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const slug = 'karnataka-rera-guide-for-homebuyers';

      assert.equal((await request('GET', `/articles/slug/${slug}`)).status, 404);

      const issued = await request('GET', '/admin/articles/1/preview-token', { token });
      assert.match(issued.body.data.url, /\/insights\/articles\/.+\?preview=/);

      const preview = await request(
        'GET',
        `/articles/slug/${slug}?preview=${issued.body.data.token}`
      );
      assert.equal(preview.status, 200);

      const wrong = await request('GET', `/articles/slug/${slug}?preview=not-a-real-token`);
      assert.equal(wrong.status, 404);
    });
  });
});

describe('admin articles', () => {
  const ARTICLE = {
    title: 'A Practical Guide to Buying a Plot in Bengaluru',
    excerpt: 'What to check before you pay a token advance.',
    content: '<h2>Approvals</h2><p>Start with the approving authority and the khata.</p>',
    categoryId: 1,
    authorId: 1,
    status: 'draft',
  };

  /** Everything going live needs (`src/config/articleRules.js`): an image and 300 words. */
  const READY = {
    ...ARTICLE,
    content: `<h2>Approvals</h2>${'<p>Start with the approving authority, then the khata, then the tax receipts and the encumbrance certificate.</p>'.repeat(20)}`,
    featuredImage: { url: 'https://example.com/plot.jpg', alt: 'A fenced plot', caption: null },
  };

  it('derives the plain text, the word count and the reading time on save', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const created = await request('POST', '/admin/articles', { token, body: ARTICLE });

      assert.equal(created.status, 201);
      assert.equal(
        created.body.data.contentText,
        'Approvals Start with the approving authority and the khata.'
      );
      assert.equal(created.body.data.wordCount, 9);
      assert.equal(created.body.data.readingTimeMinutes, 1, 'never below one minute');
      assert.equal(created.body.data.slug, created.body.data.seo.slug, 'seo.slug mirrors the slug');
      assert.equal(created.body.data.publishedAt, null, 'a draft has no publication date');
    });
  });

  it('sets publishedAt the first time an article goes live and keeps it after', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const created = await request('POST', '/admin/articles', { token, body: READY });
      const id = created.body.data.id;

      const published = await request('PATCH', `/admin/articles/${id}`, {
        token,
        body: { status: 'published' },
      });
      const first = published.body.data.publishedAt;
      assert.ok(first, 'publishing sets the date');

      await request('PATCH', `/admin/articles/${id}`, { token, body: { status: 'draft' } });
      const again = await request('PATCH', `/admin/articles/${id}`, {
        token,
        body: { status: 'published' },
      });
      assert.equal(again.body.data.publishedAt, first, 'and never moves it');
    });
  });

  it('refuses a scheduled article without a future moment', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const past = await request('POST', '/admin/articles', {
        token,
        body: { ...READY, status: 'scheduled', publishedAt: fromNow(-60) },
      });
      assert.equal(past.status, 422);
      assert.deepEqual(Object.keys(past.body.errors), ['publishedAt']);

      const future = await request('POST', '/admin/articles', {
        token,
        body: { ...READY, status: 'scheduled', publishedAt: fromNow(60) },
      });
      assert.equal(future.status, 201);
    });
  });

  it('refuses to put an article live without an excerpt, an image and 300 words (QA-55)', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const thin = await request('POST', '/admin/articles', {
        token,
        body: { ...ARTICLE, excerpt: '', status: 'published' },
      });
      assert.equal(thin.status, 422);
      assert.deepEqual(Object.keys(thin.body.errors).sort(), [
        'content',
        'excerpt',
        'featuredImage.url',
      ]);
      assert.match(thin.body.errors.content[0], /at least 300 words .* this one has 9/);

      // The same draft may be saved as a draft, and a PATCH that only makes it
      // live is asked the rules again.
      const draft = await request('POST', '/admin/articles', { token, body: ARTICLE });
      assert.equal(draft.status, 201);
      const promoted = await request('PATCH', `/admin/articles/${draft.body.data.id}`, {
        token,
        body: { status: 'scheduled', publishedAt: fromNow(60) },
      });
      assert.equal(promoted.status, 422);
      assert.ok(promoted.body.errors['featuredImage.url']);

      const ready = await request('POST', '/admin/articles', {
        token,
        body: { ...READY, status: 'published' },
      });
      assert.equal(ready.status, 201);
    });
  });

  it('does not ask the publish rules of a PATCH that leaves them alone', async () => {
    // A live article from before the rules — the only way one can be thin now.
    const seed = seedWith({
      articles: (articles) => {
        articles[0].featuredImage = null;
      },
    });

    await withServer({ seed }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const featured = await request('PATCH', '/admin/articles/1', {
        token,
        body: { isFeatured: false },
      });
      assert.equal(featured.status, 200);
    });
  });

  it('refuses a published article dated in the future (QA-55)', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const future = await request('POST', '/admin/articles', {
        token,
        body: { ...READY, status: 'published', publishedAt: fromNow(60 * 24) },
      });
      assert.equal(future.status, 422);
      assert.match(future.body.errors.publishedAt[0], /schedule it instead/);
    });
  });

  it('refuses ids that name nothing, and an article related to itself (QA-55)', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const dangling = await request('POST', '/admin/articles', {
        token,
        body: {
          ...ARTICLE,
          categoryId: 999,
          authorId: 999,
          tagIds: [1, 999],
          relatedArticleIds: [999],
          relatedPropertyIds: [99999],
        },
      });
      assert.equal(dangling.status, 422);
      assert.deepEqual(Object.keys(dangling.body.errors).sort(), [
        'authorId',
        'categoryId',
        'relatedArticleIds.0',
        'relatedPropertyIds.0',
        'tagIds.1',
      ]);

      const itself = await request('PATCH', '/admin/articles/2', {
        token,
        body: { relatedArticleIds: [1, 2] },
      });
      assert.equal(itself.status, 422);
      assert.deepEqual(itself.body.errors['relatedArticleIds.1'], [
        'An article cannot be related to itself.',
      ]);

      // A PATCH is asked only about what it sends.
      const unrelated = await request('PATCH', '/admin/articles/2', {
        token,
        body: { isFeatured: false },
      });
      assert.equal(unrelated.status, 200);
    });
  });

  it('refuses a body or an answer that carries a script, a handler or a javascript: link', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      for (const content of [
        '<p>One</p><script>alert(1)</script>',
        '<p>One <img src="x.png" alt="" onerror="alert(1)"></p>',
        '<p><a href=" java\tscript:alert(1)">One</a></p>',
        // Entities a browser decodes before it reads the scheme.
        '<p><a href="&#106;avascript&colon;alert(1)">One</a></p>',
        '<p><a href="&#x6A;ava&#x09;script:alert(1)">One</a></p>',
      ]) {
        const refused = await request('POST', '/admin/articles', {
          token,
          body: { ...ARTICLE, content },
        });
        assert.equal(refused.status, 422, content);
        assert.ok(refused.body.errors.content, content);
      }

      const answer = await request('POST', '/admin/articles', {
        token,
        body: {
          ...ARTICLE,
          faqs: [{ question: 'Is it safe?', answer: '<p onclick="x()">Yes</p>' }],
        },
      });
      assert.equal(answer.status, 422);
      assert.ok(answer.body.errors['faqs.0.answer']);

      // Prose and attribute values that merely read like one are prose.
      const innocent = await request('POST', '/admin/articles', {
        token,
        body: {
          ...ARTICLE,
          content:
            '<p>The onboarding = two visits.</p><figure><img src="https://example.com/a.png" alt="walk onward=fast"></figure><p><a href="https://example.com/javascript:guide">Guide</a></p>',
        },
      });
      assert.equal(innocent.status, 201);
    });
  });

  it('writes nothing for a save that changes nothing (QA-55)', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const created = await request('POST', '/admin/articles', { token, body: ARTICLE });
      const { id, updatedAt } = created.body.data;

      await new Promise((resolve) => setTimeout(resolve, 5));
      const same = await request('PUT', `/admin/articles/${id}`, { token, body: ARTICLE });
      assert.equal(same.status, 200);
      assert.equal(same.body.data.updatedAt, updatedAt);

      const renamed = await request('PUT', `/admin/articles/${id}`, {
        token,
        body: { ...ARTICLE, title: `${ARTICLE.title} Again` },
      });
      assert.notEqual(renamed.body.data.updatedAt, updatedAt);
    });
  });

  it('sorts the articles with no publication date last, newest first or oldest (QA-55)', async () => {
    const seed = seedWith({
      articles: (articles) => {
        articles[1].status = 'draft';
        articles[1].publishedAt = null;
      },
    });

    await withServer({ seed }, async ({ request, login }) => {
      const token = await login(ADMIN);
      for (const order of ['desc', 'asc']) {
        const list = await request('GET', `/admin/articles?sort=publishedAt&order=${order}`, {
          token,
        });
        assert.equal(ids(list).at(-1), 2, `the draft sorts last (${order})`);
      }
    });
  });

  it('bulk-publishes, archives and features', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const archived = await request('POST', '/admin/articles/bulk', {
        token,
        body: { ids: [1], action: 'archive' },
      });
      assert.equal(archived.body.data.affected, 1);
      assert.equal(
        (await request('GET', '/admin/articles/1', { token })).body.data.status,
        'archived'
      );
      assert.equal(
        (await request('GET', '/articles/slug/karnataka-rera-guide-for-homebuyers')).status,
        404
      );

      const featured = await request('POST', '/admin/articles/bulk', {
        token,
        body: { ids: [2], action: 'unfeature' },
      });
      assert.equal(featured.body.data.affected, 1);

      const nonsense = await request('POST', '/admin/articles/bulk', {
        token,
        body: { ids: [1], action: 'verify' },
      });
      assert.equal(nonsense.status, 422, 'an action this resource has no meaning for');
    });
  });

  it('bulk-publishes a scheduled article now, and refuses a batch with one not ready (QA-55)', async () => {
    const seed = seedWith({
      articles: (articles) => {
        articles[0].status = 'scheduled';
        articles[0].publishedAt = fromNow(60 * 24);
      },
    });

    await withServer({ seed }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const thin = (await request('POST', '/admin/articles', { token, body: ARTICLE })).body.data;

      const refused = await request('POST', '/admin/articles/bulk', {
        token,
        body: { ids: [1, thin.id], action: 'publish' },
      });
      assert.equal(refused.status, 422);
      assert.deepEqual(
        refused.body.data.notReady.map((row) => [row.id, row.gaps]),
        [[thin.id, ['no featured image', '9 of 300 words']]]
      );
      assert.equal(
        (await request('GET', '/admin/articles/1', { token })).body.data.status,
        'scheduled',
        'all or nothing: the ready one waits for the batch'
      );

      const published = await request('POST', '/admin/articles/bulk', {
        token,
        body: { ids: [1], action: 'publish' },
      });
      assert.equal(published.body.data.affected, 1);
      const article = (await request('GET', '/admin/articles/1', { token })).body.data;
      assert.equal(article.status, 'published');
      assert.ok(Date.parse(article.publishedAt) <= Date.now(), 'published now, not next week');
      assert.equal((await request('GET', `/articles/slug/${article.slug}`)).status, 200);

      const again = await request('POST', '/admin/articles/bulk', {
        token,
        body: { ids: [1], action: 'publish' },
      });
      assert.equal(again.body.data.affected, 0, 'an article already live does not change');
      assert.equal(again.body.message, '0 articles updated.');
    });
  });
});

/* ------------------------------------------------------------------ *
 * Master data
 * ------------------------------------------------------------------ */

describe('master data', () => {
  it('counts only active properties in a locality', async () => {
    await withServer(async ({ request, login }) => {
      const before = await request('GET', '/localities/slug/whitefield');
      assert.ok(before.body.data.propertyCount >= 1);
      assert.ok(before.body.data.city, 'the city is embedded');

      const token = await login(ADMIN);
      await request('PATCH', '/admin/properties/1', { token, body: { isActive: false } });

      const after = await request('GET', '/localities/slug/whitefield');
      assert.equal(after.body.data.propertyCount, before.body.data.propertyCount - 1);
    });
  });

  it('refuses to delete a locality in use and allows it once nothing points at it', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const refused = await request('DELETE', '/admin/localities/1', { token });
      assert.equal(refused.status, 409);
      assert.match(refused.body.errors.id[0], /^Used by/);
      assert.ok(refused.body.data.usedBy.some((usage) => usage.type === 'property'));

      // Move everything off the locality; then it is nobody's dependency.
      for (const property of refused.body.data.usedBy.filter((row) => row.type === 'property')) {
        await request('PATCH', `/admin/properties/${property.id}`, {
          token,
          body: { location: { localityId: 2 } },
        });
      }
      for (const lead of refused.body.data.usedBy.filter((row) => row.type === 'lead')) {
        await request('PATCH', `/admin/leads/${lead.id}`, {
          token,
          body: { requirement: { localityId: null } },
        });
      }

      assert.equal((await request('DELETE', '/admin/localities/1', { token })).status, 200);
    });
  });

  it('counts the listings that carry an amenity, a badge and a property type', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const amenity = await request('GET', '/admin/amenities/1', { token });
      const badge = await request('GET', '/admin/badges/1', { token });
      const type = await request('GET', '/admin/property-types/1', { token });

      for (const answer of [amenity, badge, type]) {
        assert.equal(typeof answer.body.data.propertyCount, 'number');
      }
      assert.ok(amenity.body.data.propertyCount >= 1, 'the seed puts amenity 1 on a listing');

      // Only live listings count: hiding one takes it off every counter.
      await request('PATCH', '/admin/properties/1', { token, body: { isActive: false } });

      const after = await request('GET', '/admin/amenities/1', { token });
      assert.equal(after.body.data.propertyCount, amenity.body.data.propertyCount - 1);
    });
  });

  it('reports what a delete would refuse over, on request (`withUsage`)', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const quiet = await request('GET', '/admin/property-types/1', { token });
      assert.ok(!('usedBy' in quiet.body.data), 'the usage list is opt-in');

      const asked = await request('GET', '/admin/property-types/1?withUsage=true', { token });
      assert.ok(Array.isArray(asked.body.data.usedBy));
      assert.ok(asked.body.data.usedBy.some((usage) => usage.type === 'property'));

      // The same answer the 409 of a delete would have carried.
      const refused = await request('DELETE', '/admin/property-types/1', { token });
      assert.equal(refused.status, 409);
      assert.deepEqual(refused.body.data.usedBy, asked.body.data.usedBy);

      // A resource nothing can depend on has nothing to report.
      const bank = await request('GET', '/admin/banks/1?withUsage=true', { token });
      assert.ok(!('usedBy' in bank.body.data));
    });
  });

  it('deletes a bank without complaint — nothing depends on one', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      assert.equal((await request('DELETE', '/admin/banks/1', { token })).status, 200);
    });
  });

  it('never exposes an author e-mail publicly', async () => {
    const seed = seedWith({
      authors: (authors) => void (authors[0].email = 'editor@squaresnacres.com'),
    });

    await withServer({ seed }, async ({ request, login }) => {
      const list = await request('GET', '/authors?perPage=all');
      assert.ok(list.body.data.every((author) => !('email' in author)));

      const one = await request('GET', '/authors/slug/editorial-team');
      assert.ok(!('email' in one.body.data));

      const token = await login(ADMIN);
      const admin = await request('GET', '/admin/authors/1', { token });
      assert.equal(admin.body.data.email, 'editor@squaresnacres.com');
    });
  });

  it('applies the documented filters and sorts', async () => {
    await withServer(async ({ request }) => {
      const east = await request('GET', '/localities?zone=east&perPage=all');
      assert.ok(east.body.data.every((locality) => locality.zone === 'east'));

      const commercial = await request('GET', '/property-types?segment=commercial&perPage=all');
      assert.ok(commercial.body.data.every((type) => type.segment === 'commercial'));

      const onHome = await request('GET', '/faqs?showOnHome=true&perPage=all');
      assert.ok(onHome.body.data.every((faq) => faq.showOnHome === true));

      const counted = await request('GET', '/article-categories?perPage=all');
      assert.ok(counted.body.data.every((category) => typeof category.articleCount === 'number'));
    });
  });

  it('generates and de-duplicates slugs, and reports a taken one', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      // A city lists a locality once (QA-60), and a slug is unique across
      // cities: a Whitefield of another city is the one that needs the `-2`.
      const city = await request('POST', '/admin/cities', {
        token,
        body: { name: 'Mysuru', state: 'Karnataka' },
      });
      const created = await request('POST', '/admin/localities', {
        token,
        body: { name: 'Whitefield', cityId: city.body.data.id },
      });
      assert.equal(created.body.data.slug, 'whitefield-2');

      const taken = await request('POST', '/admin/localities', {
        token,
        body: { name: 'Another', slug: 'whitefield', cityId: 1 },
      });
      assert.equal(taken.status, 409);

      const check = await request('GET', '/admin/localities/check-slug?slug=whitefield', { token });
      assert.deepEqual(check.body.data, { available: false, suggestion: 'whitefield-3' });
    });
  });

  describe('an `order` PATCH', () => {
    /** The eight seeded FAQs plus two more in the `legal` category (ids 9, 10). */
    const withThreeLegalFaqs = () =>
      seedWith({
        faqs: (rows) => {
          rows.push(
            {
              id: 9,
              question: 'Who pays the stamp duty on a sale deed?',
              answer: '<p>The buyer does, unless the agreement says otherwise.</p>',
              category: 'legal',
              order: 9,
              isActive: true,
              showOnHome: false,
              propertyTypeId: null,
              createdAt: '2026-04-09T07:10:00.000Z',
              updatedAt: '2026-04-09T07:10:00.000Z',
            },
            {
              id: 10,
              question: 'What is an encumbrance certificate for?',
              answer: '<p>It lists the charges registered against a property.</p>',
              category: 'legal',
              order: 10,
              isActive: true,
              showOnHome: false,
              propertyTypeId: null,
              createdAt: '2026-04-09T07:10:00.000Z',
              updatedAt: '2026-04-09T07:10:00.000Z',
            }
          );
        },
      });

    /** The ids of a collection, in the order the API returns them. */
    const orderedIds = async (request, token, query) => {
      const list = await request('GET', `/admin/faqs?perPage=all&sort=order${query ?? ''}`, {
        token,
      });
      return list.body.data.map((faq) => faq.id);
    };

    it('renumbers the whole collection 1..n', async () => {
      await withServer({ seed: withThreeLegalFaqs() }, async ({ request, login }) => {
        const token = await login(ADMIN);

        // Position 3 is where the third FAQ already is: nothing else moves.
        const patched = await request('PATCH', '/admin/faqs/3', { token, body: { order: 3 } });
        assert.equal(patched.status, 200);

        const list = await request('GET', '/admin/faqs?perPage=all&sort=order', { token });
        assert.deepEqual(
          list.body.data.map((faq) => faq.order),
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        );
      });
    });

    it('moves a row up within a filtered view and keeps the collection consistent', async () => {
      await withServer({ seed: withThreeLegalFaqs() }, async ({ request, login }) => {
        const token = await login(ADMIN);

        // Filtered to `legal` the editor sees 6, 9, 10 and drags the second to
        // the top: one PATCH, carrying the position of the row it landed on.
        assert.deepEqual(await orderedIds(request, token, '&category=legal'), [6, 9, 10]);
        await request('PATCH', '/admin/faqs/9', { token, body: { order: 6 } });

        assert.deepEqual(await orderedIds(request, token, '&category=legal'), [9, 6, 10]);
        // Everything the filter hid kept its place, and the numbering is dense.
        assert.deepEqual(await orderedIds(request, token), [1, 2, 3, 4, 5, 9, 6, 7, 8, 10]);

        const all = await request('GET', '/admin/faqs?perPage=all&sort=order', { token });
        assert.deepEqual(
          all.body.data.map((faq) => faq.order),
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        );
      });
    });

    it('moves a row down to the position after the one it landed on', async () => {
      await withServer({ seed: withThreeLegalFaqs() }, async ({ request, login }) => {
        const token = await login(ADMIN);

        // `legal` reads 6, 9, 10; the first is dragged past the last.
        await request('PATCH', '/admin/faqs/6', { token, body: { order: 11 } });

        assert.deepEqual(await orderedIds(request, token, '&category=legal'), [9, 10, 6]);
        assert.deepEqual(await orderedIds(request, token), [1, 2, 3, 4, 5, 7, 8, 9, 10, 6]);
      });
    });

    it('leaves the collection alone when a PATCH does not mention the order', async () => {
      await withServer({ seed: withThreeLegalFaqs() }, async ({ request, login }) => {
        const token = await login(ADMIN);

        await request('PATCH', '/admin/faqs/9', { token, body: { showOnHome: true } });

        assert.deepEqual(await orderedIds(request, token), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      });
    });

    it('keeps an untouched tie in the order the list shows it (QA-59)', async () => {
      // Three FAQs share 0 — what every create used to store — and the list
      // reads them by question: 9 ("Who pays…"), 10 ("What is…") → 10, 9.
      const seed = seedWith({
        faqs: (rows) => {
          rows.forEach((faq) => void (faq.order += 1));
          rows[0].order = 0;
          rows[0].question = 'Zeta question, first stored';
          rows[1].order = 0;
          rows[1].question = 'Alpha question, second stored';
          rows[2].order = 0;
          rows[2].question = 'Mid question, third stored';
          rows[2].updatedAt = '2026-09-01T00:00:00.000Z';
        },
      });

      await withServer({ seed }, async ({ request, login }) => {
        const token = await login(ADMIN);
        assert.deepEqual((await orderedIds(request, token)).slice(0, 4), [2, 3, 1, 4]);

        // The fourth row is moved up one, onto the third ("Zeta", order 0),
        // by the number alone: it lands first of the tie it joined, and the
        // tie keeps its own order — the newest `updatedAt` (3) no longer
        // jumps ahead of 2.
        await request('PATCH', '/admin/faqs/4', { token, body: { order: 0 } });
        assert.deepEqual((await orderedIds(request, token)).slice(0, 4), [4, 2, 3, 1]);
      });
    });

    it('places a moved row by the neighbour it names, whatever the numbers say (QA-59)', async () => {
      const seed = seedWith({
        faqs: (rows) => {
          rows.forEach((faq) => void (faq.order += 1));
          rows[0].order = 0;
          rows[0].question = 'Zeta question, first stored';
          rows[1].order = 0;
          rows[1].question = 'Alpha question, second stored';
          rows[2].order = 0;
          rows[2].question = 'Mid question, third stored';
        },
      });

      await withServer({ seed }, async ({ request, login }) => {
        const token = await login(ADMIN);
        assert.deepEqual((await orderedIds(request, token)).slice(0, 4), [2, 3, 1, 4]);

        // The same move, saying where it was dropped: just before "Zeta" (1).
        const moved = await request('PATCH', '/admin/faqs/4', {
          token,
          body: { order: 0, before: 1 },
        });
        assert.equal(moved.status, 200);
        assert.deepEqual((await orderedIds(request, token)).slice(0, 4), [2, 3, 4, 1]);

        // A second move sent with the numbers of before the first — "after
        // Alpha (2), which held 0" — still lands just after Alpha.
        await request('PATCH', '/admin/faqs/1', { token, body: { order: 1, after: 2 } });
        assert.deepEqual((await orderedIds(request, token)).slice(0, 4), [2, 1, 3, 4]);

        const all = await request('GET', '/admin/faqs?perPage=all&sort=order', { token });
        assert.deepEqual(
          all.body.data.map((faq) => faq.order),
          [1, 2, 3, 4, 5, 6, 7, 8]
        );

        // A neighbour that no longer exists is no neighbour: the number decides.
        await request('PATCH', '/admin/faqs/8', { token, body: { order: 1, before: 999 } });
        assert.equal((await orderedIds(request, token))[0], 8);
      });
    });

    it('places a row by its neighbour among records that share a number', async () => {
      // Two testimonials stored at 0 before their collection settled on
      // create — a database from before QA-59 — are tied, and read by name.
      const seed = seedWith({
        testimonials: (rows) => {
          rows.push(
            { ...rows[0], id: 11, name: 'Bravo Client', order: 0 },
            { ...rows[0], id: 12, name: 'Alpha Client', order: 0 }
          );
        },
      });

      await withServer({ seed }, async ({ request, login }) => {
        const token = await login(ADMIN);
        const list = async () =>
          (
            await request('GET', '/admin/testimonials?perPage=all&sort=order', { token })
          ).body.data.map((row) => row.id);
        const [first, second, third] = await list();
        assert.deepEqual([first, second], [12, 11]);

        // The third row is dropped between the two: after Alpha. By number
        // alone it could only land before both or after both.
        await request('PATCH', `/admin/testimonials/${third}`, {
          token,
          body: { order: 1, after: 12 },
        });
        assert.deepEqual((await list()).slice(0, 3), [12, third, 11]);
      });
    });

    it('settles a tie when the position sent is the record’s own (QA-59)', async () => {
      const seed = seedWith({
        faqs: (rows) => {
          // FAQ 2 shares 1 with FAQ 1, and lists before it: "Do you…" < "How do…".
          rows[1].order = 1;
        },
      });

      await withServer({ seed }, async ({ request, login }) => {
        const token = await login(ADMIN);
        assert.deepEqual((await orderedIds(request, token)).slice(0, 2), [2, 1]);

        // FAQ 1 is dragged above FAQ 2: `order = 1`, which it already holds.
        const moved = await request('PATCH', '/admin/faqs/1', { token, body: { order: 1 } });
        assert.equal(moved.status, 200);
        assert.equal(moved.body.data.order, 1);

        assert.deepEqual((await orderedIds(request, token)).slice(0, 2), [1, 2]);
        const all = await request('GET', '/admin/faqs?perPage=all&sort=order', { token });
        assert.deepEqual(
          all.body.data.map((faq) => faq.order),
          [1, 2, 3, 4, 5, 6, 7, 8]
        );
      });
    });
  });
});

describe('master-data writes (QA-60)', () => {
  it('gives a name with no Latin letter or digit a slug of its own', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      // "!!" and "北京 नगर" make no slug at all. They were stored as '' — both
      // of them — and neither had a page.
      const first = await request('POST', '/admin/localities', {
        token,
        body: { name: '!!', cityId: 1 },
      });
      const second = await request('POST', '/admin/localities', {
        token,
        body: { name: '北京 नगर', cityId: 1 },
      });
      assert.equal(first.status, 201);
      assert.equal(second.status, 201);
      assert.equal(first.body.data.slug, `locality-${first.body.data.id}`);
      assert.equal(second.body.data.slug, `locality-${second.body.data.id}`);
      assert.equal(first.body.data.seo.slug, first.body.data.slug, 'D34: one URL');

      // A replace that asks for a derived slug again keeps the one it has.
      const replaced = await request('PUT', `/admin/localities/${first.body.data.id}`, {
        token,
        body: { name: '@@', cityId: 1, slug: '' },
      });
      assert.equal(replaced.status, 200);
      assert.equal(replaced.body.data.slug, first.body.data.slug);

      // Every slugged collection of the router does the same.
      const type = await request('POST', '/admin/property-types', {
        token,
        body: { name: '★★', segment: 'residential', icon: 'mdi:star' },
      });
      assert.equal(type.status, 201);
      assert.equal(type.body.data.slug, `property-type-${type.body.data.id}`);
    });
  });

  it('stores the text a form sends without the spaces around it', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const city = await request('POST', '/admin/cities', {
        token,
        body: { name: '  Mysuru  ', state: ' Karnataka ' },
      });
      assert.equal(city.status, 201);
      assert.equal(city.body.data.name, 'Mysuru');
      assert.equal(city.body.data.state, 'Karnataka');
      assert.equal(city.body.data.slug, 'mysuru');

      // It sorts where its name says, not above every other city.
      const cities = await request('GET', '/admin/cities?perPage=all&sort=name', { token });
      assert.deepEqual(
        cities.body.data.map((row) => row.name),
        ['Bengaluru', 'Mysuru']
      );

      // Inside lists and rows too: a locality's highlights and connectivity.
      const locality = await request('POST', '/admin/localities', {
        token,
        body: {
          name: ' Hoskote ',
          cityId: 1,
          highlights: ['  Near the airport road  '],
          connectivity: [{ label: ' Metro ', value: ' 3 km ' }],
          priceTrendNote: ' Indicative ',
        },
      });
      assert.equal(locality.status, 201);
      assert.equal(locality.body.data.name, 'Hoskote');
      assert.deepEqual(locality.body.data.highlights, ['Near the airport road']);
      assert.deepEqual(locality.body.data.connectivity, [{ label: 'Metro', value: '3 km' }]);
      assert.equal(locality.body.data.priceTrendNote, 'Indicative');

      // Trimmed first, then checked: " A " is one character.
      const short = await request('POST', '/admin/badges', {
        token,
        body: { name: ' A ', color: 'info' },
      });
      assert.equal(short.status, 422);
      assert.ok(short.body.errors.name);

      // A patch is trimmed as well.
      const patched = await request('PATCH', `/admin/cities/${city.body.data.id}`, {
        token,
        body: { state: '  Karnataka State  ' },
      });
      assert.equal(patched.body.data.state, 'Karnataka State');
    });
  });

  it('lists a locality once in its city', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      // Whitefield (1) is in Bengaluru (1) already — in any case or spacing.
      for (const name of ['Whitefield', '  whitefield ', 'WHITE  FIELD'.replace('  ', '')]) {
        const twin = await request('POST', '/admin/localities', {
          token,
          body: { name, cityId: 1 },
        });
        assert.equal(twin.status, 422, name);
        assert.deepEqual(twin.body.errors.name, ['This locality is already in Bengaluru.']);
      }

      // Another city may have one of the same name.
      const city = await request('POST', '/admin/cities', {
        token,
        body: { name: 'Mysuru', state: 'Karnataka' },
      });
      const elsewhere = await request('POST', '/admin/localities', {
        token,
        body: { name: 'Whitefield', cityId: city.body.data.id },
      });
      assert.equal(elsewhere.status, 201);

      // Renaming into a twin is refused; a record keeps its own name, and a
      // write that leaves the name alone is not asked.
      const renamed = await request('PATCH', '/admin/localities/2', {
        token,
        body: { name: 'whitefield' },
      });
      assert.equal(renamed.status, 422);
      const own = await request('PATCH', '/admin/localities/1', {
        token,
        body: { name: 'Whitefield' },
      });
      assert.equal(own.status, 200);
      const moved = await request('PATCH', `/admin/localities/${elsewhere.body.data.id}`, {
        token,
        body: { cityId: 1 },
      });
      assert.equal(moved.status, 422, 'moving it into a city that has one');
      const off = await request('PATCH', '/admin/localities/2', {
        token,
        body: { isActive: false },
      });
      assert.equal(off.status, 200);
    });
  });

  it('groups amenities by category in the order the site does', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const categories = async (query) => {
        const { body } = await request('GET', `/admin/amenities?perPage=all&${query}`, { token });
        return [...new Set(body.data.map((row) => row.category))];
      };

      // Basic, Lifestyle, Safety… — the order of the property form and of a
      // listing page. By the alphabet, Commercial came second.
      const expected = [
        'basic',
        'lifestyle',
        'safety',
        'sports',
        'kids',
        'eco',
        'convenience',
        'commercial',
      ];
      assert.deepEqual(await categories('sort=category'), expected);
      assert.deepEqual(await categories('sort=category&order=desc'), [...expected].reverse());

      // Inside a category, the amenities keep their order; the rows come back
      // exactly as stored, with no rank added to them.
      const { body } = await request('GET', '/admin/amenities?perPage=all&sort=category', {
        token,
      });
      const lifestyle = body.data.filter((row) => row.category === 'lifestyle');
      assert.deepEqual(
        lifestyle.map((row) => row.order),
        [...lifestyle.map((row) => row.order)].sort((a, b) => a - b)
      );
      assert.ok(body.data.every((row) => typeof row.category === 'string'));
    });
  });
});

describe('FAQs (QA-59)', () => {
  const answer = '<p>An answer that is comfortably long enough to be one.</p>';
  const faq = (fields = {}) => ({
    question: 'How long does a registration take in Bengaluru?',
    answer,
    category: 'legal',
    ...fields,
  });

  const orders = async (request, token) =>
    (await request('GET', '/admin/faqs?perPage=all&sort=order', { token })).body.data.map((row) => [
      row.id,
      row.order,
    ]);

  it('places a new FAQ at the position it names, and no two FAQs share a number', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      // The form's default, 0: first, with everything else one place down.
      const first = await request('POST', '/admin/faqs', { token, body: faq({ order: 0 }) });
      assert.equal(first.status, 201);
      assert.equal(first.body.data.order, 1);

      // A second one at 0 is first in its turn — not tied with the first.
      const second = await request('POST', '/admin/faqs', {
        token,
        body: faq({ question: 'Is a sale agreement registered as well?', order: 0 }),
      });
      assert.equal(second.body.data.order, 1);

      // One at 3 is third.
      const third = await request('POST', '/admin/faqs', {
        token,
        body: faq({ question: 'Who keeps the original sale deed?', order: 3 }),
      });
      assert.equal(third.body.data.order, 3);

      const settled = await orders(request, token);
      assert.deepEqual(
        settled.map(([, order]) => order),
        Array.from({ length: 11 }, (_, index) => index + 1)
      );
      assert.deepEqual(
        settled.slice(0, 4).map(([id]) => id),
        [second.body.data.id, first.body.data.id, third.body.data.id, 1]
      );
    });
  });

  it('moves a FAQ to the position a replace names, and leaves it where it is otherwise', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const stored = (await request('GET', '/admin/faqs/7', { token })).body.data;
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...body } = stored;

      const moved = await request('PUT', '/admin/faqs/7', { token, body: { ...body, order: 2 } });
      assert.equal(moved.body.data.order, 2);
      assert.deepEqual(
        (await orders(request, token)).map(([id]) => id),
        [1, 7, 2, 3, 4, 5, 6, 8]
      );

      // Down, to 5: fifth. Tied with the FAQ holding 5 it came fourth — leaving
      // 2 had already moved that one up a place.
      const down = await request('PUT', '/admin/faqs/7', { token, body: { ...body, order: 5 } });
      assert.equal(down.body.data.order, 5);
      assert.deepEqual(
        (await orders(request, token)).map(([id]) => id),
        [1, 2, 3, 4, 7, 5, 6, 8]
      );

      // A replace that keeps the number touches nobody else.
      await request('PUT', '/admin/faqs/3', {
        token,
        body: {
          ...body,
          question: 'A reworded question about selling?',
          category: 'selling',
          order: 3,
        },
      });
      assert.deepEqual(
        (await orders(request, token)).map(([id]) => id),
        [1, 2, 3, 4, 7, 5, 6, 8]
      );
    });
  });

  it('refuses an answer with no words, and one that would run code', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      for (const empty of ['<p></p>', '<ul><li><p></p></li></ul>', '<h3> </h3><p>&nbsp;</p>']) {
        const refused = await request('POST', '/admin/faqs', {
          token,
          body: faq({ answer: empty }),
        });
        assert.equal(refused.status, 422, empty);
        assert.deepEqual(refused.body.errors.answer, ['The answer field is required.']);
      }

      for (const unsafe of [
        '<p>Fine words, then</p><script>alert(1)</script>',
        '<p>Fine words<img src="x" onerror="alert(1)"></p>',
        '<p><a href="java&#115;cript:alert(1)">more on this</a></p>',
      ]) {
        const refused = await request('POST', '/admin/faqs', {
          token,
          body: faq({ answer: unsafe }),
        });
        assert.equal(refused.status, 422, unsafe);
        assert.match(refused.body.errors.answer[0], /script/);
      }

      // A PATCH is held to the same rule for the answer it sends…
      const patched = await request('PATCH', '/admin/faqs/1', {
        token,
        body: { answer: '<ol><li></li></ol>' },
      });
      assert.equal(patched.status, 422);
      // …and not for the answer it does not.
      const toggled = await request('PATCH', '/admin/faqs/1', {
        token,
        body: { showOnHome: true },
      });
      assert.equal(toggled.status, 200);
    });
  });

  it('refuses a property type that does not exist', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const refused = await request('POST', '/admin/faqs', {
        token,
        body: faq({ propertyTypeId: 99999 }),
      });
      assert.equal(refused.status, 422);
      assert.ok(refused.body.errors.propertyTypeId);

      const tied = await request('POST', '/admin/faqs', {
        token,
        body: faq({ propertyTypeId: 1 }),
      });
      assert.equal(tied.status, 201);
      assert.equal(tied.body.data.propertyTypeId, 1);
    });
  });

  it('trims the question, and refuses one its category already asks', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const created = await request('POST', '/admin/faqs', {
        token,
        body: faq({ question: '   What should I check in a khata certificate?   ' }),
      });
      assert.equal(created.status, 201);
      assert.equal(created.body.data.question, 'What should I check in a khata certificate?');

      // The seeded legal question, in other capitals, spacing and without its "?".
      const twin = await request('POST', '/admin/faqs', {
        token,
        body: faq({ question: 'what should i check in the   TITLE documents' }),
      });
      assert.equal(twin.status, 422);
      assert.deepEqual(twin.body.errors.question, ['This question is already under Legal.']);

      // Another category may ask it.
      const elsewhere = await request('POST', '/admin/faqs', {
        token,
        body: faq({ question: 'What should I check in the title documents?', category: 'buying' }),
      });
      assert.equal(elsewhere.status, 201);

      // A record is never its own twin: saving FAQ 6 unchanged in words is fine.
      const own = (await request('GET', '/admin/faqs/6', { token })).body.data;
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...body } = own;
      const saved = await request('PUT', '/admin/faqs/6', {
        token,
        body: { ...body, showOnHome: true },
      });
      assert.equal(saved.status, 200);
    });
  });

  it('refuses a position past the ceiling', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const refused = await request('POST', '/admin/faqs', {
        token,
        body: faq({ order: 99999999999 }),
      });
      assert.equal(refused.status, 422);
      assert.ok(refused.body.errors.order);
    });
  });

  it('searches the words of an answer, not its markup', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      await request('POST', '/admin/faqs', {
        token,
        body: faq({
          question: 'Where can I read about stamp duty?',
          answer:
            '<p>Stamp duty &amp; registration are <strong>explained</strong> on the <a href="https://igr.karnataka.gov.in" target="_blank" rel="noopener">IGR site</a>.</p>',
        }),
      });

      const count = async (q) =>
        (await request('GET', `/admin/faqs?perPage=all&q=${encodeURIComponent(q)}`, { token })).body
          .meta.total;

      assert.equal(await count('<p'), 0);
      assert.equal(await count('href'), 0);
      assert.equal(await count('noopener'), 0);
      assert.equal(await count('strong'), 0);
      assert.equal(await count('duty & registration'), 1);
      assert.equal(await count('IGR site'), 1);
      // The public list reads the same way.
      assert.equal(
        (await request('GET', `/faqs?perPage=all&q=${encodeURIComponent('<p')}`)).body.meta.total,
        0
      );
    });
  });

  it('names every selected FAQ a bulk delete is refused over', async () => {
    const seed = seedWith({
      pages: (pages) => {
        pages[0].blocks.push({
          id: 999,
          type: 'faq',
          order: 99,
          data: { title: 'Questions', faqIds: [2, 5], items: [] },
        });
      },
    });

    await withServer({ seed }, async ({ request, login }) => {
      const token = await login(ADMIN);

      const refused = await request('POST', '/admin/faqs/bulk', {
        token,
        body: { ids: [1, 2, 5], action: 'delete' },
      });
      assert.equal(refused.status, 409);
      assert.equal(
        refused.body.message,
        '2 of the selected FAQs are still in use, so none was deleted.'
      );
      assert.deepEqual(
        refused.body.data.refused.map((entry) => entry.id),
        [2, 5]
      );
      assert.equal(refused.body.data.refused[0].label, 'Do you charge buyers a fee?');
      assert.deepEqual(
        refused.body.data.usedBy.map((usage) => [usage.type, usage.id]),
        [['page', 1]]
      );

      // All or nothing: FAQ 1 is still there.
      assert.equal((await request('GET', '/admin/faqs/1', { token })).status, 200);

      // One selected is the single delete's answer.
      const alone = await request('POST', '/admin/faqs/bulk', {
        token,
        body: { ids: [2], action: 'delete' },
      });
      assert.equal(alone.status, 409);
      assert.equal(alone.body.message, 'This item is in use.');
    });
  });
});

describe('the other drag-ordered collections settle on write (QA-59)', () => {
  /**
   * Every master-data and content collection whose `order` the admin drags,
   * each with the least a create needs. Their forms create at 0, the default,
   * and until these settled every record added shared 0 with the last one.
   */
  const COLLECTIONS = [
    {
      path: 'testimonials',
      create: (name) => ({ name, message: 'A long enough quote from a happy client.', rating: 5 }),
    },
    { path: 'team', create: (name) => ({ name, designation: 'Property advisor' }) },
    {
      path: 'partners',
      create: (name) => ({ name, logoUrl: 'https://example.com/logo.png', category: 'bank' }),
    },
    { path: 'localities', create: (name) => ({ name, cityId: 1 }) },
    { path: 'segments', create: (name) => ({ name, kind: 'commercial' }) },
    {
      path: 'property-types',
      create: (name) => ({ name, segment: 'residential', icon: 'mdi:home-outline' }),
    },
    { path: 'amenities', create: (name) => ({ name, category: 'basic', icon: 'mdi:pool' }) },
    { path: 'badges', create: (name) => ({ name }) },
    { path: 'developers', create: (name) => ({ name }) },
    {
      path: 'banks',
      create: (name) => ({
        name,
        interestRateMin: 8.5,
        interestRateMax: 9.5,
        maxTenureYears: 30,
        maxLtvPercent: 80,
      }),
    },
    { path: 'article-categories', create: (name) => ({ name }) },
  ];

  /** A collection as `[id, order]` pairs, in the order the admin list reads it. */
  const listed = async (request, token, path) =>
    (await request('GET', `/admin/${path}?perPage=all&sort=order`, { token })).body.data.map(
      (row) => [row.id, row.order]
    );

  /** `ids` as the admin list should read them: each at its position, `1..n`. */
  const atPositions = (ids) => ids.map((id, index) => [id, index + 1]);

  describe('placeOrder', () => {
    const rows = (...entries) => entries.map(([id, order, name]) => ({ id, order, name }));
    /** `[id, order]` in the order the list reads. */
    const read = (list) =>
      [...list].sort((left, right) => left.order - right.order).map((row) => [row.id, row.order]);
    const place = (list, id) => placeOrder(list, id, { tieBreak: ['name'] });

    it('puts a record moved down at the position it names, not one short', () => {
      const list = rows([1, 1, 'A'], [2, 2, 'B'], [3, 3, 'C'], [4, 4, 'D']);
      list[0].order = 3;
      assert.equal(place(list, 1), true);
      assert.deepEqual(read(list), [
        [2, 1],
        [3, 2],
        [1, 3],
        [4, 4],
      ]);
    });

    it('puts a record moved up at the position it names', () => {
      const list = rows([1, 1, 'A'], [2, 2, 'B'], [3, 3, 'C'], [4, 4, 'D']);
      list[3].order = 2;
      place(list, 4);
      assert.deepEqual(read(list), [
        [1, 1],
        [4, 2],
        [2, 3],
        [3, 4],
      ]);
    });

    it('counts positions among records that share a number or skip one', () => {
      // A database from before QA-59: two at 0, read by name, and gaps.
      const list = rows([1, 0, 'Bravo'], [2, 0, 'Alpha'], [3, 5, 'C'], [4, 9, 'D'], [5, 3, 'New']);
      place(list, 5);
      assert.deepEqual(read(list), [
        [2, 1],
        [1, 2],
        [5, 3],
        [3, 4],
        [4, 5],
      ]);
    });

    it('reads 0 or no number as first and a number past the end as last', () => {
      const first = rows([1, 1, 'A'], [2, 2, 'B'], [3, 0, 'New']);
      place(first, 3);
      assert.deepEqual(read(first)[0], [3, 1]);

      const none = rows([1, 1, 'A'], [2, 2, 'B'], [3, undefined, 'New']);
      place(none, 3);
      assert.deepEqual(read(none)[0], [3, 1]);

      const last = rows([1, 1, 'A'], [2, 2, 'B'], [3, 99, 'New']);
      place(last, 3);
      assert.deepEqual(read(last).at(-1), [3, 3]);
    });

    it('answers false when every record already holds its position', () => {
      const list = rows([1, 1, 'A'], [2, 2, 'B'], [3, 3, 'C']);
      assert.equal(place(list, 2), false);
    });
  });

  for (const { path, create } of COLLECTIONS) {
    describe(`/admin/${path}`, () => {
      it('places a new record at the position it names, and no two share a number', async () => {
        await withServer(async ({ request, login }) => {
          const token = await login(ADMIN);
          const seeded = (await listed(request, token, path)).map(([id]) => id);
          const post = (name, order) =>
            request('POST', `/admin/${path}`, { token, body: { ...create(name), order } });

          // The form's default, 0: first, with everything else one place down.
          const first = await post('Settle Alpha', 0);
          assert.equal(first.status, 201);
          assert.equal(first.body.data.order, 1);

          // A second one at 0 is first in its turn — not tied with the first.
          const second = await post('Settle Bravo', 0);
          assert.equal(second.status, 201);
          assert.equal(second.body.data.order, 1);

          // One at 3 is third.
          const third = await post('Settle Charlie', 3);
          assert.equal(third.status, 201);
          assert.equal(third.body.data.order, 3);

          // The seeded rows follow in the order they had, and the numbers are
          // positions: nothing shared, nothing skipped.
          const settled = [second, first, third].map((response) => response.body.data.id);
          assert.deepEqual(
            await listed(request, token, path),
            atPositions([...settled, ...seeded])
          );

          // What a visitor is shown reads the same way.
          const visible = ids(await request('GET', `/${path}?perPage=all`));
          assert.deepEqual(visible.slice(0, 3), settled);
          assert.deepEqual(
            visible,
            [...settled, ...seeded].filter((id) => visible.includes(id))
          );
        });
      });

      it('moves a record to the position a replace names, down or up, and nothing otherwise', async () => {
        await withServer(async ({ request, login }) => {
          const token = await login(ADMIN);
          const seeded = (await listed(request, token, path)).map(([id]) => id);
          const [head, ...rest] = seeded;
          const {
            id: _id,
            createdAt: _createdAt,
            updatedAt: _updatedAt,
            ...stored
          } = (await request('GET', `/admin/${path}/${head}`, { token })).body.data;
          // The whole record, as an edit form sends it.
          const put = (fields) =>
            request('PUT', `/admin/${path}/${head}`, { token, body: { ...stored, ...fields } });

          // Down, from first to last: last — not one place short of it, where
          // a tie with the record holding that number left it — and the answer
          // carries the number the form reads back.
          const down = await put({ order: seeded.length });
          assert.equal(down.status, 200);
          assert.equal(down.body.data.order, seeded.length);
          assert.deepEqual(await listed(request, token, path), atPositions([...rest, head]));

          // Up again, to 1: first, and the rest where they were.
          const up = await put({ order: 1 });
          assert.equal(up.body.data.order, 1);
          assert.deepEqual(await listed(request, token, path), atPositions(seeded));

          // Saved again at the number it has, renamed: nobody moves.
          const renamed = await put({ name: `${stored.name} (renamed)`, order: 1 });
          assert.equal(renamed.status, 200);
          assert.equal(renamed.body.data.order, 1);
          assert.deepEqual(await listed(request, token, path), atPositions(seeded));
        });
      });
    });
  }
});

/* ------------------------------------------------------------------ *
 * Pages
 * ------------------------------------------------------------------ */

describe('segments', () => {
  /** A custom segment of the commercial kind, created through the API. */
  const industrial = async (request, token) =>
    (
      await request('POST', '/admin/segments', {
        token,
        body: { name: 'Industrial', kind: 'commercial' },
      })
    ).body.data;

  it('answers every segment publicly, the inactive ones flagged, with their counts', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const created = await industrial(request, token);
      assert.equal(created.slug, 'industrial');
      assert.equal(created.builtIn, false);

      await request('PATCH', `/admin/segments/${created.id}`, {
        token,
        body: { isActive: false },
      });

      const list = await request('GET', '/segments?perPage=all');
      const bySlug = Object.fromEntries(list.body.data.map((row) => [row.slug, row]));
      // A listing filed under a retired segment still needs its layout.
      assert.equal(bySlug.industrial.isActive, false);
      assert.equal(bySlug.residential.builtIn, true);
      assert.ok(bySlug.residential.propertyTypeCount > 0);
      assert.equal(typeof bySlug.commercial.propertyCount, 'number');

      const lands = await request('GET', '/segments?kind=land&perPage=all');
      assert.deepEqual(ids(lands), [3]);
    });
  });

  it("keeps a segment's slug, and a built-in segment's kind", async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const created = await industrial(request, token);

      // A PUT that leaves the slug out keeps it rather than deriving a new one.
      const renamed = await request('PUT', `/admin/segments/${created.id}`, {
        token,
        body: { name: 'Warehousing', kind: 'commercial', isActive: true, order: 4 },
      });
      assert.equal(renamed.status, 200);
      assert.equal(renamed.body.data.slug, 'industrial');

      const moved = await request('PATCH', `/admin/segments/${created.id}`, {
        token,
        body: { slug: 'warehousing' },
      });
      assert.equal(moved.status, 422);
      assert.ok(moved.body.errors.slug);

      // A custom segment may change its layout; a built-in one may not.
      const relaid = await request('PATCH', `/admin/segments/${created.id}`, {
        token,
        body: { kind: 'land' },
      });
      assert.equal(relaid.body.data.kind, 'land');

      const builtIn = await request('PATCH', '/admin/segments/2', {
        token,
        body: { kind: 'land' },
      });
      assert.equal(builtIn.status, 422);
      assert.ok(builtIn.body.errors.kind);

      const renamedBuiltIn = await request('PATCH', '/admin/segments/3', {
        token,
        body: { name: 'Land & Plots' },
      });
      assert.equal(renamedBuiltIn.body.data.slug, 'land');
    });
  });

  it('never deletes a built-in segment, alone or in a bulk delete', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const created = await industrial(request, token);

      const alone = await request('DELETE', '/admin/segments/1', { token });
      assert.equal(alone.status, 409);
      assert.deepEqual(alone.body.data.usedBy, []);

      // All or nothing: the custom segment in the same request survives too.
      const bulk = await request('POST', '/admin/segments/bulk', {
        token,
        body: { ids: [created.id, 1], action: 'delete' },
      });
      assert.equal(bulk.status, 409);
      const after = await request('GET', `/admin/segments/${created.id}`, { token });
      assert.equal(after.status, 200);
    });
  });

  it('refuses a segment nothing names, on a property type and on a listing', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const type = await request('POST', '/admin/property-types', {
        token,
        body: { name: 'Hangars', segment: 'aviation', icon: 'mdi:home' },
      });
      assert.equal(type.status, 422);
      assert.ok(type.body.errors.segment);

      const listing = await request('PATCH', '/admin/properties/1', {
        token,
        body: { segment: 'aviation' },
      });
      assert.equal(listing.status, 422);
      assert.ok(listing.body.errors.segment);

      await industrial(request, token);
      const filed = await request('PATCH', '/admin/properties/1', {
        token,
        body: { segment: 'industrial' },
      });
      assert.equal(filed.body.data.segment, 'industrial');
    });
  });

  it('refuses to delete a segment in use, naming the types and the listings', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const created = await industrial(request, token);

      const type = await request('POST', '/admin/property-types', {
        token,
        body: { name: 'Sheds', segment: 'industrial', icon: 'mdi:home' },
      });
      await request('PATCH', '/admin/properties/1', { token, body: { segment: 'industrial' } });

      const refused = await request('DELETE', `/admin/segments/${created.id}`, { token });
      assert.equal(refused.status, 409);
      assert.equal(refused.body.errors.id[0], 'Used by 1 property type and 1 property');

      await request('DELETE', `/admin/property-types/${type.body.data.id}`, { token });
      await request('PATCH', '/admin/properties/1', { token, body: { segment: 'residential' } });
      assert.equal(
        (await request('DELETE', `/admin/segments/${created.id}`, { token })).status,
        200
      );
    });
  });

  it('is master data: a manager writes it, a sales user may not read the admin list', async () => {
    await withServer(async ({ request, login }) => {
      const manager = await login(MANAGER);
      assert.equal((await industrial(request, manager)).kind, 'commercial');

      const sales = await login(SALES);
      assert.equal((await request('GET', '/admin/segments', { token: sales })).status, 403);
    });
  });
});

describe('pages', () => {
  const PAGE = {
    slug: 'smoke-cms-page',
    title: 'A Test Page',
    template: 'standard',
    status: 'draft',
    blocks: [
      { type: 'richText', order: 5, data: { html: '<p>Second.</p>' } },
      { type: 'hero', order: 1, data: { title: 'First' } },
    ],
  };

  it('assigns block ids and renumbers the order', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const created = await request('POST', '/admin/pages', { token, body: PAGE });

      assert.equal(created.status, 201);
      assert.deepEqual(
        created.body.data.blocks.map((block) => [block.type, block.order]),
        [
          ['hero', 1],
          ['richText', 2],
        ]
      );
      assert.ok(created.body.data.blocks.every((block) => Number.isInteger(block.id)));
    });
  });

  it('refuses a script tag in rich text or raw HTML', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const rejected = await request('POST', '/admin/pages', {
        token,
        body: {
          ...PAGE,
          blocks: [{ type: 'richText', order: 1, data: { html: '<script>alert(1)</script>' } }],
        },
      });

      assert.equal(rejected.status, 422);
      assert.ok(rejected.body.errors['blocks.0.data.html']);
    });
  });

  it('serves a published page by slug and hides a draft behind its token', async () => {
    resetPreviewTokens();

    await withServer(async ({ request, login }) => {
      assert.equal((await request('GET', '/pages/slug/about')).status, 200);

      const token = await login(ADMIN);
      const created = await request('POST', '/admin/pages', { token, body: PAGE });
      const id = created.body.data.id;

      assert.equal((await request('GET', `/pages/slug/${PAGE.slug}`)).status, 404);

      const issued = await request('GET', `/admin/pages/${id}/preview-token`, { token });
      const preview = await request(
        'GET',
        `/pages/slug/${PAGE.slug}?preview=${issued.body.data.token}`
      );
      assert.equal(preview.status, 200);

      const published = await request('POST', '/admin/pages/bulk', {
        token,
        body: { ids: [id], action: 'publish' },
      });
      assert.equal(published.body.data.affected, 1);
      assert.equal((await request('GET', `/pages/slug/${PAGE.slug}`)).status, 200);
    });
  });

  it('lists the header and footer pages with the six fields a link needs', async () => {
    await withServer(async ({ request }) => {
      const header = await request('GET', '/pages?showInHeader=true');

      assert.equal(header.status, 200);
      assert.ok(header.body.data.length > 0);
      assert.ok(header.body.data.every((row) => row.headerMenu));
      assert.deepEqual(Object.keys(header.body.data[0]).sort(), [
        'footerColumn',
        'headerMenu',
        'headerSubmenu',
        'order',
        'slug',
        'title',
      ]);
      // A menu arrives whole: the list is unpaginated unless asked otherwise.
      assert.equal(header.body.meta.total, header.body.data.length);

      const footer = await request('GET', '/pages?showInFooter=true');
      assert.ok(footer.body.data.some((row) => row.slug === 'about'));
      // `home` is a published page that belongs in neither menu.
      assert.ok(!footer.body.data.some((row) => row.slug === 'home'));
    });
  });

  it('keeps a draft out of the navigation list', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      await request('POST', '/admin/pages', {
        token,
        body: { ...PAGE, showInHeader: true, headerMenu: 'company' },
      });

      const listed = await request('GET', '/pages?showInHeader=true');
      assert.ok(!listed.body.data.some((row) => row.slug === PAGE.slug));
    });
  });

  // MB-03: §5.9 has the API derive a slug from the title when the client sends
  // an empty one. Pages were the one collection that answered 422 instead,
  // because their slug is a path and so carried a descriptor of its own.
  it('derives a page slug from the title when the client sends an empty one', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const created = await request('POST', '/admin/pages', {
        token,
        body: { ...PAGE, slug: '', title: 'Our Approach To Advisory' },
      });

      assert.equal(created.status, 201);
      assert.equal(created.body.data.slug, 'our-approach-to-advisory');
      // The entity slug and `seo.slug` are always the same string (§5.9, D34).
      assert.equal(created.body.data.seo.slug, created.body.data.slug);
    });
  });

  it('de-duplicates a derived page slug rather than refusing it', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const body = { ...PAGE, slug: '', title: 'Our Approach To Advisory' };

      const first = await request('POST', '/admin/pages', { token, body });
      const second = await request('POST', '/admin/pages', { token, body });

      assert.equal(second.status, 201);
      assert.notEqual(second.body.data.slug, first.body.data.slug);
      assert.match(second.body.data.slug, /^our-approach-to-advisory-\d+$/);
    });
  });

  // MB-04: the reserved-path rule lived only in `PageFormPage`, so the API
  // stored a page under a prefix the router owns — one that exists and can
  // never be opened (D11).
  it('refuses a slug whose first segment belongs to a static route', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      for (const slug of ['properties', 'buy/apartments', 'admin', 'insights/notes']) {
        const refused = await request('POST', '/admin/pages', { token, body: { ...PAGE, slug } });
        assert.equal(refused.status, 422, `POST /admin/pages with slug "${slug}"`);
        assert.ok(refused.body.errors.slug, `errors.slug for "${slug}"`);
      }
    });
  });

  it('refuses a title that would derive a reserved slug', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const refused = await request('POST', '/admin/pages', {
        token,
        body: { ...PAGE, slug: '', title: 'Insights' },
      });

      assert.equal(refused.status, 422);
      assert.ok(refused.body.errors.slug);
    });
  });

  it('lets a page already living under a reserved prefix keep its slug', async () => {
    // The shipped seed puts the awareness page at `insights/real-estate-
    // awareness`, served by a route that spells its prefix out, so the rule
    // has to let an existing page stay where it is.
    const seed = seedWith({
      pages: (pages) => {
        pages.push({
          ...pages[0],
          id: 900,
          slug: 'insights/real-estate-awareness',
          title: 'Real estate awareness',
        });
      },
    });

    await withServer({ seed }, async ({ request, login }) => {
      const token = await login(ADMIN);

      // A `PATCH` that does not mention the slug, and one that repeats it,
      // both leave the page where it is.
      const touched = await request('PATCH', '/admin/pages/900', {
        token,
        body: { title: 'Real estate awareness, updated' },
      });
      assert.equal(touched.status, 200);
      assert.equal(touched.body.data.slug, 'insights/real-estate-awareness');

      const repeated = await request('PATCH', '/admin/pages/900', {
        token,
        body: { slug: 'insights/real-estate-awareness' },
      });
      assert.equal(repeated.status, 200);

      // Moving it to a *different* reserved prefix is still refused.
      const moved = await request('PATCH', '/admin/pages/900', {
        token,
        body: { slug: 'properties/notes' },
      });
      assert.equal(moved.status, 422);
      assert.ok(moved.body.errors.slug);
    });
  });
});

/* ------------------------------------------------------------------ *
 * Protected and built-in pages, submenus, header menus (QA-56)
 * ------------------------------------------------------------------ */

/** A built-in page as the seed carries one, for the fixtures below. */
const builtInPage = (pages, overrides = {}) => ({
  ...pages[0],
  id: 900,
  slug: 'buy',
  title: 'Buy',
  template: 'system',
  status: 'published',
  blocks: [],
  showInHeader: false,
  headerMenu: null,
  headerSubmenu: null,
  showInFooter: false,
  footerColumn: null,
  seo: { ...pages[0].seo, slug: 'buy' },
  ...overrides,
});

describe('protected and built-in pages (QA-56)', () => {
  it('never deletes the home page, and deletes an ordinary page', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const refused = await request('DELETE', '/admin/pages/1', { token });
      assert.equal(refused.status, 409);
      assert.match(refused.body.message, /home page cannot be deleted/);
      assert.deepEqual(refused.body.data.usedBy, []);

      assert.equal((await request('DELETE', '/admin/pages/2', { token })).status, 200);
    });
  });

  it('keeps the address of a protected page, and derives nothing over it', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const home = (await request('GET', '/admin/pages/1', { token })).body.data;

      const moved = await request('PATCH', '/admin/pages/1', { token, body: { slug: 'start' } });
      assert.equal(moved.status, 422);
      assert.match(moved.body.errors.slug[0], /keeps its address/);

      // An empty slug on a `PUT` asks for one derived from the title (§5.9);
      // a protected page keeps its own instead.
      const replaced = await request('PUT', '/admin/pages/1', {
        token,
        body: { ...home, slug: '', title: 'Welcome to the site' },
      });
      assert.equal(replaced.status, 200);
      assert.equal(replaced.body.data.slug, 'home');
      assert.equal(replaced.body.data.seo.slug, 'home');
    });
  });

  it('keeps the template of the built-in pages to them', async () => {
    const seed = seedWith({ pages: (pages) => pages.push(builtInPage(pages)) });

    await withServer({ seed }, async ({ request, login }) => {
      const token = await login(ADMIN);

      const created = await request('POST', '/admin/pages', {
        token,
        body: { slug: 'my-listing', title: 'My listing', template: 'system', status: 'draft' },
      });
      assert.equal(created.status, 422);
      assert.ok(created.body.errors.template);

      const intoSystem = await request('PATCH', '/admin/pages/2', {
        token,
        body: { template: 'system' },
      });
      assert.equal(intoSystem.status, 422);

      const outOfSystem = await request('PATCH', '/admin/pages/900', {
        token,
        body: { template: 'standard' },
      });
      assert.equal(outOfSystem.status, 422);
      assert.match(outOfSystem.body.errors.template[0], /keeps its template/);
    });
  });

  it('keeps a built-in page live, blockless and undeletable', async () => {
    const seed = seedWith({ pages: (pages) => pages.push(builtInPage(pages)) });

    await withServer({ seed }, async ({ request, login }) => {
      const token = await login(ADMIN);

      const draft = await request('PATCH', '/admin/pages/900', {
        token,
        body: { status: 'draft' },
      });
      assert.equal(draft.status, 422);
      assert.match(draft.body.errors.status[0], /always live/);

      const blocks = await request('PATCH', '/admin/pages/900', {
        token,
        body: { blocks: [{ type: 'richText', order: 1, data: { html: '<p>Hi</p>' } }] },
      });
      assert.equal(blocks.status, 422);
      assert.ok(blocks.body.errors.blocks);

      const deleted = await request('DELETE', '/admin/pages/900', { token });
      assert.equal(deleted.status, 409);
      assert.match(deleted.body.message, /built into the site/);

      // Its name and its place in the menus are an editor's to change.
      const renamed = await request('PATCH', '/admin/pages/900', {
        token,
        body: { title: 'Buy a home', showInHeader: true, headerMenu: 'company' },
      });
      assert.equal(renamed.status, 200);
      assert.equal(renamed.body.data.title, 'Buy a home');
      assert.equal(renamed.body.data.slug, 'buy');
    });
  });

  it('refuses a bulk action whole when a selected page cannot take it, naming the pages', async () => {
    const seed = seedWith({ pages: (pages) => pages.push(builtInPage(pages)) });

    await withServer({ seed }, async ({ request, login }) => {
      const token = await login(ADMIN);

      const unpublish = await request('POST', '/admin/pages/bulk', {
        token,
        body: { ids: [2, 900], action: 'unpublish' },
      });
      assert.equal(unpublish.status, 422);
      assert.deepEqual(
        unpublish.body.data.refused.map((row) => row.id),
        [900]
      );
      // All or nothing: About Us is still live.
      assert.equal(
        (await request('GET', '/admin/pages/2', { token })).body.data.status,
        'published'
      );

      const remove = await request('POST', '/admin/pages/bulk', {
        token,
        body: { ids: [1, 2, 900], action: 'delete' },
      });
      assert.equal(remove.status, 409);
      assert.match(remove.body.message, /2 of the selected pages cannot be deleted/);
      assert.deepEqual(remove.body.data.refused.map((row) => row.id).sort(), [1, 900]);
      assert.equal((await request('GET', '/admin/pages/2', { token })).status, 200);
    });
  });

  it('never lets the home page’s SEO panel redirect the site root', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const home = (await request('GET', '/admin/pages/1', { token })).body.data;

      const redirected = await request('PATCH', '/admin/pages/1', {
        token,
        body: {
          seo: { ...home.seo, redirect: { enabled: true, toPath: '/about', statusCode: 301 } },
        },
      });
      assert.equal(redirected.status, 422);
      assert.match(redirected.body.errors['seo.redirect.enabled'][0], /cannot be redirected/);

      // Any other page may still be sent elsewhere.
      const about = (await request('GET', '/admin/pages/2', { token })).body.data;
      const moved = await request('PATCH', '/admin/pages/2', {
        token,
        body: {
          seo: { ...about.seo, redirect: { enabled: true, toPath: '/contact', statusCode: 301 } },
        },
      });
      assert.equal(moved.status, 200);
    });
  });

  it('answers the home page’s preview at the site root', async () => {
    resetPreviewTokens();

    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const issued = await request('GET', '/admin/pages/1/preview-token', { token });

      assert.equal(issued.status, 200);
      assert.match(issued.body.data.url, /\/\?preview=/);
      assert.doesNotMatch(issued.body.data.url, /\/home\?preview=/);
    });
  });
});

describe('page placement in the header (QA-56)', () => {
  it('names a menu that exists, and needs one while the page is in the header', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const unknown = await request('PATCH', '/admin/pages/2', {
        token,
        body: { headerMenu: 'no-such-menu' },
      });
      assert.equal(unknown.status, 422);
      assert.ok(unknown.body.errors.headerMenu);

      const menuless = await request('PATCH', '/admin/pages/2', {
        token,
        body: { showInHeader: true, headerMenu: null },
      });
      assert.equal(menuless.status, 422);
      assert.ok(menuless.body.errors.headerMenu);

      // Any menu of the header, not only the three the enum knew.
      const plots = await request('PATCH', '/admin/pages/2', {
        token,
        body: { showInHeader: true, headerMenu: 'plots' },
      });
      assert.equal(plots.status, 200);
      assert.equal(plots.body.data.headerMenu, 'plots');
    });
  });

  it('files a page under a submenu of its own menu only', async () => {
    const seed = seedWith({
      headerMenus: (menus) => {
        const company = menus.find((menu) => menu.slug === 'company');
        company.submenus = [{ slug: 'who-we-are', name: 'Who we are' }];
      },
    });

    await withServer({ seed }, async ({ request, login }) => {
      const token = await login(ADMIN);

      const foreign = await request('PATCH', '/admin/pages/2', {
        token,
        body: { headerMenu: 'insights', headerSubmenu: 'who-we-are' },
      });
      assert.equal(foreign.status, 422);
      assert.ok(foreign.body.errors.headerSubmenu);

      const filed = await request('PATCH', '/admin/pages/2', {
        token,
        body: { headerMenu: 'company', headerSubmenu: 'who-we-are' },
      });
      assert.equal(filed.status, 200);

      const nav = await request('GET', '/pages?showInHeader=true');
      assert.equal(nav.body.data.find((row) => row.slug === 'about').headerSubmenu, 'who-we-are');

      // No menu, no submenu.
      const out = await request('PATCH', '/admin/pages/2', {
        token,
        body: { showInHeader: false, headerMenu: null, headerSubmenu: 'who-we-are' },
      });
      assert.equal(out.status, 200);
      assert.equal(out.body.data.headerSubmenu, null);
    });
  });
});

describe('header menus (QA-56)', () => {
  it('answers the active menus publicly, left to right, flagging the generated ones', async () => {
    const seed = seedWith({
      headerMenus: (menus) => {
        menus.find((menu) => menu.slug === 'plots').isActive = false;
      },
    });

    await withServer({ seed }, async ({ request }) => {
      const response = await request('GET', '/header-menus');

      assert.equal(response.status, 200);
      const slugs = response.body.data.map((menu) => menu.slug);
      assert.deepEqual(slugs, [
        'buy',
        'rent',
        'commercial',
        'localities',
        'builders',
        'buyer-assistance',
        'insights',
        'company',
        'contact',
      ]);
      assert.equal(response.body.meta.total, 9);
      assert.equal(response.body.data[0].builtIn, true);
      assert.equal(response.body.data.at(-1).builtIn, false);
    });
  });

  it('creates a menu of pages and links, deriving its key and its submenus’ keys', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const created = await request('POST', '/admin/header-menus', {
        token,
        body: {
          name: 'Resources',
          // Two names, one key: the second gets a suffix.
          submenus: [
            { slug: '', name: 'Guides & checklists' },
            { slug: '', name: 'Guides, checklists' },
          ],
          links: [{ label: 'Budget homes', href: '/buy?maxPrice=5000000', submenu: null }],
        },
      });

      assert.equal(created.status, 201);
      assert.equal(created.body.data.slug, 'resources');
      assert.equal(created.body.data.source, 'custom');
      assert.deepEqual(
        created.body.data.submenus.map((entry) => entry.slug),
        ['guides-checklists', 'guides-checklists-2']
      );

      const generated = await request('POST', '/admin/header-menus', {
        token,
        body: { name: 'Another Buy', source: 'buy' },
      });
      assert.equal(generated.status, 422);
      assert.ok(generated.body.errors.source);
    });
  });

  it('refuses a menu name the header already has, and a submenu name twice, whatever the case', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const clash = await request('POST', '/admin/header-menus', {
        token,
        body: { name: '  company ' },
      });
      assert.equal(clash.status, 422);
      assert.match(clash.body.errors.name[0], /already has a menu called “Company”/);

      // A menu keeps its own name, and may change its case.
      const renamed = await request('PATCH', '/admin/header-menus/9', {
        token,
        body: { name: 'COMPANY' },
      });
      assert.equal(renamed.status, 200);

      const groups = await request('POST', '/admin/header-menus', {
        token,
        body: {
          name: 'Resources',
          submenus: [
            { slug: '', name: 'Guides' },
            { slug: '', name: 'guides' },
          ],
        },
      });
      assert.equal(groups.status, 422);
      assert.ok(groups.body.errors['submenus.1.name']);
    });
  });

  it('refuses a submenu key twice, a link to a submenu it lacks and an address that is neither', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const twice = await request('POST', '/admin/header-menus', {
        token,
        body: {
          name: 'Twice',
          submenus: [
            { slug: 'a', name: 'A' },
            { slug: 'a', name: 'B' },
          ],
        },
      });
      assert.equal(twice.status, 422);
      assert.ok(twice.body.errors['submenus.1.slug']);

      const stray = await request('POST', '/admin/header-menus', {
        token,
        body: { name: 'Stray', links: [{ label: 'X', href: '/x', submenu: 'nope' }] },
      });
      assert.equal(stray.status, 422);
      assert.ok(stray.body.errors['links.0.submenu']);

      const address = await request('POST', '/admin/header-menus', {
        token,
        // eslint-disable-next-line no-script-url -- the address being refused
        body: { name: 'Address', href: 'javascript:alert(1)' },
      });
      assert.equal(address.status, 422);
      assert.ok(address.body.errors.href);
    });
  });

  it('keeps a menu’s key and what it is built from', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const company = (await request('GET', '/admin/header-menus/9', { token })).body.data;
      assert.equal(company.slug, 'company');

      const rekeyed = await request('PATCH', '/admin/header-menus/9', {
        token,
        body: { slug: 'about-us' },
      });
      assert.equal(rekeyed.status, 422);

      // A `PUT` that leaves the key out keeps it, whatever the new name.
      const renamed = await request('PUT', '/admin/header-menus/9', {
        token,
        body: { ...company, slug: undefined, name: 'About us' },
      });
      assert.equal(renamed.status, 200);
      assert.equal(renamed.body.data.slug, 'company');
      assert.equal(renamed.body.data.name, 'About us');

      const regenerated = await request('PATCH', '/admin/header-menus/9', {
        token,
        body: { source: 'buy' },
      });
      assert.equal(regenerated.status, 422);
    });
  });

  it('moves the pages of a removed submenu into the menu’s own list', async () => {
    const seed = seedWith({
      headerMenus: (menus) => {
        menus.find((menu) => menu.slug === 'company').submenus = [
          { slug: 'who-we-are', name: 'Who we are' },
        ];
      },
      pages: (pages) => {
        pages.find((page) => page.slug === 'about').headerSubmenu = 'who-we-are';
      },
    });

    await withServer({ seed }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const cleared = await request('PATCH', '/admin/header-menus/9', {
        token,
        body: { submenus: [] },
      });
      assert.equal(cleared.status, 200);

      const about = (await request('GET', '/admin/pages/2', { token })).body.data;
      assert.equal(about.headerMenu, 'company');
      assert.equal(about.headerSubmenu, null);
    });
  });

  it('never deletes a generated menu, and takes a deleted menu’s pages out of the header', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const buy = await request('DELETE', '/admin/header-menus/1', { token });
      assert.equal(buy.status, 409);
      assert.match(buy.body.message, /cannot be deleted/);

      const bulk = await request('POST', '/admin/header-menus/bulk', {
        token,
        body: { ids: [1, 4], action: 'delete' },
      });
      assert.equal(bulk.status, 409);
      assert.equal((await request('GET', '/admin/header-menus/4', { token })).status, 200);

      const company = await request('DELETE', '/admin/header-menus/9', { token });
      assert.equal(company.status, 200);

      const about = (await request('GET', '/admin/pages/2', { token })).body.data;
      assert.equal(about.showInHeader, false);
      assert.equal(about.headerMenu, null);
      assert.equal(about.headerSubmenu, null);
    });
  });

  it('is content: a manager writes it, a sales user may not read the admin list', async () => {
    await withServer(async ({ request, login }) => {
      const manager = await login(MANAGER);
      const hidden = await request('PATCH', '/admin/header-menus/4', {
        token: manager,
        body: { isActive: false },
      });
      assert.equal(hidden.status, 200);

      const sales = await login(SALES);
      assert.equal((await request('GET', '/admin/header-menus', { token: sales })).status, 403);
    });
  });
});

/* ------------------------------------------------------------------ *
 * Settings and SEO
 * ------------------------------------------------------------------ */

describe('settings', () => {
  it('deep-merges the keys it knows and drops the ones it does not', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const before = await request('GET', '/admin/settings', { token });

      const updated = await request('PUT', '/admin/settings', {
        token,
        body: { general: { siteName: 'Renamed' }, unknownKey: 1 },
      });

      assert.equal(updated.body.data.general.siteName, 'Renamed');
      assert.equal(updated.body.data.general.tagline, before.body.data.general.tagline);
      assert.deepEqual(updated.body.data.footer, before.body.data.footer);
      assert.ok(!('unknownKey' in updated.body.data));
      assert.notEqual(updated.body.data.updatedAt, before.body.data.updatedAt);
    });
  });

  it('replaces arrays rather than merging them entry by entry', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const updated = await request('PUT', '/admin/settings', {
        token,
        body: { footer: { columns: [] } },
      });
      assert.deepEqual(updated.body.data.footer.columns, []);
    });
  });

  it('keeps the lead-routing branch off the public endpoint', async () => {
    await withServer(async ({ request }) => {
      const settings = await request('GET', '/settings');
      assert.equal(settings.status, 200);
      assert.ok(!('leads' in settings.body.data));
      assert.ok(settings.body.data.general.siteName);
    });
  });

  it('lets a manager read the settings but not save them', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(MANAGER);
      assert.equal((await request('GET', '/admin/settings', { token })).status, 200);

      const refused = await request('PUT', '/admin/settings', {
        token,
        body: { general: { siteName: 'Nope' } },
      });
      assert.equal(refused.status, 403);
    });
  });
});

describe('SEO', () => {
  it('serves the settings publicly and merges an admin save', async () => {
    await withServer(async ({ request, login }) => {
      const publicSettings = await request('GET', '/seo/settings');
      assert.equal(publicSettings.status, 200);
      assert.ok(publicSettings.body.data.titleTemplates.property);

      const token = await login(ADMIN);
      const saved = await request('PUT', '/admin/seo/settings', {
        token,
        body: { defaults: { metaDescription: 'Changed.' } },
      });

      assert.equal(saved.body.data.defaults.metaDescription, 'Changed.');
      assert.equal(saved.body.data.defaults.twitterCard, 'summary_large_image', 'siblings survive');
      assert.ok(saved.body.data.sitemap.changefreq.property, 'other branches survive');
    });
  });

  it('lists every optimisable entity with its public URL', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const all = await request('GET', '/admin/seo/overview?perPage=all', { token });

      const types = new Set(all.body.data.map((row) => row.type));
      assert.ok(types.has('property') && types.has('article') && types.has('locality'));

      const property = all.body.data.find((row) => row.type === 'property');
      assert.match(property.url, /^https:\/\/.+\/properties\/.+$/);
      assert.ok('seo' in property && 'updatedAt' in property);

      const filtered = await request('GET', '/admin/seo/overview?type=article&perPage=all', {
        token,
      });
      assert.ok(filtered.body.data.every((row) => row.type === 'article'));

      const searched = await request('GET', '/admin/seo/overview?q=whitefield&perPage=all', {
        token,
      });
      assert.ok(searched.body.data.length > 0);
      assert.ok(searched.body.data.length < all.body.data.length);
    });
  });

  it('leaves the built-in pages out of the desk: their head is the templates’ (QA-56)', async () => {
    const seed = seedWith({
      pages: (pages) =>
        pages.push({
          ...pages[0],
          id: 900,
          slug: 'buy',
          title: 'Buy',
          template: 'system',
          blocks: [],
          seo: { ...pages[0].seo, slug: 'buy' },
        }),
    });

    await withServer({ seed }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const response = await request('GET', '/admin/seo/overview?type=page&perPage=all', {
        token,
      });

      assert.equal(response.status, 200);
      assert.ok(response.body.data.length > 0);
      assert.ok(!response.body.data.some((row) => row.slug === 'buy'));
    });
  });

  it('flags the records that share a title, a description or a keyword', async () => {
    // Two listings written by two people on the same afternoon: the flag is
    // what the SEO desk groups its duplicates tab by (§4.1 of prompt 37).
    const seed = seedWith({
      properties: (rows) => {
        rows[0].seo = { ...rows[0].seo, title: 'Flats in Whitefield', description: '' };
        rows[1].seo = { ...rows[1].seo, title: 'FLATS IN  WHITEFIELD ', description: '' };
      },
    });

    await withServer({ seed }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const all = await request('GET', '/admin/seo/overview?perPage=all', { token });
      const rows = all.body.data;

      const first = rows.find((row) => row.key === `property:${seed.properties[0].id}`);
      const second = rows.find((row) => row.key === `property:${seed.properties[1].id}`);

      assert.deepEqual(first.duplicateOf.title, [second.key], 'case and spacing do not differ');
      assert.deepEqual(second.duplicateOf.title, [first.key]);
      assert.deepEqual(first.duplicateOf.description, [], 'two empty values are not duplicates');

      // The flags describe the site, not the page: filtering to properties
      // still has to report a collision with an article.
      const filtered = await request('GET', '/admin/seo/overview?type=property&perPage=all', {
        token,
      });
      const filteredFirst = filtered.body.data.find((row) => row.key === first.key);
      assert.deepEqual(filteredFirst.duplicateOf.title, [second.key]);
    });
  });

  it('refuses a manager the custom head and body HTML (§7)', async () => {
    await withServer(async ({ request, login }) => {
      const manager = await login(MANAGER);

      // Every other field on the screen is a manager's to write.
      const allowed = await request('PUT', '/admin/seo/settings', {
        token: manager,
        body: { separator: '\u2013', breadcrumbs: { homeLabel: 'Start' } },
      });
      assert.equal(allowed.status, 200);
      assert.equal(allowed.body.data.breadcrumbs.homeLabel, 'Start');

      const refused = await request('PUT', '/admin/seo/settings', {
        token: manager,
        body: { customHeadHtml: '<script>alert(1)</script>' },
      });
      assert.equal(refused.status, 403);

      const stored = await request('GET', '/admin/seo/settings', { token: manager });
      assert.notEqual(stored.body.data.customHeadHtml, '<script>alert(1)</script>');

      // Saving another tab while the field is echoed back unchanged is not a
      // change, and must keep working.
      const echoed = await request('PUT', '/admin/seo/settings', {
        token: manager,
        body: {
          customHeadHtml: stored.body.data.customHeadHtml,
          breadcrumbs: { homeLabel: 'Home' },
        },
      });
      assert.equal(echoed.status, 200);

      const admin = await login(ADMIN);
      const written = await request('PUT', '/admin/seo/settings', {
        token: admin,
        body: { customHeadHtml: '<meta name="x" content="y">' },
      });
      assert.equal(written.status, 200);
      assert.equal(written.body.data.customHeadHtml, '<meta name="x" content="y">');
    });
  });

  it('previews the generated llms.txt without storing it', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const preview = await request('GET', '/admin/seo/llms-preview', { token });

      assert.equal(preview.status, 200);
      assert.match(preview.body.data.llmsTxt, /^# Squares N Acres/);
      assert.match(preview.body.data.llmsTxt, /## Localities/);

      const stored = await request('GET', '/admin/seo/settings', { token });
      assert.notEqual(stored.body.data.llmsTxt, preview.body.data.llmsTxt);
    });
  });
});

/* ------------------------------------------------------------------ *
 * Dashboard
 * ------------------------------------------------------------------ */

describe('GET /admin/dashboard', () => {
  it('answers the §6.16 shape', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const { body } = await request('GET', '/admin/dashboard', { token });
      const data = body.data;

      assert.deepEqual(Object.keys(data).sort(), [
        'recentLeads',
        'seoHealth',
        'stats',
        'topProperties',
        'trends',
        'upcomingFollowUps',
      ]);

      for (const key of [
        'propertiesTotal',
        'propertiesActive',
        'propertiesFeatured',
        'propertiesInactive',
        'leadsTotal',
        'leadsNew',
        'leadsToday',
        'leadsThisMonth',
        'leadsLastMonth',
        'conversionRate',
        'articlesPublished',
        'articlesDraft',
        'viewsThisMonth',
        'enquiriesThisMonth',
        'subscribers',
      ]) {
        assert.equal(typeof data.stats[key], 'number', `stats.${key}`);
      }

      assert.equal(data.trends.leadsByDay.length, 30);
      assert.equal(data.trends.viewsByDay.length, 30);
      assert.match(data.trends.leadsByDay[0].date, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(data.trends.leadsByStatus.length, 7, 'every rung of the funnel');
      assert.ok(data.topProperties.length <= 5);
      assert.ok(data.recentLeads.length <= 10);

      for (const key of [
        'averageScore',
        'good',
        'ok',
        'poor',
        'missingFocusKeyword',
        'missingMetaDescription',
      ]) {
        assert.equal(typeof data.seoHealth[key], 'number', `seoHealth.${key}`);
      }
    });
  });

  it('scopes every lead figure for a sales user', async () => {
    await withServer(async ({ request, login }) => {
      const admin = await login(ADMIN);
      const sales = await login(SALES);

      const whole = await request('GET', '/admin/dashboard', { token: admin });
      const scoped = await request('GET', '/admin/dashboard', { token: sales });

      assert.ok(scoped.body.data.stats.leadsTotal <= whole.body.data.stats.leadsTotal);
      assert.equal(
        scoped.body.data.stats.propertiesTotal,
        whole.body.data.stats.propertiesTotal,
        'listings are not somebody’s to own'
      );
    });
  });
});

/* ------------------------------------------------------------------ *
 * Newsletter
 * ------------------------------------------------------------------ */

describe('newsletter', () => {
  it('accepts a new address, recognises a known one and revives an unsubscribed one', async () => {
    await withServer(async ({ request, login }) => {
      const created = await request('POST', '/newsletter/subscribe', {
        body: { email: 'new.reader@example.com', name: 'New Reader' },
      });
      assert.equal(created.status, 201);
      assert.equal(created.body.data.status, 'subscribed');

      const again = await request('POST', '/newsletter/subscribe', {
        body: { email: 'New.Reader@example.com' },
      });
      assert.equal(again.status, 200);
      assert.deepEqual(again.body, { data: null, message: 'Already subscribed' });

      const token = await login(ADMIN);
      await request('DELETE', `/admin/newsletter-subscribers/${created.body.data.id}`, { token });

      const list = await request('GET', '/admin/newsletter-subscribers?perPage=all', { token });
      assert.ok(!list.body.data.some((row) => row.email === 'new.reader@example.com'));
    });
  });

  it('swallows a honeypot submission and stores nothing', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const before = await request('GET', '/admin/newsletter-subscribers?perPage=all', { token });

      const trapped = await request('POST', '/newsletter/subscribe', {
        body: { email: 'robot@example.com', website: 'http://spam.example' },
      });
      assert.equal(trapped.status, 200);
      assert.equal(trapped.body.data, null);

      const after = await request('GET', '/admin/newsletter-subscribers?perPage=all', { token });
      assert.equal(after.body.meta.total, before.body.meta.total);
    });
  });

  it('exports the subscribers as CSV with a BOM', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const csv = await request('GET', '/admin/newsletter-subscribers/export', { token });

      assert.ok(csv.text.startsWith('﻿'));
      assert.match(csv.text, /Email,Name,Source,Status,Subscribed At/);
      assert.match(csv.headers.get('content-disposition'), /attachment; filename="newsletter-/);
    });
  });
});

/* ------------------------------------------------------------------ *
 * Careers
 * ------------------------------------------------------------------ */

describe('jobs', () => {
  const APPLICATION = {
    name: 'Asha Menon',
    email: 'asha.menon@example.com',
    phone: '9876543210',
    resumeUrl: 'https://example.com/asha-menon.pdf',
  };

  it('lists the open roles and accepts an application', async () => {
    await withServer(async ({ request, login }) => {
      const open = await request('GET', '/jobs');
      assert.equal(open.body.meta.total, 1);

      const applied = await request('POST', '/jobs/1/apply', { body: APPLICATION });
      assert.equal(applied.status, 201);
      assert.equal(applied.body.data.status, 'new');

      const token = await login(ADMIN);
      const list = await request('GET', '/admin/job-applications?jobId=1', { token });
      assert.equal(list.body.meta.total, 1);
      assert.deepEqual(list.body.data[0].job, {
        id: 1,
        title: 'Real Estate Advisor — Bengaluru',
        slug: 'real-estate-advisor-bengaluru',
      });
    });
  });

  it('closes a role once its closing date has passed', async () => {
    const seed = seedWith({
      jobOpenings: (jobs) => void (jobs[0].closesAt = '2026-01-01'),
    });

    await withServer({ seed }, async ({ request }) => {
      assert.equal((await request('GET', '/jobs')).body.meta.total, 0);

      // The page still reads, so a stale link explains itself.
      const page = await request('GET', '/jobs/slug/real-estate-advisor-bengaluru');
      assert.equal(page.status, 200);
      assert.equal(page.body.data.isOpen, false);

      const refused = await request('POST', '/jobs/1/apply', { body: APPLICATION });
      assert.equal(refused.status, 404);
      assert.equal(refused.body.message, 'This opening is closed.');
    });
  });

  it('honours the honeypot and validates the résumé link', async () => {
    await withServer(async ({ request, login }) => {
      const trapped = await request('POST', '/jobs/1/apply', {
        body: { ...APPLICATION, website: 'http://spam.example' },
      });
      assert.equal(trapped.status, 200);
      assert.equal(trapped.body.data, null);

      const invalid = await request('POST', '/jobs/1/apply', {
        body: { ...APPLICATION, resumeUrl: 'not-a-url' },
      });
      assert.equal(invalid.status, 422);
      assert.ok(invalid.body.errors.resumeUrl);

      const token = await login(ADMIN);
      const list = await request('GET', '/admin/job-applications', { token });
      assert.equal(list.body.meta.total, 0, 'neither attempt was stored');
    });
  });
});

describe('content writes (QA-61)', () => {
  const APPLICATION = {
    name: 'Asha Menon',
    email: 'asha.menon@example.com',
    phone: '9876543210',
    resumeUrl: 'https://example.com/asha-menon.pdf',
  };

  it('closes the gap a delete leaves in a drag-ordered collection, one at a time and in bulk', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const orders = async () =>
        (
          await request('GET', '/admin/testimonials?perPage=all&sort=order', { token })
        ).body.data.map((row) => row.order);
      const add = async (name) =>
        (
          await request('POST', '/admin/testimonials', {
            token,
            body: { name, rating: 5, message: 'A quote long enough to be one quote.', order: 1 },
          })
        ).body.data;

      const first = await add('First of all');
      assert.deepEqual(await orders(), [1, 2, 3]);

      // The first read 2 in the Order column once the one above it had gone.
      assert.equal(
        (await request('DELETE', `/admin/testimonials/${first.id}`, { token })).status,
        200
      );
      assert.deepEqual(await orders(), [1, 2]);

      const a = await add('Alpha');
      const b = await add('Beta');
      const bulk = await request('POST', '/admin/testimonials/bulk', {
        token,
        body: { action: 'delete', ids: [a.id, b.id] },
      });
      assert.equal(bulk.status, 200);
      assert.deepEqual(await orders(), [1, 2]);
    });
  });

  it('sorts applications by where they stand, in the order the desk moves them', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const statuses = ['hired', 'new', 'interview', 'shortlisted', 'rejected'];
      for (const [index, status] of statuses.entries()) {
        const applied = await request('POST', '/jobs/1/apply', {
          body: { ...APPLICATION, email: `asha.${index}@example.com` },
        });
        await request('PATCH', `/admin/job-applications/${applied.body.data.id}`, {
          token,
          body: { status },
        });
      }

      const read = async (order) =>
        (
          await request('GET', `/admin/job-applications?sort=status&order=${order}`, { token })
        ).body.data.map((row) => row.status);

      // By spelling it read hired, interview, new, rejected, shortlisted.
      assert.deepEqual(await read('asc'), ['new', 'shortlisted', 'interview', 'rejected', 'hired']);
      assert.deepEqual(await read('desc'), [
        'hired',
        'rejected',
        'interview',
        'shortlisted',
        'new',
      ]);
    });
  });

  it('stores an opening’s text without the spaces around it', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const created = await request('POST', '/admin/jobs', {
        token,
        body: {
          title: '  Site Engineer ',
          department: 'Sales ',
          location: ' Remote',
          employmentType: 'contract',
          description: '<p>Oversee handovers.</p>',
        },
      });
      assert.equal(created.status, 201);
      assert.equal(created.body.data.title, 'Site Engineer');
      assert.equal(created.body.data.department, 'Sales');
      assert.equal(created.body.data.location, 'Remote');
    });
  });

  it('refuses an opening whose description has no words, or runs something', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const opening = (description) => ({
        title: 'Site Engineer',
        department: 'Projects',
        location: 'Remote',
        employmentType: 'contract',
        description,
      });

      // An emptied bullet: the careers page printed "About the role" over nothing.
      const empty = await request('POST', '/admin/jobs', {
        token,
        body: opening('<ul><li><p></p></li></ul>'),
      });
      assert.equal(empty.status, 422);
      assert.deepEqual(empty.body.errors.description, ['The description field is required.']);

      const unsafe = await request('POST', '/admin/jobs', {
        token,
        body: opening('<p onclick="alert(1)">Oversee handovers.</p>'),
      });
      assert.equal(unsafe.status, 422);
      assert.match(unsafe.body.errors.description[0], /may not carry a script/);

      // A PATCH that leaves the description alone is not asked about it.
      const created = await request('POST', '/admin/jobs', {
        token,
        body: opening('<p>Oversee handovers.</p>'),
      });
      assert.equal(created.status, 201);
      const toggled = await request('PATCH', `/admin/jobs/${created.body.data.id}`, {
        token,
        body: { isActive: false },
      });
      assert.equal(toggled.status, 200);
      const emptied = await request('PATCH', `/admin/jobs/${created.body.data.id}`, {
        token,
        body: { description: '<h2></h2>' },
      });
      assert.equal(emptied.status, 422);
    });
  });

  it('keeps an opening open to the end of its closing day in Bengaluru', () => {
    const job = { isActive: true, closesAt: '2026-09-30' };
    // 23:30 IST on the 30th: still the closing day.
    assert.equal(isOpen(job, Date.parse('2026-09-30T18:00:00Z')), true);
    // 01:30 IST on the 1st: Greenwich still read the 30th, and took it.
    assert.equal(isOpen(job, Date.parse('2026-09-30T20:00:00Z')), false);
    assert.equal(isOpen({ isActive: true, closesAt: null }, Date.now()), true);
    assert.equal(isOpen({ isActive: false, closesAt: null }, Date.now()), false);
  });
});

/* ------------------------------------------------------------------ *
 * Redirects
 * ------------------------------------------------------------------ */

describe('redirects', () => {
  it('serves only what the SPA matches on', async () => {
    await withServer(async ({ request }) => {
      const list = await request('GET', '/redirects');
      assert.ok(list.body.data.length > 0);
      assert.deepEqual(Object.keys(list.body.data[0]).sort(), ['fromPath', 'statusCode', 'toPath']);
    });
  });

  it('resolves a path and counts the hit', async () => {
    await withServer(async ({ request, login }) => {
      const resolved = await request('GET', '/redirects/resolve?path=/blog');
      assert.equal(resolved.body.data.toPath, '/insights/articles');

      const token = await login(ADMIN);
      const stored = await request('GET', '/admin/redirects/2', { token });
      assert.equal(stored.body.data.hits, 1);

      assert.equal((await request('GET', '/redirects/resolve?path=/nowhere')).status, 404);
    });
  });

  it('refuses a duplicate, a loop and a chain', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const duplicate = await request('POST', '/admin/redirects', {
        token,
        body: { fromPath: '/blog', toPath: '/somewhere', statusCode: 301 },
      });
      assert.equal(duplicate.status, 422);
      assert.ok(duplicate.body.errors.fromPath);

      const loop = await request('POST', '/admin/redirects', {
        token,
        body: { fromPath: '/loop', toPath: '/loop', statusCode: 301 },
      });
      assert.equal(loop.status, 422);
      assert.ok(loop.body.errors.toPath);

      const chain = await request('POST', '/admin/redirects', {
        token,
        body: { fromPath: '/first', toPath: '/blog', statusCode: 301 },
      });
      assert.equal(chain.status, 422);
      assert.ok(chain.body.errors.toPath);

      const bad = await request('POST', '/admin/redirects', {
        token,
        body: { fromPath: 'no-slash', toPath: '/properties', statusCode: 301 },
      });
      assert.equal(bad.status, 422);
    });
  });

  it('imports by upsert and exports as CSV', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const imported = await request('POST', '/admin/redirects/import', {
        token,
        body: {
          rows: [
            { fromPath: '/new-one', toPath: '/properties', statusCode: 301 },
            { fromPath: '/blog', toPath: '/insights/articles', statusCode: 302 },
            { fromPath: 'broken', toPath: '/properties' },
          ],
        },
      });

      assert.deepEqual(imported.body.data, { created: 1, updated: 1, skipped: 1 });
      assert.equal(
        (await request('GET', '/admin/redirects/2', { token })).body.data.statusCode,
        302
      );

      const csv = await request('GET', '/admin/redirects/export', { token });
      assert.ok(csv.text.startsWith('﻿'));
      assert.match(csv.text, /From,To,Status,Active,Hits,Note/);
    });
  });
});

/* ------------------------------------------------------------------ *
 * Media (§6.12, prompt 39 §5)
 * ------------------------------------------------------------------ */

describe('/admin/media', () => {
  it('infers the provider, the type and the format from a URL alone', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const created = await request('POST', '/admin/media', {
        token,
        body: { url: 'https://images.example.com/sna/whitefield.jpg', alt: 'A new picture' },
      });

      assert.equal(created.status, 201);
      assert.equal(created.body.data.provider, 'external');
      assert.equal(created.body.data.type, 'image');
      assert.equal(created.body.data.format, 'jpg');

      const pdf = await request('POST', '/admin/media', {
        token,
        body: {
          url: 'https://res.cloudinary.com/dn9gyaiik/image/upload/v1/sna/docs/price-list.pdf',
          alt: 'Price list',
        },
      });

      assert.equal(pdf.body.data.provider, 'cloudinary');
      assert.equal(pdf.body.data.type, 'document');
      assert.equal(pdf.body.data.format, 'pdf');
    });
  });

  it('takes the type the client worked out for an extension-less URL', async () => {
    // `picsum.photos/seed/x/1600/900` has no extension to read, so the API
    // would file it as a document. `MediaAddUrlDialog` knows better — it reads
    // the host as well — and says so, which is what the seed rows do too.
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const created = await request('POST', '/admin/media', {
        token,
        body: {
          url: 'https://picsum.photos/seed/sna-new/1600/900',
          alt: 'A new picture',
          type: 'image',
        },
      });

      assert.equal(created.body.data.type, 'image');
      assert.equal(created.body.data.provider, 'external');
    });
  });

  it('reports where a file is used, on a single read and on the list when asked', async () => {
    await withServer(async ({ request, login, db }) => {
      const token = await login(ADMIN);
      const used = db.getCollection('properties')[0].images[0].url;
      const record = db.getCollection('media').find((row) => row.url === used);

      const one = await request('GET', `/admin/media/${record.id}`, { token });
      assert.ok(one.body.data.usedIn.length > 0);
      assert.equal(one.body.data.usedIn[0].type, 'property');

      // The list stays cheap unless the caller asks for the search.
      const plain = await request('GET', '/admin/media?perPage=5', { token });
      assert.equal(plain.body.data[0].usedIn, undefined);

      const withUsage = await request('GET', '/admin/media?perPage=5&withUsage=true', { token });
      assert.ok(Array.isArray(withUsage.body.data[0].usedIn));
    });
  });

  it('refuses to delete a file something still shows, and lists where (§5)', async () => {
    await withServer(async ({ request, login, db }) => {
      const token = await login(ADMIN);
      const used = db.getCollection('properties')[0].images[0].url;
      const record = db.getCollection('media').find((row) => row.url === used);

      const refused = await request('DELETE', `/admin/media/${record.id}`, { token });

      assert.equal(refused.status, 409);
      assert.ok(refused.body.data.usedIn.length > 0);
      assert.match(refused.body.errors.id[0], /Used by/);
      // Nothing was removed.
      assert.ok(db.getCollection('media').some((row) => row.id === record.id));
    });
  });

  it('deletes it anyway when the editor forces it — the asset stays on Cloudinary', async () => {
    await withServer(async ({ request, login, db }) => {
      const token = await login(ADMIN);
      const used = db.getCollection('properties')[0].images[0].url;
      const record = db.getCollection('media').find((row) => row.url === used);

      const forced = await request('DELETE', `/admin/media/${record.id}?force=true`, { token });

      assert.equal(forced.status, 200);
      assert.ok(!db.getCollection('media').some((row) => row.id === record.id));
      // The listing that used it is untouched: only the library entry went.
      assert.equal(db.getCollection('properties')[0].images[0].url, used);
    });
  });

  it('deletes a file nobody uses without being asked twice', async () => {
    await withServer(async ({ request, login, db }) => {
      const token = await login(ADMIN);

      const created = await request('POST', '/admin/media', {
        token,
        body: { url: 'https://picsum.photos/seed/sna-orphan/800/600', alt: 'Nobody uses this' },
      });

      const removed = await request('DELETE', `/admin/media/${created.body.data.id}`, { token });
      assert.equal(removed.status, 200);
      assert.ok(!db.getCollection('media').some((row) => row.id === created.body.data.id));
    });
  });

  it('is closed to sales and has no public route at all (§7, §5.10)', async () => {
    await withServer(async ({ request, login }) => {
      const sales = await login(SALES);

      assert.equal((await request('GET', '/admin/media', { token: sales })).status, 403);
      assert.equal((await request('GET', '/media')).status, 404);
    });
  });
});
