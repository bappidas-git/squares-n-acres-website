#!/usr/bin/env node
/**
 * check-endpoints.js — keeps `src/services/endpoints.js` the only place in the
 * frontend that knows an API path (00_MASTER_CONTEXT.md §5.15).
 *
 * Three rules:
 *   1. `http-literal-path`   — an `http.*()` or `axios.*()` call with a string
 *                              literal path anywhere under `src/`.
 *   2. `service-path-literal`— an API path literal inside `src/services/*.js`
 *                              other than the registry itself.
 *   3. `registry-snake-case` — a registry `path` containing `_`; the contract
 *                              is camelCase and kebab-case only (§5.1).
 *
 * `scripts/check-endpoints.allow.json` is the migration's temporary escape
 * hatch: it lists the files that still talk to the HOM endpoints. Prompt 11
 * rewrites them and empties the list to `[]`.
 *
 * Usage:
 *   node scripts/check-endpoints.js            # exit 1 when findings exist
 *   node scripts/check-endpoints.js --report   # exit 0, print the summary
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_ONLY = process.argv.slice(2).includes('--report');
const ALLOW_FILE = path.join(__dirname, 'check-endpoints.allow.json');

const REGISTRY = 'src/services/endpoints.js';
const REGISTRY_TEST = 'src/services/endpoints.test.js';

const SCAN_DIR = 'src';
const EXTENSIONS = new Set(['.js', '.jsx']);
const SKIP_DIRS = new Set(['node_modules', 'build', 'coverage', '.git']);

/** The API path prefixes the contract owns (§5.14). */
const API_PREFIXES = [
  'admin',
  'auth',
  'properties',
  'leads',
  'articles',
  'localities',
  'developers',
  'pages',
  'settings',
  'seo',
  'media',
  'jobs',
  'newsletter',
  'redirects',
  'sitemap',
];

/** `http.get(`, `http.request(`, `axios.post(`, `axios(` … */
const CLIENT_CALL =
  /\b(?:http|axios)\s*(?:\.\s*(?:request|get|post|put|patch|delete|head|options)\s*)?\(/;

/** A quoted or templated string that starts with `/`. */
const LITERAL_PATH = /(['"`])\/[^'"`\n]*\1/;

/** A string literal that is one of the contract's paths. */
const API_PATH_LITERAL = new RegExp(`(['"\`])/(${API_PREFIXES.join('|')})(/[^'"\`\\n]*)?\\1`, 'g');

const readAllowList = () => {
  if (!fs.existsSync(ALLOW_FILE)) return [];
  const parsed = JSON.parse(fs.readFileSync(ALLOW_FILE, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`${path.relative(ROOT, ALLOW_FILE)} must contain an array of file paths`);
  }
  return parsed;
};

const ALLOWED = new Set(readAllowList());

function collectFiles(dir, found = []) {
  for (const item of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const relative = `${dir}/${item.name}`;
    if (item.isDirectory()) {
      if (!SKIP_DIRS.has(item.name)) collectFiles(relative, found);
    } else if (EXTENSIONS.has(path.extname(item.name))) {
      found.push(relative);
    }
  }
  return found;
}

/** `true` for `src/services/<name>.js` — not for files in a sub-directory. */
const isServiceFile = (file) => /^src\/services\/[^/]+\.js$/.test(file);

function scanFile(file) {
  const findings = [];
  const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split(/\r?\n/);

  lines.forEach((text, index) => {
    const line = index + 1;

    if (CLIENT_CALL.test(text) && LITERAL_PATH.test(text)) {
      findings.push({
        file,
        line,
        rule: 'http-literal-path',
        match: text.trim().slice(0, 120),
        message: 'HTTP call with a literal path — pass a registry entry instead',
      });
    }

    if (isServiceFile(file)) {
      for (const match of text.matchAll(API_PATH_LITERAL)) {
        findings.push({
          file,
          line,
          rule: 'service-path-literal',
          match: match[0],
          message: 'API path literal in a service — reference src/services/endpoints.js',
        });
      }
    }
  });

  return findings;
}

function scanRegistry() {
  const { allEndpoints } = require(path.join(ROOT, REGISTRY));
  return allEndpoints()
    .filter((entry) => entry.path.includes('_'))
    .map((entry) => ({
      file: REGISTRY,
      line: 0,
      rule: 'registry-snake-case',
      match: entry.path,
      message: `${entry.key} uses snake_case; the contract is camelCase (§5.1)`,
    }));
}

function main() {
  const files = collectFiles(SCAN_DIR).filter(
    (file) => file !== REGISTRY && file !== REGISTRY_TEST
  );

  const findings = [];
  const allowed = [];
  for (const file of files) {
    const fileFindings = scanFile(file);
    if (ALLOWED.has(file)) allowed.push(...fileFindings);
    else findings.push(...fileFindings);
  }
  findings.push(...scanRegistry());

  if (findings.length > 0) {
    for (const finding of findings) {
      const where = finding.line ? `${finding.file}:${finding.line}` : finding.file;
      console.log(`${where}: ${finding.match}  — ${finding.message} [${finding.rule}]`);
    }
  }

  const unusedAllowEntries = [...ALLOWED].filter(
    (file) => !allowed.some((finding) => finding.file === file)
  );

  console.log('\n--- check:endpoints summary ---');
  console.log(`files scanned:      ${files.length}`);
  console.log(`allow-listed files: ${ALLOWED.size}`);
  console.log(`allowed findings:   ${allowed.length}`);
  console.log(`blocking findings:  ${findings.length}`);
  if (unusedAllowEntries.length > 0) {
    console.log(
      `\nallow-list entries with no finding left (remove them): ${unusedAllowEntries.join(', ')}`
    );
  }

  if (REPORT_ONLY) process.exit(0);
  process.exit(findings.length > 0 ? 1 : 0);
}

main();
