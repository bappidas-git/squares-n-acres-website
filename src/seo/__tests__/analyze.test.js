import { SEO_ENTITY_TYPES } from '../../config/enums';
import article from './fixtures/article.json';
import developer from './fixtures/developer.json';
import locality from './fixtures/locality.json';
import masterData from './fixtures/masterData.json';
import page from './fixtures/page.json';
import property from './fixtures/property.json';
import seoSettings from './fixtures/seoSettings.json';
import siteIndex from './fixtures/siteIndex.json';
import { analyze, isEmptyRecord } from '../analyze';
import seo, * as engine from '../index';
import { APPLICABILITY } from '../score';
import { toSeoInput } from '../entityAdapters';

const context = { ...masterData, seoSettings, siteIndex };

const flat = (analysis) => Object.values(analysis.groups).flat();
const byId = (analysis) => Object.fromEntries(flat(analysis).map((result) => [result.id, result]));

describe('the answer', () => {
  const analysis = analyze('property', property, context);

  it('is the shape §9.6 stores', () => {
    expect(Object.keys(analysis).sort()).toEqual([
      'band',
      'groups',
      'score',
      'testsPassed',
      'testsTotal',
    ]);
    expect(Object.keys(analysis.groups)).toEqual([
      'basic',
      'additional',
      'titleReadability',
      'contentReadability',
    ]);
  });

  it('scores between 0 and 100 and bands the result', () => {
    expect(analysis.score).toBeGreaterThan(0);
    expect(analysis.score).toBeLessThanOrEqual(100);
    expect(['good', 'ok', 'poor']).toContain(analysis.band);
  });

  it('counts the tests that applied, not the ones that were skipped', () => {
    const applicable = flat(analysis).filter((result) => result.status !== 'skip');
    expect(analysis.testsTotal).toBe(applicable.length);
    expect(analysis.testsPassed).toBe(
      applicable.filter((result) => result.status === 'pass').length
    );
    expect(analysis.testsTotal).toBeLessThan(flat(analysis).length);
  });

  it('runs every test of the catalogue, skipped or not', () => {
    expect(flat(analysis)).toHaveLength(50);
  });

  it('gives every applicable test of this type a weight', () => {
    for (const id of APPLICABILITY.property) {
      expect(byId(analysis)[id].weight).toBeGreaterThan(0);
    }
  });
});

describe('every entity type', () => {
  const records = {
    property: property,
    article: article,
    page: page,
    locality: locality,
    developer: developer,
    articleCategory: { id: 1, name: 'Buying Guides', slug: 'buying-guides', isActive: true },
    author: { id: 1, name: 'Editorial Team', slug: 'editorial-team', isActive: true },
    propertyType: { id: 1, name: 'Apartments', slug: 'apartments', segment: 'residential' },
  };

  it.each(SEO_ENTITY_TYPES.values)('is analysed without an exception (%s)', (entityType) => {
    const analysis = analyze(entityType, records[entityType], context);
    expect(analysis.testsTotal).toBeGreaterThan(0);
    expect(analysis.score).toBeGreaterThanOrEqual(0);
  });

  it.each(SEO_ENTITY_TYPES.values)('skips the tests that do not apply (%s)', (entityType) => {
    const analysis = analyze(entityType, records[entityType], context);
    const applied = flat(analysis)
      .filter((result) => result.status !== 'skip')
      .map((result) => result.id);
    for (const id of applied) {
      expect(APPLICABILITY[entityType]).toContain(id);
    }
  });
});

describe('an empty record (§7)', () => {
  it.each(SEO_ENTITY_TYPES.values)('scores 0 and raises no exception (%s)', (entityType) => {
    const analysis = analyze(entityType, {}, context);
    expect(analysis.score).toBe(0);
    expect(analysis.band).toBe('poor');
    expect(analysis.testsPassed).toBe(0);
  });

  it('reads every applicable test as a failure rather than a warning', () => {
    const analysis = analyze('property', {}, context);
    const statuses = new Set(flat(analysis).map((result) => result.status));
    expect(statuses.has('warn')).toBe(false);
    expect(statuses.has('pass')).toBe(false);
  });

  it('keeps the message of the enhancement it downgraded', () => {
    expect(byId(analyze('property', {}, context))['rera-present'].message).toBe('No RERA number.');
  });

  it('recognises a record with nothing in it', () => {
    expect(isEmptyRecord(toSeoInput('property', {}, context))).toBe(true);
    expect(isEmptyRecord(toSeoInput('property', property, context))).toBe(false);
  });

  it('still reads a record with only a focus keyword as written', () => {
    const started = { seo: { focusKeyword: 'flats in whitefield' } };
    expect(isEmptyRecord(toSeoInput('property', started, context))).toBe(false);
    expect(analyze('property', started, context).score).toBeGreaterThan(0);
  });

  it('is analysed with no context at all', () => {
    expect(() => analyze('property', {})).not.toThrow();
    expect(analyze('property', {}).score).toBe(0);
  });
});

describe('a record improved', () => {
  it('scores higher once the SEO fields are written', () => {
    const before = analyze('article', { ...article, seo: {} }, context);
    const after = analyze('article', article, context);
    expect(after.score).toBeGreaterThan(before.score);
  });

  it('scores the seed article well enough to publish', () => {
    const analysis = analyze('article', article, context);
    expect(analysis.score).toBeGreaterThanOrEqual(51);
  });

  it('drops when the record is taken out of the index', () => {
    const noindexed = {
      ...article,
      seo: { ...article.seo, robots: { ...article.seo.robots, index: false } },
    };
    expect(analyze('article', noindexed, context).score).toBeLessThan(
      analyze('article', article, context).score
    );
  });
});

describe('the results themselves', () => {
  it('carry the field the panel focuses when the result is clicked', () => {
    const results = byId(analyze('property', property, context));
    expect(results['focus-keyword-set'].field).toBe('seo.focusKeyword');
    expect(results['title-length'].field).toBe('seo.title');
    expect(results['description-length'].field).toBe('seo.description');
    expect(results['slug-quality'].field).toBe('slug');
    expect(results['image-count'].field).toBe('images');
    expect(results['faqs-min-3'].field).toBe('faqs');
  });

  it('carry a hint whenever there is something to fix', () => {
    const failed = flat(analyze('property', { ...property, seo: {} }, context)).filter(
      (result) => result.status === 'fail'
    );
    expect(failed.length).toBeGreaterThan(0);
    expect(failed.every((result) => result.hint.length > 0 || result.message.length > 0)).toBe(
      true
    );
  });

  it('name the group they belong to', () => {
    const analysis = analyze('article', article, context);
    for (const [group, results] of Object.entries(analysis.groups)) {
      expect(results.every((result) => result.group === group)).toBe(true);
    }
  });
});

describe("the engine's public surface", () => {
  it('exports everything the panel, the dashboard and <Seo> read (§8 of prompt 35)', () => {
    for (const name of [
      'analyze',
      'computeScore',
      'WEIGHTS',
      'resolveTemplate',
      'buildVariables',
      'listVariables',
      'titleWidth',
      'descriptionWidth',
      'suggestKeywords',
      'generateDefaults',
      'schema',
      'urls',
      'text',
      'keywords',
    ]) {
      expect(engine[name]).toBeDefined();
    }
  });

  it('exports the namespaces as objects rather than flattening them', () => {
    expect(typeof engine.schema.mergeGraph).toBe('function');
    expect(typeof engine.urls.canonicalFor).toBe('function');
    expect(typeof engine.text.stripHtml).toBe('function');
    expect(typeof engine.keywords.containsKeyword).toBe('function');
    expect(typeof engine.readability.fleschReadingEase).toBe('function');
    expect(typeof engine.snippet.truncateToWidth).toBe('function');
  });

  it('answers the same analysis through the barrel as through the module', () => {
    expect(engine.analyze('property', property, context)).toEqual(
      analyze('property', property, context)
    );
    expect(seo.analyze).toBe(analyze);
  });
});
