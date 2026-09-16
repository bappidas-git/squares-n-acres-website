/**
 * The sixteen tabs of the property form (00_MASTER_CONTEXT.md PROP-02, D87).
 *
 * One entry describes a section completely: what the strip calls it, what
 * renders inside it, which validator answers for it, and **which fields it
 * owns** — that last list is what turns a flat error map into a red badge on
 * the right tab, whether the message came from this browser or from a 422
 * (§5.3).
 *
 * The boilerplate's sixteen tabs (`gallery, basicInfo, overview, details,
 * highlights, amenities, floorPlans, nearbyPlaces, documents, constructionSpecs,
 * constructionStatus, developer, faqs, similarProperties, sectionVisibility,
 * seoTags`) map onto these: `overview`+`details` split across Basics, Area and
 * Pricing; `constructionSpecs` joins Highlights (D39); `constructionStatus`
 * joins Project & builder; `nearbyPlaces` joins Location; `gallery` becomes
 * Media; and Unit configurations is new, because the old floor-plan tab held
 * both a price table and images (D61).
 */

import {
  validateAgent,
  validateAmenities,
  validateArea,
  validateBasics,
  validateDocuments,
  validateFaqs,
  validateFloorPlans,
  validateHighlights,
  validateLocation,
  validateMedia,
  validatePricing,
  validateProject,
  validateSeo,
  validateSimilar,
  validateUnits,
  validateVisibility,
} from './validators';
import BasicsTab from './tabs/BasicsTab';
import PlaceholderTab from './tabs/PlaceholderTab';

/**
 * @type {Array<{
 *   key: string,
 *   label: string,
 *   icon: string,
 *   component: React.ComponentType,
 *   validator: Function,
 *   fields: string[],   // dotted prefixes this tab owns
 *   prompt?: number,    // the prompt that writes the real tab
 *   note?: string,
 * }>}
 */
export const TABS = [
  {
    key: 'basics',
    label: 'Basics',
    icon: 'mdi:information-outline',
    component: BasicsTab,
    validator: validateBasics,
    prompt: 19,
    fields: [
      'title',
      'slug',
      'projectName',
      'listingType',
      'segment',
      'propertyTypeId',
      'constructionStatus',
      'availability',
      'possessionDate',
      'ageOfPropertyYears',
      'furnishing',
      'facing',
      'floorNumber',
      'totalFloors',
      'ownership',
      'reraNumber',
      'reraRegistered',
      'description',
      'shortDescription',
      // The rail's own switches: their messages have to land somewhere the
      // editor can open, and this is the tab they belong to.
      'isActive',
      'isFeatured',
      'isVerified',
      'priorityOrder',
    ],
  },
  {
    key: 'location',
    label: 'Location',
    icon: 'mdi:map-marker-outline',
    component: PlaceholderTab,
    validator: validateLocation,
    prompt: 19,
    fields: ['location', 'nearbyPlaces'],
  },
  {
    key: 'pricing',
    label: 'Pricing',
    icon: 'mdi:currency-inr',
    component: PlaceholderTab,
    validator: validatePricing,
    prompt: 19,
    fields: ['pricing'],
  },
  {
    key: 'area',
    label: 'Area & configuration',
    icon: 'mdi:ruler-square',
    component: PlaceholderTab,
    validator: validateArea,
    prompt: 19,
    fields: ['area', 'configuration'],
  },
  {
    key: 'units',
    label: 'Unit configurations',
    icon: 'mdi:table-large',
    component: PlaceholderTab,
    validator: validateUnits,
    prompt: 19,
    fields: ['unitConfigurations'],
  },
  {
    key: 'media',
    label: 'Media',
    icon: 'mdi:image-multiple-outline',
    component: PlaceholderTab,
    validator: validateMedia,
    prompt: 19,
    fields: ['images', 'videoUrl', 'virtualTourUrl', 'brochureUrl', 'brochureLeadGated'],
  },
  {
    key: 'amenities',
    label: 'Amenities',
    icon: 'mdi:dumbbell',
    component: PlaceholderTab,
    validator: validateAmenities,
    prompt: 20,
    fields: ['amenityIds', 'badgeIds'],
  },
  {
    key: 'highlights',
    label: 'Highlights & specifications',
    icon: 'mdi:star-outline',
    component: PlaceholderTab,
    validator: validateHighlights,
    prompt: 20,
    fields: ['highlights', 'specifications', 'constructionSpecs'],
  },
  {
    key: 'floorPlans',
    label: 'Floor plans',
    icon: 'mdi:floor-plan',
    component: PlaceholderTab,
    validator: validateFloorPlans,
    prompt: 20,
    fields: ['floorPlans'],
  },
  {
    key: 'documents',
    label: 'Documents',
    icon: 'mdi:file-document-outline',
    component: PlaceholderTab,
    validator: validateDocuments,
    prompt: 20,
    fields: ['documents'],
  },
  {
    key: 'project',
    label: 'Project & builder',
    icon: 'mdi:office-building-outline',
    component: PlaceholderTab,
    validator: validateProject,
    prompt: 20,
    fields: ['project', 'constructionTimeline', 'constructionProgressPercent'],
  },
  {
    key: 'faqs',
    label: 'FAQs',
    icon: 'mdi:comment-question-outline',
    component: PlaceholderTab,
    validator: validateFaqs,
    prompt: 20,
    fields: ['faqs'],
  },
  {
    key: 'similar',
    label: 'Similar properties',
    icon: 'mdi:compare-horizontal',
    component: PlaceholderTab,
    validator: validateSimilar,
    prompt: 21,
    fields: ['similarPropertyIds'],
  },
  {
    key: 'visibility',
    label: 'Section visibility',
    icon: 'mdi:eye-outline',
    component: PlaceholderTab,
    validator: validateVisibility,
    prompt: 21,
    fields: ['sectionVisibility'],
  },
  {
    key: 'agent',
    label: 'Agent',
    icon: 'mdi:account-tie-outline',
    component: PlaceholderTab,
    validator: validateAgent,
    prompt: 21,
    fields: ['agent'],
  },
  {
    key: 'seo',
    label: 'SEO',
    icon: 'mdi:magnify',
    component: PlaceholderTab,
    validator: validateSeo,
    prompt: 21,
    note: 'Prompt 21 mounts the panel in this tab and prompt 36 writes it. The listing’s SEO branch is carried through every save meanwhile, so nothing is lost.',
    fields: ['seo'],
  },
];

/** The tab shown when a form opens. */
export const DEFAULT_TAB = TABS[0].key;

/** Where an error with no home lands — there is always one. */
const FALLBACK_TAB = TABS[0].key;

/** A tab by key. */
export const tabByKey = (key) => TABS.find((tab) => tab.key === key) ?? TABS[0];

/**
 * Whether a dotted path belongs to a field prefix: `location` owns
 * `location.localityId`, but `locationNote` is somebody else's.
 */
const owns = (prefix, path) => path === prefix || path.startsWith(`${prefix}.`);

/** The key of the tab a dotted path belongs to. */
export function tabOfPath(path) {
  const found = TABS.find((tab) => tab.fields.some((prefix) => owns(prefix, path)));
  return found ? found.key : FALLBACK_TAB;
}

/**
 * How many messages each tab holds — the red badges of `AdminTabs`.
 *
 * @param {Record<string, string>} errors dotted path → message
 * @returns {Record<string, number>} tab key → count (only the non-zero ones)
 */
export function groupErrorsByTab(errors = {}) {
  const counts = {};
  for (const path of Object.keys(errors)) {
    const key = tabOfPath(path);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/**
 * The first tab, in tab order, that holds one of these messages.
 *
 * @param {Record<string, string>} errors
 * @returns {string|null}
 */
export function firstTabWithErrors(errors = {}) {
  const counts = groupErrorsByTab(errors);
  const found = TABS.find((tab) => counts[tab.key] > 0);
  return found ? found.key : null;
}

export default TABS;
