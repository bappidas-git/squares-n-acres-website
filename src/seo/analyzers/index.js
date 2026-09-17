/**
 * The four groups of §9.1, run over one normalised record.
 *
 * Nothing here decides anything: the rules live in the four files beside this
 * one, the catalogue and the weights live in `score.js`, and this module only
 * says what order the groups come in.
 */

import { runAdditionalTests } from './additional';
import { runBasicTests } from './basic';
import { runContentReadabilityTests } from './contentReadability';
import { runTitleReadabilityTests } from './titleReadability';

export { runAdditionalTests, runBasicTests, runContentReadabilityTests, runTitleReadabilityTests };

/**
 * Every test of every group, for one record.
 *
 * @param {object} input the normalised record (`entityAdapters.toSeoInput`)
 * @param {object} [context] `{ siteIndex, seoSettings, … }`
 * @returns {{basic: Array<object>, additional: Array<object>,
 *   titleReadability: Array<object>, contentReadability: Array<object>}}
 */
export function runAllAnalyzers(input, context = {}) {
  return {
    basic: runBasicTests(input, context),
    additional: runAdditionalTests(input, context),
    titleReadability: runTitleReadabilityTests(input, context),
    contentReadability: runContentReadabilityTests(input, context),
  };
}

export default runAllAnalyzers;
