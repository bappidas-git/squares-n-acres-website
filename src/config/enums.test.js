import {
  ADMIN_LEAD_SOURCES,
  makeEnum,
  AREA_UNITS,
  AVAILABILITY,
  BADGE_TONES,
  BLOCK_TYPES,
  LEAD_CLOSED_STATUSES,
  LEAD_OPEN_STATUSES,
  LEAD_PIPELINE,
  LEAD_SOURCES,
  LEAD_STATUS,
  LEGACY_LEAD_SOURCE_MAP,
  LISTING_TYPES,
  SECTION_VISIBILITY_KEYS,
  SEO_SCORE_BANDS,
} from './enums';
import { TONES } from '../components/ui/tones';

const enums = require('./enums');

/** Every export built by `makeEnum`, as `[name, enum]` pairs. */
const allEnums = Object.entries(enums).filter(
  ([, value]) => value && typeof value === 'object' && Array.isArray(value.values)
);

describe('makeEnum', () => {
  const sample = makeEnum([
    { value: 'a', label: 'Alpha', tone: 'info' },
    { value: 'b', label: 'Beta' },
  ]);

  it('exposes values, options, meta and entries', () => {
    expect(sample.values).toEqual(['a', 'b']);
    expect(sample.options).toEqual([
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ]);
    expect(sample.meta.a).toEqual({ tone: 'info' });
    expect(sample.meta.b).toEqual({});
    expect(sample.entries).toHaveLength(2);
  });

  it('labels known values and returns an empty string otherwise', () => {
    expect(sample.labelOf('a')).toBe('Alpha');
    expect(sample.labelOf('zzz')).toBe('');
    expect(sample.labelOf(undefined)).toBe('');
    expect(sample.has('a')).toBe(true);
    expect(sample.has('zzz')).toBe(false);
  });
});

describe('every enum', () => {
  it('is exported (the suite covers more than a handful)', () => {
    expect(allEnums.length).toBeGreaterThanOrEqual(40);
  });

  it.each(allEnums)('%s has unique values', (_name, subject) => {
    expect(new Set(subject.values).size).toBe(subject.values.length);
  });

  it.each(allEnums)('%s has one option per value with a non-empty label', (_name, subject) => {
    expect(subject.options).toHaveLength(subject.values.length);
    subject.options.forEach((option) => {
      expect(typeof option.label).toBe('string');
      expect(option.label.length).toBeGreaterThan(0);
    });
  });

  it.each(allEnums)('%s labels every value and returns "" for an unknown one', (_name, subject) => {
    subject.values.forEach((value) => {
      expect(subject.labelOf(value)).toBe(subject.options.find((o) => o.value === value).label);
    });
    expect(subject.labelOf('__not_a_value__')).toBe('');
  });

  it.each(allEnums)('%s only uses tones the UI can resolve', (_name, subject) => {
    const tones = Object.values(subject.meta).flatMap((meta) => (meta.tone ? [meta.tone] : []));
    expect(tones.filter((tone) => !TONES.includes(tone))).toEqual([]);
  });

  it.each(allEnums)('%s only uses Iconify mdi icon ids', (_name, subject) => {
    const icons = Object.values(subject.meta).flatMap((meta) => (meta.icon ? [meta.icon] : []));
    expect(icons.filter((icon) => !/^mdi:[a-z0-9-]+$/.test(icon))).toEqual([]);
  });
});

describe('LISTING_TYPES.verbOf', () => {
  it('returns the listing verb', () => {
    expect(LISTING_TYPES.verbOf('sale')).toBe('for Sale');
    expect(LISTING_TYPES.verbOf('rent')).toBe('for Rent');
    expect(LISTING_TYPES.verbOf('lease')).toBe('for Lease');
  });

  it('returns an empty string for an unknown listing type', () => {
    expect(LISTING_TYPES.verbOf('barter')).toBe('');
    expect(LISTING_TYPES.verbOf(undefined)).toBe('');
  });
});

describe('AREA_UNITS.toSqft', () => {
  it('applies the documented factors', () => {
    expect(AREA_UNITS.toSqft(1, 'sqft')).toBe(1);
    expect(AREA_UNITS.toSqft(1, 'sqm')).toBeCloseTo(10.7639, 4);
    expect(AREA_UNITS.toSqft(1, 'sqyd')).toBe(9);
    expect(AREA_UNITS.toSqft(1, 'acre')).toBe(43560);
    expect(AREA_UNITS.toSqft(1, 'cent')).toBeCloseTo(435.6, 4);
    expect(AREA_UNITS.toSqft(1, 'guntha')).toBe(1089);
    expect(AREA_UNITS.toSqft(2.5, 'acre')).toBe(108900);
  });

  it('reads a missing unit as sq ft and rejects unknown units and values', () => {
    expect(AREA_UNITS.toSqft(1200)).toBe(1200);
    expect(AREA_UNITS.toSqft(1200, 'bigha')).toBeNull();
    expect(AREA_UNITS.toSqft(null, 'sqft')).toBeNull();
    expect(AREA_UNITS.toSqft('1200', 'sqft')).toBeNull();
    expect(AREA_UNITS.toSqft(Number.NaN, 'sqft')).toBeNull();
  });
});

describe('SEO_SCORE_BANDS.bandOf', () => {
  it('maps the band thresholds', () => {
    expect(SEO_SCORE_BANDS.bandOf(null)).toBe('none');
    expect(SEO_SCORE_BANDS.bandOf(undefined)).toBe('none');
    expect(SEO_SCORE_BANDS.bandOf(0)).toBe('poor');
    expect(SEO_SCORE_BANDS.bandOf(50)).toBe('poor');
    expect(SEO_SCORE_BANDS.bandOf(51)).toBe('ok');
    expect(SEO_SCORE_BANDS.bandOf(80)).toBe('ok');
    expect(SEO_SCORE_BANDS.bandOf(81)).toBe('good');
    expect(SEO_SCORE_BANDS.bandOf(100)).toBe('good');
  });

  it('treats a non-numeric score as not analysed', () => {
    expect(SEO_SCORE_BANDS.bandOf('85')).toBe('none');
    expect(SEO_SCORE_BANDS.bandOf(Number.NaN)).toBe('none');
  });
});

describe('LEAD_SOURCES', () => {
  it('carries every documented source', () => {
    // 29 from the site's forms, and the seven the desk enters (prompt 51).
    expect(LEAD_SOURCES.values).toHaveLength(36);
    expect(LEAD_SOURCES.values).toEqual(
      expect.arrayContaining(['property-enquiry', 'hero-search', ...ADMIN_LEAD_SOURCES])
    );
    expect(ADMIN_LEAD_SOURCES).toEqual([
      'walk-in',
      'phone',
      'whatsapp-inbound',
      'referral',
      'portal-99acres',
      'portal-magicbricks',
      'portal-housing',
    ]);
  });

  it('splits the statuses into the open ones and the two that close a lead', () => {
    expect(LEAD_CLOSED_STATUSES).toEqual(['converted', 'lost']);
    expect([...LEAD_OPEN_STATUSES, ...LEAD_CLOSED_STATUSES].sort()).toEqual(
      [...LEAD_STATUS.values].sort()
    );
  });

  it('maps all 24 legacy source values onto canonical ones', () => {
    const legacyKeys = Object.keys(LEGACY_LEAD_SOURCE_MAP);
    expect(legacyKeys).toHaveLength(24);
    legacyKeys.forEach((legacy) => {
      expect(LEAD_SOURCES.values).toContain(LEGACY_LEAD_SOURCE_MAP[legacy]);
    });
  });

  it('maps every source value the boilerplate wrote', () => {
    const boilerplateSources = [
      'property-detail-page',
      'property_enquiry',
      'property-listing-page',
      'child_form',
      'homepage-contact-form',
      'contact',
      'website',
      'home_loan',
      'legal_assistance',
      'interior_design',
      'sell_let',
      'flexible_workspace',
      'direct_lease_retails',
      'real_estate_awareness',
      'newsletter_articles',
      'article_detail',
      'faq_contact',
      'brochure_download',
      'floorplan_download',
      'floorplan_request',
      'document_download',
      'detailed_pricing',
      'bank-eligibility-check',
      'financial-assessment',
    ];
    boilerplateSources.forEach((source) => {
      const canonical = LEGACY_LEAD_SOURCE_MAP[source] ?? source;
      expect(LEAD_SOURCES.values).toContain(canonical);
    });
  });
});

describe('LEAD_STATUS', () => {
  it('keeps the pipeline order and leaves "lost" outside the funnel', () => {
    expect(LEAD_STATUS.values).toEqual([
      'new',
      'contacted',
      'qualified',
      'site-visit',
      'negotiation',
      'converted',
      'lost',
    ]);
    expect(LEAD_PIPELINE).not.toContain('lost');
    expect(LEAD_PIPELINE).toHaveLength(LEAD_STATUS.values.length - 1);
  });
});

describe('SECTION_VISIBILITY_KEYS', () => {
  it('lists the 18 property sections in display order with labels', () => {
    expect(SECTION_VISIBILITY_KEYS).toHaveLength(18);
    expect(SECTION_VISIBILITY_KEYS[0]).toEqual({ key: 'overview', label: 'Overview' });
    expect(SECTION_VISIBILITY_KEYS[17]).toEqual({ key: 'enquiry', label: 'Enquiry' });
    const keys = SECTION_VISIBILITY_KEYS.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
    SECTION_VISIBILITY_KEYS.forEach((entry) => expect(entry.label).toBeTruthy());
  });
});

describe('BLOCK_TYPES', () => {
  it('covers every CMS block type of the data model', () => {
    expect(BLOCK_TYPES.values).toEqual([
      'hero',
      'richText',
      'features',
      'steps',
      'stats',
      'faq',
      'cta',
      'leadForm',
      'team',
      'testimonials',
      'properties',
      'articles',
      'checklist',
      'quiz',
      'map',
      'contactInfo',
      'image',
      'banks',
      'partners',
      'html',
      'jobs',
      'facts',
      'expandableCards',
      'packages',
      'gallery',
    ]);
  });

  it('hands out a fresh data object per block', () => {
    const first = BLOCK_TYPES.defaultDataOf('features');
    const second = BLOCK_TYPES.defaultDataOf('features');
    expect(first).toEqual({ title: '', subtitle: '', items: [] });
    expect(first).not.toBe(second);
    first.items.push('mutated');
    expect(second.items).toEqual([]);
  });

  it('returns an empty object for an unknown block type', () => {
    expect(BLOCK_TYPES.defaultDataOf('carousel')).toEqual({});
  });

  it('gives every type an icon and a default data factory', () => {
    BLOCK_TYPES.values.forEach((value) => {
      expect(BLOCK_TYPES.meta[value].icon).toMatch(/^mdi:/);
      expect(typeof BLOCK_TYPES.meta[value].defaultData).toBe('function');
    });
  });
});

describe('price buckets', () => {
  it('are contiguous and open-ended at the top', () => {
    [enums.PRICE_BUCKETS_SALE, enums.PRICE_BUCKETS_RENT].forEach((buckets) => {
      expect(buckets).toHaveLength(9);
      expect(buckets[0].min).toBe(0);
      expect(buckets[buckets.length - 1].max).toBeNull();
      buckets.slice(0, -1).forEach((bucket, index) => {
        expect(bucket.max).toBe(buckets[index + 1].min);
        expect(bucket.label).toBeTruthy();
      });
    });
  });
});

describe('tone vocabularies', () => {
  it('badge tones are exactly the UI tones', () => {
    expect(BADGE_TONES.values).toEqual(TONES);
  });

  it('availability carries a tone for every value', () => {
    AVAILABILITY.values.forEach((value) => {
      expect(TONES).toContain(AVAILABILITY.meta[value].tone);
    });
  });
});
