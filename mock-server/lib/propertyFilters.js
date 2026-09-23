/**
 * Property search (00_MASTER_CONTEXT.md §5.7).
 *
 * One module implements every filter and every sort option of the listing —
 * public and admin — so `GET /properties` and `GET /admin/properties` cannot
 * disagree about what `bedrooms=3` means. The rules that need explaining:
 *
 *   price   `pricing.price` for a sale, `pricing.rentPerMonth` for a rent or a
 *           lease, falling back to `priceRangeMin` for a project quoted as a
 *           range. A listing on request has no number, so it drops out as soon
 *           as a price filter is set and sorts last on `price-asc`/`price-desc`.
 *           A price sort puts sales before rentals: a total and a monthly
 *           figure are not one scale.
 *   area    `superBuiltUpArea ?? carpetArea ?? plotArea`, converted to square
 *           feet, and the filter's own bounds converted from `areaUnit`, so
 *           `minArea=100&areaUnit=sqm` compares like with like.
 *   beds    the property's own `configuration.bedrooms` **or** any of its
 *           active unit configurations, and `5` means "five or more". A plot or
 *           an office has neither, so it never matches a bedrooms filter.
 *
 * Everything works on the stored record — the embeds are attached to the page
 * the route returns, not to the whole collection.
 */

const { AREA_UNITS } = require('./enums');
const { inCsv, matchesQ, toBool } = require('./filters');

/** `bedrooms=5` and `bedrooms=5,4` both mean "5 or more" for the 5 (§7, D68). */
const MAX_BEDROOM_BUCKET = 5;

const isFilled = (value) => value !== undefined && value !== null && value !== '';

const asNumber = (value) => {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(parsed) ? parsed : null;
};

const first = (value) => (Array.isArray(value) ? value[0] : value);

/** The number a price filter compares against, or `null` for "on request". */
function priceOf(property) {
  const pricing = property?.pricing ?? {};
  if (pricing.priceOnRequest) return null;

  const rental = property?.listingType === 'rent' || property?.listingType === 'lease';
  const value = rental ? pricing.rentPerMonth : (pricing.price ?? pricing.priceRangeMin);
  return Number.isFinite(value) ? value : null;
}

/** The property's headline area in square feet, or `null`. */
function areaInSqft(property) {
  const area = property?.area ?? {};
  const value = area.superBuiltUpArea ?? area.carpetArea ?? area.plotArea;
  if (!Number.isFinite(value)) return null;
  return AREA_UNITS.toSqft(value, area.areaUnit ?? 'sqft');
}

/** Every bedroom count the property can be found under. */
function bedroomsOf(property) {
  const counts = new Set();
  const own = property?.configuration?.bedrooms;
  if (Number.isFinite(own)) counts.add(own);

  for (const unit of property?.unitConfigurations ?? []) {
    if (unit?.isActive === false) continue;
    if (Number.isFinite(unit?.bedrooms)) counts.add(unit.bedrooms);
  }

  return counts;
}

/** The last millisecond of `yyyy-mm`, for `possessionBy`. */
function endOfMonth(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value ?? '').trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return Date.UTC(year, month, 0, 23, 59, 59, 999);
}

/** `q` also searches the locality and the developer, which live elsewhere. */
function matchesSearch(property, q, source) {
  const needle = String(q ?? '').trim();
  if (!needle) return true;

  const locality = (source?.localities ?? []).find(
    (row) => row.id === property?.location?.localityId
  );
  const developer = (source?.developers ?? []).find(
    (row) => row.id === property?.project?.developerId
  );

  const haystack = {
    ...property,
    localityName: locality?.name ?? null,
    developerName: developer?.name ?? null,
  };

  return matchesQ(
    haystack,
    ['title', 'projectName', 'shortDescription', 'localityName', 'developerName'],
    needle
  );
}

/** `ids=3,1` returns those properties in that order and ignores the rest (§5.7). */
function selectByIds(items, ids) {
  const wanted = inCsv(ids);
  if (wanted.length === 0) return null;

  return wanted
    .map((id) => items.find((property) => String(property.id) === String(id)))
    .filter(Boolean);
}

/** True when the property satisfies every filter the query sets. */
function matchesFilters(property, query, { admin, source }) {
  const csv = (name) => inCsv(query[name]);
  const has = (name) => csv(name).length > 0;
  const includes = (name, value) => csv(name).includes(String(value));

  if (has('listingType') && !includes('listingType', property.listingType)) return false;
  if (has('segment') && !includes('segment', property.segment)) return false;
  if (has('propertyTypeId') && !includes('propertyTypeId', property.propertyTypeId)) return false;
  if (has('localityId') && !includes('localityId', property.location?.localityId)) return false;
  if (has('cityId') && !includes('cityId', property.location?.cityId)) return false;
  if (has('constructionStatus') && !includes('constructionStatus', property.constructionStatus)) {
    return false;
  }
  if (has('availability') && !includes('availability', property.availability)) return false;
  if (has('furnishing') && !includes('furnishing', property.furnishing)) return false;
  if (has('facing') && !includes('facing', property.facing)) return false;
  if (has('developerId') && !includes('developerId', property.project?.developerId)) return false;

  if (has('bedrooms')) {
    const counts = bedroomsOf(property);
    const wanted = csv('bedrooms')
      .map((value) => Number(value))
      .filter(Number.isFinite);
    const matched = wanted.some((value) =>
      value >= MAX_BEDROOM_BUCKET ? [...counts].some((count) => count >= value) : counts.has(value)
    );
    if (!matched) return false;
  }

  const minPrice = asNumber(query.minPrice);
  const maxPrice = asNumber(query.maxPrice);
  if (isFilled(first(query.minPrice)) || isFilled(first(query.maxPrice))) {
    const price = priceOf(property);
    // A price filter is a question about a number, and "on request" is not one.
    if (price === null) return false;
    if (minPrice !== null && price < minPrice) return false;
    if (maxPrice !== null && price > maxPrice) return false;
  }

  const minArea = asNumber(query.minArea);
  const maxArea = asNumber(query.maxArea);
  if (minArea !== null || maxArea !== null) {
    const unit = String(first(query.areaUnit) ?? 'sqft');
    const area = areaInSqft(property);
    if (area === null) return false;
    if (minArea !== null && area < AREA_UNITS.toSqft(minArea, unit)) return false;
    if (maxArea !== null && area > AREA_UNITS.toSqft(maxArea, unit)) return false;
  }

  if (has('amenityIds')) {
    const owned = new Set((property.amenityIds ?? []).map(String));
    if (!csv('amenityIds').every((id) => owned.has(id))) return false;
  }

  if (has('badgeIds')) {
    const owned = new Set((property.badgeIds ?? []).map(String));
    if (!csv('badgeIds').some((id) => owned.has(id))) return false;
  }

  for (const flag of ['isFeatured', 'isVerified', 'reraRegistered']) {
    const wanted = toBool(query[flag]);
    if (wanted !== undefined && Boolean(property[flag]) !== wanted) return false;
  }

  if (isFilled(first(query.possessionBy))) {
    const deadline = endOfMonth(first(query.possessionBy));
    const possession = Date.parse(property.possessionDate);
    // Something you can move into is available by any date (§5.7).
    const ready =
      property.constructionStatus === 'ready-to-move' || property.constructionStatus === 'resale';
    if (!ready) {
      if (deadline === null || !Number.isFinite(possession) || possession > deadline) return false;
    }
  }

  if (admin) {
    const isActive = toBool(query.isActive);
    if (isActive !== undefined && Boolean(property.isActive) !== isActive) return false;
    if (has('seoScoreBand') && !includes('seoScoreBand', property.seo?.scoreBand ?? 'none')) {
      return false;
    }
    if (has('createdBy') && !includes('createdBy', property.createdBy)) return false;
  }

  return matchesSearch(property, first(query.q), source);
}

/**
 * Applies every §5.7 filter the query sets.
 *
 * @param {Array<object>} items the properties in scope (public: active only)
 * @param {object} query `req.query`
 * @param {{admin?: boolean, source?: object}} [options] `source` resolves the
 *   locality and developer names `q` searches
 * @returns {Array<object>}
 */
function applyPropertyFilters(items, query = {}, { admin = false, source } = {}) {
  const byIds = selectByIds(items, query.ids);
  if (byIds) return byIds;

  return items.filter((property) => matchesFilters(property, query, { admin, source }));
}

/** `null` sorts last whichever direction the caller asked for. */
function compareNullable(left, right, direction) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return direction === 'desc' ? right - left : left - right;
}

/** 0 for a sale, 1 for a rent or a lease — the two scales a price comes in. */
const priceScaleOf = (property) =>
  property?.listingType === 'rent' || property?.listingType === 'lease' ? 1 : 0;

/**
 * Orders by price without comparing a total with a monthly figure.
 *
 * `priceOf` answers the rent for a rental and the price for a sale, so a plain
 * numeric sort put every ₹21,000/month flat ahead of the cheapest ₹34.5 L sale
 * on "low to high", and after it on "high to low". Sales come first and
 * rentals after, each ordered the way the caller asked; a listing on request
 * still sorts last.
 */
function comparePrice(a, b, direction) {
  const left = priceOf(a);
  const right = priceOf(b);
  if (left === null || right === null) return compareNullable(left, right, direction);
  return priceScaleOf(a) - priceScaleOf(b) || compareNullable(left, right, direction);
}

const time = (value) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** The comparators of §5.7 plus the admin columns of §5.14. */
const COMPARATORS = {
  relevance: (a, b) =>
    Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) ||
    (b.priorityOrder ?? 0) - (a.priorityOrder ?? 0) ||
    compareNullable(time(a.updatedAt), time(b.updatedAt), 'desc'),
  newest: (a, b) => compareNullable(time(a.publishedAt), time(b.publishedAt), 'desc'),
  'price-asc': (a, b) => comparePrice(a, b, 'asc'),
  'price-desc': (a, b) => comparePrice(a, b, 'desc'),
  'area-desc': (a, b) => compareNullable(areaInSqft(a), areaInSqft(b), 'desc'),
  popular: (a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0),
};

/** Admin columns sort by a plain value, in the direction `order` asks for. */
const ADMIN_VALUES = {
  updatedAt: (property) => time(property.updatedAt),
  createdAt: (property) => time(property.createdAt),
  price: priceOf,
  viewCount: (property) => property.viewCount ?? 0,
  priorityOrder: (property) => property.priorityOrder ?? 0,
  seoScore: (property) => (Number.isFinite(property.seo?.score) ? property.seo.score : null),
  title: (property) => property.title ?? '',
};

/**
 * Sorts a result set.
 *
 * @param {Array<object>} items
 * @param {string} [sort] a §5.7 option or an admin column
 * @param {string} [order] `asc` | `desc`, used by the admin columns only
 * @returns {Array<object>} a sorted copy
 */
function applyPropertySort(items, sort, order) {
  const key = String(first(sort) ?? '') || 'relevance';
  const direction = String(first(order) ?? '').toLowerCase() === 'asc' ? 'asc' : 'desc';
  const sorted = items.slice();

  if (COMPARATORS[key]) return sorted.sort(COMPARATORS[key]);

  if (key === 'price') return sorted.sort((a, b) => comparePrice(a, b, direction));

  const value = ADMIN_VALUES[key];
  if (!value) return sorted.sort(COMPARATORS.relevance);

  return sorted.sort((a, b) => {
    const left = value(a);
    const right = value(b);
    if (typeof left === 'string' || typeof right === 'string') {
      const result = String(left).localeCompare(String(right), 'en', { sensitivity: 'base' });
      return direction === 'desc' ? -result : result;
    }
    return compareNullable(left, right, direction);
  });
}

module.exports = {
  applyPropertyFilters,
  applyPropertySort,
  priceOf,
  areaInSqft,
  bedroomsOf,
  MAX_BEDROOM_BUCKET,
};
