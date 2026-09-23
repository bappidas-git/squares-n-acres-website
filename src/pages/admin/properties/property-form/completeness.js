/**
 * How finished a listing is, as a percentage and a checklist.
 *
 * The weights answer "what does a buyer actually need to see?", not "how many
 * fields are filled": a cover image and five described photos are worth more
 * than any single input, and a page with no price is not 90 % done. They add up
 * to 100 and are listed in `docs/DECISIONS.md` so the rail and the property
 * list agree on one number.
 */

import { plainText } from './validators';

const filled = (value) => value !== null && value !== undefined && String(value).trim() !== '';

const rows = (value) => (Array.isArray(value) ? value : []);

/** The checklist, in the order the rail shows it. `done` is a predicate. */
const ITEMS = [
  {
    key: 'basics',
    label: 'Title, URL, type and status',
    weight: 10,
    done: (values) =>
      filled(values.title) &&
      String(values.title).trim().length >= 10 &&
      filled(values.slug) &&
      filled(values.propertyTypeId) &&
      filled(values.listingType) &&
      filled(values.constructionStatus),
  },
  {
    key: 'description',
    label: 'Description of 300 characters or more',
    weight: 10,
    done: (values) => plainText(values.description).length >= 300,
  },
  {
    key: 'images',
    label: 'A cover image and five described photos',
    weight: 15,
    done: (values) => {
      const images = rows(values.images).filter((image) => filled(image.url));
      const described = images.filter((image) => filled(image.alt));
      return described.length >= 5 && images.some((image) => image.isCover === true);
    },
  },
  {
    key: 'pricing',
    label: 'A price, a range, or “on request”',
    weight: 10,
    done: (values) => {
      const pricing = values.pricing ?? {};
      if (pricing.priceOnRequest === true) return true;
      if (values.listingType === 'rent' || values.listingType === 'lease') {
        return filled(pricing.rentPerMonth);
      }
      return (
        filled(pricing.price) || (filled(pricing.priceRangeMin) && filled(pricing.priceRangeMax))
      );
    },
  },
  {
    key: 'area',
    label: 'Area and configuration',
    weight: 8,
    done: (values) => {
      const area = values.area ?? {};
      const configuration = values.configuration ?? {};
      const measured =
        filled(area.superBuiltUpArea) || filled(area.carpetArea) || filled(area.plotArea);
      // Rooms are a home's: an office or a plot has no bedroom field to fill,
      // and asking for one kept every commercial listing below 100 %.
      const configured =
        values.segment !== 'residential' ||
        filled(configuration.bedrooms) ||
        filled(configuration.bathrooms);
      return measured && configured;
    },
  },
  {
    key: 'amenities',
    label: 'Eight amenities or more',
    weight: 8,
    done: (values) => rows(values.amenityIds).length >= 8,
  },
  {
    key: 'highlights',
    label: 'Three highlights or more',
    weight: 4,
    done: (values) => rows(values.highlights).filter(filled).length >= 3,
  },
  {
    key: 'location',
    label: 'Locality, address and map coordinates',
    weight: 8,
    done: (values) => {
      const location = values.location ?? {};
      return (
        filled(location.localityId) &&
        filled(location.address) &&
        filled(location.latitude) &&
        filled(location.longitude)
      );
    },
  },
  {
    key: 'plans',
    label: 'A floor plan or a unit configuration',
    weight: 6,
    done: (values) =>
      rows(values.floorPlans).some((plan) => filled(plan.imageUrl)) ||
      rows(values.unitConfigurations).some((unit) => filled(unit.name)),
  },
  {
    key: 'documents',
    label: 'A brochure or a document',
    weight: 4,
    done: (values) =>
      filled(values.brochureUrl) || rows(values.documents).some((entry) => filled(entry.url)),
  },
  {
    key: 'nearby',
    label: 'Three nearby places or more',
    weight: 4,
    done: (values) => rows(values.nearbyPlaces).filter((place) => filled(place.name)).length >= 3,
  },
  {
    key: 'faqs',
    label: 'Three answered questions or more',
    weight: 5,
    done: (values) =>
      rows(values.faqs).filter((faq) => filled(faq.question) && filled(plainText(faq.answer)))
        .length >= 3,
  },
  {
    key: 'project',
    label: 'Builder and project details',
    weight: 3,
    done: (values) => filled(values.project?.developerId),
  },
  {
    key: 'seo',
    label: 'SEO title, description and focus keyword',
    weight: 5,
    done: (values) =>
      filled(values.seo?.title) &&
      filled(values.seo?.description) &&
      filled(values.seo?.focusKeyword),
  },
];

/** The band a percentage falls in — the rail colours the meter with it (§6). */
export const completenessTone = (percent) =>
  percent >= 75 ? 'success' : percent >= 40 ? 'warning' : 'error';

/**
 * @param {object} values the form's values
 * @returns {{percent: number, items: Array<{key: string, label: string, done: boolean, weight: number}>}}
 */
export function computeCompleteness(values = {}) {
  const items = ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    weight: item.weight,
    done: Boolean(item.done(values)),
  }));

  const earned = items.reduce((total, item) => total + (item.done ? item.weight : 0), 0);
  const possible = items.reduce((total, item) => total + item.weight, 0);

  return { percent: Math.round((earned / possible) * 100), items };
}

export default computeCompleteness;
