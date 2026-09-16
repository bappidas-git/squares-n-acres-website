/**
 * Sitemaps, robots.txt, RSS and llms.txt, end to end (00_MASTER_CONTEXT.md
 * §5.13, §9.8; decision D21).
 *
 * Run with `npm run test:mock`. The harness is described in `./helpers.js`.
 *
 * These documents are read by machines that are unforgiving about shape, so
 * the assertions are about shape: one `<url>` per public page and none for a
 * page that opted out, a `<lastmod>` that is a real date, an `<image:image>`
 * only where there are images, the same bytes at `/sitemap.xml` as at
 * `/api/sitemap.xml`.
 */

const assert = require('node:assert/strict');
const { after, describe, it } = require('node:test');

const { SEED, cleanupTempFiles, silenceRequestLog, withServer } = require('./helpers');

silenceRequestLog();

after(cleanupTempFiles);

/** A copy of the seed with `changes` applied. */
function seedWith(changes) {
  const copy = JSON.parse(JSON.stringify(SEED));
  for (const [collection, mutate] of Object.entries(changes)) mutate(copy[collection], copy);
  return copy;
}

/** How many times a tag opens in a document. */
const count = (text, tag) => (text.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length;

/** Every `<loc>` of a document, in order. */
const locations = (text) => [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

const SITE = SEED.seoSettings.siteUrl;

describe('GET /sitemap.xml', () => {
  it('is a sitemap index of the five child documents, each with a lastmod', async () => {
    await withServer(async ({ request }) => {
      const response = await request('GET', '/sitemap.xml');

      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /^text\/xml; charset=utf-8$/);
      assert.equal(response.headers.get('cache-control'), 'public, max-age=3600');

      assert.ok(response.text.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
      assert.match(
        response.text,
        /<sitemapindex xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/
      );
      assert.equal(count(response.text, 'sitemap'), 5);

      assert.deepEqual(locations(response.text), [
        `${SITE}/sitemap-properties.xml`,
        `${SITE}/sitemap-localities.xml`,
        `${SITE}/sitemap-developers.xml`,
        `${SITE}/sitemap-articles.xml`,
        `${SITE}/sitemap-pages.xml`,
      ]);

      for (const [, value] of response.text.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) {
        assert.ok(!Number.isNaN(Date.parse(value)), `${value} is a date`);
      }
    });
  });
});

describe('GET /sitemap-properties.xml', () => {
  it('lists every active listing with its images', async () => {
    await withServer(async ({ request }) => {
      const response = await request('GET', '/sitemap-properties.xml');
      const active = SEED.properties.filter((property) => property.isActive);

      assert.match(
        response.text,
        /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/
      );
      assert.match(
        response.text,
        /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/
      );
      assert.equal(count(response.text, 'url'), active.length);

      assert.deepEqual(
        locations(response.text).filter((loc) => loc.includes('/properties/')),
        active.map((property) => `${SITE}/properties/${property.slug}`)
      );

      assert.match(response.text, /<changefreq>weekly<\/changefreq>/);
      assert.match(response.text, /<priority>0\.8<\/priority>/);
      assert.match(response.text, /<image:loc>/);
      assert.match(response.text, /<image:title>/);
    });
  });

  it('carries at most five images per listing and none when there are none', async () => {
    const seed = seedWith({
      properties: (properties) => {
        properties[0].images = Array.from({ length: 9 }, (unused, index) => ({
          id: index + 1,
          url: `https://example.com/photo-${index + 1}.jpg`,
          alt: `Photo ${index + 1}`,
          order: index + 1,
          isCover: index === 0,
        }));
        for (const property of properties.slice(1)) property.images = [];
      },
    });

    await withServer({ seed }, async ({ request }) => {
      const response = await request('GET', '/sitemap-properties.xml');
      assert.equal(count(response.text, 'image:image'), 5);
    });
  });

  it('drops a listing that opted out and a URL the settings exclude', async () => {
    const seed = seedWith({
      properties: (properties) => {
        properties[0].seo.sitemap = { include: false, priority: null, changefreq: null };
        properties[1].seo.sitemap = { include: true, priority: 0.4, changefreq: 'daily' };
      },
      seoSettings: (unused, database) => {
        database.seoSettings.sitemap.excludeUrls = [`/properties/${SEED.properties[2].slug}`];
      },
    });

    await withServer({ seed }, async ({ request }) => {
      const response = await request('GET', '/sitemap-properties.xml');
      const found = locations(response.text);

      assert.ok(!found.includes(`${SITE}/properties/${SEED.properties[0].slug}`), 'opted out');
      assert.ok(!found.includes(`${SITE}/properties/${SEED.properties[2].slug}`), 'excluded URL');
      assert.equal(found.length, SEED.properties.filter((p) => p.isActive).length - 2);

      assert.match(response.text, /<priority>0\.4<\/priority>/);
      assert.match(response.text, /<changefreq>daily<\/changefreq>/);
    });
  });

  it('leaves an inactive listing out', async () => {
    const seed = seedWith({ properties: (properties) => void (properties[0].isActive = false) });

    await withServer({ seed }, async ({ request }) => {
      const response = await request('GET', '/sitemap-properties.xml');
      assert.ok(
        !locations(response.text).includes(`${SITE}/properties/${SEED.properties[0].slug}`)
      );
    });
  });
});

describe('the other child sitemaps', () => {
  it('lists localities and developers at their public paths', async () => {
    await withServer(async ({ request }) => {
      const localities = await request('GET', '/sitemap-localities.xml');
      assert.deepEqual(
        locations(localities.text),
        SEED.localities.filter((row) => row.isActive).map((row) => `${SITE}/localities/${row.slug}`)
      );

      const developers = await request('GET', '/sitemap-developers.xml');
      assert.deepEqual(
        locations(developers.text),
        SEED.developers.filter((row) => row.isActive).map((row) => `${SITE}/builders/${row.slug}`)
      );
    });
  });

  it('lists published articles plus their category, tag and author pages', async () => {
    await withServer(async ({ request }) => {
      const response = await request('GET', '/sitemap-articles.xml');
      const found = locations(response.text);

      for (const article of SEED.articles) {
        assert.ok(found.includes(`${SITE}/insights/articles/${article.slug}`), article.slug);
      }
      assert.ok(found.some((loc) => loc.includes('/insights/articles/category/')));
      assert.ok(found.some((loc) => loc.includes('/insights/articles/tag/')));
      assert.ok(found.some((loc) => loc.includes('/insights/authors/')));
    });
  });

  it('keeps a draft out and lets a scheduled article in once it is due', async () => {
    const seed = seedWith({
      articles: (articles) => {
        articles[0].status = 'draft';
        articles[1].status = 'scheduled';
        articles[1].publishedAt = new Date(Date.now() - 60_000).toISOString();
        articles[2].status = 'scheduled';
        articles[2].publishedAt = new Date(Date.now() + 3_600_000).toISOString();
      },
    });

    await withServer({ seed }, async ({ request }) => {
      const found = locations((await request('GET', '/sitemap-articles.xml')).text);

      assert.ok(!found.includes(`${SITE}/insights/articles/${SEED.articles[0].slug}`), 'draft');
      assert.ok(found.includes(`${SITE}/insights/articles/${SEED.articles[1].slug}`), 'due');
      assert.ok(!found.includes(`${SITE}/insights/articles/${SEED.articles[2].slug}`), 'not yet');
    });
  });

  it('lists the static routes and the published pages, with the home page once', async () => {
    await withServer(async ({ request }) => {
      const found = locations((await request('GET', '/sitemap-pages.xml')).text);

      for (const path of [
        '/',
        '/properties',
        '/buy',
        '/rent',
        '/lease',
        '/localities',
        '/builders',
        '/insights/faqs',
      ]) {
        assert.ok(found.includes(path === '/' ? SITE : `${SITE}${path}`), path);
      }

      assert.equal(found.filter((loc) => loc === SITE).length, 1, 'the home page appears once');
      assert.ok(found.includes(`${SITE}/about`), 'a CMS page');
      assert.match((await request('GET', '/sitemap-pages.xml')).text, /<priority>1\.0<\/priority>/);
    });
  });

  it('answers with an empty urlset when the sitemap is switched off', async () => {
    const seed = seedWith({
      seoSettings: (unused, database) => void (database.seoSettings.sitemap.enabled = false),
    });

    await withServer({ seed }, async ({ request }) => {
      const response = await request('GET', '/sitemap-properties.xml');
      assert.equal(response.status, 200);
      assert.equal(count(response.text, 'url'), 0);
    });
  });
});

describe('GET /robots.txt', () => {
  it('resolves %siteurl% and names every sitemap', async () => {
    await withServer(async ({ request }) => {
      const response = await request('GET', '/robots.txt');

      assert.match(response.headers.get('content-type'), /^text\/plain; charset=utf-8$/);
      assert.ok(!response.text.includes('%siteurl%'));
      assert.match(response.text, /^User-agent: \*$/m);
      assert.match(response.text, /^Disallow: \/admin$/m);
      assert.match(response.text, /^User-agent: ClaudeBot$/m);

      assert.match(response.text, new RegExp(`^Sitemap: ${SITE}/sitemap\\.xml$`, 'm'));
      for (const name of ['properties', 'localities', 'developers', 'articles', 'pages']) {
        assert.match(response.text, new RegExp(`^Sitemap: ${SITE}/sitemap-${name}\\.xml$`, 'm'));
      }
    });
  });
});

describe('GET /rss.xml', () => {
  it('is an RSS 2.0 channel of the published articles', async () => {
    await withServer(async ({ request }) => {
      const response = await request('GET', '/rss.xml');

      assert.match(response.text, /<rss version="2\.0"/);
      assert.match(response.text, /<channel>/);
      assert.equal(count(response.text, 'item'), SEED.articles.length);

      assert.match(response.text, /<link>https:\/\/[^<]+\/insights\/articles\/[^<]+<\/link>/);
      assert.match(response.text, /<guid isPermaLink="true">/);
      assert.match(response.text, /<pubDate>[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4}/);
      assert.match(response.text, /<category>/);
      assert.match(response.text, /<author>/);
    });
  });

  it('carries the newest article first', async () => {
    await withServer(async ({ request }) => {
      const response = await request('GET', '/rss.xml');
      const newest = [...SEED.articles].sort(
        (left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt)
      )[0];

      assert.match(response.text, new RegExp(`<item>\\s*<title>${newest.title}`));
    });
  });
});

describe('GET /llms.txt', () => {
  it('serves the stored document when the editor wrote one', async () => {
    await withServer(async ({ request }) => {
      const response = await request('GET', '/llms.txt');

      assert.match(response.headers.get('content-type'), /^text\/plain; charset=utf-8$/);
      assert.equal(response.text, SEED.seoSettings.llmsTxt);
    });
  });

  it('generates one from the data when the field is empty', async () => {
    const seed = seedWith({
      seoSettings: (unused, database) => void (database.seoSettings.llmsTxt = ''),
    });

    await withServer({ seed }, async ({ request }) => {
      const response = await request('GET', '/llms.txt');

      assert.match(response.text, /^# Squares N Acres\n/);
      assert.match(response.text, /^## Localities$/m);
      assert.match(response.text, /^## Property types$/m);
      assert.match(response.text, /^## Guides$/m);
      assert.match(response.text, /^## Contact$/m);
      assert.match(response.text, new RegExp(`\\]\\(${SITE}/localities/whitefield\\)`));
    });
  });
});

describe('the root mirrors (D21)', () => {
  it('serve the same documents as the API paths', async () => {
    await withServer(async ({ request, origin }) => {
      for (const file of [
        'sitemap.xml',
        'sitemap-properties.xml',
        'sitemap-localities.xml',
        'sitemap-developers.xml',
        'sitemap-articles.xml',
        'sitemap-pages.xml',
        'robots.txt',
        'rss.xml',
        'llms.txt',
      ]) {
        const mirrored = await fetch(`${origin}/${file}`);
        const direct = await request('GET', `/${file}`);

        assert.equal(mirrored.status, 200, file);
        assert.equal(await mirrored.text(), direct.text, file);
      }
    });
  });
});
