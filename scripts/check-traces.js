#!/usr/bin/env node
/**
 * check-traces.js — scans the repository for leftover traces of the
 * "H.O.M Advisory" boilerplate (brand strings, the Cloudways API host, the HOM
 * palette and fonts, the old Cloudinary cloud, Gumlet videos and placehold.co
 * placeholders), for hex colour literals outside the files that are allowed to
 * hold them, and — in `src/` only — for the placeholder copy and the
 * scaffolding markers of prompt 43 (lorem ipsum, TODO, FIXME, "Coming in
 * prompt", "placeholder until", "dummy").
 *
 * Patterns and scanned paths follow 00_MASTER_CONTEXT.md §13 D17.
 *
 * `scripts/check-traces.allow.json` carries the temporary exemptions of the
 * migration (see ALLOW_FILE below). It is emptied by the design-system prompt,
 * after which the scan is strict everywhere.
 *
 * Usage:
 *   node scripts/check-traces.js            # exit 1 when findings exist
 *   node scripts/check-traces.js --report   # exit 0, print totals only
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const REPORT_ONLY = process.argv.slice(2).includes('--report');
const ALLOW_FILE = path.join(__dirname, 'check-traces.allow.json');

/** Directories scanned recursively. */
const SCAN_DIRS = ['src', 'public', 'mock-server', 'scripts', 'docs'];

/** Individual files scanned when they exist. */
const SCAN_FILES = ['db.json', 'README.md', 'package.json'];

/** Directories never entered, wherever they appear. */
const SKIP_DIRS = new Set([
  'node_modules',
  'build',
  'coverage',
  'prompts',
  '.git',
  '.runtime',
  'dist',
]);

/** Paths (relative, posix separators) never scanned. */
const SKIP_PATHS = [
  'docs/archive',
  // QA evidence files are verbatim tool output and quote what the tools found.
  'docs/QA',
  // This file contains the patterns themselves.
  'scripts/check-traces.js',
];

/** Extensions treated as binary and skipped. */
const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
  '.mp4',
  '.webm',
  '.mp3',
  '.pdf',
  '.zip',
  '.gz',
  '.map',
]);

/** Brand / legacy traces — all case-insensitive (D17). */
const TRACE_PATTERNS = [
  { id: 'hom-dotted', re: /h\.o\.m/gi, label: 'H.O.M brand string' },
  { id: 'hom-advisory', re: /\bhom advisory/gi, label: 'HOM Advisory brand string' },
  { id: 'homadvisory', re: /homadvisory/gi, label: 'homadvisory domain/handle' },
  { id: 'home-office-market', re: /home office market/gi, label: 'HOM tagline' },
  { id: 'hom-underscore', re: /\bhom_/gi, label: 'hom_ identifier/storage key' },
  { id: 'hom-hyphen', re: /\bhom-/gi, label: 'hom- identifier' },
  { id: 'hom-class', re: /\.hom-/gi, label: '.hom- CSS class' },
  { id: 'cloudways', re: /cloudwaysapps/gi, label: 'Cloudways API host' },
  { id: 'palette-navy', re: /#1B2A4A/gi, label: 'HOM palette navy' },
  { id: 'palette-navy-light', re: /#2D4470/gi, label: 'HOM palette navy light' },
  { id: 'palette-navy-dark', re: /#111C33/gi, label: 'HOM palette navy dark' },
  { id: 'palette-gold', re: /#C9A86C/gi, label: 'HOM palette gold' },
  { id: 'palette-gold-light', re: /#D4BC8E/gi, label: 'HOM palette gold light' },
  { id: 'palette-gold-dark', re: /#B08E4A/gi, label: 'HOM palette gold dark' },
  { id: 'palette-cream', re: /#F8F6F3/gi, label: 'HOM palette cream' },
  { id: 'palette-navy-alt', re: /#2d3f63/gi, label: 'HOM palette navy (alt)' },
  { id: 'font-playfair', re: /playfair/gi, label: 'HOM font Playfair Display' },
  { id: 'font-dm-sans', re: /dm sans/gi, label: 'HOM font DM Sans' },
  { id: 'font-outfit', re: /\boutfit\b/gi, label: 'HOM font Outfit' },
  { id: 'cloudinary-old', re: /dzbiw7t4i/gi, label: 'old Cloudinary cloud' },
  { id: 'gumlet', re: /video\.gumlet\.io/gi, label: 'Gumlet video host' },
  { id: 'placehold', re: /placehold\.co/gi, label: 'placehold.co placeholder' },
  { id: 'goldenrod', re: /goldenrod/gi, label: 'goldenrod placeholder colour' },
];

/**
 * Copy patterns — the leftovers of writing the site rather than of the
 * boilerplate (prompt 43, §14). Placeholder prose, scaffolding notes and the
 * two comment markers that always promise a later edit that never comes.
 *
 * They are scanned in **`src/` only** (COPY_SCAN_PREFIX): `prompts/` is the
 * specification, which says "Coming in prompt" on purpose, and `docs/` records
 * what was found — a report that may not quote its own findings is useless.
 * Both are still scanned for the brand traces above.
 */
const COPY_PATTERNS = [
  { id: 'lorem', re: /lorem ipsum/gi, label: 'lorem ipsum placeholder text' },
  { id: 'todo', re: /\btodo\b/gi, label: 'TODO marker' },
  { id: 'fixme', re: /\bfixme\b/gi, label: 'FIXME marker' },
  { id: 'coming-in-prompt', re: /coming in prompt/gi, label: '"Coming in prompt" placeholder' },
  { id: 'placeholder-until', re: /placeholder until/gi, label: '"placeholder until" note' },
  { id: 'dummy', re: /\bdummy\b/gi, label: 'dummy placeholder' },
];

/** Only files under this prefix are scanned for `COPY_PATTERNS`. */
const COPY_SCAN_PREFIX = 'src/';

/**
 * Trace patterns that are colour literals. Together with the generic hex scan
 * they form the "colour literal" class, which the allow file can downgrade to
 * report-only while the design system is still the boilerplate's.
 */
const COLOUR_PATTERN_IDS = new Set(
  TRACE_PATTERNS.filter((p) => p.id.startsWith('palette-')).map((p) => p.id)
);
const isColourFinding = (finding) => finding.kind === 'hex' || COLOUR_PATTERN_IDS.has(finding.id);

/**
 * Words that legitimately contain "hom" and must never be reported.
 * A match is discarded when the matched text, extended to the full surrounding
 * word, is one of these.
 */
const ALLOW_LIST = ['home', 'homes', 'homepage', 'home-loan', 'home loan', 'hometown'];

/**
 * Files allowed to contain hex colour literals.
 *
 * The two token files are the design system's home (§2.4). `public/index.html`
 * (`theme-color`) and `public/manifest.json` (`theme_color`,
 * `background_color`) are browser/OS chrome: neither can reference a CSS
 * variable, so their literals are structural, not a styling decision.
 */
const HEX_ALLOWED_FILES = new Set([
  'src/assets/styles/global.css',
  'src/theme.js',
  'public/index.html',
  'public/manifest.json',
]);

/** Directory prefixes allowed to contain hex colour literals. */
const HEX_ALLOWED_PREFIXES = ['src/seo/data/', 'public/brand/'];

const HEX_RE = /#[0-9a-f]{3,8}\b/gi;

/** A NUL byte marks a binary file whose extension did not give it away. */
const NUL = String.fromCharCode(0);

const toPosix = (p) => p.split(path.sep).join('/');

const sha256 = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');

/**
 * The migration allow-list.
 *
 *   files            — every finding in these files is exempt
 *   lines            — `{ "<file>": [{ line, sha256 }] }`; a finding on that line
 *                      is exempt only while the line's trimmed text still hashes
 *                      to `sha256`, so a shift in the file cannot silently exempt
 *                      a different line
 *   colourLiterals   — "report" downgrades colour findings (hex literals and the
 *                      HOM palette hexes) to non-blocking; anything else, and the
 *                      absence of the key, blocks
 *
 * Emptying the file to `{ "files": [], "lines": {} }` makes the scan strict.
 */
function loadAllowList() {
  const empty = { files: new Set(), lines: new Map(), colourLiterals: 'block' };
  if (!fs.existsSync(ALLOW_FILE)) return empty;

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(ALLOW_FILE, 'utf8'));
  } catch (error) {
    console.error(`Cannot parse ${toPosix(path.relative(ROOT, ALLOW_FILE))}: ${error.message}`);
    process.exit(2);
  }

  const lines = new Map();
  for (const [file, entries] of Object.entries(parsed.lines || {})) {
    const byLine = new Map();
    for (const entry of entries) {
      const line = typeof entry === 'number' ? entry : entry.line;
      const hash = typeof entry === 'number' ? null : entry.sha256 || null;
      byLine.set(line, hash);
    }
    lines.set(file, byLine);
  }

  return {
    files: new Set(parsed.files || []),
    lines,
    colourLiterals: parsed.colourLiterals === 'report' ? 'report' : 'block',
  };
}

const ALLOW = loadAllowList();

/**
 * Decide whether a finding is exempt. Line exemptions are keyed by line number
 * but verified by content, so a line that moved (or changed) is reported with a
 * note instead of being waved through.
 */
function classifyAllowance(finding, lineText) {
  if (ALLOW.files.has(finding.file)) return { allowed: true };

  const byLine = ALLOW.lines.get(finding.file);
  if (!byLine || !byLine.has(finding.line)) return { allowed: false };

  const expected = byLine.get(finding.line);
  if (expected && expected !== sha256(lineText.trim())) {
    return { allowed: false, note: 'allow-listed line no longer matches its recorded content' };
  }
  return { allowed: true };
}

const isSkipped = (relPath) =>
  SKIP_PATHS.some((skip) => relPath === skip || relPath.startsWith(`${skip}/`));

const isHexAllowed = (relPath) =>
  HEX_ALLOWED_FILES.has(relPath) || HEX_ALLOWED_PREFIXES.some((p) => relPath.startsWith(p));

function collectFiles() {
  const files = [];

  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = toPosix(path.relative(ROOT, full));
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || isSkipped(rel)) continue;
        walk(full);
      } else if (entry.isFile()) {
        if (isSkipped(rel)) continue;
        if (BINARY_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
        files.push(rel);
      }
    }
  };

  for (const dir of SCAN_DIRS) {
    const full = path.join(ROOT, dir);
    if (fs.existsSync(full)) walk(full);
  }

  for (const file of SCAN_FILES) {
    const full = path.join(ROOT, file);
    if (fs.existsSync(full) && !isSkipped(file)) files.push(file);
  }

  // Every .env* file at the repository root (committed or not).
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.startsWith('.env')) files.push(entry.name);
  }

  return [...new Set(files)].sort();
}

function readTextFile(absolute) {
  try {
    // Non-UTF-8 bytes are replaced rather than throwing.
    return fs.readFileSync(absolute, 'utf8');
  } catch {
    return null;
  }
}

/** Expand a match to the whole surrounding word so the allow-list can be applied. */
function surroundingWord(line, index, length) {
  let start = index;
  let end = index + length;
  while (start > 0 && /[\w-]/.test(line[start - 1])) start -= 1;
  while (end < line.length && /[\w-]/.test(line[end])) end += 1;
  return line.slice(start, end);
}

function isAllowed(line, index, length) {
  const word = surroundingWord(line, index, length).toLowerCase();
  if (ALLOW_LIST.includes(word)) return true;
  // "home loan" / "home-loan" as a two-word phrase.
  const phrase = line.slice(index, index + length + 5).toLowerCase();
  return ALLOW_LIST.some((allowed) => allowed.includes(' ') && phrase.startsWith(allowed));
}

/**
 * A hex-looking token that is part of a URL fragment/query of an http(s) string,
 * or an HTML numeric entity such as `&#8377;`, is not a colour literal.
 */
function isHexFalsePositive(line, index) {
  const before = line.slice(0, index);
  if (/&\s*$/.test(before)) return true;
  const quoteStart = Math.max(
    before.lastIndexOf('"'),
    before.lastIndexOf("'"),
    before.lastIndexOf('`')
  );
  if (quoteStart !== -1) {
    const literal = before.slice(quoteStart + 1);
    if (/^https?:\/\//i.test(literal) && /[?#]/.test(literal)) return true;
  }
  return false;
}

function scanFile(relPath) {
  const absolute = path.join(ROOT, relPath);
  const content = readTextFile(absolute);
  if (content === null) return [];
  if (content.includes(NUL)) return [];

  const findings = [];
  const lines = content.split(/\r?\n/);
  const scanCopy = relPath.startsWith(COPY_SCAN_PREFIX);

  lines.forEach((line, i) => {
    for (const pattern of TRACE_PATTERNS) {
      pattern.re.lastIndex = 0;
      let match;
      while ((match = pattern.re.exec(line)) !== null) {
        if (match[0].length === 0) {
          pattern.re.lastIndex += 1;
          continue;
        }
        if (isAllowed(line, match.index, match[0].length)) continue;
        findings.push({
          file: relPath,
          line: i + 1,
          kind: 'trace',
          id: pattern.id,
          label: pattern.label,
          match: match[0],
          text: line.trim().slice(0, 160),
        });
      }
    }

    if (scanCopy) {
      for (const pattern of COPY_PATTERNS) {
        pattern.re.lastIndex = 0;
        let match;
        while ((match = pattern.re.exec(line)) !== null) {
          if (match[0].length === 0) {
            pattern.re.lastIndex += 1;
            continue;
          }
          findings.push({
            file: relPath,
            line: i + 1,
            kind: 'copy',
            id: pattern.id,
            label: pattern.label,
            match: match[0],
            text: line.trim().slice(0, 160),
          });
        }
      }
    }

    if (!isHexAllowed(relPath)) {
      HEX_RE.lastIndex = 0;
      let match;
      while ((match = HEX_RE.exec(line)) !== null) {
        if (isHexFalsePositive(line, match.index)) continue;
        findings.push({
          file: relPath,
          line: i + 1,
          kind: 'hex',
          id: 'hex-literal',
          label: 'hex colour literal',
          match: match[0],
          text: line.trim().slice(0, 160),
        });
      }
    }
  });

  return findings.filter((finding) => {
    const { allowed, note } = classifyAllowance(finding, lines[finding.line - 1] ?? '');
    if (note) finding.note = note;
    return !allowed;
  });
}

function main() {
  const files = collectFiles();
  const findings = files.flatMap(scanFile);

  // Colour literals are still the boilerplate's until the design-system prompt
  // replaces them; the allow file says whether they block or are only reported.
  const deferred = new Set(
    ALLOW.colourLiterals === 'report' ? findings.filter(isColourFinding) : []
  );
  const blocking = findings.filter((f) => !deferred.has(f));

  const traces = findings.filter((f) => f.kind === 'trace');
  const hexes = findings.filter((f) => f.kind === 'hex');
  const copies = findings.filter((f) => f.kind === 'copy');

  if (!REPORT_ONLY && findings.length > 0) {
    const byFile = new Map();
    for (const finding of findings) {
      if (!byFile.has(finding.file)) byFile.set(finding.file, []);
      byFile.get(finding.file).push(finding);
    }
    for (const [file, items] of [...byFile.entries()].sort()) {
      console.log(`\n${file} (${items.length})`);
      for (const item of items) {
        const suffix = item.note ? `  [${item.note}]` : '';
        const tag = deferred.has(item) ? ' (deferred)' : '';
        console.log(`  ${file}:${item.line}: ${item.match}  — ${item.label}${tag}${suffix}`);
      }
    }
  }

  const byPattern = new Map();
  for (const finding of findings) {
    const key = `${finding.id} (${finding.label})`;
    byPattern.set(key, (byPattern.get(key) || 0) + 1);
  }

  console.log('\n--- check:traces summary ---');
  console.log(`files scanned:      ${files.length}`);
  console.log(`brand/legacy traces: ${traces.length}`);
  console.log(`hex colour literals: ${hexes.length}`);
  console.log(`copy placeholders:   ${copies.length}`);
  console.log(`total findings:      ${findings.length}`);
  if (deferred.size > 0) {
    console.log(
      `deferred (colour literals, not blocking): ${deferred.size} — ` +
        'empty scripts/check-traces.allow.json to make them blocking'
    );
  }
  console.log(`blocking findings:   ${blocking.length}`);
  if (byPattern.size > 0) {
    console.log('\nby pattern:');
    for (const [key, count] of [...byPattern.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(count).padStart(5)}  ${key}`);
    }
    const fileCounts = new Map();
    for (const finding of findings) {
      fileCounts.set(finding.file, (fileCounts.get(finding.file) || 0) + 1);
    }
    console.log('\ntop files:');
    for (const [file, count] of [...fileCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)) {
      console.log(`  ${String(count).padStart(5)}  ${file}`);
    }
  }

  if (REPORT_ONLY) {
    process.exit(0);
  }
  process.exit(blocking.length > 0 ? 1 : 0);
}

if (require.main === module) main();

/**
 * The pattern list is exported so that `scripts/validate-seed.js` can apply the
 * same regexes to `db.json` without restating them — two copies would drift,
 * and a copy in another file would itself be a finding (this file is the one
 * path the scan skips).
 *
 * `COPY_PATTERNS` is exported beside it for the same reason, and because the
 * scan's own unit tests assert the list rather than re-typing it.
 */
module.exports = { TRACE_PATTERNS, COPY_PATTERNS, COPY_SCAN_PREFIX, ALLOW_LIST, HEX_RE };
