import { citiesOf, joinNames, localitiesIndex } from '../localitiesIndex';
import { INDEX_PAGES, indexPageFor } from '../pageTypes';

/**
 * `/localities` names the cities its localities are in: one reads as the site
 * always read, a few are named, more are counted, and `?city=` picks one.
 */

const BENGALURU = { id: 1, name: 'Bengaluru', slug: 'bengaluru' };
const BONGAIGAON = { id: 2, name: 'Bongaigaon', slug: 'bongaigaon' };
const MYSURU = { id: 3, name: 'Mysuru', slug: 'mysuru' };
const HUBBALLI = { id: 4, name: 'Hubballi', slug: 'hubballi' };

let nextId = 1;
const localityIn = (city) => ({ id: nextId++, name: `Locality ${nextId}`, cityId: city.id, city });

/** `count` localities in each city given. */
const localities = (...pairs) =>
  pairs.flatMap(([city, count]) => Array.from({ length: count }, () => localityIn(city)));

describe('citiesOf', () => {
  it('lists the cities the localities are in, the one with the most first', () => {
    const covered = citiesOf(localities([BONGAIGAON, 1], [BENGALURU, 3], [MYSURU, 1]));

    expect(covered.map((city) => [city.name, city.count])).toEqual([
      ['Bengaluru', 3],
      ['Bongaigaon', 1],
      ['Mysuru', 1],
    ]);
    expect(covered[0]).toEqual({ id: 1, name: 'Bengaluru', slug: 'bengaluru', count: 3 });
  });

  it('reads the city list for a locality without its embed, and skips one with no city', () => {
    const covered = citiesOf(
      [{ id: 1, cityId: 2 }, { id: 2, cityId: null }, { id: 3 }],
      [BENGALURU, BONGAIGAON]
    );

    expect(covered).toEqual([{ id: 2, name: 'Bongaigaon', slug: 'bongaigaon', count: 1 }]);
  });
});

describe('joinNames', () => {
  it('joins one, two and three names', () => {
    expect(joinNames(['Bengaluru'])).toBe('Bengaluru');
    expect(joinNames(['Bengaluru', 'Mysuru'])).toBe('Bengaluru and Mysuru');
    expect(joinNames(['Bengaluru', 'Mysuru', 'Hubballi'])).toBe('Bengaluru, Mysuru and Hubballi');
    expect(joinNames([])).toBe('');
  });
});

describe('localitiesIndex', () => {
  it('reads as the site always read with one city', () => {
    const words = localitiesIndex({ localities: localities([BENGALURU, 20]) });

    expect(words.title).toBe('Localities in Bengaluru');
    expect(words.description).toBe(
      'Explore neighbourhoods across Bengaluru: connectivity, prices and lifestyle at a glance.'
    );
    expect(words.zoneCity).toBe('Bengaluru');
    expect(words.city).toBeNull();
  });

  it('names two or three cities, and leaves the zones as sides', () => {
    const two = localitiesIndex({ localities: localities([BENGALURU, 20], [BONGAIGAON, 1]) });
    expect(two.title).toBe('Localities in Bengaluru and Bongaigaon');
    expect(two.description).toBe(
      'Explore neighbourhoods across Bengaluru and Bongaigaon: connectivity, prices and lifestyle at a glance.'
    );
    expect(two.zoneCity).toBe('');

    const three = localitiesIndex({
      localities: localities([BENGALURU, 20], [BONGAIGAON, 1], [MYSURU, 2]),
    });
    expect(three.title).toBe('Localities in Bengaluru, Mysuru and Bongaigaon');
  });

  it('counts the cities from four', () => {
    const words = localitiesIndex({
      localities: localities([BENGALURU, 5], [BONGAIGAON, 1], [MYSURU, 1], [HUBBALLI, 1]),
    });

    expect(words.title).toBe('Localities across 4 cities');
    expect(words.description).toBe(
      'Explore neighbourhoods across 4 cities: connectivity, prices and lifestyle at a glance.'
    );
    expect(words.cities).toHaveLength(4);
  });

  it('becomes the chosen city’s index, zones and all', () => {
    const words = localitiesIndex({
      localities: localities([BENGALURU, 20], [BONGAIGAON, 1]),
      citySlug: 'bongaigaon',
    });

    expect(words.title).toBe('Localities in Bongaigaon');
    expect(words.zoneCity).toBe('Bongaigaon');
    expect(words.city).toEqual({ id: 2, name: 'Bongaigaon', slug: 'bongaigaon', count: 1 });
    expect(words.cities).toHaveLength(2);
  });

  it('treats a city it does not cover as no city at all', () => {
    const words = localitiesIndex({
      localities: localities([BENGALURU, 20], [BONGAIGAON, 1]),
      citySlug: 'mysuru',
    });

    expect(words.city).toBeNull();
    expect(words.title).toBe('Localities in Bengaluru and Bongaigaon');
  });

  it('says only "Localities" before it knows a city', () => {
    const words = localitiesIndex();

    expect(words.title).toBe('Localities');
    expect(words.description).toBe(
      'Explore neighbourhoods: connectivity, prices and lifestyle at a glance.'
    );
    expect(words.cities).toEqual([]);
    expect(words.zoneCity).toBe('');
  });
});

describe('indexPageFor', () => {
  it('names the cities of the localities index from the master data it is given', () => {
    expect(
      indexPageFor('localities', { localities: localities([BENGALURU, 2], [BONGAIGAON, 1]) })
    ).toEqual({
      title: 'Localities in Bengaluru and Bongaigaon',
      description:
        'Explore neighbourhoods across Bengaluru and Bongaigaon: connectivity, prices and lifestyle at a glance.',
    });
  });

  it('gives every other index page its fixed words', () => {
    expect(indexPageFor('builders')).toBe(INDEX_PAGES.builders);
    expect(indexPageFor('nothing-of-the-sort')).toEqual({});
  });
});
