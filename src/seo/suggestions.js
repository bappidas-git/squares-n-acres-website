/**
 * What should this page be trying to rank for?
 *
 * The panel offers these as chips under the focus keyword field, because the
 * hardest part of writing SEO for a listing is not the writing — it is picking
 * the phrase, and the phrase is nearly always the same shape: what it is, how
 * many rooms, and where. The suggestions are built from the record's own data
 * rather than from a keyword tool, so they are phrases the page can actually
 * deliver on.
 */

import { LISTING_TYPES } from '../config/enums';
import { formatBhk } from '../utils/format';
import { normalize } from './keywords';
import { withoutStopWords } from './data/stopWords';

/** How many suggestions the panel shows. */
export const MAX_SUGGESTIONS = 6;

/** "Apartments" is a menu label; "apartment in whitefield" is a search. */
const singular = (name) => {
  const value = String(name ?? '').trim();
  if (/ies$/i.test(value)) return `${value.slice(0, -3)}y`;
  if (/(ches|shes|xes|zes|sses)$/i.test(value)) return value.slice(0, -2);
  return /[^s]s$/i.test(value) ? value.slice(0, -1) : value;
};

const findById = (records, id) =>
  (Array.isArray(records) ? records : []).find((row) => String(row?.id) === String(id)) ?? null;

/**
 * The 2-, 3- and 4-word phrases a title opens with, once the words that carry
 * no meaning of their own are out of the way.
 *
 * @param {string} title
 * @returns {string[]}
 */
export function titleNgrams(title) {
  const all = normalize(title).split(' ').filter(Boolean);
  const meaningful = withoutStopWords(all);

  // "About Us" is two stop words and a page: taking them both out leaves "us",
  // which is not a phrase anybody searches for. A title too short to survive
  // the filter keeps its words.
  const words = meaningful.length >= 2 ? meaningful : all;
  if (words.length < 2) return words.length ? [words[0]] : [];

  const grams = [];
  for (const size of [2, 3, 4]) {
    if (words.length >= size) grams.push(words.slice(0, size).join(' '));
  }
  return grams;
}

const propertySuggestions = (property, context) => {
  const locality =
    property.location?.locality ?? findById(context.localities, property.location?.localityId);
  const propertyType =
    property.propertyType ?? findById(context.propertyTypes, property.propertyTypeId);
  const developer =
    property.project?.developer ?? findById(context.developers, property.project?.developerId);

  const place = locality?.name ?? '';
  const type = singular(propertyType?.name ?? 'property');
  const bhk =
    property.segment !== 'commercial' &&
    property.segment !== 'land' &&
    Number(property.configuration?.bedrooms) > 0
      ? formatBhk(property.configuration.bedrooms)
      : '';
  const verb = LISTING_TYPES.verbOf(property.listingType) || 'for sale';

  return [
    place && `${[bhk, type].filter(Boolean).join(' ')} ${verb} in ${place}`,
    place && `${type} in ${place}`,
    property.projectName,
    developer?.name && place && `${developer.name} ${place}`,
    place && bhk && `${bhk} ${verb} in ${place}`,
  ];
};

const localitySuggestions = (locality) => [
  locality.name && `properties in ${locality.name}`,
  locality.name && `${locality.name} real estate`,
  locality.name && `flats in ${locality.name}`,
  locality.name && `${locality.name} property price`,
];

const articleSuggestions = (article, context) => {
  const category = article.category ?? findById(context.categories, article.categoryId);
  return [...titleNgrams(article.title), category?.name];
};

const developerSuggestions = (developer, context) => {
  const city = (Array.isArray(context.cities) ? context.cities[0]?.name : '') || 'Bengaluru';
  return [
    developer.name && `${developer.name} projects in ${city}`,
    developer.name,
    developer.name && `${developer.name} reviews`,
  ];
};

/**
 * Focus keyword suggestions for one record.
 *
 * @param {string} entityType one of `SEO_ENTITY_TYPES`
 * @param {object} entity
 * @param {object} [context] `{ localities, cities, propertyTypes, developers, categories }`
 * @returns {string[]} lowercased, de-duplicated, at most {@link MAX_SUGGESTIONS}
 */
export function suggestKeywords(entityType, entity = {}, context = {}) {
  const record = entity ?? {};
  let raw;

  switch (entityType) {
    case 'property':
      raw = propertySuggestions(record, context);
      break;
    case 'locality':
      raw = localitySuggestions(record);
      break;
    case 'article':
      raw = articleSuggestions(record, context);
      break;
    case 'developer':
      raw = developerSuggestions(record, context);
      break;
    case 'propertyType': {
      const city = (Array.isArray(context.cities) ? context.cities[0]?.name : '') || 'Bengaluru';
      raw = [
        record.name && `${record.name} in ${city}`,
        record.name && `${singular(record.name)} for sale in ${city}`,
        record.name,
      ];
      break;
    }
    case 'author':
      raw = [record.name, record.designation && `${record.name} ${record.designation}`];
      break;
    default:
      raw = titleNgrams(record.title ?? record.name ?? '');
  }

  const seen = new Set();
  const out = [];
  for (const suggestion of raw) {
    const value = normalize(suggestion ?? '');
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

const suggestions = { MAX_SUGGESTIONS, suggestKeywords, titleNgrams };

export default suggestions;
