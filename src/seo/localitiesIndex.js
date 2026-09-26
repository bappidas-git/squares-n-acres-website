/**
 * What `/localities` calls itself: the cities its localities are in.
 *
 * The index lists every active locality, and every locality carries its city,
 * so the cities it covers are the ones those localities are in — a city with
 * none yet changes nothing. One city is named everywhere, as the site always
 * read ("Localities in Bengaluru", zones "North Bengaluru"); two or three are
 * named in the heading and the zones are sides alone, since they span every
 * city; from four the cities are counted. `?city=<slug>` of one of them makes
 * the index that city's; a slug it does not cover is no filter at all, as an
 * unknown zone is (P14).
 *
 * The page draws these words and `<Seo>` publishes them. Authored in CommonJS
 * (D36b) so that `scripts/lib/renderJsonLd.js` resolves `/localities` from the
 * same master data, and the same rule, as the browser.
 */

const { SEO, fill } = require('../config/copy');

const WORDS = SEO.indexPages.localities;

/** Past this many the heading counts the cities rather than naming them. */
const MAX_NAMED = 3;

/** "Bengaluru", "Bengaluru and Mysuru", "Bengaluru, Mysuru and Hubballi". */
function joinNames(names) {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * The cities the localities are in, the one with the most localities first
 * and the rest by name.
 *
 * @param {Array<object>} [localities] records with `city` or `cityId`
 * @param {Array<object>} [cities] the city list, for a locality without its embed
 * @returns {Array<{id: number, name: string, slug: string, count: number}>}
 */
function citiesOf(localities, cities) {
  const byId = new Map(
    (Array.isArray(cities) ? cities : []).map((city) => [String(city.id), city])
  );
  const found = new Map();

  for (const locality of Array.isArray(localities) ? localities : []) {
    const id = locality?.city?.id ?? locality?.cityId;
    if (id === null || id === undefined || id === '') continue;
    const city = locality.city?.name ? locality.city : byId.get(String(id));
    if (!city?.name) continue;

    const key = String(id);
    const entry = found.get(key) ?? {
      id: city.id ?? id,
      name: city.name,
      slug: city.slug ?? '',
      count: 0,
    };
    entry.count += 1;
    found.set(key, entry);
  }

  return [...found.values()].sort(
    (left, right) => right.count - left.count || left.name.localeCompare(right.name)
  );
}

/**
 * @param {object} [context]
 * @param {Array<object>} [context.localities] the active localities
 * @param {Array<object>} [context.cities] the active cities
 * @param {string} [context.citySlug] the city of `?city=`, if any
 * @returns {{cities: Array<object>, city: object|null, zoneCity: string,
 *   title: string, description: string}} `cities` is what the index covers,
 *   `city` the one chosen of them, and `zoneCity` the city its zones are
 *   sides of — `''` while they span several
 */
function localitiesIndex({ localities, cities, citySlug } = {}) {
  const covered = citiesOf(localities, cities);
  const city = citySlug ? (covered.find((entry) => entry.slug === citySlug) ?? null) : null;
  const named = city ? [city] : covered;

  let title = WORDS.title;
  let description = WORDS.description;
  if (named.length > MAX_NAMED) {
    title = fill(WORDS.titleAcross, { count: named.length });
    description = fill(WORDS.descriptionAcross, { count: named.length });
  } else if (named.length > 0) {
    const names = joinNames(named.map((entry) => entry.name));
    title = fill(WORDS.titleIn, { cities: names });
    description = fill(WORDS.descriptionIn, { cities: names });
  }

  return {
    cities: covered,
    city,
    zoneCity: named.length === 1 ? named[0].name : '',
    title,
    description,
  };
}

module.exports = { citiesOf, joinNames, localitiesIndex };
