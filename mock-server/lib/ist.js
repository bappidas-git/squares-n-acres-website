/**
 * India Standard Time, for everything the mock answers in calendar terms
 * (D22, QA-53).
 *
 * The panel prints every absolute date in IST, the follow-up inputs are read
 * and written in IST (P29) and so is article scheduling (P33); a lead that
 * arrived at 01:30 on the 14th is a lead of the 14th to the desk that reads
 * it. The date filters, the dashboard's days and the timeline's sentences now
 * say the same thing, where they used to count UTC days (D96, superseded).
 *
 * IST is UTC+05:30 all year — India observes no daylight saving — so a fixed
 * offset is the whole timezone. Nothing here reads the ICU data of the machine
 * the mock runs on: a stored sentence must not depend on it.
 */

/** +05:30, in milliseconds. */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** The months of `05 Sep 2026`, written out rather than taken from `Intl`. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The instant moved on by the offset, so that its **UTC** fields read the IST
 * wall clock.
 *
 * @param {string|number|Date} value
 * @returns {Date|null}
 */
function istClock(value) {
  let parsed = Number.NaN;
  if (value instanceof Date) parsed = value.getTime();
  else if (typeof value === 'number') parsed = value;
  else if (typeof value === 'string') parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed + IST_OFFSET_MS) : null;
}

/**
 * `2026-09-14` — the IST calendar day of a timestamp.
 *
 * @param {string|number|Date} value
 * @returns {string|null}
 */
function istDay(value) {
  return istClock(value)?.toISOString().slice(0, 10) ?? null;
}

/**
 * `2026-09-14 01:30` — the IST date and time of a timestamp, in the shape a
 * spreadsheet reads as one.
 *
 * @param {string|number|Date} value
 * @returns {string|null}
 */
function istDateTime(value) {
  return istClock(value)?.toISOString().slice(0, 16).replace('T', ' ') ?? null;
}

/**
 * `14 Sep 2026` — the timeline's date.
 *
 * @param {string|number|Date} value
 * @returns {string} `''` when it cannot be read
 */
function formatIstDate(value) {
  const clock = istClock(value);
  if (!clock) return '';
  const day = String(clock.getUTCDate()).padStart(2, '0');
  return `${day} ${MONTHS[clock.getUTCMonth()]} ${clock.getUTCFullYear()}`;
}

/**
 * `14 Sep 2026, 01:30 am` — the timeline's date and time, as the panel's own
 * `formatDateTime` prints them.
 *
 * @param {string|number|Date} value
 * @returns {string} `''` when it cannot be read
 */
function formatIstDateTime(value) {
  const clock = istClock(value);
  if (!clock) return '';
  const hours = clock.getUTCHours();
  const hour12 = String(hours % 12 === 0 ? 12 : hours % 12).padStart(2, '0');
  const minutes = String(clock.getUTCMinutes()).padStart(2, '0');
  return `${formatIstDate(value)}, ${hour12}:${minutes} ${hours < 12 ? 'am' : 'pm'}`;
}

module.exports = {
  IST_OFFSET_MS,
  istClock,
  istDay,
  istDateTime,
  formatIstDate,
  formatIstDateTime,
};
