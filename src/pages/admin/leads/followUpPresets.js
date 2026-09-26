/**
 * The next-step presets of "Log activity" (prompt 51) — Tomorrow 11:00, in
 * three days, Saturday 11:00 — in India Standard Time whatever the laptop's
 * clock says (D22). IST keeps no daylight saving, so the offset is a constant.
 */

const IST = 'Asia/Kolkata';
const IST_OFFSET = '+05:30';

/** When a preset follow-up falls due: late morning, after the day's calls start. */
export const PRESET_TIME = '11:00';

const DAY_MS = 24 * 60 * 60 * 1000;

/** `2026-09-24` — the IST calendar day of an instant. */
export function istDateOf(instant) {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(date);
}

/**
 * The instant of an IST wall-clock date and time, as ISO-8601.
 *
 * @param {string} date `yyyy-mm-dd`
 * @param {string} [time] `hh:mm`
 * @returns {string|null}
 */
export function istInstant(date, time = PRESET_TIME) {
  if (!date) return null;
  const instant = new Date(`${date}T${time || PRESET_TIME}:00${IST_OFFSET}`);
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}

/** The IST day `days` after the IST day of `now`. */
function istDayAfter(now, days) {
  const [year, month, day] = istDateOf(now).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * The three one-press next steps, as of `now`.
 *
 * "Saturday" is the next Saturday after today — on a Saturday, the one a week
 * on: a follow-up is a promise about a later conversation.
 *
 * @param {number} [now]
 * @returns {Array<{key: string, label: string, at: string}>}
 */
export function followUpPresets(now = Date.now()) {
  const [year, month, day] = istDateOf(now).split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const toSaturday = (6 - weekday + 7) % 7 || 7;

  return [
    { key: 'tomorrow', label: `Tomorrow ${PRESET_TIME}`, at: istInstant(istDayAfter(now, 1)) },
    { key: 'three-days', label: `In 3 days, ${PRESET_TIME}`, at: istInstant(istDayAfter(now, 3)) },
    {
      key: 'saturday',
      label: `Saturday ${PRESET_TIME}`,
      at: istInstant(istDayAfter(now, toSaturday)),
    },
  ];
}
