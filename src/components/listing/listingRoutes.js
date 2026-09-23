import { CONSTRUCTION_STATUS } from '../../config/enums';
import PATHS from '../../routes/paths';
import { segmentKind } from '../../config/segments';

/**
 * Every listing URL the site answers, and what each one means.
 *
 * One engine serves them all (D94); a route contributes nothing but its
 * **fixed** filters and its words. A fixed filter is not in the query string,
 * cannot be removed and is drawn as a locked chip — `/rent` is rent, and no
 * amount of clicking in the rail turns it into a sale.
 *
 * `/buy/:slug` and its siblings resolve in the order D25 fixes: the four
 * construction-status slugs first, then the property-type slugs of master
 * data, then 404. That is what keeps `/buy/ready-to-move` a status page and
 * `/rent/apartments` a type page without either shadowing the other.
 */

const CITY = 'Bengaluru';

const HOME_CRUMB = { label: 'Home', to: PATHS.home };

/** The noun a status page calls its listings, and the sentence under the title. */
const STATUS_ROUTES = {
  'pre-launch': {
    noun: 'Pre-launch projects',
    intro:
      'Projects announced before their formal launch. Prices and plans are indicative until the developer publishes them, so ask us what is confirmed before you commit.',
  },
  'under-construction': {
    noun: 'Under-construction properties',
    intro:
      'Homes being built now, with the possession date and the construction stage on every listing.',
  },
  'ready-to-move': {
    noun: 'Ready-to-move homes',
    intro: 'Completed homes you can visit, register and move into without waiting for handover.',
  },
  resale: {
    noun: 'Resale properties',
    intro: 'Homes sold by their current owners, in projects that are already built and occupied.',
  },
};

/**
 * The table. `fixed` is merged into every request; `noun` and `verb` build the
 * H1 and the title; `intro` is the sentence under the heading.
 */
export const LISTING_ROUTES = [
  {
    key: 'properties',
    path: PATHS.properties,
    fixed: {},
    noun: 'Properties',
    verb: '',
    intro:
      'Every listing Squares N Acres has verified in Bengaluru — apartments, villas, plots and commercial space, to buy, rent or lease.',
    breadcrumbs: [HOME_CRUMB, { label: 'Properties' }],
  },
  {
    key: 'buy',
    path: PATHS.buy,
    fixed: { listingType: 'sale' },
    noun: 'Properties',
    verb: 'for sale',
    intro:
      'Apartments, villas, plots and commercial space for sale across Bengaluru, with the price, the carpet area and the possession date on every card.',
    breadcrumbs: [HOME_CRUMB, { label: 'Buy' }],
  },
  ...Object.entries(STATUS_ROUTES).map(([status, copy]) => ({
    key: `buy-${status}`,
    path: PATHS.buyStatus(status),
    fixed: { listingType: 'sale', constructionStatus: [status] },
    noun: copy.noun,
    verb: '',
    intro: copy.intro,
    breadcrumbs: [
      HOME_CRUMB,
      { label: 'Buy', to: PATHS.buy },
      { label: CONSTRUCTION_STATUS.labelOf(status) },
    ],
  })),
  {
    key: 'buy-type',
    path: '/buy/:propertyTypeSlug',
    dynamic: true,
    fixed: { listingType: 'sale' },
    noun: 'Properties',
    verb: 'for sale',
    breadcrumbs: [HOME_CRUMB, { label: 'Buy', to: PATHS.buy }],
  },
  {
    key: 'rent',
    path: PATHS.rent,
    fixed: { listingType: 'rent' },
    noun: 'Properties',
    verb: 'for rent',
    intro:
      'Rental homes across Bengaluru with the monthly rent, the deposit and the furnishing stated on every listing.',
    breadcrumbs: [HOME_CRUMB, { label: 'Rent' }],
  },
  {
    key: 'rent-type',
    path: '/rent/:propertyTypeSlug',
    dynamic: true,
    fixed: { listingType: 'rent' },
    noun: 'Properties',
    verb: 'for rent',
    breadcrumbs: [HOME_CRUMB, { label: 'Rent', to: PATHS.rent }],
  },
  {
    key: 'lease',
    path: PATHS.lease,
    fixed: { listingType: 'lease' },
    noun: 'Properties',
    verb: 'for lease',
    intro:
      'Office floors, retail units and warehouses available on lease, with the monthly rent and the lock-in stated by the owner.',
    breadcrumbs: [HOME_CRUMB, { label: 'Lease' }],
  },
  {
    key: 'commercial',
    path: PATHS.commercial,
    fixed: { segment: 'commercial' },
    noun: 'Commercial properties',
    verb: '',
    intro:
      'Offices, shops, showrooms and warehouses in Bengaluru, to buy or to lease, with the floor plate and the fit-out stage on every listing.',
    breadcrumbs: [HOME_CRUMB, { label: 'Commercial' }],
  },
  {
    key: 'commercial-type',
    path: '/commercial/:propertyTypeSlug',
    dynamic: true,
    fixed: { segment: 'commercial' },
    noun: 'Commercial properties',
    verb: '',
    breadcrumbs: [HOME_CRUMB, { label: 'Commercial', to: PATHS.commercial }],
  },
  {
    key: 'plots',
    path: PATHS.plots,
    fixed: { segment: 'land' },
    noun: 'Plots & land',
    verb: '',
    intro:
      'Residential plots, farm land and industrial land around Bengaluru, with the plot area, the approval and the khata on every listing.',
    breadcrumbs: [HOME_CRUMB, { label: 'Plots & Land' }],
  },
];

const byKey = new Map(LISTING_ROUTES.map((route) => [route.key, route]));

/** One route of the table by its key. */
export const listingRouteByKey = (key) => byKey.get(key) ?? byKey.get('properties');

/**
 * What a `:propertyTypeSlug` segment stands for (D25).
 *
 * @param {'buy'|'rent'|'commercial'} kind the parent route
 * @param {string} slug the URL segment
 * @param {{propertyTypes: Array<object>, loading: boolean}} masterData
 * @returns {{state: 'ok'|'pending'|'not-found', fixed?: object, noun?: string,
 *   verb?: string|null, label?: string, record?: object}}
 */
export function resolveDynamicSlug(kind, slug, masterData = {}) {
  const wanted = String(slug ?? '').toLowerCase();

  // Status slugs win, so `/rent/ready-to-move` is a status page rather than a
  // 404 for a property type nobody named "ready-to-move".
  if (CONSTRUCTION_STATUS.has(wanted)) {
    return {
      state: 'ok',
      kind: 'status',
      fixed: { constructionStatus: [wanted] },
      noun: STATUS_ROUTES[wanted]?.noun,
      verb: '',
      intro: STATUS_ROUTES[wanted]?.intro,
      label: CONSTRUCTION_STATUS.labelOf(wanted),
    };
  }

  const types = Array.isArray(masterData.propertyTypes) ? masterData.propertyTypes : [];
  const record = types.find((type) => type.slug === wanted);

  if (record) {
    return {
      state: 'ok',
      kind: 'propertyType',
      fixed: { propertyTypeId: [String(record.id)] },
      noun: record.name,
      label: record.name,
      intro: record.shortDescription || undefined,
      record,
    };
  }

  // Master data decides whether this is a type or a 404, so while it is on its
  // way the page waits rather than flashing a 404 at a URL that is valid.
  if (masterData.loading || types.length === 0) return { state: 'pending' };

  return { state: 'not-found' };
}

/**
 * The route a page renders: its own entry, plus whatever its dynamic segment
 * resolved to.
 *
 * @param {object} args
 * @param {string} args.routeKey a key of {@link LISTING_ROUTES}
 * @param {string} [args.slug] the `:propertyTypeSlug` segment
 * @param {object} [args.masterData]
 * @returns {{state: 'ok'|'pending'|'not-found', config: object}}
 */
export function resolveListingRoute({ routeKey, slug, masterData }) {
  const route = listingRouteByKey(routeKey);
  if (!route.dynamic) return { state: 'ok', config: route };

  const kind = route.key.split('-')[0];
  const resolved = resolveDynamicSlug(kind, slug, masterData);
  if (resolved.state !== 'ok') return { state: resolved.state, config: route };

  const fixed = { ...route.fixed, ...resolved.fixed };

  // A type an editor moved into a segment of its own of the same kind —
  // Warehouses into "Industrial", of the commercial kind — keeps its page at
  // `/commercial/warehouses` (where `urls.publicPathFor` sends it), and that
  // page lists the type's segment rather than an empty Commercial (QA-52).
  const ownSegment = resolved.record?.segment;
  if (
    fixed.segment &&
    ownSegment &&
    ownSegment !== fixed.segment &&
    segmentKind(ownSegment) === segmentKind(fixed.segment)
  ) {
    fixed.segment = ownSegment;
  }

  return {
    state: 'ok',
    config: {
      ...route,
      path: `/${kind}/${slug}`,
      fixed,
      noun: resolved.noun ?? route.noun,
      verb: resolved.verb ?? route.verb,
      intro: resolved.intro ?? route.intro,
      breadcrumbs: [...route.breadcrumbs, { label: resolved.label }],
      resolved,
    },
  };
}

/** The city every H1 and title names while Bengaluru is the only one seeded. */
export const DEFAULT_CITY = CITY;

export default LISTING_ROUTES;
