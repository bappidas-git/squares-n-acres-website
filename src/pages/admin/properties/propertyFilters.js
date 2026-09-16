/**
 * The filter row of the admin property table (§5.7).
 *
 * Every filter here is one the API answers — nothing is narrowed in the
 * browser (BUG-19) — so the list of keys below is both what `FilterBar` shows
 * and what `useApiList` keeps in the query string, which is what makes a
 * filtered table a shareable URL.
 *
 * The master-data options (property types, localities, developers) are passed
 * in rather than fetched: `MasterDataContext` already holds all three (D93).
 */

import { DEFAULT_PER_PAGE } from '../../../components/admin/DataTable';
import { toOptions } from '../../../hooks/useMasterData';
import {
  AVAILABILITY,
  CONSTRUCTION_STATUS,
  LISTING_TYPES,
  SEGMENTS,
  SEO_SCORE_BANDS,
} from '../../../config/enums';

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
 */
export const PROPERTY_LIST_PARAM_KEYS = {
  q: 'string',
  listingType: 'string',
  segment: 'string',
  propertyTypeId: 'string',
  localityId: 'string',
  constructionStatus: 'csv',
  availability: 'string',
  isActive: 'string',
  isFeatured: 'string',
  developerId: 'string',
  seoScoreBand: 'string',
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
 * @param {Array<object>} [sources.propertyTypes] every type, active or not
 * @param {Array<object>} [sources.localities]
 * @param {Array<object>} [sources.developers]
 * @returns {Array<object>}
 */
export function buildPropertyFilterFields({
  propertyTypes = [],
  localities = [],
  developers = [],
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
      options: SEGMENTS.options,
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
      placeholder: 'All',
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
  ];
}
