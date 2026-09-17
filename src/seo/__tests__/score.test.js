import { SEO_ENTITY_TYPES, SEO_SCORE_BANDS } from '../../config/enums';
import {
  APPLICABILITY,
  GROUP_OF,
  NOT_APPLICABLE,
  POINTS,
  TEST_GROUPS,
  TEST_IDS,
  WEIGHTS,
  applies,
  computeScore,
  runGroup,
  testResult,
  weightOf,
} from '../score';

describe('the test catalogue', () => {
  it('covers the four groups of §9.1', () => {
    expect(Object.keys(TEST_GROUPS)).toEqual([
      'basic',
      'additional',
      'titleReadability',
      'contentReadability',
    ]);
  });

  it('gives every test a group and a number of points', () => {
    for (const id of TEST_IDS) {
      expect(GROUP_OF[id]).toBeTruthy();
      expect(POINTS[id]).toBeGreaterThan(0);
    }
  });

  it('has no duplicate ids', () => {
    expect(new Set(TEST_IDS).size).toBe(TEST_IDS.length);
  });

  it('holds every test id SEO-06 to SEO-09 names', () => {
    for (const id of [
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
      'keyword-at-start',
      'title-has-number',
      'title-power-word',
      'title-not-all-caps',
      'title-unique-site',
      'toc-present',
      'short-paragraphs',
      'has-media',
      'flesch-reading-ease',
      'sentence-length',
      'subheading-distribution',
      'passive-voice',
      'transition-words',
      'heading-hierarchy',
    ]) {
      expect(TEST_IDS).toContain(id);
    }
  });
});

describe('WEIGHTS', () => {
  it('covers every entity type of SEO_ENTITY_TYPES', () => {
    expect(Object.keys(WEIGHTS).sort()).toEqual([...SEO_ENTITY_TYPES.values].sort());
  });

  it.each(SEO_ENTITY_TYPES.values)('sums to 100 for %s', (entityType) => {
    const total = Object.values(WEIGHTS[entityType]).reduce((sum, value) => sum + value, 0);
    expect(total).toBe(100);
  });

  it.each(SEO_ENTITY_TYPES.values)('is worth at least a point per test for %s', (entityType) => {
    for (const [id, weight] of Object.entries(WEIGHTS[entityType])) {
      expect({ id, weight: weight >= 1 }).toEqual({ id, weight: true });
    }
  });

  it('weighs a test the applicability table names and nothing else', () => {
    for (const [entityType, ids] of Object.entries(APPLICABILITY)) {
      expect(Object.keys(WEIGHTS[entityType]).sort()).toEqual([...new Set(ids)].sort());
    }
  });

  it('keeps the property-only tests off other types', () => {
    expect(applies('property', 'price-present')).toBe(true);
    expect(applies('article', 'price-present')).toBe(false);
    expect(weightOf('article', 'price-present')).toBe(0);
  });

  it('asks a taxonomy record nothing about a body it has not got', () => {
    for (const entityType of ['articleCategory', 'author', 'propertyType']) {
      expect(applies(entityType, 'content-length')).toBe(false);
      expect(applies(entityType, 'keyword-in-content')).toBe(false);
      expect(applies(entityType, 'title-length')).toBe(true);
    }
  });

  it('asks content readability only of articles, pages and localities', () => {
    expect(applies('article', 'flesch-reading-ease')).toBe(true);
    expect(applies('page', 'flesch-reading-ease')).toBe(true);
    expect(applies('locality', 'flesch-reading-ease')).toBe(true);
    expect(applies('property', 'flesch-reading-ease')).toBe(false);
    expect(applies('developer', 'flesch-reading-ease')).toBe(false);
  });

  it('asks only an article for a contents list', () => {
    expect(applies('article', 'toc-present')).toBe(true);
    expect(applies('page', 'toc-present')).toBe(false);
  });

  it('weighs a more important test more heavily than a less important one', () => {
    expect(WEIGHTS.article['title-length']).toBeGreaterThan(WEIGHTS.article['title-power-word']);
  });
});

describe('testResult', () => {
  it('carries the group and the weight of the test', () => {
    const result = testResult('article', 'title-length', 'pass', { message: 'Fine.' });
    expect(result).toMatchObject({
      id: 'title-length',
      group: 'basic',
      status: 'pass',
      message: 'Fine.',
      weight: WEIGHTS.article['title-length'],
    });
  });

  it('forces a test the type never asks to skip', () => {
    const result = testResult('article', 'price-present', 'pass', { message: 'ignored' });
    expect(result.status).toBe('skip');
    expect(result.message).toBe(NOT_APPLICABLE);
    expect(result.weight).toBe(0);
  });
});

describe('runGroup', () => {
  it('runs the group in catalogue order and never evaluates a skipped rule', () => {
    const ran = [];
    const tests = Object.fromEntries(
      TEST_GROUPS.additional.map((id) => [
        id,
        (input, context, make) => {
          ran.push(id);
          return make(id, 'pass', { message: id });
        },
      ])
    );

    const results = runGroup('additional', tests, { entityType: 'locality' }, {});
    expect(results.map((result) => result.id)).toEqual(TEST_GROUPS.additional);
    expect(ran).not.toContain('price-present');
    expect(ran).toContain('slug-quality');
    expect(results.find((result) => result.id === 'price-present').status).toBe('skip');
  });
});

describe('computeScore', () => {
  const all = (entityType, status) =>
    APPLICABILITY[entityType].map((id) => ({ id, status, group: GROUP_OF[id] }));

  it('scores everything passing as 100 and everything failing as 0', () => {
    expect(computeScore(all('article', 'pass'), 'article').score).toBe(100);
    expect(computeScore(all('article', 'fail'), 'article').score).toBe(0);
  });

  it('scores a warning as half of its weight', () => {
    expect(computeScore(all('article', 'warn'), 'article').score).toBe(50);
  });

  it('counts the tests that passed, not the ones that warned', () => {
    const results = all('developer', 'pass');
    results[0].status = 'warn';
    const scored = computeScore(results, 'developer');
    expect(scored.testsPassed).toBe(results.length - 1);
    expect(scored.testsTotal).toBe(results.length);
  });

  it('leaves a skipped test out of the total and re-normalises over the rest (§9.1)', () => {
    const results = all('property', 'pass');
    results[0].status = 'skip';
    const scored = computeScore(results, 'property');
    expect(scored.score).toBe(100);
    expect(scored.testsTotal).toBe(results.length - 1);
    expect(scored.weightApplied).toBe(100 - WEIGHTS.property[results[0].id]);
  });

  it('bands the score the way §6.17 does', () => {
    expect(computeScore(all('developer', 'pass'), 'developer').band).toBe('good');
    expect(computeScore(all('developer', 'warn'), 'developer').band).toBe('poor');
    expect(SEO_SCORE_BANDS.bandOf(81)).toBe('good');
  });

  it('accepts results grouped as well as flat', () => {
    const grouped = { basic: all('developer', 'pass') };
    expect(computeScore(grouped, 'developer').score).toBe(100);
  });

  it('answers "not analysed" when nothing applied', () => {
    expect(computeScore([], 'property')).toEqual({
      score: 0,
      band: 'none',
      testsPassed: 0,
      testsTotal: 0,
      weightApplied: 0,
    });
  });

  it('ignores a result for a test this type does not weigh', () => {
    const scored = computeScore([{ id: 'price-present', status: 'pass' }], 'article');
    expect(scored.testsTotal).toBe(0);
  });
});
