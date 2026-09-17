/**
 * Which tests apply to which kind of record, what each one is worth, and how
 * the results add up to a number between 0 and 100 (SEO-05).
 *
 * Weights are not written down as percentages. Each test carries **points** —
 * an importance from 1 to 5 that says the same thing whatever record it is
 * measuring — and a type's weight table is those points apportioned to exactly
 * 100 over the tests that apply to that type. Two consequences, both wanted:
 * a test worth 5 points is always worth about five times a test worth 1, and
 * adding a test to a type can never leave the table summing to 99.
 *
 * A result is worth its full weight when it passes, half when it warns,
 * nothing when it fails. A test that does not apply — `skip` — is not scored
 * and not counted, and the rest of the table is re-normalised over what is
 * left, so a property is never marked down for having no article category.
 *
 * `docs/SEO_ENGINE.md` lists every test, its group, its points and the
 * resulting weight per entity type.
 */

import { SEO_SCORE_BANDS } from '../config/enums';

/** Every test id, in the group the panel draws it in. */
export const TEST_GROUPS = {
  basic: [
    'focus-keyword-set',
    'keyword-in-title',
    'keyword-in-description',
    'keyword-in-slug',
    'keyword-in-first-10-percent',
    'keyword-in-content',
    'content-length',
    'title-length',
    'description-length',
    'description-unique',
  ],
  additional: [
    'keyword-in-subheading',
    'keyword-in-image-alt',
    'keyword-density',
    'slug-quality',
    'internal-link',
    'external-dofollow-link',
    'keyword-unique-site',
    'image-count',
    'og-image-set',
    'canonical-set',
    'indexable',
    'price-present',
    'locality-in-title',
    'rera-present',
    'faqs-min-3',
    'floor-plan-or-units',
    'amenities-min-8',
    'description-mentions-locality-and-type',
    'connectivity-present',
    'highlights-present',
    'excerpt-present',
    'category-assigned',
    'tags-min-2',
    'featured-image-alt-keyword',
    'faq-block-present',
    'related-links-present',
  ],
  titleReadability: [
    'keyword-at-start',
    'title-has-number',
    'title-power-word',
    'title-not-all-caps',
    'title-unique-site',
  ],
  contentReadability: [
    'toc-present',
    'short-paragraphs',
    'has-media',
    'flesch-reading-ease',
    'sentence-length',
    'subheading-distribution',
    'passive-voice',
    'transition-words',
    'heading-hierarchy',
  ],
};

/** Every test id, flat. */
export const TEST_IDS = Object.values(TEST_GROUPS).flat();

/** The group one test belongs to. */
export const GROUP_OF = Object.fromEntries(
  Object.entries(TEST_GROUPS).flatMap(([group, ids]) => ids.map((id) => [id, group]))
);

/**
 * How much each test matters, 1 (nice to have) to 5 (the record is broken
 * without it). The same scale for every entity type.
 */
export const POINTS = {
  'focus-keyword-set': 5,
  'keyword-in-title': 5,
  'keyword-in-description': 4,
  'keyword-in-slug': 4,
  'keyword-in-first-10-percent': 3,
  'keyword-in-content': 4,
  'content-length': 5,
  'title-length': 5,
  'description-length': 5,
  'description-unique': 3,

  'keyword-in-subheading': 3,
  'keyword-in-image-alt': 2,
  'keyword-density': 3,
  'slug-quality': 3,
  'internal-link': 3,
  'external-dofollow-link': 2,
  'keyword-unique-site': 2,
  'image-count': 3,
  'og-image-set': 2,
  'canonical-set': 2,
  indexable: 3,
  'price-present': 3,
  'locality-in-title': 3,
  'rera-present': 1,
  'faqs-min-3': 2,
  'floor-plan-or-units': 2,
  'amenities-min-8': 2,
  'description-mentions-locality-and-type': 2,
  'connectivity-present': 2,
  'highlights-present': 2,
  'excerpt-present': 3,
  'category-assigned': 2,
  'tags-min-2': 2,
  'featured-image-alt-keyword': 2,
  'faq-block-present': 2,
  'related-links-present': 2,

  'keyword-at-start': 3,
  'title-has-number': 1,
  'title-power-word': 1,
  'title-not-all-caps': 1,
  'title-unique-site': 2,

  'toc-present': 2,
  'short-paragraphs': 2,
  'has-media': 2,
  'flesch-reading-ease': 3,
  'sentence-length': 2,
  'subheading-distribution': 2,
  'passive-voice': 2,
  'transition-words': 2,
  'heading-hierarchy': 2,
};

const BASIC_ALL = TEST_GROUPS.basic;

/** A record with no body of its own is not asked about one. */
const BASIC_META = BASIC_ALL.filter(
  (id) => !['keyword-in-first-10-percent', 'keyword-in-content', 'content-length'].includes(id)
);

/** The five checks every record answers, body or no body. */
const ADDITIONAL_CORE = [
  'slug-quality',
  'keyword-unique-site',
  'og-image-set',
  'canonical-set',
  'indexable',
];

/** The three that need prose to read. */
const ADDITIONAL_CONTENT = ['keyword-in-subheading', 'keyword-in-image-alt', 'keyword-density'];

const TITLE_ALL = TEST_GROUPS.titleReadability;
const CONTENT_ALL = TEST_GROUPS.contentReadability;

/** Content readability without the contents list, which only an article has. */
const CONTENT_NO_TOC = CONTENT_ALL.filter((id) => id !== 'toc-present');

/** A taxonomy record: a name, a description and a URL. */
const TAXONOMY_TESTS = [...BASIC_META, ...ADDITIONAL_CORE, ...TITLE_ALL];

/** Which tests apply to which entity type (`SEO_ENTITY_TYPES`). */
export const APPLICABILITY = {
  property: [
    ...BASIC_ALL,
    ...ADDITIONAL_CONTENT,
    ...ADDITIONAL_CORE,
    'image-count',
    'price-present',
    'locality-in-title',
    'rera-present',
    'faqs-min-3',
    'floor-plan-or-units',
    'amenities-min-8',
    'description-mentions-locality-and-type',
    ...TITLE_ALL,
  ],
  article: [
    ...BASIC_ALL,
    ...ADDITIONAL_CONTENT,
    ...ADDITIONAL_CORE,
    'internal-link',
    'external-dofollow-link',
    'image-count',
    'excerpt-present',
    'category-assigned',
    'tags-min-2',
    'featured-image-alt-keyword',
    'faq-block-present',
    'related-links-present',
    ...TITLE_ALL,
    ...CONTENT_ALL,
  ],
  page: [
    ...BASIC_ALL,
    ...ADDITIONAL_CONTENT,
    ...ADDITIONAL_CORE,
    'internal-link',
    ...TITLE_ALL,
    ...CONTENT_NO_TOC,
  ],
  locality: [
    ...BASIC_ALL,
    ...ADDITIONAL_CONTENT,
    ...ADDITIONAL_CORE,
    'connectivity-present',
    'highlights-present',
    ...TITLE_ALL,
    ...CONTENT_NO_TOC,
  ],
  developer: [...BASIC_ALL, ...ADDITIONAL_CONTENT, ...ADDITIONAL_CORE, ...TITLE_ALL],
  articleCategory: TAXONOMY_TESTS,
  author: TAXONOMY_TESTS,
  propertyType: TAXONOMY_TESTS,
};

/**
 * Points apportioned to exactly 100 by the largest-remainder method, with
 * every applicable test guaranteed to be worth at least one point of the
 * score. Ties are broken by test id so the table is the same on every run.
 */
function apportion(ids) {
  const total = ids.reduce((sum, id) => sum + (POINTS[id] ?? 1), 0);
  if (!total) return {};

  const rows = ids.map((id) => {
    const exact = ((POINTS[id] ?? 1) * 100) / total;
    return { id, exact, floor: Math.floor(exact) };
  });

  const weights = {};
  for (const row of rows) weights[row.id] = row.floor;

  const byRemainder = [...rows].sort(
    (a, b) => b.exact - b.floor - (a.exact - a.floor) || (a.id < b.id ? -1 : 1)
  );
  let left = 100 - rows.reduce((sum, row) => sum + row.floor, 0);
  for (const row of byRemainder) {
    if (left <= 0) break;
    weights[row.id] += 1;
    left -= 1;
  }

  const biggest = () =>
    Object.keys(weights).reduce((best, id) => (weights[id] > weights[best] ? id : best));
  for (const id of ids) {
    if (weights[id] === 0) {
      weights[id] = 1;
      weights[biggest()] -= 1;
    }
  }

  return weights;
}

/**
 * `WEIGHTS[entityType][testId]` — what a passing test is worth out of 100.
 *
 * @type {Record<string, Record<string, number>>}
 */
export const WEIGHTS = Object.fromEntries(
  Object.entries(APPLICABILITY).map(([entityType, ids]) => [entityType, apportion(ids)])
);

/**
 * What one test is worth for one entity type; `0` when it does not apply.
 *
 * @param {string} entityType
 * @param {string} testId
 * @returns {number}
 */
export const weightOf = (entityType, testId) => WEIGHTS[entityType]?.[testId] ?? 0;

/** Whether a test applies to an entity type at all. */
export const applies = (entityType, testId) => weightOf(entityType, testId) > 0;

/** Results as one flat array, whether they arrive grouped or already flat. */
const flatten = (results) => {
  if (Array.isArray(results)) return results;
  if (results && typeof results === 'object') return Object.values(results).flat();
  return [];
};

/**
 * The score of one set of results.
 *
 * @param {Array<object>|Record<string, Array<object>>} results
 * @param {string} entityType
 * @returns {{score: number, band: string, testsPassed: number, testsTotal: number,
 *   weightApplied: number}}
 */
export function computeScore(results, entityType) {
  const table = WEIGHTS[entityType] ?? {};
  let earned = 0;
  let applied = 0;
  let passed = 0;
  let counted = 0;

  for (const result of flatten(results)) {
    if (!result || result.status === 'skip') continue;
    const weight = table[result.id] ?? 0;
    if (!weight) continue;

    applied += weight;
    counted += 1;
    if (result.status === 'pass') {
      earned += weight;
      passed += 1;
    } else if (result.status === 'warn') {
      earned += weight / 2;
    }
  }

  if (!applied) {
    return { score: 0, band: 'none', testsPassed: 0, testsTotal: 0, weightApplied: 0 };
  }

  const score = Math.round((earned / applied) * 100);
  return {
    score,
    band: SEO_SCORE_BANDS.bandOf(score),
    testsPassed: passed,
    testsTotal: counted,
    weightApplied: applied,
  };
}

/** The message a test carries when its entity type never asks it. */
export const NOT_APPLICABLE = 'Does not apply to this kind of record.';

/**
 * One analyser result, in the shape §9.6 stores and the panel draws.
 *
 * A test that does not apply to the entity type is forced to `skip` here
 * rather than in twenty-six separate rules, which is what keeps
 * {@link APPLICABILITY} the single answer to "is this counted?".
 *
 * @param {string} entityType
 * @param {string} id
 * @param {'pass'|'warn'|'fail'|'skip'} status
 * @param {{message?: string, hint?: string, field?: string, value?: *}} [detail]
 * @returns {{id: string, group: string, status: string, message: string, hint: string,
 *   field: string, weight: number}}
 */
export function testResult(entityType, id, status, detail = {}) {
  const applicable = applies(entityType, id);
  const result = {
    id,
    group: GROUP_OF[id] ?? 'basic',
    status: applicable ? status : 'skip',
    message: applicable ? (detail.message ?? '') : NOT_APPLICABLE,
    hint: applicable ? (detail.hint ?? '') : '',
    field: detail.field ?? '',
    weight: weightOf(entityType, id),
  };
  if (detail.value !== undefined) result.value = detail.value;
  return result;
}

/**
 * Runs one group's tests in catalogue order, skipping the ones this entity
 * type never asks and never evaluating their rules.
 *
 * @param {keyof TEST_GROUPS} group
 * @param {Record<string, (input: object, context: object, make: Function) => object>} tests
 * @param {object} input the normalised record (`entityAdapters.toSeoInput`)
 * @param {object} [context]
 * @returns {Array<object>}
 */
export function runGroup(group, tests, input, context = {}) {
  const entityType = input?.entityType;
  const make = (id, status, detail) => testResult(entityType, id, status, detail);

  return (TEST_GROUPS[group] ?? []).map((id) => {
    if (!applies(entityType, id) || typeof tests[id] !== 'function') {
      return testResult(entityType, id, 'skip', {});
    }
    return tests[id](input, context, make);
  });
}

const score = {
  APPLICABILITY,
  NOT_APPLICABLE,
  GROUP_OF,
  POINTS,
  TEST_GROUPS,
  TEST_IDS,
  WEIGHTS,
  applies,
  computeScore,
  runGroup,
  testResult,
  weightOf,
};

export default score;
