/**
 * What an article needs before it may go live (00_MASTER_CONTEXT.md §6.8,
 * prompt 33 §2).
 *
 * The form has refused a publish that breaks these since prompt 33; since
 * QA-55 the API does too — `POST`, `PUT`, `PATCH` and the bulk "publish"
 * alike. The rules lived in the form alone, and the list's bulk bar put a
 * four-word draft with no picture and no excerpt on the site, because the bulk
 * endpoint never asked. One module states them for both sides, so the
 * sentence an editor reads in the form is the sentence the API answers with.
 *
 * CommonJS (D36b), like `enums.js`: the mock server requires it.
 */

/** The two states whose article a visitor can reach — a scheduled one is a published one with a date on it. */
const GOING_LIVE = ['published', 'scheduled'];

/** An article needs this many words before it may go live. */
const PUBLISH_MIN_WORDS = 300;

/** Below this the rail says so, but the save goes through. */
const RECOMMENDED_MIN_WORDS = 600;

const text = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * Whether a status puts the article in front of a visitor.
 *
 * @param {string} status
 * @returns {boolean}
 */
const goesLive = (status) => GOING_LIVE.includes(status);

/**
 * What stands between an article and the site, keyed the way a 422 keys it.
 *
 * Alt text is not among them: it is required whenever there is an image,
 * whatever the status, which the write schema already says (§8.3).
 *
 * @param {{excerpt?: string|null, featuredImage?: {url?: string}|null}} article
 * @param {number} words how many words the body holds
 * @returns {Record<string, string>} `{}` when the article may go live
 */
function publishProblems(article, words) {
  const found = {};
  const count = Number.isFinite(Number(words)) ? Number(words) : 0;

  if (!text(article?.excerpt)) {
    found.excerpt = 'An excerpt is required before an article goes live.';
  }
  if (!text(article?.featuredImage?.url)) {
    found['featuredImage.url'] = 'A featured image is required before an article goes live.';
  }
  if (count < PUBLISH_MIN_WORDS) {
    found.content = `An article needs at least ${PUBLISH_MIN_WORDS} words to go live — this one has ${count}.`;
  }

  return found;
}

/**
 * The same problems as short phrases — "no featured image", "212 of 300 words"
 * — for a list that names several articles at once (the bulk bar's refusal).
 *
 * @param {Record<string, string>} problems what {@link publishProblems} found
 * @param {number} words
 * @returns {Array<string>}
 */
function publishGaps(problems, words) {
  const gaps = [];
  if (problems.excerpt) gaps.push('no excerpt');
  if (problems['featuredImage.url']) gaps.push('no featured image');
  if (problems.content) gaps.push(`${Number(words) || 0} of ${PUBLISH_MIN_WORDS} words`);
  return gaps;
}

module.exports = {
  GOING_LIVE,
  PUBLISH_MIN_WORDS,
  RECOMMENDED_MIN_WORDS,
  goesLive,
  publishProblems,
  publishGaps,
};
