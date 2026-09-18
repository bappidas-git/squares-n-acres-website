#!/usr/bin/env node
/**
 * `.env.example` completeness check (prompt 48 §4.9).
 *
 *   npm run check:env
 *
 * `.env.example` is the only map a new developer has of the variables this
 * project reads, and `src/services/http.js` throws at module load when
 * `REACT_APP_API_URL` is missing — so a variable that is read in code but
 * absent from the example file costs somebody a debugging session for no
 * reason. Nothing enforces the two stay in step, so this script does:
 *
 *   1. every variable read in `src/`, `mock-server/` and `scripts/` is
 *      declared in `.env.example`
 *   2. every declaration carries an explanatory comment above it
 *   3. `.env.example` declares nothing the code never reads
 *   4. `.env.development` and `.env.production.example` declare only keys
 *      `.env.example` documents
 *   5. required variables ship with a working local value; optional ones are
 *      empty or carry their documented default
 *
 * It reads only files, so it needs no server and belongs in `check:all`.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXAMPLE = path.join(ROOT, '.env.example');

/** The trees whose `process.env` reads must be documented. */
const SCANNED = ['src', 'mock-server', 'scripts'];

const SCANNED_EXTENSIONS = new Set(['.js', '.jsx']);

/** Directories that hold no source of ours. */
const SKIPPED_DIRS = new Set(['node_modules', 'build', 'coverage', '.runtime']);

/**
 * Variables the project reads whose value the toolchain supplies, so they must
 * *not* be declared in `.env.example`: setting them by hand breaks the build.
 */
const TOOLCHAIN = new Map([
  ['NODE_ENV', 'set by react-scripts and by `node --test`; never set it by hand'],
  ['CI', 'set by `cross-env CI=true` in the `:ci` scripts and by the CI runner'],
  ['PUBLIC_URL', 'set by react-scripts from `homepage` in package.json'],
]);

/**
 * The variables that must carry a value in `.env.example` for a fresh clone to
 * run against the mock, with the value prompt 48 expects. Everything else is
 * optional and ships empty or with its documented default.
 */
const REQUIRED = new Map([
  ['REACT_APP_API_URL', 'http://localhost:4000/api'],
  ['REACT_APP_SITE_URL', 'http://localhost:3000'],
  ['REACT_APP_SITE_NAME', 'Squares N Acres'],
]);

/**
 * Variables whose value is a credential or a path to something on one
 * developer's machine: `.env.example` must leave them empty so nobody commits
 * a key and nobody inherits a path that does not exist. Listed by name rather
 * than matched on a substring, because `MOCK_TOKEN_TTL_HOURS` is a duration
 * with a legitimate default, not a token.
 */
const MUST_BE_EMPTY = [
  'REACT_APP_CLOUDINARY_CLOUD_NAME',
  'REACT_APP_CLOUDINARY_UPLOAD_PRESET',
  'REACT_APP_GOOGLE_MAPS_KEY',
  'CHROME_PATH',
];

/* ------------------------------------------------------------------ *
 * Reporting (same shape as check-guidelines.js)
 * ------------------------------------------------------------------ */

const problems = [];
const checks = [];

const check = (name, ok, detail = '') => {
  checks.push({ name, ok, detail });
  if (!ok) problems.push({ name, detail });
};

/** Reports one group at a time, so a failure names what is wrong. */
function checkAll(name, expected, ok, describe = (entry) => entry) {
  const bad = expected.filter((entry) => !ok(entry));
  check(
    `${name} (${expected.length})`,
    bad.length === 0,
    bad.length === 0
      ? ''
      : `${bad.length}: ${bad.slice(0, 10).map(describe).join(', ')}${bad.length > 10 ? ', …' : ''}`
  );
}

/* ------------------------------------------------------------------ *
 * Reading the code
 * ------------------------------------------------------------------ */

/** Every `.js`/`.jsx` file under `dir`, recursively. */
function sourceFiles(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.runtime') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) sourceFiles(full, found);
    } else if (SCANNED_EXTENSIONS.has(path.extname(entry.name))) {
      found.push(full);
    }
  }
  return found;
}

/**
 * Every variable the scanned trees read, mapped to the files that read it.
 * Matches the dotted and the bracketed form of a `process.env` read alike.
 * (Written without a literal example on purpose: this file is scanned too.)
 */
function readVariables() {
  const pattern = /process\.env(?:\.([A-Za-z_][A-Za-z0-9_]*)|\[\s*['"]([^'"]+)['"]\s*\])/g;
  const reads = new Map();

  for (const dir of SCANNED) {
    for (const file of sourceFiles(path.join(ROOT, dir))) {
      const text = fs.readFileSync(file, 'utf8');
      for (const match of text.matchAll(pattern)) {
        const name = match[1] ?? match[2];
        const relative = path.relative(ROOT, file).split(path.sep).join('/');
        if (!reads.has(name)) reads.set(name, new Set());
        reads.get(name).add(relative);
      }
    }
  }
  return reads;
}

/* ------------------------------------------------------------------ *
 * Reading .env.example
 * ------------------------------------------------------------------ */

/**
 * Parses an env file into `{ name: { value, comment, line } }`. `comment` is
 * the run of `#` lines directly above the assignment, which is what "declared
 * with a comment" means — a section banner two blank lines up explains a group,
 * not the variable.
 */
function parseEnv(file) {
  const declared = new Map();
  if (!fs.existsSync(file)) return declared;

  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  let comment = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      // A `# --- Section ----` banner introduces a group, not a variable.
      if (!/^#\s*-{2,}/.test(trimmed)) comment.push(trimmed.replace(/^#\s?/, ''));
      return;
    }
    if (trimmed === '') {
      comment = [];
      return;
    }
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (match) {
      declared.set(match[1], {
        value: match[2].trim(),
        comment: comment.join(' ').trim(),
        line: index + 1,
      });
    }
    comment = [];
  });

  return declared;
}

/* ------------------------------------------------------------------ *
 * The checks
 * ------------------------------------------------------------------ */

function main() {
  if (!fs.existsSync(EXAMPLE)) {
    console.error('.env.example does not exist — every variable must be documented there.');
    process.exitCode = 1;
    return;
  }

  const reads = readVariables();
  const declared = parseEnv(EXAMPLE);

  const documentable = [...reads.keys()].filter((name) => !TOOLCHAIN.has(name)).sort();

  /* 1 — every variable the code reads is declared */
  checkAll(
    'variables read in code and declared in .env.example',
    documentable,
    (name) => declared.has(name),
    (name) => `${name} (read in ${[...reads.get(name)].slice(0, 2).join(', ')})`
  );

  /* 2 — every declaration is explained */
  checkAll(
    'declarations with an explanatory comment',
    [...declared.keys()],
    (name) => declared.get(name).comment.length >= 10,
    (name) => `${name} (line ${declared.get(name).line})`
  );

  /* 3 — nothing declared that nothing reads, and nothing the toolchain owns */
  const unread = [...declared.keys()].filter((name) => !reads.has(name));
  check(
    'no declaration the code never reads',
    unread.length === 0,
    unread.length === 0 ? '' : `${unread.join(', ')} — remove, or read it somewhere`
  );

  const toolchainDeclared = [...declared.keys()].filter((name) => TOOLCHAIN.has(name));
  check(
    'no toolchain variable declared',
    toolchainDeclared.length === 0,
    toolchainDeclared.map((name) => `${name} — ${TOOLCHAIN.get(name)}`).join('; ')
  );

  /* 4 — the committed env files stay inside the documented set */
  for (const name of ['.env.development', '.env.production.example']) {
    const file = path.join(ROOT, name);
    if (!fs.existsSync(file)) {
      check(`${name} exists`, false, 'committed env files are listed in 00_MASTER_CONTEXT.md §3.5');
      continue;
    }
    const keys = [...parseEnv(file).keys()];
    checkAll(`${name} keys documented in .env.example`, keys, (key) => declared.has(key));
  }

  /* 5 — required variables work out of the box, optional ones stay empty */
  checkAll(
    'required variables carry their local value',
    [...REQUIRED.keys()],
    (name) => declared.get(name)?.value === REQUIRED.get(name),
    (name) =>
      `${name} is "${declared.get(name)?.value ?? '(absent)'}", expected "${REQUIRED.get(name)}"`
  );

  checkAll(
    'credentials and machine paths ship empty',
    MUST_BE_EMPTY,
    (name) => declared.has(name) && declared.get(name).value === '',
    (name) => `${name} is "${declared.get(name)?.value ?? '(absent)'}", expected empty`
  );

  report(documentable.length, declared.size);
}

function report(read, documented) {
  const width = Math.max(...checks.map((entry) => entry.name.length), 10);
  for (const entry of checks) {
    console.log(`${entry.ok ? 'ok  ' : 'FAIL'} ${entry.name.padEnd(width)}  ${entry.detail}`);
  }

  console.log(
    `\n${checks.filter((entry) => entry.ok).length}/${checks.length} checks passed — ` +
      `${read} variable(s) read in code, ${documented} declared in .env.example.`
  );

  if (problems.length > 0) {
    console.log('\nProblems:');
    for (const problem of problems) {
      console.log(`  ${problem.name}${problem.detail ? ` — ${problem.detail}` : ''}`);
    }
    console.log('\nDocument every variable in .env.example, with a comment above it.');
    process.exitCode = 1;
  }
}

main();
