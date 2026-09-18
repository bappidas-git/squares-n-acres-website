#!/usr/bin/env node
/**
 * Coverage check for `backend_developer_guidelines/` (prompt 47 §4.3).
 *
 *   npm run check:guidelines
 *
 * The package is generated, so it cannot be wrong by hand — but it can be
 * **stale**, or generated without the live examples, and either one hands the
 * Laravel developer a document that quietly omits an endpoint. This script
 * asserts the things a reader would otherwise have to check by counting:
 *
 *   1. every file of BDG-02 exists and is not empty
 *   2. every registry entry appears in `03_ENDPOINTS.md`, the Postman
 *      collection and `openapi.yaml`
 *   3. every collection appears in `04_DATA_MODELS.md` and `schema.sql`
 *   4. every `##` heading of `docs/backend-notes/` reached the package
 *   5. every endpoint carries a captured example
 *   6. `db.json` is byte-identical to the repository seed
 *   7. nothing carries a stale brand trace or an undocumented host
 *
 * It reads only files, so it needs no server and belongs in `check:all`.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { allEndpoints } = require('../src/services/endpoints');
const { MODELS } = require('../mock-server/schemas/models');
const { MAPPING } = require('./lib/guidelines/sql');
const { tableOf } = require('./lib/guidelines/rules');
const { readNotes } = require('./lib/guidelines/merge');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'backend_developer_guidelines');
const NOTES = path.join(ROOT, 'docs', 'backend-notes');

/** Every file BDG-02 requires. */
const REQUIRED_FILES = [
  'README.md',
  '01_API_CONTRACT.md',
  '02_AUTH_AND_RBAC.md',
  '03_ENDPOINTS.md',
  '04_DATA_MODELS.md',
  'schema.sql',
  '05_BUSINESS_RULES.md',
  '06_SEO_SITEMAP_ROBOTS.md',
  '07_DEPLOYMENT.md',
  '08_TESTING_AND_PARITY.md',
  'postman_collection.json',
  'postman_environment.json',
  'openapi.yaml',
  'db.json',
  'seed-mapping.md',
];

/**
 * Text that must never reach a handover package: the boilerplate's brand, the
 * markers of an unfinished document, and the artefacts of a template that
 * rendered nothing.
 */
const FORBIDDEN = [
  { re: /h\.o\.m/gi, why: 'boilerplate brand string' },
  { re: /\bhom advisory/gi, why: 'boilerplate brand string' },
  { re: /homadvisory/gi, why: 'boilerplate domain' },
  { re: /cloudwaysapps/gi, why: 'boilerplate API host' },
  { re: /placehold\.co/gi, why: 'placeholder image host' },
  { re: /dzbiw7t4i/gi, why: 'the boilerplate Cloudinary cloud' },
  { re: /video\.gumlet\.io/gi, why: 'boilerplate video host' },
  { re: /\byour-?domain\b/gi, why: 'placeholder domain' },
  { re: /\bexample\.org\b/gi, why: 'placeholder domain' },
  { re: /\bTODO\b|\bFIXME\b/g, why: 'unfinished marker' },
  { re: /lorem ipsum/gi, why: 'placeholder copy' },
  { re: /\[object Object\]/g, why: 'a value that was rendered without being formatted' },
  { re: /\bundefined\b/g, why: 'a template token with nothing behind it' },
];

/**
 * The only hosts of the project's own domain the package may name.
 * `www.` serves the site, `api.` serves the API, and the apex redirects to the
 * first; anything else is a placeholder somebody forgot to replace.
 */
const ALLOWED_HOSTS = new Set([
  'squaresnacres.com',
  'www.squaresnacres.com',
  'api.squaresnacres.com',
]);

/** Files whose content is data rather than prose, and is checked differently. */
const DATA_FILES = new Set(['db.json']);

/* ------------------------------------------------------------------ *
 * Reporting
 * ------------------------------------------------------------------ */

const problems = [];
const checks = [];

const check = (name, ok, detail = '') => {
  checks.push({ name, ok, detail });
  if (!ok) problems.push({ name, detail });
};

/** Reports one group at a time, so a failure names what is missing. */
function checkAll(name, expected, has) {
  const missing = expected.filter((entry) => !has(entry));
  check(
    `${name} (${expected.length})`,
    missing.length === 0,
    missing.length === 0
      ? ''
      : `${missing.length} missing: ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ', …' : ''}`
  );
}

/* ------------------------------------------------------------------ *
 * The checks
 * ------------------------------------------------------------------ */

function main() {
  if (!fs.existsSync(OUT)) {
    console.error(
      'backend_developer_guidelines/ does not exist.\n' +
        '  npm run mock                          # terminal 1\n' +
        '  npm run generate:backend-guidelines   # terminal 2'
    );
    process.exitCode = 1;
    return;
  }

  const read = (name) => fs.readFileSync(path.join(OUT, name), 'utf8');

  /* 1 — the files exist */
  checkAll('required files', REQUIRED_FILES, (name) => {
    const file = path.join(OUT, name);
    return fs.existsSync(file) && fs.statSync(file).size > 0;
  });
  if (problems.length > 0) return report();

  const endpointsDoc = read('03_ENDPOINTS.md');
  const openapi = read('openapi.yaml');
  const collection = JSON.parse(read('postman_collection.json'));
  const models = read('04_DATA_MODELS.md');
  const ddl = read('schema.sql');

  /* 2 — every registry entry, three times over */
  const endpoints = allEndpoints();

  const postmanText = JSON.stringify(collection);
  checkAll(
    'endpoints in 03_ENDPOINTS.md',
    endpoints.map((e) => e.key),
    (key) => endpointsDoc.includes(`\`${key}\``)
  );
  checkAll(
    'endpoint headings in 03_ENDPOINTS.md',
    endpoints.map((e) => `${e.method} ${e.path}`),
    (heading) => endpointsDoc.includes(`### ${heading}\n`)
  );
  checkAll(
    'endpoints in postman_collection.json',
    endpoints.map((e) => e.key),
    (key) => postmanText.includes(`**Registry key** \`${key}\``)
  );
  checkAll(
    'operations in openapi.yaml',
    endpoints.map((e) => e.key),
    (key) => openapi.includes(`operationId: ${key}`)
  );

  /* 3 — every collection, twice over */
  const collections = Object.keys(MODELS);
  checkAll('collections in 04_DATA_MODELS.md', collections, (name) =>
    models.includes(`### \`${name}\``)
  );
  checkAll('collections in schema.sql', collections, (name) =>
    ddl.includes(`-- collection: ${name}`)
  );
  checkAll(
    'tables in schema.sql',
    collections.map((name) => MAPPING[name]?.table ?? tableOf(name)),
    (table) => ddl.includes(`CREATE TABLE \`${table}\``)
  );

  /* 4 — every hand-written section reached the package */
  const notes = readNotes(NOTES);
  const packageText = REQUIRED_FILES.filter((name) => name.endsWith('.md'))
    .map((name) => read(name))
    .join('\n');

  const headings = Object.entries(notes).flatMap(([stem, sections]) =>
    Object.entries(sections)
      .filter(([key]) => key !== '')
      .map(([, value]) => ({ stem, heading: value.heading, body: value.body }))
  );
  checkAll(
    'sections of docs/backend-notes merged in',
    headings.map((entry) => `${entry.stem}: ${entry.heading}`),
    (label) => {
      const entry = headings.find((item) => `${item.stem}: ${item.heading}` === label);
      const firstLine = entry.body.split('\n').find((line) => line.trim() !== '') ?? '';
      return packageText.includes(firstLine.trim());
    }
  );

  /* 5 — the examples were captured
   *
   * Two absences read alike in the document and are not alike at all
   * (`lib/guidelines/documents.js`):
   *
   *   "No example was captured for this endpoint." — the generator ran with no
   *     capture, or the capture failed. A hole. This is what fails the check.
   *   "Not captured: <reason>."                   — a deliberate, explained
   *     skip: a write aimed at a throwaway fixture the run then deleted, so
   *     printing the request would document a lead, an application or a
   *     password change that no longer exists (prompt 47's capture decision).
   *
   * Only the first is a defect — but the count has to say so, or the line reads
   * "captured examples (242)" while three endpoints carry no payload, which is
   * the checker overstating its own coverage. */
  const sections = endpoints.map((endpoint) => ({
    endpoint,
    section: sectionOf(endpointsDoc, `### ${endpoint.method} ${endpoint.path}\n`),
  }));

  const holes = sections.filter(({ section }) => section.includes('No example was captured'));
  const explained = sections.filter(({ section }) => /_Not captured: [^_]+\._/.test(section));
  const captured = endpoints.length - holes.length - explained.length;

  check(
    `captured examples (${captured} captured, ${explained.length} explained skip` +
      `${explained.length === 1 ? '' : 's'}, of ${endpoints.length})`,
    holes.length === 0,
    holes.length === 0
      ? explained.map(({ endpoint }) => endpoint.key).join(', ')
      : `${holes.length} endpoint(s) have no example — run the generator with the mock up: ` +
          holes
            .slice(0, 8)
            .map(({ endpoint }) => endpoint.key)
            .join(', ')
  );

  /* 6 — the seed is a byte copy */
  const digest = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  check(
    'db.json is byte-identical to the seed',
    digest(path.join(ROOT, 'db.json')) === digest(path.join(OUT, 'db.json'))
  );

  /* 7 — nothing stale, no undocumented host */
  const stale = [];
  for (const name of REQUIRED_FILES) {
    if (DATA_FILES.has(name)) continue;
    const text = read(name);

    for (const { re, why } of FORBIDDEN) {
      const found = text.match(new RegExp(re.source, re.flags));
      if (found) stale.push(`${name}: ${found.length}× "${found[0]}" (${why})`);
    }

    const hosts = new Set(
      [...text.matchAll(/https?:\/\/([a-z0-9.-]*squaresnacres\.com)/gi)].map((match) =>
        match[1].toLowerCase()
      )
    );
    for (const host of hosts) {
      if (!ALLOWED_HOSTS.has(host)) stale.push(`${name}: undocumented host ${host}`);
    }
  }
  check('no stale traces or undocumented hosts', stale.length === 0, stale.slice(0, 8).join('; '));

  report();
}

/** The text of one `###` section of a Markdown document. */
function sectionOf(document, heading) {
  const start = document.indexOf(heading);
  if (start === -1) return '';
  const end = document.indexOf('\n### ', start + heading.length);
  return document.slice(start, end === -1 ? undefined : end);
}

function report() {
  const width = Math.max(...checks.map((entry) => entry.name.length), 10);
  for (const entry of checks) {
    console.log(`${entry.ok ? 'ok  ' : 'FAIL'} ${entry.name.padEnd(width)}  ${entry.detail}`);
  }

  const failed = problems.length;
  console.log(`\n${checks.filter((entry) => entry.ok).length}/${checks.length} checks passed.`);

  if (failed > 0) {
    console.log('\nProblems:');
    for (const problem of problems)
      console.log(`  ${problem.name}${problem.detail ? ` — ${problem.detail}` : ''}`);
    console.log('\nRegenerate with the mock running: npm run generate:backend-guidelines');
    process.exitCode = 1;
  }
}

main();
