import {
  CONTRACT_SECTION_KEYS,
  SECTION_DEFINITIONS,
  SECTION_KEYS,
  getSectionHints,
  getVisibleSections,
  isSectionEnabled,
  sectionByKey,
} from '../propertySections';

/**
 * The rules the admin tab and the public page both read. Every one of the
 * eighteen is asserted twice — once with the data it needs and once without —
 * because "the section is empty" is exactly the case both callers get wrong.
 */

/** The smallest property the rules accept: nothing filled in. */
const blank = (patch = {}) => ({
  listingType: 'sale',
  constructionStatus: 'ready-to-move',
  description: '',
  highlights: [],
  unitConfigurations: [],
  specifications: [],
  constructionSpecs: [],
  amenityIds: [],
  floorPlans: [],
  images: [],
  videoUrl: '',
  virtualTourUrl: '',
  documents: [],
  brochureUrl: '',
  constructionTimeline: [],
  constructionProgressPercent: null,
  project: { developerId: null },
  nearbyPlaces: [],
  location: { localityId: null, latitude: null, longitude: null },
  pricing: { price: null, priceRangeMin: null },
  faqs: [],
  similarPropertyIds: [],
  sectionVisibility: {},
  ...patch,
});

const has = (key, patch, context) => sectionByKey(key).hasData(blank(patch), context ?? {});

const keys = (property, context) => getVisibleSections(property, context).map((row) => row.key);

describe('the definitions', () => {
  it('describes exactly the eighteen keys of the contract', () => {
    expect([...SECTION_KEYS].sort()).toEqual([...CONTRACT_SECTION_KEYS].sort());
    expect(SECTION_DEFINITIONS).toHaveLength(18);
  });

  it('gives every section a label, a description and an anchor', () => {
    for (const section of SECTION_DEFINITIONS) {
      expect(section.label).toEqual(expect.any(String));
      expect(section.label.length).toBeGreaterThan(0);
      expect(section.description.length).toBeGreaterThan(0);
      expect(section.anchor).toMatch(/^[a-z-]+$/);
    }
  });

  it('uses each anchor once', () => {
    const anchors = SECTION_DEFINITIONS.map((section) => section.anchor);
    expect(new Set(anchors).size).toBe(anchors.length);
  });
});

describe('what a section needs', () => {
  it('overview takes a description or a project-snapshot fact, but not highlights alone', () => {
    expect(has('overview', {})).toBe(false);
    expect(has('overview', { description: '<p>A home.</p>' })).toBe(true);
    expect(has('overview', { reraNumber: 'PRM/KA/RERA/0000/000' })).toBe(true);
    expect(has('overview', { project: { totalTowers: 4 } })).toBe(true);
    // Highlights have a section and a navigation item of their own; on their
    // own they would leave the Overview section with nothing to print.
    expect(has('overview', { highlights: ['Corner unit'] })).toBe(false);
  });

  it('highlights ignores blank rows', () => {
    expect(has('highlights', { highlights: ['', '   '] })).toBe(false);
    expect(has('highlights', { highlights: ['Corner unit'] })).toBe(true);
  });

  it('unit configurations counts only the active ones', () => {
    expect(
      has('unitConfigurations', { unitConfigurations: [{ name: '2 BHK', isActive: false }] })
    ).toBe(false);
    expect(
      has('unitConfigurations', { unitConfigurations: [{ name: '2 BHK', isActive: true }] })
    ).toBe(true);
    // A row the form has just added carries no flag yet, and counts.
    expect(has('unitConfigurations', { unitConfigurations: [{ name: '2 BHK' }] })).toBe(true);
  });

  it('specifications takes either list (D39)', () => {
    expect(has('specifications', {})).toBe(false);
    expect(has('specifications', { specifications: [{ label: 'Khata', value: 'A' }] })).toBe(true);
    expect(
      has('specifications', { constructionSpecs: [{ label: 'Structure', value: 'RCC' }] })
    ).toBe(true);
  });

  it('amenities reads the ids or the embedded records', () => {
    expect(has('amenities', {})).toBe(false);
    expect(has('amenities', { amenityIds: [3] })).toBe(true);
    expect(has('amenities', { amenityIds: [], amenities: [{ id: 3, name: 'Lift' }] })).toBe(true);
  });

  it('floor plans needs one drawing', () => {
    expect(has('floorPlans', {})).toBe(false);
    expect(has('floorPlans', { floorPlans: [{ imageUrl: 'https://x/p.png' }] })).toBe(true);
  });

  it('the gallery needs two images with an address', () => {
    expect(has('gallery', { images: [{ url: 'https://x/1.jpg' }] })).toBe(false);
    expect(has('gallery', { images: [{ url: 'https://x/1.jpg' }, { url: '' }] })).toBe(false);
    expect(
      has('gallery', { images: [{ url: 'https://x/1.jpg' }, { url: 'https://x/2.jpg' }] })
    ).toBe(true);
  });

  it('video and virtual tour need their address', () => {
    expect(has('video', {})).toBe(false);
    expect(has('video', { videoUrl: 'https://youtu.be/x' })).toBe(true);
    expect(has('virtualTour', {})).toBe(false);
    expect(has('virtualTour', { virtualTourUrl: 'https://tour.example/x' })).toBe(true);
  });

  it('documents takes a row or the brochure', () => {
    expect(has('documents', {})).toBe(false);
    expect(has('documents', { documents: [{ title: 'Price list' }] })).toBe(true);
    expect(has('documents', { brochureUrl: 'https://x/b.pdf' })).toBe(true);
  });

  it('construction is for a project still being built', () => {
    const timeline = { constructionTimeline: [{ milestone: 'Foundation' }] };
    expect(has('construction', { ...timeline })).toBe(false);
    expect(has('construction', { ...timeline, constructionStatus: 'under-construction' })).toBe(
      true
    );
    expect(has('construction', { ...timeline, constructionStatus: 'pre-launch' })).toBe(true);
    expect(
      has('construction', {
        constructionStatus: 'under-construction',
        constructionProgressPercent: 0,
      })
    ).toBe(true);
    expect(has('construction', { constructionStatus: 'under-construction' })).toBe(false);
  });

  it('the builder needs a developer, by id or by embed', () => {
    expect(has('builder', {})).toBe(false);
    expect(has('builder', { project: { developerId: 4 } })).toBe(true);
    expect(has('builder', { project: { developer: { id: 4, name: 'Aurelia' } } })).toBe(true);
  });

  it('nearby needs a place', () => {
    expect(has('nearby', {})).toBe(false);
    expect(has('nearby', { nearbyPlaces: [{ name: 'Metro' }] })).toBe(true);
  });

  it('location takes coordinates or a locality', () => {
    expect(has('location', {})).toBe(false);
    expect(has('location', { location: { latitude: 12.97 } })).toBe(false);
    expect(has('location', { location: { latitude: 12.97, longitude: 77.59 } })).toBe(true);
    expect(has('location', { location: { localityId: 7 } })).toBe(true);
    expect(has('location', { location: { locality: { id: 7, name: 'Whitefield' } } })).toBe(true);
  });

  it('finance needs a sale, a price and a lender', () => {
    const priced = { pricing: { price: 9500000 } };
    expect(has('finance', priced, { banksAvailable: true })).toBe(true);
    expect(has('finance', priced, { banksAvailable: false })).toBe(false);
    expect(has('finance', priced, {})).toBe(false);
    expect(has('finance', { ...priced, listingType: 'rent' }, { banksAvailable: true })).toBe(
      false
    );
    expect(has('finance', {}, { banksAvailable: true })).toBe(false);
    expect(has('finance', { pricing: { priceRangeMin: 8500000 } }, { banksAvailable: true })).toBe(
      true
    );
  });

  it('faqs needs a question', () => {
    expect(has('faqs', {})).toBe(false);
    expect(has('faqs', { faqs: [{ question: 'When?' }] })).toBe(true);
  });

  it('similar follows the API when the caller has asked it, the picks when not', () => {
    // The admin's visibility tab makes no request, so the picks decide there.
    expect(has('similar', {})).toBe(false);
    expect(has('similar', { similarPropertyIds: [2] })).toBe(true);

    // The page passes what the endpoint actually answered with, and that wins:
    // the editor's picks may all have been unpublished since (BUG-07).
    expect(has('similar', {}, { similarAvailable: true })).toBe(true);
    expect(has('similar', { similarPropertyIds: [2] }, { similarAvailable: false })).toBe(false);
  });

  it('the enquiry section is always available (D86)', () => {
    expect(has('enquiry', {})).toBe(true);
  });
});

describe('getVisibleSections', () => {
  it('answers with nothing for a missing record', () => {
    expect(getVisibleSections(null)).toEqual([]);
    expect(getVisibleSections('nope')).toEqual([]);
  });

  it('keeps a section only when it is switched on and holds something', () => {
    const property = blank({
      description: '<p>A home.</p>',
      videoUrl: 'https://youtu.be/x',
      faqs: [{ question: 'When?' }],
      sectionVisibility: { video: false },
    });

    expect(keys(property)).toEqual(['overview', 'faqs', 'enquiry']);
  });

  it('treats an absent key as switched on', () => {
    const property = blank({ description: '<p>A home.</p>', sectionVisibility: {} });
    expect(keys(property)).toContain('overview');
    expect(isSectionEnabled(property, 'overview')).toBe(true);
    expect(isSectionEnabled({ sectionVisibility: { overview: false } }, 'overview')).toBe(false);
  });

  it('returns the sections in page order with their anchors', () => {
    const property = blank({
      description: '<p>A home.</p>',
      amenityIds: [1],
      faqs: [{ question: 'When?' }],
    });

    expect(getVisibleSections(property)).toEqual([
      { key: 'overview', label: 'Overview', anchor: 'overview' },
      { key: 'amenities', label: 'Amenities', anchor: 'amenities' },
      { key: 'faqs', label: 'FAQs', anchor: 'faqs' },
      { key: 'enquiry', label: 'Enquiry form', anchor: 'enquiry' },
    ]);
  });
});

describe('getSectionHints', () => {
  it('gives one row per section, in the same order', () => {
    const rows = getSectionHints(blank());
    expect(rows.map((row) => row.key)).toEqual(SECTION_KEYS);
  });

  it('says what is missing and names the tab that holds it', () => {
    const row = getSectionHints(blank()).find((entry) => entry.key === 'gallery');
    expect(row).toMatchObject({ enabled: true, hasData: false, visible: false });
    expect(row.hint).toBe('No data yet — add at least two images in Media');
  });

  it('says nothing when a section is both on and filled', () => {
    const rows = getSectionHints(blank({ videoUrl: 'https://youtu.be/x' }));
    expect(rows.find((row) => row.key === 'video')).toMatchObject({
      enabled: true,
      hasData: true,
      visible: true,
      hint: '',
    });
  });

  it('says “Hidden” for a switched-off section, whatever it holds', () => {
    const rows = getSectionHints(
      blank({ videoUrl: 'https://youtu.be/x', sectionVisibility: { video: false } })
    );
    expect(rows.find((row) => row.key === 'video')).toMatchObject({
      enabled: false,
      hasData: true,
      visible: false,
      hint: 'Hidden',
    });
  });

  it('explains the finance section rather than blaming the editor', () => {
    const priced = blank({ pricing: { price: 9500000 } });

    const noBanks = getSectionHints(priced, { banksAvailable: false });
    expect(noBanks.find((row) => row.key === 'finance').hint).toBe(
      'Hidden automatically — no active banks'
    );

    const rental = getSectionHints(
      blank({ listingType: 'rent', pricing: { rentPerMonth: 45000 } }),
      {
        banksAvailable: true,
      }
    );
    expect(rental.find((row) => row.key === 'finance').hint).toBe(
      'Hidden automatically — sale listings only'
    );

    const ready = getSectionHints(priced, { banksAvailable: true });
    expect(ready.find((row) => row.key === 'finance').hint).toBe('');
  });

  it('survives being handed nothing', () => {
    expect(getSectionHints(null)).toHaveLength(18);
    expect(getSectionHints(undefined).every((row) => row.enabled)).toBe(true);
  });
});
