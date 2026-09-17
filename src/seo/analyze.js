/**
 * `analyze(entityType, entity, context)` — the one call the SEO panel makes.
 *
 * It normalises the record (`entityAdapters`), runs the four groups
 * (`analyzers/`) and scores the results (`score.js`). The answer is exactly
 * what §9.6 stores on the record: a score, its band, how many tests passed out
 * of how many applied, and the results themselves grouped the way the panel
 * draws them.
 *
 * One rule lives here rather than in the analysers: **a record nobody has
 * written yet fails everything.** A blank form has no title, no slug, no
 * description, no body and no keyword. A warning about the FAQs it has not got
 * would score it points for nothing, and "yes, robots may index it" is true of
 * a record that does not exist — so on an empty record every applicable test is
 * read as the failure it is and the score is 0 (§7 of prompt 35). The messages
 * survive the downgrade, so the panel still says what to write first.
 */

import { runAllAnalyzers } from './analyzers';
import { computeScore } from './score';
import { toSeoInput } from './entityAdapters';

/**
 * Whether a record is still blank — nothing an analyser could be about.
 *
 * @param {object} input the normalised record
 * @returns {boolean}
 */
export function isEmptyRecord(input) {
  return (
    !String(input?.title ?? '').trim() &&
    !String(input?.effectiveTitle ?? '').trim() &&
    !String(input?.slug ?? '').trim() &&
    !String(input?.description ?? '').trim() &&
    !String(input?.summary ?? '').trim() &&
    !String(input?.contentText ?? '').trim() &&
    !String(input?.focusKeyword ?? '').trim()
  );
}

/** Every applicable result read as the failure it is, messages kept. */
const asFailures = (groups) =>
  Object.fromEntries(
    Object.entries(groups).map(([group, results]) => [
      group,
      results.map((result) => (result.status === 'skip' ? result : { ...result, status: 'fail' })),
    ])
  );

/**
 * The SEO analysis of one record.
 *
 * @param {string} entityType one of `SEO_ENTITY_TYPES`
 * @param {object} entity the record, as the form holds it
 * @param {object} [context] `{ seoSettings, siteSettings, siteIndex, localities,
 *   cities, propertyTypes, developers, categories, authors, now }`
 * @returns {{score: number, band: string, testsPassed: number, testsTotal: number,
 *   groups: {basic: Array<object>, additional: Array<object>,
 *   titleReadability: Array<object>, contentReadability: Array<object>}}}
 */
export function analyze(entityType, entity = {}, context = {}) {
  const input = toSeoInput(entityType, entity, context);
  const ran = runAllAnalyzers(input, context);
  const groups = isEmptyRecord(input) ? asFailures(ran) : ran;
  const { score, band, testsPassed, testsTotal } = computeScore(groups, entityType);

  return { score, band, testsPassed, testsTotal, groups };
}

export default analyze;
