import createInitialState, { resetTmpIds } from '../initialState';
import fromRecord from '../fromRecord';

const RECORD = {
  id: 7,
  slug: 'lakeview-heights-3-bhk',
  title: 'Lakeview Heights 3 BHK',
  projectName: null,
  propertyTypeId: 1,
  reraNumber: null,
  description: '<p>A home in Whitefield.</p>',
  images: [
    { id: 2, url: 'https://example.com/b.jpg', alt: 'B', caption: null, order: 2, isCover: false },
    { id: 1, url: 'https://example.com/a.jpg', alt: 'A', caption: null, order: 1, isCover: true },
  ],
  faqs: [
    { id: 2, question: 'Second', answer: 'Two', order: 2 },
    { id: 1, question: 'First', answer: 'One', order: 1 },
  ],
  specifications: [{ group: 'kitchen', label: 'Counter', value: 'Granite', icon: null }],
  location: {
    address: 'Whitefield Main Road',
    localityId: 1,
    locality: { id: 1, name: 'Whitefield', slug: 'whitefield' },
    cityId: 1,
    city: { id: 1, name: 'Bengaluru', slug: 'bengaluru' },
    pincode: '560066',
    landmark: null,
    latitude: 12.9746,
    longitude: 77.7517,
    mapEmbedUrl: null,
    showExactLocation: false,
  },
  project: {
    developerId: 1,
    developer: { id: 1, name: 'Aurelia Estates', slug: 'aurelia-estates', logoUrl: null },
    approvals: ['bbmp'],
  },
  propertyType: { id: 1, name: 'Apartment', slug: 'apartments', segment: 'residential' },
  amenities: [{ id: 1, name: 'Lift', slug: 'lift', icon: 'mdi:elevator', category: 'basic' }],
  amenityIds: [1, 2],
  badges: [{ id: 1, name: 'Verified', slug: 'verified', color: 'success' }],
  viewCount: 312,
  enquiryCount: 7,
  publishedAt: '2026-09-01T00:00:00.000Z',
  createdBy: 1,
  updatedAt: '2026-09-16T10:00:00.000Z',
};

beforeEach(() => resetTmpIds());

it('fills every key of §6.1, whatever the record left out', () => {
  const values = fromRecord({ id: 1, title: 'Only a title' });
  const blank = createInitialState();

  expect(Object.keys(values).sort()).toEqual(Object.keys(blank).sort());
  expect(values.pricing).toEqual(blank.pricing);
  expect(values.sectionVisibility).toEqual(blank.sectionVisibility);
  expect(values.seo.robots).toEqual(blank.seo.robots);
});

it('answers a missing record with a blank form', () => {
  expect(fromRecord(null)).toEqual(createInitialState());
});

it('turns a null the editor types into into an empty string', () => {
  const values = fromRecord(RECORD);

  expect(values.projectName).toBe('');
  expect(values.reraNumber).toBe('');
  expect(values.location.landmark).toBe('');
  expect(values.images[0].caption).toBe('');
});

it('drops the embedded objects the API sends for display', () => {
  const values = fromRecord(RECORD);

  expect(values.location).not.toHaveProperty('locality');
  expect(values.location).not.toHaveProperty('city');
  expect(values.project).not.toHaveProperty('developer');
  expect(values).not.toHaveProperty('propertyType');
  expect(values).not.toHaveProperty('amenities');
  expect(values).not.toHaveProperty('badges');
  expect(values).not.toHaveProperty('viewCount');
  expect(values).not.toHaveProperty('publishedAt');
  // The ids behind them survive: the form edits those.
  expect(values.amenityIds).toEqual([1, 2]);
  expect(values.location.localityId).toBe(1);
  expect(values.project.developerId).toBe(1);
});

it('sorts every ordered list and renumbers it 1..n', () => {
  const values = fromRecord(RECORD);

  expect(values.images.map((image) => image.alt)).toEqual(['A', 'B']);
  expect(values.images.map((image) => image.order)).toEqual([1, 2]);
  expect(values.faqs.map((faq) => faq.question)).toEqual(['First', 'Second']);
});

it('gives a row with no id of its own a temporary one', () => {
  const values = fromRecord(RECORD);

  expect(values.images[0].id).toBe(1);
  expect(String(values.specifications[0].id)).toMatch(/^tmp-/);
});

it('mirrors the entity slug onto the SEO branch (D34)', () => {
  const values = fromRecord({ ...RECORD, seo: { slug: 'an-older-url', title: 'A title' } });

  expect(values.seo.slug).toBe('lakeview-heights-3-bhk');
  expect(values.seo.title).toBe('A title');
  // Everything the record left out still arrives at its default.
  expect(values.seo.twitter.card).toBe('summary_large_image');
});

it('keeps a section-visibility key the record switched off', () => {
  const values = fromRecord({ ...RECORD, sectionVisibility: { finance: false } });

  expect(values.sectionVisibility.finance).toBe(false);
  expect(values.sectionVisibility.gallery).toBe(true);
});
