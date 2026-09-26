/**
 * The filter row of the admin property table (§5.7).
 *
 * Every filter here is one the API answers — nothing is narrowed in the
 * browser (BUG-19) — so the list of keys below is both what `FilterBar` shows
 * and what `useApiList` keeps in the query string, which is what makes a
 * filtered table a shareable URL.
 *
 * The master-data options (segments, property types, localities, developers)
 * are passed in rather than fetched: `MasterDataContext` already holds all four
 * (D93).
 */

import { DEFAULT_PER_PAGE } from '../../../components/admin/DataTable';
import { toOptions } from '../../../hooks/useMasterData';
import {
  AVAILABILITY,
  CONSTRUCTION_STATUS,
  LISTING_TYPES,
  SEO_SCORE_BANDS,
} from '../../../config/enums';
import { segmentOptions } from '../../../config/segments';

/** What the table asks for before anybody touches a control (D23, D47). */
export const PROPERTY_LIST_DEFAULTS = {
  page: 1,
  perPage: DEFAULT_PER_PAGE,
  sort: 'updatedAt',
  order: 'desc',
};

/**
 * The query parameters that live in the URL, and how each is serialised
 * (§5.6). `constructionStatus` is the one multi-value filter, so it is the one
 * read back as a list.
 *
 * The two flags are booleans, not strings: typed as strings, `?isActive=1` in
 * a shared link reached the API (which reads `1` as true and answered with the
 * 38 active listings) while the select showed "Any" and the chip said
 * "Inactive". Read as booleans, anything but `true`/`false` is simply no
 * filter, on the screen and in the request alike.
 */
export const PROPERTY_LIST_PARAM_KEYS = {
  q: 'string',
  listingType: 'string',
  segment: 'string',
  propertyTypeId: 'string',
  localityId: 'string',
  constructionStatus: 'csv',
  availability: 'string',
  isActive: 'bool',
  isFeatured: 'bool',
  developerId: 'string',
  seoScoreBand: 'string',
  // The listings one advisor answers for — the Team list links here (prompt 51).
  agentId: 'string',
  // The listings with one amenity or one badge — the counts of Master data
  // link here (prompt 51). One id each; the API reads a list.
  amenityIds: 'string',
  badgeIds: 'string',
  sort: 'string',
  order: 'string',
  page: 'int',
  perPage: 'int',
};

/** The keys that narrow the list, as opposed to paging or ordering it. */
export const PROPERTY_FILTER_KEYS = [
  'q',
  'listingType',
  'segment',
  'propertyTypeId',
  'localityId',
  'constructionStatus',
  'availability',
  'isActive',
  'isFeatured',
  'developerId',
  'seoScoreBand',
  'agentId',
  'amenityIds',
  'badgeIds',
];

const isSet = (value) =>
  value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length);

/**
 * Whether the view is narrowed at all — the difference between "no properties
 * match" and "no properties yet" (§8.2).
 *
 * @param {object} params
 * @returns {boolean}
 */
export const hasActiveFilters = (params = {}) =>
  PROPERTY_FILTER_KEYS.some((key) => isSet(params[key]));

/**
 * The parameters an export repeats: the filters and the order of the table as
 * it stands, every page of it (D44).
 *
 * @param {object} params
 * @returns {object} ready for `propertyService.adminList()`
 */
export function exportParamsOf(params = {}) {
  const query = { sort: params.sort, order: params.order, perPage: 'all' };
  for (const key of PROPERTY_FILTER_KEYS) {
    if (isSet(params[key])) query[key] = params[key];
  }
  return query;
}

/**
 * The `FilterBar` fields, in the order they appear.
 *
 * @param {object} [sources]
 * @param {Array<object>} [sources.segments] every segment, active or not
 * @param {Array<object>} [sources.propertyTypes] every type, active or not
 * @param {Array<object>} [sources.localities]
 * @param {Array<object>} [sources.developers]
 * @param {Array<object>} [sources.agents] the team members, switched-off ones too
 * @param {Array<object>} [sources.amenities]
 * @param {Array<object>} [sources.badges]
 * @returns {Array<object>}
 */
export function buildPropertyFilterFields({
  segments = [],
  propertyTypes = [],
  localities = [],
  developers = [],
  agents = [],
  amenities = [],
  badges = [],
} = {}) {
  return [
    {
      key: 'q',
      type: 'search',
      label: 'Search',
      placeholder: 'Title, project, locality or developer',
    },
    {
      key: 'listingType',
      type: 'select',
      label: 'Listing',
      placeholder: 'All listings',
      options: LISTING_TYPES.options,
    },
    {
      key: 'segment',
      type: 'select',
      label: 'Segment',
      placeholder: 'All segments',
      // Master data (QA-52), the retired ones included: a listing already
      // filed under one has to stay findable.
      options: segmentOptions(segments, { activeOnly: false }),
    },
    {
      key: 'propertyTypeId',
      type: 'select',
      label: 'Property type',
      placeholder: 'All types',
      options: toOptions(propertyTypes),
    },
    {
      key: 'localityId',
      type: 'select',
      label: 'Locality',
      placeholder: 'All localities',
      options: toOptions(localities),
    },
    {
      key: 'constructionStatus',
      type: 'multiselect',
      label: 'Status',
      placeholder: 'Any status',
      options: CONSTRUCTION_STATUS.options,
    },
    {
      key: 'availability',
      type: 'select',
      label: 'Availability',
      placeholder: 'Any availability',
      options: AVAILABILITY.options,
    },
    {
      key: 'isActive',
      type: 'toggle',
      label: 'Published',
      placeholder: 'Any',
      trueLabel: 'Active',
      falseLabel: 'Inactive',
    },
    {
      key: 'isFeatured',
      type: 'toggle',
      label: 'Featured',
      placeholder: 'Any',
      trueLabel: 'Featured',
      falseLabel: 'Not featured',
    },
    {
      key: 'developerId',
      type: 'select',
      label: 'Developer',
      placeholder: 'All developers',
      options: toOptions(developers),
    },
    {
      key: 'seoScoreBand',
      type: 'select',
      label: 'SEO',
      placeholder: 'Any score',
      options: SEO_SCORE_BANDS.options,
    },
    {
      key: 'agentId',
      type: 'select',
      label: 'Advisor',
      placeholder: 'Any advisor',
      // Somebody who has left still answers for the listings nobody moved.
      options: agents.map((agent) => ({
        value: String(agent.id),
        label: agent.isActive === false ? `${agent.name} (inactive)` : agent.name,
      })),
    },
    {
      key: 'amenityIds',
      type: 'select',
      label: 'Amenity',
      placeholder: 'Any amenity',
      options: toOptions(amenities),
    },
    {
      key: 'badgeIds',
      type: 'select',
      label: 'Badge',
      placeholder: 'Any badge',
      options: toOptions(badges),
    },
  ];
}
