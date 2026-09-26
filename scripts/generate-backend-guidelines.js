#!/usr/bin/env node
/**
 * Generates `backend_developer_guidelines/` — the handover package the Laravel
 * developer builds from (00_MASTER_CONTEXT.md §10 / BDG-02, prompt 47).
 *
 *   npm run mock                          # terminal 1 — examples are captured live
 *   npm run generate:backend-guidelines   # terminal 2
 *   npm run check:guidelines              # coverage check
 *
 * Everything in the package comes from a source that the application itself
 * uses — `src/services/endpoints.js`, `src/services/schemas/`,
 * `src/config/enums.js`, `src/config/rbac.js`, `mock-server/schemas/models.js`
 * and `db.json` — plus the hand-written prose of `docs/backend-notes/*.md` and
 * the responses of a running mock. Nothing is typed twice, so nothing can drift.
 *
 * It is deterministic on purpose: the walk is in registry order, JSON and YAML
 * are emitted with a stable key order, arrays and strings in the captured
 * examples are trimmed to fixed lengths, and every instant a server invents is
 * normalised. Running it twice produces no diff; the only line that moves
 * between commits is `generatedFrom: <git commit>`.
 *
 *   --baseUrl=<url>    the API to capture from (default http://localhost:4000/api)
 *   --skip-capture     reuse `.tmp/examples.json`, or mark the examples missing
 *   --quiet            only print the summary
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const { allEndpoints } = require('../src/services/endpoints');
const { captureExamples } = require('./lib/guidelines/capture');
const documents = require('./lib/guidelines/documents');
const { readNotes, render, section } = require('./lib/guidelines/merge');
const { blocks, code, table } = require('./lib/guidelines/markdown');
const { buildCollection, buildEnvironment } = require('./lib/guidelines/postman');
const { renderOpenApi } = require('./lib/guidelines/openapi');
const { renderDdl } = require('./lib/guidelines/sql');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'backend_developer_guidelines');
const TMP = path.join(OUT, '.tmp');
const TEMPLATES = path.join(__dirname, 'lib', 'guidelines', 'templates');
const NOTES = path.join(ROOT, 'docs', 'backend-notes');

/* ------------------------------------------------------------------ *
 * Arguments
 * ------------------------------------------------------------------ */

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const option = (name, fallback) => {
  const found = argv.find((entry) => entry.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : fallback;
};

const options = {
  baseUrl: String(option('baseUrl', 'http://localhost:4000/api')).replace(/\/+$/, ''),
  skipCapture: flag('skip-capture'),
  quiet: flag('quiet'),
};

const log = (message) => {
  if (!options.quiet) console.log(message);
};

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** The commit the package was generated from — the one line allowed to move. */
function gitCommit() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim();
  } catch {
    return 'unknown (not a git checkout)';
  }
}

/** Writes a file with LF endings and exactly one trailing newline. */
function writeFile(name, contents) {
  const body = `${String(contents).replace(/\r\n/g, '\n').replace(/\s+$/, '')}\n`;
  fs.writeFileSync(path.join(OUT, name), body, 'utf8');
  return Buffer.byteLength(body, 'utf8');
}

/** Writes JSON with a fixed indent, so two runs produce the same bytes. */
const writeJson = (name, value) => writeFile(name, JSON.stringify(value, null, 2));

/** `db.json`, copied byte for byte. */
function copySeed() {
  const source = path.join(ROOT, 'db.json');
  fs.copyFileSync(source, path.join(OUT, 'db.json'));
  return fs.statSync(source).size;
}

/** A template, rendered. */
function renderTemplate(name, values) {
  const template = fs.readFileSync(path.join(TEMPLATES, name), 'utf8');
  return render(template, values, `templates/${name}`);
}

/** Every section of one notes file, keyed by camelCase anchor. */
function notesOf(notes, stem) {
  const camel = (key) => key.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
  return Object.fromEntries(
    Object.keys(notes[stem] ?? {})
      .filter(Boolean)
      .map((key) => [camel(key), section(notes, `${stem}.${key}`)])
  );
}

/* ------------------------------------------------------------------ *
 * The documents that need more than one source
 * ------------------------------------------------------------------ */

/** The file list of `README.md`, with the size of each generated file. */
function fileList(sizes) {
  const purpose = {
    'README.md': 'this file — orientation, the switch-over, the parity checklist',
    '01_API_CONTRACT.md': 'envelopes, errors, auth, pagination, filters, write semantics, slugs',
    '02_AUTH_AND_RBAC.md': 'the token flow and who may call what, endpoint by endpoint',
    '03_ENDPOINTS.md':
      'every endpoint: parameters, Laravel rules, a captured example, errors, side effects',
    '04_DATA_MODELS.md': 'every collection and field, the relational mapping and the enumerations',
    'schema.sql': 'MySQL 8 DDL — run it, then import the seed',
    '05_BUSINESS_RULES.md': 'the formulas: search, facets, leads, the dashboard, exports, guards',
    '06_SEO_SITEMAP_ROBOTS.md': 'the nine documents the API serves to crawlers',
    '07_DEPLOYMENT.md': 'environment, Nginx, security headers, switch-over, rollback, go-live',
    '08_TESTING_AND_PARITY.md': 'how to prove the two backends answer the same',
    'postman_collection.json': 'every endpoint as a request, with tests and saved responses',
    'postman_environment.json': 'the local mock, with the production values alongside',
    'openapi.yaml': 'OpenAPI 3.1 for tooling and client generation',
    'db.json': 'the seed, byte-identical to the repository copy',
    'seed-mapping.md': 'how to import `db.json` into MySQL',
  };

  return table(
    ['File', 'What it is', 'Size'],
    Object.entries(purpose).map(([name, what]) => [
      `\`${name}\``,
      what,
      // The README is written last, so its own size is not known while its file
      // list is being rendered — and saying "this file" is more use than a dash.
      name === 'README.md' ? 'this file' : `${Math.round(sizes[name] / 1024)} kB`,
    ])
  );
}

/**
 * The support matrix: every endpoint, and whether v1 needs it.
 *
 * "Optional" is not a guess — it is the handful whose absence the frontend
 * already survives, because the feature hides itself when the call fails.
 */
const OPTIONAL = {
  'properties.view': 'the counter simply does not move',
  'adminRedirects.import': 'the admin still adds redirects one at a time',
  'adminRedirects.exportCsv': 'the list is visible on screen',
  'adminSeo.llmsPreview': 'the SEO settings screen hides the preview button',
  'adminNewsletterSubscribers.exportCsv': 'the list is visible on screen',
  'sitemap.llms': 'nothing on the site reads it; crawlers do',
  'redirects.resolve': 'used by the smoke test; the SPA resolves client-side',
  'properties.counts':
    'the home page falls back to one `GET /properties?perPage=1` a tile on 404 or 501',
  'adminHeaderMenus.checkSlug':
    'nothing calls it: a menu’s slug is derived from its name and kept (422 on a clash)',
};

function supportMatrix() {
  const rows = allEndpoints().map((endpoint) => [
    `\`${endpoint.method} ${endpoint.path}\``,
    endpoint.module,
    OPTIONAL[endpoint.key] ? 'optional' : '**required for v1**',
    OPTIONAL[endpoint.key] ?? endpoint.description,
  ]);
  return table(['Endpoint', 'Module', 'Status', 'Notes'], rows);
}

/** The seed's robots.txt, with `%siteurl%` resolved as the API resolves it. */
function robotsDefault() {
  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'db.json'), 'utf8'));
  const settings = seed.seoSettings ?? {};
  const siteUrl = String(settings.siteUrl ?? '').replace(/\/+$/, '');
  return code(String(settings.robotsTxt ?? '').replace(/%siteurl%/g, siteUrl), 'text');
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

async function main() {
  const generatedFrom = gitCommit();
  const notes = readNotes(NOTES);

  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(TMP, { recursive: true });

  const examplesFile = path.join(TMP, 'examples.json');
  let examples = {};

  if (options.skipCapture) {
    if (fs.existsSync(examplesFile)) {
      examples = JSON.parse(fs.readFileSync(examplesFile, 'utf8'));
      log(`reusing ${Object.keys(examples).length} captured examples`);
    } else {
      log('no captured examples — the package will say so, and check:guidelines will fail');
    }
  } else {
    log(`capturing examples from ${options.baseUrl}`);
    const captured = await captureExamples({
      baseUrl: options.baseUrl,
      accounts: {
        admin: { email: 'admin@squaresnacres.com', password: 'Admin@123' },
        manager: { email: 'manager@squaresnacres.com', password: 'Manager@123' },
        sales: { email: 'sales@squaresnacres.com', password: 'Sales@123' },
      },
      log,
    });
    examples = captured.examples;
    fs.writeFileSync(examplesFile, `${JSON.stringify(examples, null, 2)}\n`, 'utf8');

    if (captured.failures.length > 0) {
      console.warn(`\n${captured.failures.length} endpoint(s) did not answer as expected:`);
      for (const failure of captured.failures) {
        console.warn(`  ${failure.key}: ${failure.status} ${String(failure.note).slice(0, 120)}`);
      }
      console.warn('The examples for those endpoints show what the mock actually answered.\n');
    }
  }

  const missing = allEndpoints()
    .filter((endpoint) => endpoint.example === undefined || endpoint.example === null)
    .filter((endpoint) => /:[a-zA-Z]+/.test(endpoint.path));
  if (missing.length > 0) {
    throw new Error(
      'These registry entries have a path parameter but no `example`, so nothing can be captured:\n' +
        missing.map((endpoint) => `  ${endpoint.key}  ${endpoint.path}`).join('\n') +
        '\nAdd an `example` to src/services/endpoints.js.'
    );
  }

  const sizes = {};
  const write = (name, contents) => {
    sizes[name] = writeFile(name, contents);
  };

  /* ---- the generated documents ---- */

  write(
    '01_API_CONTRACT.md',
    renderTemplate('01_API_CONTRACT.md', {
      ...documents.apiContract({ generatedFrom, examples }),
      notesVersioning: section(notes, '01_api_contract.versioning-policy'),
      notesCaching: section(notes, '01_api_contract.caching-headers'),
      notesCors: section(notes, '01_api_contract.cors'),
      notesRateLimiting: section(notes, '01_api_contract.rate-limiting'),
      notesCounts: section(notes, '01_api_contract.category-counts'),
      notesPlanned: section(notes, '01_api_contract.planned-additions'),
    })
  );

  write(
    '02_AUTH_AND_RBAC.md',
    renderTemplate('02_AUTH_AND_RBAC.md', {
      ...documents.authAndRbac({ generatedFrom, examples }),
      notesTokenFlow: section(notes, '02_auth.token-flow'),
      notesTokenLifetime: section(notes, '02_auth.token-lifetime'),
      notesSeedPasswords: section(notes, '02_auth.seed-passwords'),
      notesSalesScoping: section(notes, '02_auth.sales-scoping'),
    })
  );

  write(
    '03_ENDPOINTS.md',
    renderTemplate('03_ENDPOINTS.md', documents.endpointsDocument({ generatedFrom, examples }))
  );

  write(
    '04_DATA_MODELS.md',
    renderTemplate('04_DATA_MODELS.md', {
      ...documents.dataModels({ generatedFrom }),
      notesChildTables: section(notes, '04_relational_mapping.child-tables'),
      notesJsonColumns: section(notes, '04_relational_mapping.json-columns'),
      notesNaming: section(notes, '04_relational_mapping.naming'),
      notesIndexes: section(notes, '04_relational_mapping.indexes'),
    })
  );

  write(
    '05_BUSINESS_RULES.md',
    renderTemplate('05_BUSINESS_RULES.md', {
      generatedFrom,
      ...notesOf(notes, '05_business_rules'),
    })
  );

  write(
    '06_SEO_SITEMAP_ROBOTS.md',
    renderTemplate('06_SEO_SITEMAP_ROBOTS.md', {
      generatedFrom,
      notesSitemaps: section(notes, '06_seo.sitemaps'),
      notesLastmod: section(notes, '06_seo.lastmod-and-caching'),
      notesRobots: section(notes, '06_seo.robotstxt'),
      notesSitemapHost: section(notes, '06_seo.the-host-the-index-names'),
      notesRss: section(notes, '06_seo.rss'),
      notesLlms: section(notes, '06_seo.llmstxt'),
      notesRedirects: section(notes, '06_seo.redirects'),
      notesNotFoundLog: section(notes, '06_seo.the-404-log'),
      notesCanonicalHost: section(notes, '06_seo.canonical-host'),
      notesEscaping: section(notes, '06_seo.escaping'),
      robotsDefault: robotsDefault(),
      sitemapIndexExample: documents.exampleBlock(examples['sitemap.index']),
      sitemapPropertiesExample: documents.exampleBlock(examples['sitemap.properties']),
      rssExample: documents.exampleBlock(examples['sitemap.rss']),
      llmsExample: documents.exampleBlock(examples['sitemap.llms']),
      redirectsExample: documents.exampleBlock(examples['redirects.list']),
    })
  );

  write(
    '07_DEPLOYMENT.md',
    renderTemplate('07_DEPLOYMENT.md', {
      generatedFrom,
      ...notesOf(notes, '07_deployment'),
    })
  );

  write(
    '08_TESTING_AND_PARITY.md',
    renderTemplate('08_TESTING_AND_PARITY.md', {
      generatedFrom,
      runningBoth: section(notes, '08_testing.running-both'),
      comparingResponses: section(notes, '08_testing.comparing-responses'),
      postman: section(notes, '08_testing.postman'),
      acceptanceChecklist: section(notes, '08_testing.acceptance-checklist'),
    })
  );

  write(
    'seed-mapping.md',
    renderTemplate('seed-mapping.md', documents.seedMapping({ generatedFrom }))
  );

  /* ---- the machine-readable half ---- */

  write('schema.sql', renderDdl({ generatedFrom }));
  sizes['postman_collection.json'] = writeJson(
    'postman_collection.json',
    buildCollection({ generatedFrom, examples })
  );
  sizes['postman_environment.json'] = writeJson(
    'postman_environment.json',
    buildEnvironment({ generatedFrom })
  );
  write(
    'openapi.yaml',
    renderOpenApi({
      generatedFrom,
      version: require('../package.json').version,
      examples,
    })
  );
  sizes['db.json'] = copySeed();

  /* ---- the README last: it lists the sizes of everything above ---- */

  const modules = new Set(allEndpoints().map((endpoint) => endpoint.module));
  write(
    'README.md',
    renderTemplate('README.md', {
      generatedFrom,
      endpointCount: String(allEndpoints().length),
      moduleCount: String(modules.size),
      fileList: fileList(sizes),
      supportMatrix: supportMatrix(),
      // A Postman variable the reader types, not a token of this template.
      token: '{{token}}',
    })
  );
  sizes['README.md'] = fs.statSync(path.join(OUT, 'README.md')).size;

  /* ---- summary ---- */

  log('');
  log(
    blocks(
      table(
        ['File', 'Bytes'],
        Object.keys(sizes)
          .sort()
          .map((name) => [name, String(sizes[name])])
      )
    )
  );
  const captured = Object.values(examples).filter((entry) => entry && entry.request).length;
  log(
    `\n${Object.keys(sizes).length} files, ${allEndpoints().length} endpoints, ` +
      `${captured} captured examples, generatedFrom ${generatedFrom}.`
  );
  log('Run `npm run check:guidelines` to verify coverage.');
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
});
