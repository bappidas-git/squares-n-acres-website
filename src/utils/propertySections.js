/**
 * The eighteen sections of a property page: what each one is called, what it
 * needs before it has anything to show, and whether it is showing
 * (00_MASTER_CONTEXT.md §6.1 `sectionVisibility`, D39, D86).
 *
 * `sectionVisibility` is the editor's half of the answer and the data is the
 * other half — a section renders only when it is switched on **and** the
 * listing carries something to put in it. Both halves are written down once,
 * here, so that the admin's Section-visibility tab, the public page and the
 * sticky sub-navigation cannot disagree about which sections a listing has
 * (BUG-06).
 *
 *   getVisibleSections(property, { banksAvailable })  // the page and its nav
 *   getSectionHints(values, { banksAvailable })       // the admin tab's chips
 *
 * The rules read a **record** (`/properties/:slug`) and the property **form's**
 * values equally: the two shapes differ only in the read-only embeds the API
 * adds (`amenities[]` beside `amenityIds[]`, `location.locality` beside
 * `location.localityId`), and every rule below accepts either.
 */

import { SECTION_VISIBILITY_KEYS } from '../config/enums';

const list = (value) => (Array.isArray(value) ? value : []);

const filled = (value) => value !== null && value !== undefined && String(value).trim() !== '';

/** A number the record actually carries — `0` counts, `''` and `null` do not. */
const hasNumber = (value) =>
  value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

/** The construction statuses whose progress a buyer has any reason to read. */
const BUILDING = ['pre-launch', 'under-construction'];

/**
 * The eighteen sections in the order the public page prints them.
 *
 * `key` is the `sectionVisibility` key of §6.1 — the eighteen of
 * `SECTION_VISIBILITY_KEYS`, no more and no fewer; `anchor` is the `id` the
 * section is scrolled to; `hasData(property, context)` is what the listing owes
 * the section before it can render.
 *
 * `context` carries the two facts a property record cannot answer on its own:
 * `banksAvailable` (is any lender active? — without one the finance section has
 * nothing to compare, §6.6) and `similarAvailable` (the API tops the editor's
 * picks up to six by locality and type, §5.14).
 *
 * @type {Array<{key: string, label: string, description: string, anchor: string,
 *   hasData: (property: object, context: object) => boolean}>}
 */
export const SECTION_DEFINITIONS = [
  {
    key: 'overview',
    label: 'Overview',
    description: 'The description and the headline facts, at the top of the page.',
    anchor: 'overview',
    hasData: (property) => filled(property.description) || list(property.highlights).length > 0,
  },
  {
    key: 'highlights',
    label: 'Highlights',
    description: 'The short selling points, one line each.',
    anchor: 'highlights',
    hasData: (property) => list(property.highlights).filter(filled).length > 0,
  },
  {
    key: 'unitConfigurations',
    label: 'Unit configurations',
    description: 'The configuration table: sizes, prices and availability per unit.',
    anchor: 'unit-configurations',
    hasData: (property) =>
      list(property.unitConfigurations).filter((unit) => unit?.isActive !== false).length > 0,
  },
  {
    key: 'specifications',
    label: 'Specifications',
    description: 'The specification sheet and the construction specifications below it (D39).',
    anchor: 'specifications',
    hasData: (property) =>
      list(property.specifications).length > 0 || list(property.constructionSpecs).length > 0,
  },
  {
    key: 'amenities',
    label: 'Amenities',
    description: 'What the project offers, grouped by category.',
    anchor: 'amenities',
    hasData: (property) =>
      list(property.amenityIds).length > 0 || list(property.amenities).length > 0,
  },
  {
    key: 'floorPlans',
    label: 'Floor plans',
    description: 'The drawings, in a gallery of their own.',
    anchor: 'floor-plans',
    hasData: (property) => list(property.floorPlans).length > 0,
  },
  {
    key: 'gallery',
    label: 'Gallery',
    description: 'The photograph gallery. One image is the cover, not a gallery.',
    anchor: 'gallery',
    hasData: (property) => list(property.images).filter((image) => filled(image?.url)).length >= 2,
  },
  {
    key: 'video',
    label: 'Video',
    description: 'The walkthrough video.',
    anchor: 'video',
    hasData: (property) => filled(property.videoUrl),
  },
  {
    key: 'virtualTour',
    label: 'Virtual tour',
    description: 'The 360° tour.',
    anchor: 'virtual-tour',
    hasData: (property) => filled(property.virtualTourUrl),
  },
  {
    key: 'documents',
    label: 'Documents',
    description: 'The brochure and everything else a buyer downloads.',
    anchor: 'documents',
    hasData: (property) => list(property.documents).length > 0 || filled(property.brochureUrl),
  },
  {
    key: 'construction',
    label: 'Construction progress',
    description: 'The milestones and the progress bar — only while a project is being built.',
    anchor: 'construction',
    hasData: (property) =>
      BUILDING.includes(property.constructionStatus) &&
      (list(property.constructionTimeline).length > 0 ||
        hasNumber(property.constructionProgressPercent)),
  },
  {
    key: 'builder',
    label: 'Builder',
    description: 'The developer’s profile and their other projects.',
    anchor: 'builder',
    hasData: (property) =>
      filled(property.project?.developerId) || filled(property.project?.developer?.id),
  },
  {
    key: 'nearby',
    label: 'Nearby places',
    description: 'Schools, hospitals, metro stations and the rest, with distances.',
    anchor: 'nearby',
    hasData: (property) => list(property.nearbyPlaces).length > 0,
  },
  {
    key: 'location',
    label: 'Location',
    description: 'The map and the address.',
    anchor: 'location',
    hasData: (property) =>
      (hasNumber(property.location?.latitude) && hasNumber(property.location?.longitude)) ||
      filled(property.location?.localityId) ||
      filled(property.location?.locality?.id),
  },
  {
    key: 'finance',
    label: 'Finance & EMI',
    description: 'The EMI calculator and the home-loan partners.',
    anchor: 'finance',
    hasData: (property, context = {}) =>
      property.listingType === 'sale' &&
      (hasNumber(property.pricing?.price) || hasNumber(property.pricing?.priceRangeMin)) &&
      context.banksAvailable === true,
  },
  {
    key: 'faqs',
    label: 'FAQs',
    description: 'The questions asked about this listing.',
    anchor: 'faqs',
    hasData: (property) => list(property.faqs).length > 0,
  },
  {
    key: 'similar',
    label: 'Similar properties',
    description: 'Your picks first; the API tops them up to six.',
    anchor: 'similar',
    hasData: (property, context = {}) =>
      list(property.similarPropertyIds).length > 0 || context.similarAvailable === true,
  },
  {
    key: 'enquiry',
    label: 'Enquiry form',
    description:
      'The enquiry block inside the page. The sticky bar and the enquire buttons stay either way (D86).',
    anchor: 'enquiry',
    hasData: () => true,
  },
];

/** A definition by its `sectionVisibility` key. */
export const sectionByKey = (key) => SECTION_DEFINITIONS.find((section) => section.key === key);

/** Whether the editor has left a section switched on (an absent key means on). */
export const isSectionEnabled = (property, key) => property?.sectionVisibility?.[key] !== false;

/**
 * The sections a listing actually shows, in page order.
 *
 * @param {object} property a record of §6.1, or the property form's values
 * @param {{banksAvailable?: boolean, similarAvailable?: boolean}} [context]
 * @returns {Array<{key: string, label: string, anchor: string}>}
 */
export function getVisibleSections(property, context = {}) {
  if (!property || typeof property !== 'object') return [];

  return SECTION_DEFINITIONS.filter(
    (section) => isSectionEnabled(property, section.key) && section.hasData(property, context)
  ).map(({ key, label, anchor }) => ({ key, label, anchor }));
}

/**
 * Where an editor is sent to fill a section in. The tab keys are
 * `property-form/tabs.js`; the sentence is what the hint says.
 */
const SOURCE = {
  overview: 'write a description in Basics',
  highlights: 'add highlights in Highlights & specifications',
  unitConfigurations: 'add a unit in Unit configurations',
  specifications: 'add rows in Highlights & specifications',
  amenities: 'tick amenities in Amenities',
  floorPlans: 'add a drawing in Floor plans',
  gallery: 'add at least two images in Media',
  video: 'add a video address in Media',
  virtualTour: 'add a tour address in Media',
  documents: 'attach a document in Documents',
  construction: 'add milestones in Project & builder',
  builder: 'choose a developer in Project & builder',
  nearby: 'add nearby places in Location',
  location: 'choose a locality in Location',
  finance: 'set a price in Pricing',
  faqs: 'add a question in FAQs',
  similar: 'choose listings in Similar properties',
  enquiry: '',
};

/** The one section the listing itself can never satisfy, and why. */
const withheld = (key, property, context) => {
  if (key !== 'finance') return null;
  if (context.banksAvailable === false) return 'Hidden automatically — no active banks';
  if (property.listingType !== 'sale') return 'Hidden automatically — sale listings only';
  return null;
};

/**
 * One row per section for the admin's Section-visibility tab: is it on, does it
 * hold anything, and the sentence the chip prints.
 *
 * @param {object} values the property form's values
 * @param {{banksAvailable?: boolean, similarAvailable?: boolean}} [context]
 * @returns {Array<{key: string, label: string, description: string, enabled: boolean,
 *   hasData: boolean, visible: boolean, hint: string}>}
 */
export function getSectionHints(values, context = {}) {
  const property = values && typeof values === 'object' ? values : {};

  return SECTION_DEFINITIONS.map((section) => {
    const enabled = isSectionEnabled(property, section.key);
    const hasData = section.hasData(property, context);
    const reason = withheld(section.key, property, context);

    return {
      key: section.key,
      label: section.label,
      description: section.description,
      anchor: section.anchor,
      enabled,
      hasData,
      visible: enabled && hasData,
      hint: !enabled
        ? 'Hidden'
        : hasData
          ? ''
          : (reason ?? `No data yet — ${SOURCE[section.key] || 'add the fields it needs'}`),
    };
  });
}

/**
 * Every key of §6.1 is a definition and every definition is a key of §6.1.
 * Read by the unit test, and by nothing else: a mismatch is a page that either
 * ignores a toggle or offers one nothing reads.
 */
export const SECTION_KEYS = SECTION_DEFINITIONS.map((section) => section.key);

/** The enum's own eighteen, for the test that compares the two lists. */
export const CONTRACT_SECTION_KEYS = SECTION_VISIBILITY_KEYS.map((entry) => entry.key);

export default SECTION_DEFINITIONS;
