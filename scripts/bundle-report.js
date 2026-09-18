#!/usr/bin/env node
/**
 * What did the build actually ship? (prompt 41 §4.2)
 *
 *   npm run build
 *   npm run analyze
 *
 * It reads `build/asset-manifest.json`, gzips every asset the manifest names,
 * and prints the entry chunks first and then the largest lazy chunks — the two
 * numbers that decide whether a phone on a Bengaluru 4G connection sees the
 * home page in under two and a half seconds (§8.6).
 *
 * Then it fails the check on the two things that must not be true:
 *
 * 1. **The public entry chunk is over the budget.** Everything a visitor must
 *    download before anything renders is in `main.*.js`; the budget is
 *    {@link BUDGET_BYTES} gzipped and it is deliberately the *smaller* of the
 *    two readings of "300 KB" — 300 000 bytes, not 307 200 — so a report that
 *    passes here passes however the number is quoted.
 *
 * 2. **Admin code leaked into it.** The admin panel is four fifths of this
 *    codebase and none of it belongs on a listing page. Route-level
 *    `React.lazy` is what keeps it out, and a single careless static import —
 *    a shared constant pulled from a form, a chart imported for its types —
 *    silently undoes that. The cheap, reliable check is to look for the names
 *    of the four heaviest admin-only modules in the entry chunk's own bytes:
 *    minification renames locals but it does not rename the string literals
 *    and component display names these modules carry.
 *
 * Exits non-zero when either is true, so `npm run analyze` is a gate rather
 * than a report nobody reads.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ------------------------------------------------------------------ *
 * The budget
 * ------------------------------------------------------------------ */

/** §8.6: the public entry chunk, gzipped. */
const BUDGET_BYTES = 300_000;

/**
 * Strings that may not appear in the public entry chunk.
 *
 * Each names one admin-only module that must stay in a chunk of its own: the
 * SEO panel (prompt 36), the Tiptap editor (32), the dashboard charts (29) and
 * the media library (39).
 */
const ADMIN_MARKERS = ['SeoPanel', 'RichTextEditor', 'recharts', 'MediaLibrary'];

/** How many of the lazy chunks the report lists. */
const TOP_CHUNKS = 12;

const BUILD_DIR = path.join(__dirname, '..', 'build');
const MANIFEST = path.join(BUILD_DIR, 'asset-manifest.json');

/* ------------------------------------------------------------------ *
 * Reading the build
 * ------------------------------------------------------------------ */

/** `123456` → `123.5 kB`, in the same 1000-byte kB the build report uses. */
const kb = (bytes) => `${(bytes / 1000).toFixed(2)} kB`;

/** The gzipped size of a file, at the level a CDN actually serves. */
function gzipSize(file) {
  return zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length;
}

/**
 * Every asset the manifest names, with both sizes.
 *
 * A manifest path is site-absolute (`/static/js/main.abc.js`); the leading
 * slash is dropped and the rest joined onto the build directory with
 * `path.join`, so the script works on Windows too (§3.4).
 *
 * @param {object} manifest the parsed `asset-manifest.json`
 * @param {string} [buildDir] where those paths are rooted — the tests point it
 *   at a fixture rather than at the repository's own build
 * @returns {Array<{name: string, file: string, raw: number, gzip: number}>}
 */
function readAssets(manifest, buildDir = BUILD_DIR) {
  const seen = new Set();
  const assets = [];

  for (const url of Object.values(manifest.files ?? {})) {
    const relative = String(url).replace(/^\/+/, '');
    if (!/\.(js|css)$/.test(relative)) continue;
    if (seen.has(relative)) continue;
    seen.add(relative);

    const file = path.join(buildDir, ...relative.split('/'));
    if (!fs.existsSync(file)) continue;

    assets.push({
      name: relative,
      file,
      raw: fs.statSync(file).size,
      gzip: gzipSize(file),
    });
  }

  return assets;
}

/** The entry assets, in the order the manifest lists them. */
function entryAssets(manifest, assets) {
  const wanted = (manifest.entrypoints ?? []).map((entry) => String(entry).replace(/^\/+/, ''));
  return wanted.map((name) => assets.find((asset) => asset.name === name)).filter(Boolean);
}

/** The one JavaScript entry chunk — `main.*.js`, the public bundle. */
function mainChunk(entries) {
  return entries.find((asset) => /^static\/js\/main\.[^/]*\.js$/.test(asset.name)) ?? null;
}

/** Which of {@link ADMIN_MARKERS} the file's own bytes contain. */
function adminMarkersIn(file) {
  const source = fs.readFileSync(file, 'utf8');
  return ADMIN_MARKERS.filter((marker) => source.includes(marker));
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

function main() {
  if (!fs.existsSync(MANIFEST)) {
    console.error(`No ${path.relative(process.cwd(), MANIFEST)}. Run \`npm run build\` first.`);
    return 1;
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const assets = readAssets(manifest);
  if (assets.length === 0) {
    console.error('The asset manifest names no JavaScript or CSS at all.');
    return 1;
  }

  const entries = entryAssets(manifest, assets);
  const entryNames = new Set(entries.map((asset) => asset.name));
  const lazy = assets
    .filter((asset) => !entryNames.has(asset.name))
    .sort((left, right) => right.gzip - left.gzip);

  const totalGzip = assets.reduce((sum, asset) => sum + asset.gzip, 0);
  const entryGzip = entries.reduce((sum, asset) => sum + asset.gzip, 0);

  console.log('Bundle report — sizes are gzip (level 9), kB = 1000 bytes.\n');

  console.log('Entry (downloaded before anything renders):');
  for (const asset of entries) {
    console.log(`  ${kb(asset.gzip).padStart(10)}  ${asset.name}  (raw ${kb(asset.raw)})`);
  }
  console.log(`  ${kb(entryGzip).padStart(10)}  — entry total\n`);

  console.log(`Largest of the ${lazy.length} lazy chunks:`);
  for (const asset of lazy.slice(0, TOP_CHUNKS)) {
    console.log(`  ${kb(asset.gzip).padStart(10)}  ${asset.name}`);
  }
  if (lazy.length > TOP_CHUNKS) {
    const rest = lazy.slice(TOP_CHUNKS).reduce((sum, asset) => sum + asset.gzip, 0);
    console.log(`  ${kb(rest).padStart(10)}  — the other ${lazy.length - TOP_CHUNKS} chunks`);
  }
  console.log(`\n  ${kb(totalGzip).padStart(10)}  — every asset in the build\n`);

  /* ---------------- the two gates ---------------- */

  const failures = [];
  const main = mainChunk(entries);

  if (!main) {
    failures.push('The manifest names no `static/js/main.*.js` entry chunk.');
  } else {
    const over = main.gzip - BUDGET_BYTES;
    if (over > 0) {
      failures.push(
        `The public entry chunk is ${kb(main.gzip)} gzip — ${kb(over)} over the ` +
          `${kb(BUDGET_BYTES)} budget (§8.6). Split something out with \`React.lazy\`.`
      );
    } else {
      console.log(
        `Budget: ${kb(main.gzip)} / ${kb(BUDGET_BYTES)} gzip — ` +
          `${kb(-over)} to spare in the public entry chunk.`
      );
    }

    const leaked = adminMarkersIn(main.file);
    if (leaked.length > 0) {
      failures.push(
        `Admin code is in the public entry chunk: ${leaked.join(', ')}. ` +
          'Something on a public route imports it statically.'
      );
    } else {
      console.log(`No admin markers in the entry chunk (${ADMIN_MARKERS.join(', ')}).`);
    }
  }

  if (failures.length > 0) {
    console.error('\nBundle report FAILED:');
    failures.forEach((failure) => console.error(`  • ${failure}`));
    return 1;
  }

  console.log('\nBundle report passed.');
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (thrown) {
    console.error(thrown.message);
    process.exitCode = 1;
  }
}

module.exports = {
  ADMIN_MARKERS,
  BUDGET_BYTES,
  adminMarkersIn,
  entryAssets,
  mainChunk,
  readAssets,
};
