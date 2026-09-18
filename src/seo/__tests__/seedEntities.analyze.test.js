/**
 * The SEO engine, run over the whole seed (prompt 45).
 *
 * `analyze.test.js` proves the engine's rules against six hand-written
 * fixtures. This suite proves it does not *throw* — and does not answer
 * nonsense — for any of the 105 real records the seed publishes: the plot with
 * no bedrooms, the price-on-request farm land, the draft article with no
 * `publishedAt`, the CMS page whose whole body is blocks rather than HTML, the
 * locality with twenty pincodes, the builder with no projects yet.
 *
 * The SEO panel runs `analyze()` on every keystroke of every one of these
 * records. An exception there takes the admin screen down with it, and a
 * non-numeric score reaches `seo.score` and then the dashboard's sort. Neither
 * is something a fixture can rule out, because a fixture is the record its
 * author thought of.
 *
 * The context is the one `SeoPanel` builds (§9.1): the master data, the seed's
 * own `seoSettings`, and the `/admin/seo/overview` rows the uniqueness tests
 * read — assembled here exactly as `mock-server/routes/seo.js` assembles them,
 * so "is this description unique?" is asked against the real site index.
 */

import fs from 'fs';
import path from 'path';

import { SEO_ENTITY_TYPES } from '../../config/enums';
import { analyze } from '../analyze';
import { toSeoInput } from '../entityAdapters';

/** The committed seed, read the way `scripts/validate-seed.js` reads it. */
const seed = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', '..', 'db.json'), { encoding: 'utf-8' })
);

/** The collection behind each SEO entity type, and the field its title lives in. */
const SOURCES = {
  property: { collection: 'properties', title: (record) => record.title },
  article: { collection: 'articles', title: (record) => record.title },
  page: { collection: 'pages', title: (record) => record.title },
  locality: { collection: 'localities', title: (record) => record.name },
  developer: { collection: 'developers', title: (record) => record.name },
  articleCategory: { collection: 'articleCategories', title: (record) => record.name },
  author: { collection: 'authors', title: (record) => record.name },
  propertyType: { collection: 'propertyTypes', title: (record) => record.name },
};

const siteUrl = seed.seoSettings?.siteUrl ?? 'https://www.squaresnacres.com';

/** The `/admin/seo/overview` rows, as the uniqueness tests read them. */
const siteIndex = Object.entries(SOURCES).flatMap(([type, source]) =>
  (seed[source.collection] ?? []).map((record) => ({
    key: `${type}:${record.id}`,
    id: record.id,
    type,
    title: source.title(record) ?? null,
    slug: record.slug ?? null,
    url: record.slug ? `${siteUrl}/${record.slug}` : null,
    seo: record.seo ?? null,
  }))
);

/** The context `SeoPanel` hands the engine (§9.1). */
const context = {
  seoSettings: seed.seoSettings,
  siteSettings: seed.siteSettings,
  siteUrl,
  siteIndex,
  localities: seed.localities,
  cities: seed.cities,
  propertyTypes: seed.propertyTypes,
  developers: seed.developers,
  amenities: seed.amenities,
  categories: seed.articleCategories,
  authors: seed.authors,
  banksAvailable: (seed.banks ?? []).length > 0,
};

/** Every seeded record, paired with the entity type it is analysed as. */
const everyRecord = Object.entries(SOURCES).flatMap(([type, source]) =>
  (seed[source.collection] ?? []).map((record) => [
    type,
    record.id,
    source.title(record) ?? `#${record.id}`,
    record,
  ])
);

describe('the seed, through the engine', () => {
  it('covers every entity type the contract has', () => {
    expect(Object.keys(SOURCES).sort()).toEqual([...SEO_ENTITY_TYPES.values].sort());
  });

  it('has a record of every type to analyse', () => {
    for (const type of SEO_ENTITY_TYPES.values) {
      expect(everyRecord.filter(([kind]) => kind === type).length).toBeGreaterThan(0);
    }
  });

  it('analyses more than a hundred records', () => {
    expect(everyRecord.length).toBeGreaterThan(100);
  });
});

describe.each(SEO_ENTITY_TYPES.values)('%s', (type) => {
  const records = everyRecord.filter(([kind]) => kind === type);

  it.each(records.map(([, id, title, record]) => [`#${id} ${title}`, record]))(
    '%s analyses to a number',
    (_label, record) => {
      let analysis;
      expect(() => {
        analysis = analyze(type, record, context);
      }).not.toThrow();

      expect(typeof analysis.score).toBe('number');
      expect(Number.isFinite(analysis.score)).toBe(true);
      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.score).toBeLessThanOrEqual(100);
      expect(['good', 'ok', 'poor']).toContain(analysis.band);

      // The four groups of §9.6, each a list of results the panel can draw.
      expect(Object.keys(analysis.groups)).toEqual([
        'basic',
        'additional',
        'titleReadability',
        'contentReadability',
      ]);
      const results = Object.values(analysis.groups).flat();
      expect(results.length).toBe(50);
      for (const result of results) {
        expect(typeof result.id).toBe('string');
        expect(['pass', 'warn', 'fail', 'skip']).toContain(result.status);
        expect(typeof result.message).toBe('string');
      }

      // The counters agree with the results they count (§9.6).
      const applicable = results.filter((result) => result.status !== 'skip');
      expect(analysis.testsTotal).toBe(applicable.length);
      expect(analysis.testsPassed).toBe(
        applicable.filter((result) => result.status === 'pass').length
      );
      expect(analysis.testsPassed).toBeLessThanOrEqual(analysis.testsTotal);
    }
  );

  it('normalises every record of this type without throwing', () => {
    for (const [, , , record] of records) {
      expect(() => toSeoInput(type, record, context)).not.toThrow();
    }
  });

  it('is stable: the same record twice gives the same score', () => {
    for (const [, , , record] of records) {
      expect(analyze(type, record, context).score).toBe(analyze(type, record, context).score);
    }
  });
});

/**
 * The panel's hints are the product: an editor who does what the failing tests
 * say must end up with a green record. Property 33 is the seed's lowest-scoring
 * listing — 50, Poor — and each step below is one of the messages its panel
 * shows, applied literally.
 */
describe('following the panel, a Poor record reaches Good', () => {
  const KEYWORD = 'pg and coliving in marathahalli';
  const base = seed.properties.find((record) => record.id === 33);

  /** One edit, its label, and the score it produced. */
  const walk = () => {
    const record = JSON.parse(JSON.stringify(base));
    const steps = [];
    const measure = (label) => {
      const analysis = analyze('property', record, context);
      steps.push({ label, score: analysis.score, band: analysis.band, analysis });
      return analysis;
    };

    measure('as seeded');

    // "The title does not carry the focus keyword" + "does not carry it at all".
    record.seo.title = 'PG and Coliving in Marathahalli — Trident Commons, from ₹18,000';
    measure('title carries the keyword, at the start');

    // "The description does not carry the focus keyword."
    record.seo.description =
      `Furnished ${KEYWORD}: single and twin rooms at Trident Commons with meals, ` +
      'housekeeping and Wi-Fi, ten minutes from the Outer Ring Road.';
    measure('description carries the keyword');

    // "The URL does not carry the focus keyword."
    record.slug = 'pg-and-coliving-in-marathahalli-trident-commons';
    record.seo.slug = record.slug;
    measure('slug carries the keyword');

    // "The keyword does not appear in the opening tenth", "There are no
    // subheadings", "Keyword density 0 %".
    record.description = [
      `<p>Trident Commons is ${KEYWORD} for people who want a room that is ready to move into.</p>`,
      `<h2>What the ${KEYWORD} includes</h2>`,
      '<p>Single and twin rooms, each furnished with a bed, a wardrobe and a study table, with',
      'meals, housekeeping and high-speed Wi-Fi in the monthly rent. Power backup runs the whole',
      'building and the common areas are cleaned daily.</p>',
      '<h2>Getting to work from Marathahalli</h2>',
      '<p>The Outer Ring Road technology parks are a ten-minute drive, and the buses to Whitefield',
      'and Electronic City stop at the junction. That is the reason most residents choose',
      `${KEYWORD} over a flat share further out.</p>`,
      '<h2>What it costs</h2>',
      '<p>Rent starts at ₹18,000 a month for a twin room and ₹24,000 for a single, with one',
      "month's deposit and no brokerage. The agreement runs month to month after the first",
      'three.</p>',
      '<h2>Who it suits</h2>',
      '<p>People starting a first job, consultants on a project posting, and anybody who would',
      'rather not furnish a flat for a year. It is the most practical',
      `${KEYWORD} on this stretch.</p>`,
    ].join('\n');
    measure('keyword in the opening tenth, a subheading and at 0.5–2.5 %');

    // "No alt text carries the keyword" + "No share image".
    record.images = (record.images ?? []).map((image, index) =>
      index === 0 ? { ...image, alt: `A furnished twin room — ${KEYWORD}` } : image
    );
    record.seo.og = {
      ...(record.seo.og ?? {}),
      imageUrl: 'https://picsum.photos/seed/sna-property-33-og/1200/630',
    };
    measure('alt text and a share image');

    return steps;
  };

  it('starts Poor', () => {
    expect(analyze('property', base, context).band).toBe('poor');
  });

  it('ends Good, having only done what the panel asked', () => {
    const steps = walk();
    const last = steps[steps.length - 1];

    expect(last.band).toBe('good');
    expect(last.score).toBeGreaterThanOrEqual(81);
    expect(last.score - steps[0].score).toBeGreaterThan(30);
  });

  it('never goes backwards on the way', () => {
    const steps = walk();
    for (let index = 1; index < steps.length; index += 1) {
      expect(steps[index].score).toBeGreaterThanOrEqual(steps[index - 1].score);
    }
  });

  it('leaves no failing test behind — only warnings the editor may accept', () => {
    const steps = walk();
    const results = Object.values(steps[steps.length - 1].analysis.groups).flat();
    expect(results.filter((result) => result.status === 'fail')).toEqual([]);
  });
});

describe('the bands the seed lands in', () => {
  it('stores a score for every record the dashboard will rank', () => {
    const bands = everyRecord.map(([type, , , record]) => analyze(type, record, context).band);
    // Every band is one of the three §9.1 defines; `none` is for a record that
    // has never been analysed, which is not what `analyze()` can answer.
    expect(new Set(bands).size).toBeGreaterThan(0);
    for (const band of bands) expect(['good', 'ok', 'poor']).toContain(band);
  });
});
