/**
 * The property form's validation, as the form uses it.
 *
 * `validators/property.js` holds one function per tab; this is the barrel plus
 * the two whole-form readings of them — every rule at once (`validateAll`) and
 * one tab's rules on their own (`validateSection`), which is what a tab change
 * runs so an editor sees the badge appear as they leave a section.
 */

import {
  validateAgent,
  validateAmenities,
  validateArea,
  validateBasics,
  validateDocuments,
  validateFaqs,
  validateFloorPlans,
  validateForActivation,
  validateHighlights,
  validateLocation,
  validateMedia,
  validatePricing,
  validateProject,
  validateSeo,
  validateSimilar,
  validateUnits,
  validateVisibility,
} from './property';

export {
  validateAgent,
  validateAmenities,
  validateArea,
  validateBasics,
  validateDocuments,
  validateFaqs,
  validateFloorPlans,
  validateForActivation,
  validateHighlights,
  validateLocation,
  validateMedia,
  validatePricing,
  validateProject,
  validateSeo,
  validateSimilar,
  validateUnits,
  validateVisibility,
};

export {
  DESCRIPTION_MIN,
  FAQ_QUESTION_MAX,
  FAQ_QUESTION_MIN,
  FOCUS_KEYWORD_MAX,
  HIGHLIGHTS_MAX,
  HIGHLIGHT_MAX_LENGTH,
  SIMILAR_MAX,
  TITLE_MIN,
  plainText,
  wordCount,
} from './property';

/** Every section validator, in tab order. */
export const SECTION_VALIDATORS = [
  validateBasics,
  validateLocation,
  validatePricing,
  validateArea,
  validateUnits,
  validateMedia,
  validateAmenities,
  validateHighlights,
  validateFloorPlans,
  validateDocuments,
  validateProject,
  validateFaqs,
  validateSimilar,
  validateVisibility,
  validateAgent,
  validateSeo,
];

/**
 * Every rule that applies to a set of values, as one dotted map.
 *
 * The activation blockers join in only while `isActive` is true, which is what
 * lets an unfinished listing be saved as a draft and refused as a publication
 * (PROP-04).
 *
 * @param {object} values
 * @param {{propertyId?: number|string|null}} [options]
 * @returns {Record<string, string>}
 */
export function validateAll(values, options = {}) {
  const found = SECTION_VALIDATORS.reduce(
    (errors, validator) => ({ ...errors, ...validator(values, options) }),
    {}
  );

  return { ...found, ...validateForActivation(values).errors };
}

/**
 * One section's rules, by tab key.
 *
 * @param {object} tab a `tabs.js` entry
 * @param {object} values
 * @param {{propertyId?: number|string|null}} [options]
 * @returns {Record<string, string>}
 */
export function validateSection(tab, values, options = {}) {
  if (!tab?.validator) return {};
  return tab.validator(values, options) ?? {};
}

export default validateAll;
