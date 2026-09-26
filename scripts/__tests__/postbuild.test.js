/**
 * `scripts/postbuild.js` (prompt 51): what `build/robots.txt` becomes for each
 * layout, and the env precedence it reads the two addresses with.
 *
 * Run with `npm run test:scripts`.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, describe, it } = require('node:test');

const { parseEnvFile, readBuildEnv, rewriteSitemapLines, run } = require('../postbuild');

const PLACEHOLDER = 'User-agent: *\nDisallow: /admin\n';
const SEED_ROBOTS =
  'User-agent: *\nAllow: /\nDisallow: /admin\n\nUser-agent: GPTBot\nAllow: /\n\nSitemap: %siteurl%/sitemap.xml';

const roots = [];
after(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

/** A throwaway repository: env files, a seed, and a build unless told otherwise. */
function project({ files = {}, build = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sna-postbuild-'));
  roots.push(root);
  fs.mkdirSync(path.join(root, 'public'));
  fs.writeFileSync(path.join(root, 'public', 'robots.txt'), PLACEHOLDER);
  fs.writeFileSync(
    path.join(root, 'db.json'),
    JSON.stringify({ seoSettings: { robotsTxt: SEED_ROBOTS } })
  );
  if (build) {
    fs.mkdirSync(path.join(root, 'build'));
    fs.writeFileSync(path.join(root, 'build', 'robots.txt'), PLACEHOLDER);
  }
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(root, name), text);
  return root;
}

const built = (root) => path.join(root, 'build', 'robots.txt');
const read = (file) => fs.readFileSync(file, 'utf8');

/** Collects what the run says. */
function quiet() {
  const said = { log: [], warn: [] };
  return {
    said,
    log: (message) => said.log.push(message),
    warn: (message) => said.warn.push(message),
  };
}

const answering = (status, text) => async () => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => text,
});

describe('reading the env files', () => {
  it('understands comments, export, quotes and a comment after a value', () => {
    assert.deepEqual(
      parseEnvFile(
        [
          '# a comment',
          'export REACT_APP_API_URL=https://api.example.com/api',
          'REACT_APP_SITE_URL="https://www.example.com"',
          "REACT_APP_SITE_NAME='Squares N Acres'",
          'MOCK_PORT=4000 # the mock',
          'not a line',
        ].join('\n')
      ),
      {
        REACT_APP_API_URL: 'https://api.example.com/api',
        REACT_APP_SITE_URL: 'https://www.example.com',
        REACT_APP_SITE_NAME: 'Squares N Acres',
        MOCK_PORT: '4000',
      }
    );
  });

  it('takes the environment first, then the files in the order a production build does', () => {
    const root = project({
      files: {
        '.env': 'REACT_APP_API_URL=https://env.example/api\nREACT_APP_SITE_URL=https://env.example',
        '.env.production': 'REACT_APP_API_URL=https://production.example/api',
        '.env.production.local': 'REACT_APP_API_URL=\n',
        '.env.development': 'REACT_APP_SITE_URL=http://localhost:3000',
      },
    });

    assert.deepEqual(readBuildEnv(['REACT_APP_API_URL', 'REACT_APP_SITE_URL'], { root, env: {} }), {
      // An empty value is not a value: `.env.production` answers.
      REACT_APP_API_URL: 'https://production.example/api',
      // `.env.development` is not a production file.
      REACT_APP_SITE_URL: 'https://env.example',
    });
    assert.equal(
      readBuildEnv(['REACT_APP_API_URL'], { root, env: { REACT_APP_API_URL: 'https://shell/api' } })
        .REACT_APP_API_URL,
      'https://shell/api'
    );
  });
});

describe('the Sitemap: lines', () => {
  it('moves every one to the API origin with its own path, and drops repeats', () => {
    const text = [
      'User-agent: *',
      'Disallow: /admin   ',
      '',
      'Sitemap: https://www.example.com/sitemap.xml',
      'Sitemap: https://api.example.com/api/sitemap-properties.xml',
      'sitemap:   https://www.example.com/sitemap.xml',
      'Sitemap: /sitemap-pages.xml?v=2',
    ].join('\r\n');

    assert.equal(
      rewriteSitemapLines(text, 'https://api.example.com'),
      [
        'User-agent: *',
        'Disallow: /admin',
        '',
        'Sitemap: https://api.example.com/sitemap.xml',
        'Sitemap: https://api.example.com/api/sitemap-properties.xml',
        'Sitemap: https://api.example.com/sitemap-pages.xml?v=2',
        '',
      ].join('\n')
    );
  });

  it('adds a line it is given only when it is not there already', () => {
    const text = 'User-agent: *\nSitemap: https://api.example.com/api/sitemap.xml\n';
    assert.equal(
      rewriteSitemapLines(text, 'https://api.example.com', [
        'https://api.example.com/api/sitemap.xml',
      ]),
      text
    );
  });
});

describe('postbuild', () => {
  it('leaves the build alone without an API address — a fresh clone', async () => {
    const root = project();
    const { said, ...io } = quiet();

    assert.equal(await run({ root, env: {}, ...io }), 'unset');
    assert.equal(read(built(root)), PLACEHOLDER);
    assert.deepEqual(said.log, [
      'postbuild: REACT_APP_API_URL not set — leaving build/robots.txt as committed',
    ]);
  });

  it('says so, and succeeds, when there is no build', async () => {
    const root = project({ build: false });
    const { said, ...io } = quiet();
    const env = { REACT_APP_API_URL: 'https://www.example.com/api' };

    assert.equal(await run({ root, env, ...io }), 'no-build');
    assert.match(said.log[0], /no build\/ folder/);
  });

  it('deletes build/robots.txt when the site and the API share an origin', async () => {
    const root = project({
      files: {
        '.env.production':
          'REACT_APP_API_URL=https://www.example.com/api\nREACT_APP_SITE_URL=https://www.example.com',
      },
    });
    const { said, ...io } = quiet();

    assert.equal(await run({ root, env: {}, ...io }), 'deleted');
    assert.ok(!fs.existsSync(built(root)));
    assert.equal(read(path.join(root, 'public', 'robots.txt')), PLACEHOLDER);
    assert.match(said.log[0], /before Laravel sees the request/);

    // Run twice, it has nothing left to do.
    assert.equal(await run({ root, env: {}, ...io }), 'absent');
  });

  it('writes the API’s robots.txt for two origins, its sitemaps on the API', async () => {
    const root = project();
    const { said, ...io } = quiet();
    const requested = [];
    const fetchImpl = async (url, init) => {
      requested.push({ url, signal: Boolean(init?.signal) });
      return answering(
        200,
        [
          'User-agent: *',
          'Disallow: /admin',
          'Sitemap: https://www.example.com/sitemap.xml',
          'Sitemap: https://api.example.com/api/sitemap-properties.xml',
          'Sitemap: https://www.example.com/sitemap.xml',
        ].join('\n')
      )();
    };
    const env = {
      REACT_APP_API_URL: 'https://api.example.com/api/',
      REACT_APP_SITE_URL: 'https://www.example.com',
    };

    assert.equal(await run({ root, env, fetchImpl, ...io }), 'written');
    assert.deepEqual(requested, [{ url: 'https://api.example.com/api/robots.txt', signal: true }]);
    assert.equal(
      read(built(root)),
      [
        'User-agent: *',
        'Disallow: /admin',
        'Sitemap: https://api.example.com/sitemap.xml',
        'Sitemap: https://api.example.com/api/sitemap-properties.xml',
        '',
      ].join('\n')
    );
    assert.equal(said.warn.length, 0);
    assert.equal(read(path.join(root, 'public', 'robots.txt')), PLACEHOLDER);
  });

  it('writes the seed’s default, and warns, when the API cannot be read', async () => {
    const env = {
      REACT_APP_API_URL: 'https://api.example.com/api',
      REACT_APP_SITE_URL: 'https://www.example.com/',
    };

    for (const fetchImpl of [
      async () => {
        throw new Error('getaddrinfo ENOTFOUND api.example.com');
      },
      answering(404, 'Not found'),
      answering(200, '<!doctype html><title>The site</title>'),
    ]) {
      const root = project();
      const { said, ...io } = quiet();

      assert.equal(await run({ root, env, fetchImpl, ...io }), 'fallback');
      const text = read(built(root));
      assert.ok(!text.includes('%siteurl%'));
      assert.match(text, /^User-agent: GPTBot$/m);
      assert.match(text, /^Sitemap: https:\/\/api\.example\.com\/sitemap\.xml$/m);
      assert.match(text, /^Sitemap: https:\/\/api\.example\.com\/api\/sitemap\.xml$/m);
      assert.ok(!text.includes('www.example.com/sitemap'));
      assert.equal(said.warn.length, 1);
      assert.match(said.warn[0], /default robots\.txt/);
    }
  });
});
