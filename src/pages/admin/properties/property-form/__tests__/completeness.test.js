import createInitialState, {
  makeDocument,
  makeFaq,
  makeImage,
  makeNearbyPlace,
  resetTmpIds,
} from '../initialState';
import { completenessTone, computeCompleteness } from '../completeness';

const image = (index) =>
  makeImage({
    url: `https://example.com/${index}.jpg`,
    alt: `Photo ${index}`,
    isCover: index === 1,
  });

/** Every checklist item satisfied — the 100 % listing. */
const complete = () => ({
  ...createInitialState(),
  title: 'Lakeview Heights 3 BHK',
  slug: 'lakeview-heights-3-bhk',
  propertyTypeId: 1,
  description: `<p>${'A well written description. '.repeat(20)}</p>`,
  images: [1, 2, 3, 4, 5].map(image),
  pricing: { ...createInitialState().pricing, price: 16500000 },
  area: { ...createInitialState().area, superBuiltUpArea: 1650 },
  configuration: { ...createInitialState().configuration, bedrooms: 3 },
  amenityIds: [1, 2, 3, 4, 5, 6, 7, 8],
  highlights: ['One', 'Two', 'Three'],
  location: {
    ...createInitialState().location,
    localityId: 1,
    address: '14 Lake Road, Whitefield',
    latitude: 12.97,
    longitude: 77.75,
  },
  floorPlans: [],
  unitConfigurations: [{ id: 1, name: '3 BHK' }],
  brochureUrl: 'https://example.com/brochure.pdf',
  documents: [makeDocument({ title: 'Brochure', url: 'https://example.com/b.pdf' })],
  nearbyPlaces: [1, 2, 3].map((index) => makeNearbyPlace({ name: `Place ${index}` })),
  faqs: [1, 2, 3].map((index) => makeFaq({ question: `Q${index}`, answer: `A${index}` })),
  project: { ...createInitialState().project, developerId: 1 },
  seo: {
    ...createInitialState().seo,
    title: 'A title',
    description: 'A description',
    focusKeyword: '3 bhk whitefield',
  },
});

beforeEach(() => resetTmpIds());

it('weights add up to a hundred', () => {
  const { items } = computeCompleteness(createInitialState());
  expect(items.reduce((total, item) => total + item.weight, 0)).toBe(100);
});

it('reads a blank listing as nothing done', () => {
  const { percent, items } = computeCompleteness(createInitialState());

  expect(percent).toBe(0);
  expect(items.every((item) => item.done === false)).toBe(true);
});

it('reads a finished listing as a hundred', () => {
  const { percent, items } = computeCompleteness(complete());

  expect(percent).toBe(100);
  expect(items.filter((item) => !item.done)).toEqual([]);
});

it('earns exactly the weight of the item that was filled in', () => {
  const values = { ...createInitialState(), amenityIds: [1, 2, 3, 4, 5, 6, 7, 8] };
  expect(computeCompleteness(values).percent).toBe(8);
});

it('asks for a cover and five described photos, not five photos', () => {
  const values = { ...createInitialState(), images: [1, 2, 3, 4, 5].map(image) };
  expect(computeCompleteness(values).items.find((item) => item.key === 'images').done).toBe(true);

  const undescribed = {
    ...createInitialState(),
    images: [1, 2, 3, 4, 5].map((index) => makeImage({ url: `https://example.com/${index}.jpg` })),
  };
  expect(computeCompleteness(undescribed).items.find((item) => item.key === 'images').done).toBe(
    false
  );
});

it('counts a rental listing’s monthly rent as its price', () => {
  const values = {
    ...createInitialState(),
    listingType: 'rent',
    pricing: { ...createInitialState().pricing, rentPerMonth: 45000 },
  };
  expect(computeCompleteness(values).items.find((item) => item.key === 'pricing').done).toBe(true);
});

it('does not ask a plot for a bedroom count', () => {
  const values = {
    ...createInitialState(),
    segment: 'land',
    area: { ...createInitialState().area, plotArea: 2400 },
  };
  expect(computeCompleteness(values).items.find((item) => item.key === 'area').done).toBe(true);
});

it('bands the percentage for the meter', () => {
  expect(completenessTone(0)).toBe('error');
  expect(completenessTone(39)).toBe('error');
  expect(completenessTone(40)).toBe('warning');
  expect(completenessTone(74)).toBe('warning');
  expect(completenessTone(75)).toBe('success');
  expect(completenessTone(100)).toBe('success');
});

it('asks for the address the checklist names', () => {
  const listing = complete();
  listing.location = { ...listing.location, address: '' };

  // "Locality, address and map coordinates" was ticked without an address.
  const item = computeCompleteness(listing).items.find((entry) => entry.key === 'location');
  expect(item.done).toBe(false);
});

it('does not ask a plot or an office for bedrooms', () => {
  const office = {
    ...complete(),
    segment: 'commercial',
    configuration: { ...createInitialState().configuration, bedrooms: null, bathrooms: null },
  };
  const plot = {
    ...complete(),
    segment: 'land',
    area: { ...createInitialState().area, plotArea: 2400 },
    configuration: { ...createInitialState().configuration, bedrooms: null, bathrooms: null },
  };

  const areaOf = (values) =>
    computeCompleteness(values).items.find((entry) => entry.key === 'area').done;
  expect(areaOf(office)).toBe(true);
  expect(areaOf(plot)).toBe(true);
});
