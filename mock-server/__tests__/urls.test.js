/**
 * Every `url` of the contract is at most 500 characters (QA-65).
 *
 * The column behind a `url` is a `VARCHAR(500)`, and only three descriptors
 * said so: a 3 000-character partner logo was taken with a 200 and would have
 * failed Laravel's write. A `url` without a `maxLength` of its own is now held
 * to 500 (`src/services/schemas/limits.js`) — on the public writes, the master
 * data, the listings, the articles and the two settings singletons alike, at
 * any depth: a nested address and an item of a list of them.
 *
 * Each route answers 422 with the sentence under the dotted key for 501
 * characters, and takes 500.
 */

const assert = require('node:assert/strict');
const { after, describe, it } = require('node:test');

const { ADMIN, cleanupTempFiles, silenceRequestLog, withServer } = require('./helpers');

silenceRequestLog();

after(cleanupTempFiles);

/** An address of exactly `length` characters. */
const address = (length) => `https://cdn.example.com/${'a'.repeat(length - 28)}.png`;

const tooLong = (key) => `The ${key} may not be greater than 500 characters.`;

/** A 422 that names `key` with the length sentence, and nothing else about it. */
function assertTooLong(response, key) {
  assert.equal(response.status, 422, response.text);
  assert.deepEqual(response.body.errors[key], [tooLong(key)]);
}

describe('a url is at most 500 characters (QA-65)', () => {
  it('on a master-data create: a partner’s logo', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const partner = (logoUrl) => ({ name: 'Long Logo Partner', category: 'bank', logoUrl });

      assertTooLong(
        await request('POST', '/admin/partners', { token, body: partner(address(501)) }),
        'logoUrl'
      );
      const created = await request('POST', '/admin/partners', {
        token,
        body: partner(address(500)),
      });
      assert.equal(created.status, 201, created.text);
      assert.equal(created.body.data.logoUrl.length, 500);
    });
  });

  it('on the public lead form: the page it was sent from', async () => {
    await withServer(async ({ request }) => {
      const enquiry = (pageUrl) => ({
        name: 'Test Lead',
        phone: '9876543210',
        source: 'contact-page',
        pageUrl,
      });

      assertTooLong(await request('POST', '/leads', { body: enquiry(address(501)) }), 'pageUrl');
      const created = await request('POST', '/leads', { body: enquiry(address(500)) });
      assert.equal(created.status, 201, created.text);
    });
  });

  it('on a job application: the résumé link', async () => {
    await withServer(async ({ request }) => {
      const application = (resumeUrl) => ({
        name: 'Asha Menon',
        email: 'asha.menon@example.com',
        phone: '9876543210',
        resumeUrl,
      });

      assertTooLong(
        await request('POST', '/jobs/1/apply', { body: application(address(501)) }),
        'resumeUrl'
      );
      const applied = await request('POST', '/jobs/1/apply', { body: application(address(500)) });
      assert.equal(applied.status, 201, applied.text);
    });
  });

  it('on a listing: its video', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      assertTooLong(
        await request('PATCH', '/admin/properties/1', {
          token,
          body: { videoUrl: address(501) },
        }),
        'videoUrl'
      );
      const saved = await request('PATCH', '/admin/properties/1', {
        token,
        body: { videoUrl: address(500) },
      });
      assert.equal(saved.status, 200, saved.text);
    });
  });

  it('on an article: the featured image, one level down', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const image = (url) => ({ featuredImage: { url, alt: 'Featured picture', caption: null } });

      assertTooLong(
        await request('PATCH', '/admin/articles/1', { token, body: image(address(501)) }),
        'featuredImage.url'
      );
      const saved = await request('PATCH', '/admin/articles/1', {
        token,
        body: image(address(500)),
      });
      assert.equal(saved.status, 200, saved.text);
    });
  });

  it('on the site settings: a nested address, and an item of a list of them', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const refused = await request('PUT', '/admin/settings', {
        token,
        body: {
          general: { logoUrl: address(501) },
          footer: { galleryImageUrls: [address(500), address(501)] },
        },
      });
      assertTooLong(refused, 'general.logoUrl');
      assertTooLong(refused, 'footer.galleryImageUrls.1');
      assert.equal(refused.body.errors['footer.galleryImageUrls.0'], undefined);

      const saved = await request('PUT', '/admin/settings', {
        token,
        body: { general: { logoUrl: address(500) } },
      });
      assert.equal(saved.status, 200, saved.text);
    });
  });

  it('on the SEO settings: the default share image', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      assertTooLong(
        await request('PUT', '/admin/seo/settings', {
          token,
          body: { defaults: { ogImageUrl: address(501) } },
        }),
        'defaults.ogImageUrl'
      );
      const saved = await request('PUT', '/admin/seo/settings', {
        token,
        body: { defaults: { ogImageUrl: address(500) } },
      });
      assert.equal(saved.status, 200, saved.text);
    });
  });
});
