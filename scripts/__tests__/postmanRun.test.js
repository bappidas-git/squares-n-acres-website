/**
 * The Postman collection, run whole against a fresh mock (prompt 51): every
 * test green, nothing left behind, and a runner that does notice a red one.
 *
 * Run with `npm run test:scripts`.
 */

const assert = require('node:assert/strict');
const { after, describe, it } = require('node:test');

const { buildCollection, buildEnvironment } = require('../lib/guidelines/postman');
const { runCollection } = require('../lib/guidelines/postmanRun');
const {
  ADMIN,
  LIVE_SEED,
  cleanupTempFiles,
  silenceRequestLog,
  withServer,
} = require('../../mock-server/__tests__/helpers');

silenceRequestLog();
after(cleanupTempFiles);

/** The admin lists whose totals must read the same before and after a run. */
const LISTS = [
  '/admin/properties',
  '/admin/leads',
  '/admin/localities',
  '/admin/articles',
  '/admin/pages',
  '/admin/media',
  '/admin/redirects',
  '/admin/users',
  '/admin/job-applications',
  '/admin/newsletter-subscribers',
  '/admin/seo/not-found',
];

describe('the Postman collection', () => {
  it('runs green against a fresh mock and leaves nothing behind', async () => {
    const collection = buildCollection({ generatedFrom: 'test', examples: {} });
    const environment = buildEnvironment({ generatedFrom: 'test' });

    await withServer({ seed: LIVE_SEED }, async ({ origin, request, login }) => {
      const token = await login(ADMIN);
      const totals = async () =>
        Object.fromEntries(
          await Promise.all(
            LISTS.map(async (path) => [
              path,
              (await request('GET', `${path}?perPage=1`, { token })).body?.meta?.total,
            ])
          )
        );

      const before = await totals();
      const run = await runCollection({
        collection,
        environment,
        overrides: { baseUrl: `${origin}/api` },
      });

      assert.deepEqual(
        run.failures,
        [],
        run.failures
          .map((failure) => `${failure.item} — ${failure.test}: ${failure.error}`)
          .join('\n')
      );
      assert.ok(run.requests > 250, `${run.requests} requests`);
      assert.ok(run.tests > run.requests, `${run.tests} tests`);
      assert.deepEqual(await totals(), before);
    });
  });

  it('reports a request that does not answer as the contract says', async () => {
    const collection = {
      item: [
        {
          name: 'a listing that is not there',
          request: {
            method: 'GET',
            auth: { type: 'noauth' },
            header: [],
            url: { raw: '{{baseUrl}}/properties/slug/no-such-listing' },
          },
          event: [
            {
              listen: 'test',
              script: {
                exec: ["pm.test('200', function () {", '  pm.response.to.have.status(200);', '});'],
              },
            },
          ],
        },
      ],
    };

    await withServer({ seed: LIVE_SEED }, async ({ origin }) => {
      const run = await runCollection({
        collection,
        environment: { values: [] },
        overrides: { baseUrl: `${origin}/api` },
      });
      assert.equal(run.failures.length, 1);
      assert.match(run.failures[0].error, /expected 404 to eql 200/);
    });
  });
});
