import { DEFAULT_CITY } from './listingRoutes';
import { BEDROOM_OPTIONS, LISTING_TYPES } from '../../config/enums';
import { LISTING_DEFAULTS, hasValue } from '../../utils/listingFilters';
import { SITE } from '../../config/site';

/**
 * What a listing URL tells a search engine (§9.4, §9.5).
 *
 * A pure function: route + params + `meta` in, `{ title, description, h1,
 * canonicalPath, noindex, intro }` out. `ListingEngine` hands it to
 * `<Seo type="listing">` as overrides and draws the same `h1` from it, so the
 * rules are written down once and tested once.
 *
 * Two rules do the work. **Canonical**: the path plus only the parameters
 * worth indexing, in a fixed order, so `?localityId=4&sort=price-asc` and
 * `?sort=price-asc&localityId=4` are one page and not two. **Noindex**: any
 * other parameter — a price, an amenity, a sort, a search — means the visitor
 * built a view for themselves rather than a page Google should keep.
 */

/** Indexed, in this order; everything else makes the page `noindex` (§9.4). */
const INDEX_WORTHY = [
  'listingType',
  'segment',
  'propertyTypeId',
  'localityId',
  'constructionStatus',
  'bedrooms',
];

const ONE_OF = (value) => {
  const list = Array.isArray(value) ? value : hasValue(value) ? [value] : [];
  return list.length === 1 ? String(list[0]) : null;
};

const csv = (value) => (Array.isArray(value) ? value.join(',') : String(value));

/** The nouns a listing template counts, so "1 Listings" never reaches a tab. */
const SINGULARS = { listings: 'listing', properties: 'property', results: 'result' };

const singularOf = (word) => {
  const base = SINGULARS[word.toLowerCase()] ?? word.toLowerCase().replace(/s$/, '');
  return word[0] === word[0].toUpperCase() ? base[0].toUpperCase() + base.slice(1) : base;
};

/** A record of a master-data collection by id, tolerant of string ids. */
const findById = (records, id) =>
  (Array.isArray(records) ? records : []).find((row) => String(row.id) === String(id)) ?? null;

/**
 * Removes unresolved variables and the punctuation they leave behind (§9.5).
 *
 * `"%propertytype% %listingtype% in %locality%, %city%"` with no locality must
 * read "Properties for Sale in Bengaluru", not "Properties for Sale in ,
 * Bengaluru".
 */
export function cleanTitle(text) {
  return String(text ?? '')
    .replace(/%\w+%/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,;:])/g, '$1')
    .replace(/([,–|])\s*\1/g, '$1')
    .replace(/\b(in|at|for|near|from)\s*,\s*/gi, '$1 ')
    .replace(/\s*[–-]\s*(?=$|\|)/g, ' ')
    .replace(/^[\s,\-–|]+|[\s,\-–|]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The template's variables, resolved from the route, the filters and the count. */
function buildVariables({ config, effective, masterData, count, siteName, separator }) {
  const localityId = ONE_OF(effective.localityId);
  const locality = localityId ? findById(masterData.localities, localityId) : null;

  const typeId = ONE_OF(effective.propertyTypeId);
  const propertyType = typeId ? findById(masterData.propertyTypes, typeId) : null;

  const bedrooms = ONE_OF(effective.bedrooms);
  const city = masterData.cities?.[0]?.name || DEFAULT_CITY;

  return {
    locality,
    propertyType,
    city,
    bedroomLabel: bedrooms ? BEDROOM_OPTIONS.labelOf(Number(bedrooms)) : '',
    noun: propertyType?.name || config.noun || 'Properties',
    count,
    siteName,
    separator,
  };
}

/**
 * The verb in the heading.
 *
 * A route that fixes its listing type has already said it in words — a
 * pre-launch page is not "pre-launch projects for sale" — so the route's own
 * `verb` wins until the visitor picks a different listing type in the rail.
 */
function verbOf(config, effective) {
  const routeFixed = config.fixed?.listingType;
  const chosen = effective.listingType;

  if (config.verb !== undefined && (chosen === routeFixed || (!chosen && !routeFixed))) {
    return config.verb;
  }
  return chosen ? LISTING_TYPES.verbOf(chosen).toLowerCase() : '';
}

/**
 * `%listingtype%` for the title: {@link verbOf}'s decision, in §9.5's casing.
 *
 * The heading and the description have always honoured a route's `verb`; the
 * title resolved the token straight from the listing type instead, so the four
 * `/buy/<status>` pages announced themselves as "Under-construction properties
 * **for Sale**" — the same claim twice, and "Resale properties for Sale" says
 * it twice in one breath. It also cost nine characters of a 60-character
 * result (NEW-40). Empty verb in, empty token out; otherwise the title case
 * §9.5 gives the token ("for Sale", not "for sale").
 */
function titleVerbOf(config, effective) {
  const verb = verbOf(config, effective);
  if (!verb) return '';
  return effective.listingType ? LISTING_TYPES.verbOf(effective.listingType) : verb;
}

/**
 * The `<h1>`: what this page is, in the visitor's words and without the brand.
 *
 * Built from the filters rather than from the route, so narrowing a search
 * renames the page — "3 BHK apartments for sale in Whitefield, Bengaluru".
 */
function buildH1({ config, effective, vars }) {
  const place = [vars.locality?.name, vars.city].filter(Boolean).join(', ');
  const head = [vars.bedroomLabel, vars.noun].filter(Boolean).join(' ');
  const verb = verbOf(config, effective);

  return cleanTitle([head, verb, place ? `in ${place}` : ''].filter(Boolean).join(' '));
}

/**
 * The canonical path: the route, plus the index-worthy parameters the route
 * has not already fixed, in the order of §9.4.
 */
function buildCanonicalPath({ config, params, page }) {
  const fixed = config.fixed ?? {};
  const search = [];

  for (const key of INDEX_WORTHY) {
    if (hasValue(fixed[key])) continue;
    if (!hasValue(params[key])) continue;
    search.push(`${key}=${encodeURIComponent(csv(params[key]))}`);
  }

  const base = config.path ?? '/properties';
  const query = search.join('&');
  const withFilters = query ? `${base}?${query}` : base;
  if (page <= 1) return withFilters;
  return `${withFilters}${query ? '&' : '?'}page=${page}`;
}

/** Whether any parameter outside the index-worthy list is in play (§9.4). */
function hasFilteringParams(params) {
  return Object.entries(params ?? {}).some(([key, value]) => {
    if (!hasValue(value)) return false;
    if (INDEX_WORTHY.includes(key) || key === 'page') return false;
    if (key === 'perPage') return Number(value) !== LISTING_DEFAULTS.perPage;
    if (key === 'sort') return value !== LISTING_DEFAULTS.sort;
    return true;
  });
}

/**
 * Everything the head of a listing page needs.
 *
 * @param {object} args
 * @param {object} args.routeConfig an entry of `listingRoutes.js`, already resolved
 * @param {object} args.params the visitor's parameters (the query string)
 * @param {object} [args.meta] the list envelope's `meta` — `total` feeds `%count%`
 * @param {object} [args.masterData] `{ localities, propertyTypes, cities }`
 * @param {object} [args.seoSettings] `GET /seo/settings`
 * @param {string} [args.siteName]
 * @returns {{title: string, description: string, h1: string, canonicalPath: string,
 *   canonicalUrl: string, noindex: boolean, intro: string, pagination: {prev: string|null, next: string|null}}}
 */
export function buildListingSeo({
  routeConfig,
  params = {},
  meta = null,
  masterData = {},
  seoSettings = null,
  siteName,
} = {}) {
  const config = routeConfig ?? { path: '/properties', fixed: {}, noun: 'Properties', verb: '' };
  const effective = { ...params, ...(config.fixed ?? {}) };

  const name = siteName || seoSettings?.knowledgeGraph?.name || SITE.name;
  const separator = seoSettings?.separator || '|';
  const count = Number.isFinite(meta?.total) ? meta.total : null;
  const page = Math.max(1, Number(params.page) || 1);

  const vars = buildVariables({ config, effective, masterData, count, siteName: name, separator });
  const h1 = buildH1({ config, effective, vars });

  const template =
    seoSettings?.titleTemplates?.listing ||
    '%propertytype% %listingtype% in %locality%, %city% – %count% Listings %sep% %sitename%';

  // A count nobody has yet takes the phrase it belongs to with it, rather than
  // leaving "– Listings" hanging in the tab title while the page loads; a count
  // of one takes its noun down to the singular with it.
  const withCount =
    count === null
      ? template.replace(/\s*[–-]?\s*%count%\s*listings?/gi, '')
      : template.replace(/%count%(\s*)(listings|properties|results)?/gi, (match, space, noun) =>
          noun
            ? `${count}${space}${count === 1 ? singularOf(noun) : noun}`
            : `${count}${space ?? ''}`
        );

  const resolved = withCount
    .replace(/%propertytype%/g, [vars.bedroomLabel, vars.noun].filter(Boolean).join(' '))
    .replace(/%listingtype%/g, titleVerbOf(config, effective))
    .replace(/%locality%/g, vars.locality?.name ?? '')
    .replace(/%city%/g, vars.city)
    .replace(/%page%/g, page > 1 ? `Page ${page}` : '')
    .replace(/%sep%/g, separator)
    .replace(/%sitename%/g, name);

  const title = cleanTitle(resolved);

  const place = [vars.locality?.name, vars.city].filter(Boolean).join(', ');
  const subject = cleanTitle(
    [
      vars.bedroomLabel,
      vars.noun.toLowerCase(),
      verbOf(config, effective),
      place ? `in ${place}` : '',
    ]
      .filter(Boolean)
      .join(' ')
  );

  const description = cleanTitle(
    `Browse ${count === null ? '' : `${count} `}${subject}. Compare prices, floor plans and amenities, then enquire with ${name}.`
  );

  const canonicalPath = buildCanonicalPath({ config, params, page });
  const siteUrl = String(seoSettings?.siteUrl || SITE.url || '').replace(/\/+$/, '');
  const absolute = (path) => (siteUrl ? `${siteUrl}${path}` : path);

  const noindexSettings = seoSettings?.noindex ?? {};
  const noindex = Boolean(
    (hasFilteringParams(params) && noindexSettings.filteredListings !== false) ||
    (page > 1 && noindexSettings.paginatedListings === true) ||
    config.noindex
  );

  const totalPages = Number.isFinite(meta?.totalPages) ? meta.totalPages : null;
  const pageAt = (target) => absolute(buildCanonicalPath({ config, params, page: target }));

  return {
    title,
    description,
    h1,
    intro: vars.locality?.shortDescription || config.intro || '',
    canonicalPath,
    canonicalUrl: absolute(canonicalPath),
    noindex,
    pagination: {
      prev: page > 1 ? pageAt(page - 1) : null,
      next: totalPages && page < totalPages ? pageAt(page + 1) : null,
    },
  };
}

export default buildListingSeo;
