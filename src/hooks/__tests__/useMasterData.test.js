import { renderHook } from '@testing-library/react';

import { AMENITY_CATEGORIES } from '../../config/enums';
import { MasterDataContext } from '../../contexts/MasterDataContext';
import {
  toOptions,
  useAmenities,
  useAmenitiesGrouped,
  useBadgeMap,
  useBanks,
  useCities,
  useDevelopers,
  useLocalities,
  usePropertyTypes,
} from '../useMasterData';

const PROPERTY_TYPES = [
  { id: 1, name: 'Villas', slug: 'villas', segment: 'residential', order: 2, isActive: true },
  {
    id: 2,
    name: 'Apartments',
    slug: 'apartments',
    segment: 'residential',
    order: 1,
    isActive: true,
  },
  {
    id: 3,
    name: 'Office Spaces',
    slug: 'office-spaces',
    segment: 'commercial',
    order: 3,
    isActive: true,
  },
  { id: 4, name: 'Farm Land', slug: 'farm-land', segment: 'land', order: 4, isActive: false },
];

const AMENITIES = [
  { id: 10, name: 'Swimming Pool', slug: 'swimming-pool', category: 'lifestyle', order: 6 },
  { id: 11, name: 'Power Backup', slug: 'power-backup', category: 'basic', order: 2 },
  { id: 12, name: 'Lift', slug: 'lift', category: 'basic', order: 1 },
  { id: 13, name: 'Kids Pool', slug: 'kids-pool', category: 'kids', order: 9, isActive: false },
];

const BADGES = [
  { id: 5, name: 'New Launch', slug: 'new-launch', color: 'info', order: 1 },
  { id: 6, name: 'Price Drop', slug: 'price-drop', color: 'warning', order: 2 },
];

const BANKS = [
  { id: 1, name: 'Metro Capital Bank', order: 2, isActive: true },
  { id: 2, name: 'Garden City Bank', order: 1, isActive: true },
  { id: 3, name: 'Closed Finance', order: 3, isActive: false },
];

const LOCALITIES = [
  { id: 1, name: 'Whitefield', order: 1, isFeatured: true, isActive: true },
  { id: 2, name: 'Jayanagar', order: 2, isFeatured: false, isActive: true },
  { id: 3, name: 'Hidden Layout', order: 3, isFeatured: true, isActive: false },
];

const DEVELOPERS = [
  { id: 1, name: 'Aurelia Estates', order: 2, isFeatured: true, isActive: true },
  { id: 2, name: 'Cauvery Homes', order: 1, isFeatured: false, isActive: true },
];

const CITIES = [
  { id: 2, name: 'Mysuru', isActive: true },
  { id: 1, name: 'Bengaluru', isActive: true },
  { id: 3, name: 'Retired City', isActive: false },
];

const EMPTY = {
  localities: [],
  cities: [],
  propertyTypes: [],
  amenities: [],
  badges: [],
  developers: [],
  banks: [],
};

/** A provider holding exactly the collections a test cares about. */
const wrapperWith = (data) =>
  function Wrapper({ children }) {
    return (
      <MasterDataContext.Provider value={{ ...EMPTY, ...data }}>
        {children}
      </MasterDataContext.Provider>
    );
  };

const names = (records) => records.map((record) => record.name);

describe('usePropertyTypes', () => {
  it('returns the active types in `order`', () => {
    const { result } = renderHook(() => usePropertyTypes(), {
      wrapper: wrapperWith({ propertyTypes: PROPERTY_TYPES }),
    });

    expect(names(result.current)).toEqual(['Apartments', 'Villas', 'Office Spaces']);
  });

  it('narrows to one segment', () => {
    const { result } = renderHook(() => usePropertyTypes({ segment: 'commercial' }), {
      wrapper: wrapperWith({ propertyTypes: PROPERTY_TYPES }),
    });

    expect(names(result.current)).toEqual(['Office Spaces']);
  });

  it('keeps the inactive ones when asked', () => {
    const { result } = renderHook(() => usePropertyTypes({ activeOnly: false }), {
      wrapper: wrapperWith({ propertyTypes: PROPERTY_TYPES }),
    });

    expect(names(result.current)).toEqual(['Apartments', 'Villas', 'Office Spaces', 'Farm Land']);
  });

  it('leaves the context collection where it found it', () => {
    const records = [...PROPERTY_TYPES];
    renderHook(() => usePropertyTypes(), { wrapper: wrapperWith({ propertyTypes: records }) });

    expect(names(records)).toEqual(names(PROPERTY_TYPES));
  });

  it('is empty outside a provider rather than throwing', () => {
    const { result } = renderHook(() => usePropertyTypes());
    expect(result.current).toEqual([]);
  });
});

describe('useAmenitiesGrouped', () => {
  it('groups in `AMENITY_CATEGORIES` order with the items in `order`', () => {
    const { result } = renderHook(() => useAmenitiesGrouped(), {
      wrapper: wrapperWith({ amenities: AMENITIES }),
    });

    expect(result.current.map((group) => group.category)).toEqual(['basic', 'lifestyle']);
    expect(result.current[0].label).toBe(AMENITY_CATEGORIES.labelOf('basic'));
    expect(names(result.current[0].items)).toEqual(['Lift', 'Power Backup']);
    expect(names(result.current[1].items)).toEqual(['Swimming Pool']);
  });

  it('drops a category whose only amenity is inactive', () => {
    const { result } = renderHook(() => useAmenitiesGrouped(), {
      wrapper: wrapperWith({ amenities: AMENITIES }),
    });

    expect(result.current.some((group) => group.category === 'kids')).toBe(false);
  });

  it('carries the category icon so a group can render its own heading', () => {
    const { result } = renderHook(() => useAmenitiesGrouped(), {
      wrapper: wrapperWith({ amenities: AMENITIES }),
    });

    expect(result.current[0].icon).toBe(AMENITY_CATEGORIES.meta.basic.icon);
  });
});

describe('useAmenities', () => {
  it('returns one category, ungrouped and in `order`', () => {
    const { result } = renderHook(() => useAmenities({ category: 'basic' }), {
      wrapper: wrapperWith({ amenities: AMENITIES }),
    });

    expect(names(result.current)).toEqual(['Lift', 'Power Backup']);
  });
});

describe('useBadgeMap', () => {
  it('indexes the badges by id as a string', () => {
    const { result } = renderHook(() => useBadgeMap(), {
      wrapper: wrapperWith({ badges: BADGES }),
    });

    expect(result.current.size).toBe(2);
    expect(result.current.get('5').name).toBe('New Launch');
    expect(result.current.get(String(6)).color).toBe('warning');
    expect(result.current.get('99')).toBeUndefined();
  });
});

describe('useBanks', () => {
  it('returns the active lenders in `order`', () => {
    const { result } = renderHook(() => useBanks(), { wrapper: wrapperWith({ banks: BANKS }) });

    expect(names(result.current)).toEqual(['Garden City Bank', 'Metro Capital Bank']);
  });

  it('is empty when nothing is active — which is what hides the finance section', () => {
    const { result } = renderHook(() => useBanks(), {
      wrapper: wrapperWith({ banks: [{ id: 9, name: 'Closed', isActive: false }] }),
    });

    expect(result.current).toEqual([]);
  });
});

describe('useLocalities and useDevelopers', () => {
  it('returns the active localities in `order`', () => {
    const { result } = renderHook(() => useLocalities(), {
      wrapper: wrapperWith({ localities: LOCALITIES }),
    });

    expect(names(result.current)).toEqual(['Whitefield', 'Jayanagar']);
  });

  it('narrows to the featured localities', () => {
    const { result } = renderHook(() => useLocalities({ featuredOnly: true }), {
      wrapper: wrapperWith({ localities: LOCALITIES }),
    });

    expect(names(result.current)).toEqual(['Whitefield']);
  });

  it('narrows to the featured developers', () => {
    const { result } = renderHook(() => useDevelopers({ featuredOnly: true }), {
      wrapper: wrapperWith({ developers: DEVELOPERS }),
    });

    expect(names(result.current)).toEqual(['Aurelia Estates']);
  });
});

describe('useCities', () => {
  it('sorts by name, because a city has no order of its own', () => {
    const { result } = renderHook(() => useCities(), { wrapper: wrapperWith({ cities: CITIES }) });

    expect(names(result.current)).toEqual(['Bengaluru', 'Mysuru']);
  });
});

describe('toOptions', () => {
  it('turns records into `{ value, label }`', () => {
    expect(toOptions([{ id: 3, name: 'Villas' }])).toEqual([{ value: 3, label: 'Villas' }]);
    expect(toOptions()).toEqual([]);
  });
});
