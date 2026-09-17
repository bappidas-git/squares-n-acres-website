/**
 * The words that make a property headline worth clicking (SEO-08).
 *
 * A general-purpose "power word" list is written for magazine headlines —
 * "shocking", "insane", "secret" — and none of it belongs on a listing for a
 * home someone is about to spend a crore on. This list is the real-estate one:
 * the words a buyer in Bengaluru is actually looking for, plus the words that
 * mark a guide as complete.
 *
 * The check is a warning, never a failure: a headline without one of these is
 * a headline, not a defect. Hyphens and spaces are interchangeable when the
 * list is matched, so `ready-to-move` is written once and finds both.
 */

/** @type {ReadonlyArray<string>} */
export const POWER_WORDS = [
  'affordable',
  'best',
  'checklist',
  'complete',
  'essential',
  'exclusive',
  'expert',
  'gated',
  'guide',
  'handpicked',
  'luxury',
  'new launch',
  'premium',
  'proven',
  'ready-to-move',
  'rera-approved',
  'smart',
  'spacious',
  'step-by-step',
  'top',
  'trusted',
  'ultimate',
  'verified',
];

/**
 * The current year and the next one, so "Bengaluru Property Guide 2026" counts
 * as a power headline while the guide is current and stops counting when it is
 * not. Computed rather than written down: a list with a year in it is a list
 * that goes stale in December.
 *
 * @param {Date} [now]
 * @returns {string[]}
 */
export const currentYearWords = (now = new Date()) => {
  const year = now.getFullYear();
  return [String(year), String(year + 1)];
};

/**
 * The first power word a title carries, `null` when it carries none.
 *
 * Matching is done on word boundaries over the lowercased title, so
 * "topography" is not "top" and "guidelines" is not "guide".
 *
 * @param {string} title
 * @param {Date} [now]
 * @returns {string|null}
 */
export function findPowerWord(title, now = new Date()) {
  const text = String(title ?? '').toLowerCase();
  if (!text) return null;

  const candidates = [...POWER_WORDS, ...currentYearWords(now)];
  for (const word of candidates) {
    // Hyphens and spaces are interchangeable: "ready-to-move" and "ready to
    // move" are the same promise typed two ways.
    const pattern = word.replace(/[-\s]/g, '[-\\s]');
    if (new RegExp(`(^|[^\\p{L}\\p{N}])${pattern}([^\\p{L}\\p{N}]|$)`, 'u').test(text)) {
      return word;
    }
  }
  return null;
}

export default POWER_WORDS;
