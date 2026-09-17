/**
 * Every JSON-LD generator of §9.3, the merger that turns them into one
 * `@graph`, and the validator that refuses a graph search engines would.
 *
 * Nothing here renders: prompt 38's `<Seo>` chooses which generators a page
 * calls and puts the result in the head. These are pure functions of a record
 * and the settings, which is what makes them testable without a browser.
 */

import { articleNode } from './article';
import { breadcrumbNode } from './breadcrumb';
import { developerOrganizationNode } from './developerOrganization';
import { faqPageNode } from './faqPage';
import { SCHEMA_CONTEXT, absolute, compact, isoDate, mergeGraph, parseCustom, ref } from './graph';
import { itemListNode } from './itemList';
import { organizationId, organizationNode } from './organization';
import { personNode } from './person';
import { placeNode } from './place';
import { realEstateListingNode, residenceTypeOf } from './realEstateListing';
import { aggregateRatingNode, reviewNodes } from './review';
import {
  KNOWN_TYPES,
  REQUIRED_PROPERTIES,
  validate,
  validateGraph,
  validateNode,
} from './validate';
import { videoObjectNode } from './videoObject';
import { webPageNode } from './webPage';
import { websiteId, websiteNode } from './website';

/** The generator each entity type leads with, for a caller that has no opinion. */
export const GENERATOR_FOR = {
  property: realEstateListingNode,
  article: articleNode,
  page: webPageNode,
  locality: placeNode,
  developer: developerOrganizationNode,
  author: personNode,
  articleCategory: webPageNode,
  propertyType: webPageNode,
};

/**
 * The node an entity type publishes about itself, or `null` when the record is
 * not far enough along to have one.
 *
 * @param {string} entityType
 * @param {object} input the normalised record (`entityAdapters.toSeoInput`)
 * @param {object} [context]
 * @returns {object|null}
 */
export function primaryNodeFor(entityType, input, context = {}) {
  const generator = GENERATOR_FOR[entityType];
  return generator ? generator(input, context) : null;
}

export {
  KNOWN_TYPES,
  REQUIRED_PROPERTIES,
  SCHEMA_CONTEXT,
  absolute,
  aggregateRatingNode,
  articleNode,
  breadcrumbNode,
  compact,
  developerOrganizationNode,
  faqPageNode,
  isoDate,
  itemListNode,
  mergeGraph,
  organizationId,
  organizationNode,
  parseCustom,
  personNode,
  placeNode,
  realEstateListingNode,
  ref,
  residenceTypeOf,
  reviewNodes,
  validate,
  validateGraph,
  validateNode,
  videoObjectNode,
  webPageNode,
  websiteId,
  websiteNode,
};

const schema = {
  GENERATOR_FOR,
  aggregateRatingNode,
  articleNode,
  breadcrumbNode,
  developerOrganizationNode,
  faqPageNode,
  itemListNode,
  mergeGraph,
  organizationNode,
  parseCustom,
  personNode,
  placeNode,
  primaryNodeFor,
  realEstateListingNode,
  reviewNodes,
  validate,
  validateGraph,
  validateNode,
  videoObjectNode,
  webPageNode,
  websiteNode,
};

export default schema;
