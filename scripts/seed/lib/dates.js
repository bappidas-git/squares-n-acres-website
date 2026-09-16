/**
 * Every timestamp in the seed is measured from one fixed instant.
 *
 * A generator that reads the clock produces a different `db.json` every day,
 * which makes `npm run seed:build` impossible to diff and "run it twice, get
 * the same file" impossible to assert. `GENERATED_AT` is therefore a constant:
 * it is the day the dataset was written, it is recorded in
 * `docs/SEED_GUIDE.md`, and moving it is a deliberate edit that shows up in
 * the diff of every record.
 *
 * The consequence to keep in mind: "the last 90 days" means the 90 days before
 * `GENERATED_AT`, not before today. `scripts/validate-seed.js` warns once the
 * scheduled article's `publishedAt` has drifted into the past, which is the
 * signal to bump the constant and rebuild.
 */

/** The instant the dataset describes (00:00 IST on the generation day). */
const GENERATED_AT = '2026-09-16T09:00:00.000Z';

const GENERATED_MS = Date.parse(GENERATED_AT);
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * An ISO-8601 timestamp `days` before (or, negative, after) the generation
 * instant, at the given wall-clock time in UTC.
 *
 * @param {number} days
 * @param {number} [hour] 0–23
 * @param {number} [minute] 0–59
 * @returns {string} e.g. `2026-07-19T06:30:00.000Z`
 */
function daysAgo(days, hour = 9, minute = 0) {
  const stamp = new Date(GENERATED_MS - days * DAY_MS);
  stamp.setUTCHours(hour, minute, 0, 0);
  return stamp.toISOString();
}

/** `days` **after** the generation instant — follow-ups and the scheduled post. */
const daysAhead = (days, hour = 9, minute = 0) => daysAgo(-days, hour, minute);

/** The `yyyy-mm-dd` half of a timestamp. */
const dateOnly = (iso) => iso.slice(0, 10);

/** A `yyyy-mm-dd` date `days` before the generation instant. */
const dateDaysAgo = (days) => dateOnly(daysAgo(days));

/** A `yyyy-mm-dd` date `days` after the generation instant. */
const dateDaysAhead = (days) => dateOnly(daysAgo(-days));

/** The first day of the month `months` after the generation instant (§6.15). */
function monthStartAhead(months) {
  const stamp = new Date(GENERATED_MS);
  stamp.setUTCDate(1);
  stamp.setUTCMonth(stamp.getUTCMonth() + months);
  stamp.setUTCHours(0, 0, 0, 0);
  return dateOnly(stamp.toISOString());
}

/** The first day of the month `months` before the generation instant. */
const monthStartAgo = (months) => monthStartAhead(-months);

/**
 * `count` day offsets spread evenly over `span` days, oldest first.
 *
 * Deterministic by construction: the offsets are a function of the index, and
 * the jitter comes from the caller's generator rather than the clock.
 *
 * @param {number} count
 * @param {number} span the oldest offset, in days
 * @returns {number[]} day offsets, descending (oldest → newest)
 */
function spreadDays(count, span) {
  if (count <= 1) return [span];
  const step = span / (count - 1);
  return Array.from({ length: count }, (_, index) => Math.round(span - index * step));
}

module.exports = {
  GENERATED_AT,
  DAY_MS,
  daysAgo,
  daysAhead,
  dateOnly,
  dateDaysAgo,
  dateDaysAhead,
  monthStartAhead,
  monthStartAgo,
  spreadDays,
};
