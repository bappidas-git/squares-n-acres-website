/**
 * The 404 log (prompt 51): the addresses visitors reached that answered "not
 * found", reported by the site's 404 page (`POST /not-found`) and read by the
 * SEO dashboard's 404s tab (`GET /admin/seo/not-found`), where each can become
 * a redirect.
 *
 * One row per path per Indian day, counted — so a busy broken link is one row
 * a day, not a row a visit — and never more than {@link MAX_ROWS} rows: the
 * ones seen longest ago go first. The admin reads one line per path.
 */

const { istDay } = require('./ist');
const { nextId } = require('./ids');

/** How many rows the log keeps at most. */
const MAX_ROWS = 500;

/** Where a 404 is not the site's to report: the panel, the API, the build's own files. */
const IGNORED_PREFIXES = ['/admin', '/api/', '/static/'];

/** A missing script, stylesheet, image or feed is a file, not a page a visitor asked for. */
const ASSET_PATTERN =
  /\.(js|mjs|css|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|json|txt|xml)$/i;

/**
 * A path as the log keys it: no query string, no fragment, no trailing slash.
 *
 * @param {string} value
 * @returns {string}
 */
function normalizePath(value) {
  const text = String(value ?? '')
    .trim()
    .split('#')[0]
    .split('?')[0];
  if (text.length > 1) return text.replace(/\/+$/, '') || '/';
  return text;
}

/**
 * Whether a reported path is left out of the log.
 *
 * @param {string} path normalised
 * @param {Array<object>} redirects the stored redirects — an address one of
 *   them answers is not a broken link
 * @returns {boolean}
 */
function isIgnored(path, redirects = []) {
  if (path === '/admin' || IGNORED_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
  if (ASSET_PATTERN.test(path)) return true;
  return redirects.some(
    (rule) => rule?.isActive !== false && normalizePath(rule?.fromPath) === path
  );
}

/**
 * Counts one visit to a missing address, in place, and keeps the log to its cap.
 *
 * @param {Array<object>} rows the `notFoundLog` collection
 * @param {{path: string, referrer?: string|null, now?: Date}} visit
 * @returns {object} the row that counted it
 */
function recordVisit(rows, { path, referrer = null, now = new Date() }) {
  const day = istDay(now);
  const at = now.toISOString();
  const from = referrer ? String(referrer).slice(0, 500) : null;

  let row = rows.find((entry) => entry.path === path && entry.day === day);
  if (row) {
    row.count = (Number(row.count) || 0) + 1;
    row.lastSeenAt = at;
    if (from) row.referrer = from;
  } else {
    row = {
      id: nextId(rows),
      path,
      day,
      count: 1,
      referrer: from,
      firstSeenAt: at,
      lastSeenAt: at,
    };
    rows.push(row);
  }

  if (rows.length > MAX_ROWS) {
    const oldest = [...rows]
      .sort((left, right) => String(left.lastSeenAt).localeCompare(String(right.lastSeenAt)))
      .slice(0, rows.length - MAX_ROWS);
    for (const stale of oldest) rows.splice(rows.indexOf(stale), 1);
  }
  return row;
}

/**
 * One line per path, the most reached first: its visits, the days it was
 * reached on, when first and last, and the latest page that linked to it.
 * `id` is the path's most recent row — what a dismissal names.
 *
 * @param {Array<object>} rows
 * @returns {Array<{id: number, path: string, count: number, days: number,
 *   firstSeenAt: string, lastSeenAt: string, referrer: string|null}>}
 */
function summarize(rows = []) {
  const byPath = new Map();
  for (const row of rows) {
    const line = byPath.get(row.path);
    if (!line) {
      byPath.set(row.path, {
        id: row.id,
        path: row.path,
        count: Number(row.count) || 0,
        days: new Set([row.day]),
        firstSeenAt: row.firstSeenAt,
        lastSeenAt: row.lastSeenAt,
        referrer: row.referrer ?? null,
        referrerAt: row.referrer ? row.lastSeenAt : '',
      });
      continue;
    }
    line.count += Number(row.count) || 0;
    line.days.add(row.day);
    if (String(row.firstSeenAt) < String(line.firstSeenAt)) line.firstSeenAt = row.firstSeenAt;
    if (String(row.lastSeenAt) > String(line.lastSeenAt)) {
      line.lastSeenAt = row.lastSeenAt;
      line.id = row.id;
    }
    if (row.referrer && String(row.lastSeenAt) > line.referrerAt) {
      line.referrer = row.referrer;
      line.referrerAt = row.lastSeenAt;
    }
  }
  return [...byPath.values()]
    .map(({ days, referrerAt: _referrerAt, ...line }) => ({ ...line, days: days.size }))
    .sort(
      (left, right) =>
        right.count - left.count || String(right.lastSeenAt).localeCompare(String(left.lastSeenAt))
    );
}

module.exports = { MAX_ROWS, isIgnored, normalizePath, recordVisit, summarize };
