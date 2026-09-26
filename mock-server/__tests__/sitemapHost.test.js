/**
 * Where the sitemap index names its children (prompt 51): the origin the
 * request came in on when the site answers there, the site's address
 * otherwise.
 *
 * Run with `npm run test:mock`.
 */

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { isAllowedOrigin, requestOrigin, sitemapBase } = require('../lib/sitemapHost');

const SITE = 'https://www.squaresnacres.com';
const API = 'https://api.squaresnacres.com/api';

/** Just enough of an Express request. */
const requestWith = (headers = {}, protocol = 'http') => {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value])
  );
  return { protocol, get: (name) => lower[name.toLowerCase()] };
};

describe('the origin a request proposes', () => {
  it('is the forwarded scheme and host when a proxy set them, the first of a chain', () => {
    const req = requestWith({
      host: '10.0.0.4:8080',
      'x-forwarded-host': 'www.squaresnacres.com, proxy.internal',
      'x-forwarded-proto': 'https, http',
    });
    assert.equal(requestOrigin(req), SITE);
  });

  it('is the connection’s own otherwise, and nothing for a scheme that is not the web’s', () => {
    assert.equal(requestOrigin(requestWith({ host: 'localhost:4000' })), 'http://localhost:4000');
    assert.equal(
      requestOrigin(requestWith({ host: 'localhost:4000', 'x-forwarded-proto': 'ftp' })),
      null
    );
    assert.equal(requestOrigin(requestWith({})), null);
  });
});

describe('the allow-list', () => {
  it('takes the site’s origin, the API’s when it is set, and this machine', () => {
    assert.ok(isAllowedOrigin(SITE, { siteUrl: `${SITE}/` }));
    assert.ok(isAllowedOrigin('https://api.squaresnacres.com', { siteUrl: SITE, apiUrl: API }));
    assert.ok(!isAllowedOrigin('https://api.squaresnacres.com', { siteUrl: SITE }));
    assert.ok(isAllowedOrigin('http://localhost:3000', { siteUrl: SITE }));
    assert.ok(isAllowedOrigin('http://127.0.0.1:4000', { siteUrl: SITE }));
    assert.ok(isAllowedOrigin('http://[::1]:4000', { siteUrl: SITE }));
  });

  it('refuses another host, another scheme of the site’s, and nothing at all', () => {
    assert.ok(!isAllowedOrigin('https://elsewhere.example', { siteUrl: SITE, apiUrl: API }));
    assert.ok(!isAllowedOrigin('http://www.squaresnacres.com', { siteUrl: SITE }));
    assert.ok(!isAllowedOrigin(null, { siteUrl: SITE }));
  });
});

describe('the base the children are named on', () => {
  it('is the request’s origin and prefix when it is allowed', () => {
    const req = requestWith({
      host: 'app:4000',
      'x-forwarded-host': 'api.squaresnacres.com',
      'x-forwarded-proto': 'https',
    });
    assert.equal(
      sitemapBase(req, { siteUrl: SITE, apiUrl: API, prefix: '/api' }),
      'https://api.squaresnacres.com/api'
    );
  });

  it('is the site’s address, without its trailing slash, when it is not', () => {
    const req = requestWith({ host: 'elsewhere.example', 'x-forwarded-proto': 'https' });
    assert.equal(sitemapBase(req, { siteUrl: `${SITE}/`, apiUrl: API, prefix: '/api' }), SITE);
  });
});
