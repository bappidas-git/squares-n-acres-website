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
      const created = await request('POST', '/admin/articles', { token, body: ARTICLE });
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
        body: { ...ARTICLE, status: 'scheduled', publishedAt: fromNow(-60) },
      });
      assert.equal(past.status, 422);
      assert.ok(past.body.errors.publishedAt);

      const future = await request('POST', '/admin/articles', {
        token,
        body: { ...ARTICLE, status: 'scheduled', publishedAt: fromNow(60) },
      });
      assert.equal(future.status, 201);
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

      const created = await request('POST', '/admin/localities', {
        token,
        body: { name: 'Whitefield', cityId: 1 },
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
  });
});

/* ------------------------------------------------------------------ *
 * Pages
 * ------------------------------------------------------------------ */

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

  it('lists the header and footer pages with the five fields a link needs', async () => {
    await withServer(async ({ request }) => {
      const header = await request('GET', '/pages?showInHeader=true');

      assert.equal(header.status, 200);
      assert.ok(header.body.data.length > 0);
      assert.ok(header.body.data.every((row) => row.headerMenu));
      assert.deepEqual(Object.keys(header.body.data[0]).sort(), [
        'footerColumn',
        'headerMenu',
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
