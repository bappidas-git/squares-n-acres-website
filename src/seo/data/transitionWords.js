/**
 * The words that tell a reader where a sentence is going (SEO-09).
 *
 * "However", "because", "for example" — the joins that turn a list of facts
 * into an argument. The readability group counts the share of sentences that
 * open with one or contain one, and asks for a fifth of them.
 *
 * Multi-word phrases come first in {@link TRANSITION_WORDS} only for reading;
 * {@link hasTransitionWord} matches on word boundaries either way.
 */

/** @type {ReadonlyArray<string>} */
export const TRANSITION_WORDS = [
  'above all',
  'accordingly',
  'additionally',
  'after that',
  'afterwards',
  'also',
  'alternatively',
  'although',
  'as a result',
  'as well as',
  'at the same time',
  'because',
  'before',
  'besides',
  'but',
  'by contrast',
  'consequently',
  'conversely',
  'despite',
  'earlier',
  'equally',
  'especially',
  'even so',
  'finally',
  'first',
  'firstly',
  'for example',
  'for instance',
  'further',
  'furthermore',
  'hence',
  'however',
  'in addition',
  'in contrast',
  'in fact',
  'in other words',
  'in practice',
  'in particular',
  'in short',
  'in summary',
  'in the meantime',
  'indeed',
  'instead',
  'later',
  'likewise',
  'meanwhile',
  'moreover',
  'nevertheless',
  'next',
  'nonetheless',
  'on the other hand',
  'otherwise',
  'overall',
  'rather',
  'second',
  'secondly',
  'similarly',
  'since',
  'so',
  'specifically',
  'still',
  'subsequently',
  'that is',
  'then',
  'therefore',
  'though',
  'thus',
  'to summarise',
  'typically',
  'unless',
  'until',
  'what is more',
  'whereas',
  'while',
  'yet',
];

const PATTERNS = TRANSITION_WORDS.map(
  (word) =>
    new RegExp(`(^|[^\\p{L}\\p{N}])${word.replace(/\s+/g, '\\s+')}([^\\p{L}\\p{N}]|$)`, 'iu')
);

/**
 * Whether a sentence carries at least one transition word.
 *
 * @param {string} sentence
 * @returns {boolean}
 */
export function hasTransitionWord(sentence) {
  const text = String(sentence ?? '');
  if (!text.trim()) return false;
  return PATTERNS.some((pattern) => pattern.test(text));
}

export default TRANSITION_WORDS;
