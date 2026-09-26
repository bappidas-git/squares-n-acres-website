/**
 * Property validation, one function per tab (00_MASTER_CONTEXT.md §6.1, PROP-03).
 *
 * Every validator answers the same way the API does: a flat map keyed by the
 * **dotted path** of the field it refuses — `location.localityId`,
 * `images.0.alt`, `unitConfigurations.2.name` — so a message this file writes
 * and a message a 422 sends land on the same control, and `tabs.js` can count
 * them per tab from the key alone (§5.3).
 *
 * Nothing here blocks a draft. A listing may be saved half-written; what it may
 * not be is *published* half-written, and those rules live in
 * `validateForActivation` (PROP-04).
 */

import {
  DATE_PATTERN,
  INDIAN_MOBILE_PATTERN,
  SLUG_PATTERN,
  URL_PATTERN,
} from '../../../../../utils/validation';
import { URL_MAX_LENGTH } from '../../../../../services/schemas/limits';
import { tidyPhone } from '../../../../../utils/validators';
import { validateSeoBranch } from '../../../../../components/seo/seoSideEffects';
import { isMapEmbedUrl } from '../../../../../utils/mapEmbed';
import { DESCRIPTION_MIN, plainText, publishProblems } from '../../../../../config/propertyRules';

/** Title length the contract asks for (§6.1). */
export const TITLE_MIN = 10;

// Characters of description a listing needs before it may go live, and the
// HTML-to-text the rule is counted on: the API reads the same module (QA-62).
export { DESCRIPTION_MIN, plainText };

/** Words below which the rail warns, without blocking (PROP-04). */
export const DESCRIPTION_WARN_WORDS = 300;

/** Amenities below which the rail warns. */
export const AMENITY_WARN_COUNT = 8;

/** The contract's cap on the editor's similar-property picks (§6.1). */
export const SIMILAR_MAX = 6;

/** How many highlights a listing may carry, and how long one may be (§4.2 of prompt 20). */
export const HIGHLIGHTS_MAX = 12;
export const HIGHLIGHT_MAX_LENGTH = 140;

/** A question short enough to read and long enough to be one. */
export const FAQ_QUESTION_MIN = 10;
export const FAQ_QUESTION_MAX = 200;

/** A phrase, not a paragraph — the analyser of prompt 36 matches it in the text. */
export const FOCUS_KEYWORD_MAX = 120;

/**
 * Script tags in an answer.
 *
 * `RichTextEditor` sanitises what it emits and `SafeHtml` sanitises again on
 * the way to the page, so nothing an editor types can reach this. It stays as
 * the cheap guard against a value that never went through either — a legacy
 * record, an import, a payload assembled by hand — being saved unnoticed.
 */
const SCRIPT_PATTERN = /<\s*\/?\s*script\b|<\s*iframe\b|\son[a-z]+\s*=|javascript:/i;

const isBlank = (value) => value === null || value === undefined || String(value).trim() === '';

const isNumber = (value) =>
  value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

/** Words of a rich-text value. */
export const wordCount = (html) => {
  const text = plainText(html);
  return text ? text.split(' ').length : 0;
};

/** A date the API would accept — `yyyy-mm-dd` and a real day. */
const isDate = (value) =>
  typeof value === 'string' &&
  DATE_PATTERN.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

const isUrl = (value) => URL_PATTERN.test(String(value ?? ''));

/** Collects messages without letting a later rule overwrite an earlier one. */
const collector = () => {
  const errors = {};
  const add = (path, message) => {
    if (!message || errors[path]) return;
    errors[path] = message;
  };
  return { errors, add };
};

/** `value` must be a number and must not be negative. */
const checkNonNegative = (add, path, value, label) => {
  if (isBlank(value)) return;
  if (!isNumber(value)) {
    add(path, `${label} must be a number.`);
    return;
  }
  if (Number(value) < 0) add(path, `${label} cannot be negative.`);
};

/**
 * `value` must be an address the API takes: `http(s)://`, and no longer than
 * the 500 characters of its column (QA-65). A signed CDN link can be longer,
 * and the API's refusal would name the key — "The images.0.url may not be
 * greater than 500 characters." — after the round trip.
 */
const checkUrl = (add, path, value, label) => {
  if (isBlank(value)) return;
  if (!isUrl(value)) add(path, `${label} must start with http:// or https://.`);
  else if (String(value).trim().length > URL_MAX_LENGTH) {
    add(path, `${label} can be at most ${URL_MAX_LENGTH} characters.`);
  }
};

/**
 * `value` must be a number inside the range the API accepts.
 *
 * The bounds are the contract's (`src/services/schemas/property.js`): with
 * looser ones here the form let an editor save a 25-bedroom flat or a school
 * 900 km away, and the refusal came back as the raw "The
 * configuration.parkingCovered may not be greater than 20." after the round
 * trip.
 */
const checkRange = (add, path, value, label, { min = 0, max } = {}) => {
  if (isBlank(value)) return;
  if (!isNumber(value)) {
    add(path, `${label} must be a number.`);
    return;
  }
  const number = Number(value);
  if (number < min) {
    add(path, min === 0 ? `${label} cannot be negative.` : `${label} must be at least ${min}.`);
  } else if (max !== undefined && number > max) {
    add(path, `${label} can be at most ${max}.`);
  }
};

/** `value` must fit the API's length for the field. */
const checkLength = (add, path, value, label, max) => {
  if (String(value ?? '').trim().length > max) add(path, `Keep ${label} to ${max} characters.`);
};

/** The contract's caps, in one place (§6.1, `src/services/schemas/property.js`). */
export const LIMITS = {
  ageOfPropertyYears: 100,
  floors: 200,
  lowestFloor: -5,
  rooms: 20,
  distanceKm: 200,
  travelTimeMin: 600,
  unitName: 120,
  floorPlanTitle: 120,
  placeName: 150,
  imageAlt: 200,
  imageCaption: 300,
  documentTitle: 150,
  milestone: 150,
  milestoneNote: 300,
  specLabel: 120,
  specValue: 300,
  chargeLabel: 120,
  chargeNote: 200,
  agentName: 120,
};

/** The two statuses that promise a date (§6.1). */
const NEEDS_POSSESSION_DATE = ['pre-launch', 'under-construction'];

/** Rent and lease are quoted per month; a sale is quoted once (D90). */
const rental = (values) => values.listingType === 'rent' || values.listingType === 'lease';

/* ------------------------------------------------------------------ *
 * Section validators
 * ------------------------------------------------------------------ */

export function validateBasics(values) {
  const { errors, add } = collector();

  const title = String(values.title ?? '').trim();
  if (!title) add('title', 'A title is required.');
  else if (title.length < TITLE_MIN) {
    add('title', `The title needs at least ${TITLE_MIN} characters.`);
  }

  const slug = String(values.slug ?? '').trim();
  if (!slug) add('slug', 'A URL is required.');
  else if (!SLUG_PATTERN.test(slug)) {
    add('slug', 'The URL may only contain lowercase letters, numbers and hyphens.');
  }

  if (isBlank(values.listingType)) add('listingType', 'Choose what this listing is for.');
  if (isBlank(values.segment)) add('segment', 'Choose a segment.');
  if (isBlank(values.propertyTypeId)) add('propertyTypeId', 'Choose a property type.');
  if (isBlank(values.constructionStatus)) add('constructionStatus', 'Choose a status.');
  if (isBlank(values.availability)) add('availability', 'Choose an availability.');

  const possession = values.possessionDate;
  if (NEEDS_POSSESSION_DATE.includes(values.constructionStatus) && isBlank(possession)) {
    add('possessionDate', 'A possession date is required for this construction status.');
  } else if (
    NEEDS_POSSESSION_DATE.includes(values.constructionStatus) &&
    !isBlank(possession) &&
    !isDate(possession)
  ) {
    // The control is a month picker, so the message names a month.
    add('possessionDate', 'Choose the month and the year handover is promised for.');
  }

  checkRange(add, 'ageOfPropertyYears', values.ageOfPropertyYears, 'The age', {
    max: LIMITS.ageOfPropertyYears,
  });
  checkRange(add, 'totalFloors', values.totalFloors, 'The number of floors', {
    max: LIMITS.floors,
  });
  checkRange(add, 'floorNumber', values.floorNumber, 'The floor', {
    min: LIMITS.lowestFloor,
    max: LIMITS.floors,
  });

  // A registration number is the whole point of the switch: "RERA registered"
  // with nothing beside it is a claim the listing cannot back up.
  if (values.reraRegistered === true && isBlank(values.reraNumber)) {
    add('reraNumber', 'Give the RERA registration number, or turn the switch off.');
  }

  const short = String(values.shortDescription ?? '');
  if (short.length > 300) add('shortDescription', 'Keep the summary to 300 characters.');

  return errors;
}

export function validateLocation(values) {
  const { errors, add } = collector();
  const location = values.location ?? {};

  // The city follows the locality, so it is only ever worth a message of its
  // own when the locality it came from carries none.
  if (isBlank(location.localityId)) add('location.localityId', 'Choose a locality.');
  else if (isBlank(location.cityId)) {
    add('location.cityId', 'This locality has no city. Give it one in master data.');
  }

  const pincode = String(location.pincode ?? '').trim();
  if (pincode && !/^\d{6}$/.test(pincode)) add('location.pincode', 'A pincode is six digits.');

  if (!isBlank(location.latitude)) {
    const latitude = Number(location.latitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      add('location.latitude', 'The latitude is between −90 and 90.');
    }
  }
  if (!isBlank(location.longitude)) {
    const longitude = Number(location.longitude);
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      add('location.longitude', 'The longitude is between −180 and 180.');
    }
  }

  checkUrl(add, 'location.mapEmbedUrl', location.mapEmbedUrl, 'The map URL');
  if (!isBlank(location.mapEmbedUrl) && !isMapEmbedUrl(location.mapEmbedUrl)) {
    add(
      'location.mapEmbedUrl',
      'Paste the address from Google Maps → Share → Embed a map, or from a shared Google My Map.'
    );
  }

  (values.nearbyPlaces ?? []).forEach((place, index) => {
    // A row exists because somebody added it, and a row without a name is
    // dropped on save — so it is refused here rather than lost silently.
    if (isBlank(place.name)) add(`nearbyPlaces.${index}.name`, 'Name this place.');
    checkLength(add, `nearbyPlaces.${index}.name`, place.name, 'the name', LIMITS.placeName);
    checkRange(add, `nearbyPlaces.${index}.distanceKm`, place.distanceKm, 'The distance', {
      max: LIMITS.distanceKm,
    });
    checkRange(add, `nearbyPlaces.${index}.travelTimeMin`, place.travelTimeMin, 'The drive', {
      max: LIMITS.travelTimeMin,
    });
  });

  return errors;
}

/**
 * What a price has to be, not that there has to be one: `pricing.price` is
 * nullable in the contract (§6.1), and a listing is drafted long before it is
 * priced. "A published listing needs a price" is a publication rule, and lives
 * in `validateForActivation` with the others.
 */
export function validatePricing(values) {
  const { errors, add } = collector();
  const pricing = values.pricing ?? {};

  const money = [
    ['price', 'The price'],
    ['priceRangeMin', 'The lowest price'],
    ['priceRangeMax', 'The highest price'],
    ['pricePerSqft', 'The price per sq ft'],
    ['rentPerMonth', 'The rent'],
    ['securityDeposit', 'The deposit'],
    ['maintenanceChargesMonthly', 'The maintenance'],
    ['bookingAmount', 'The booking amount'],
  ];
  money.forEach(([key, label]) => checkNonNegative(add, `pricing.${key}`, pricing[key], label));

  if (!rental(values)) {
    const hasRange = !isBlank(pricing.priceRangeMin) && !isBlank(pricing.priceRangeMax);
    if (
      hasRange &&
      isNumber(pricing.priceRangeMin) &&
      isNumber(pricing.priceRangeMax) &&
      Number(pricing.priceRangeMin) >= Number(pricing.priceRangeMax)
    ) {
      add('pricing.priceRangeMax', 'The highest price must be above the lowest.');
    }
    if (!isBlank(pricing.priceRangeMin) !== !isBlank(pricing.priceRangeMax)) {
      const missing = isBlank(pricing.priceRangeMin) ? 'priceRangeMin' : 'priceRangeMax';
      add(`pricing.${missing}`, 'A price range needs both ends.');
    }
  }

  (pricing.otherCharges ?? []).forEach((charge, index) => {
    const hasLabel = !isBlank(charge.label);
    const hasAmount = !isBlank(charge.amount);
    if (hasLabel && !hasAmount) {
      add(`pricing.otherCharges.${index}.amount`, 'Give this charge an amount.');
    }
    if (!hasLabel && hasAmount) {
      add(`pricing.otherCharges.${index}.label`, 'Name this charge.');
    }
    checkNonNegative(add, `pricing.otherCharges.${index}.amount`, charge.amount, 'The amount');
    checkLength(
      add,
      `pricing.otherCharges.${index}.label`,
      charge.label,
      'the name',
      LIMITS.chargeLabel
    );
    checkLength(
      add,
      `pricing.otherCharges.${index}.note`,
      charge.note,
      'the note',
      LIMITS.chargeNote
    );
  });

  return errors;
}

export function validateArea(values) {
  const { errors, add } = collector();
  const area = values.area ?? {};
  const configuration = values.configuration ?? {};

  [
    ['superBuiltUpArea', 'The super built-up area'],
    ['builtUpArea', 'The built-up area'],
    ['carpetArea', 'The carpet area'],
    ['plotArea', 'The plot area'],
    ['plotLength', 'The plot length'],
    ['plotWidth', 'The plot width'],
  ].forEach(([key, label]) => checkNonNegative(add, `area.${key}`, area[key], label));

  [
    // Counts, so the label says so: "The bedrooms is at most 20" read as a
    // typo in a form that was otherwise careful with its words (QA-62).
    ['bedrooms', 'The number of bedrooms'],
    ['bathrooms', 'The number of bathrooms'],
    ['balconies', 'The number of balconies'],
    ['parkingCovered', 'The number of covered parking spaces'],
    ['parkingOpen', 'The number of open parking spaces'],
  ].forEach(([key, label]) =>
    checkRange(add, `configuration.${key}`, configuration[key], label, { max: LIMITS.rooms })
  );

  return errors;
}

export function validateUnits(values) {
  const { errors, add } = collector();

  (values.unitConfigurations ?? []).forEach((unit, index) => {
    const path = `unitConfigurations.${index}`;
    const named = !isBlank(unit.name);
    const measured = !isBlank(unit.superBuiltUpArea) || !isBlank(unit.carpetArea);
    // "On request" is not a price: a row with neither an area nor a figure
    // prints an empty line in the configuration table (§7 of prompt 19).
    const priced = !isBlank(unit.price);
    // Any field at all: a row with nothing but a bedroom count would be dropped
    // on save, and silently losing an editor's row is worse than asking for a name.
    const touched =
      named ||
      measured ||
      priced ||
      unit.priceOnRequest === true ||
      !isBlank(unit.bedrooms) ||
      !isBlank(unit.bathrooms) ||
      !isBlank(unit.availableUnits) ||
      !isBlank(unit.floorPlanImageUrl) ||
      !isBlank(unit.floorPlanPdfUrl);

    if (!touched) return;
    if (!named) add(`${path}.name`, 'Name this configuration, e.g. “3 BHK — Type A”.');
    checkLength(add, `${path}.name`, unit.name, 'the name', LIMITS.unitName);
    if (!measured && !priced) {
      add(`${path}.superBuiltUpArea`, 'Add an area or a price.');
    }

    checkNonNegative(add, `${path}.superBuiltUpArea`, unit.superBuiltUpArea, 'The area');
    checkNonNegative(add, `${path}.carpetArea`, unit.carpetArea, 'The carpet area');
    checkNonNegative(add, `${path}.price`, unit.price, 'The price');
    checkRange(add, `${path}.bedrooms`, unit.bedrooms, 'The number of bedrooms', {
      max: LIMITS.rooms,
    });
    checkRange(add, `${path}.bathrooms`, unit.bathrooms, 'The number of bathrooms', {
      max: LIMITS.rooms,
    });
    checkNonNegative(add, `${path}.availableUnits`, unit.availableUnits, 'The available units');
    checkUrl(add, `${path}.floorPlanImageUrl`, unit.floorPlanImageUrl, 'The floor-plan image');
    checkUrl(add, `${path}.floorPlanPdfUrl`, unit.floorPlanPdfUrl, 'The floor-plan PDF');
  });

  return errors;
}

export function validateMedia(values) {
  const { errors, add } = collector();

  // A missing description is a publishing rule (prompt 51): a draft is saved
  // without one, and going live asks for each (`config/propertyRules`).
  (values.images ?? []).forEach((image, index) => {
    if (isBlank(image.url)) return;
    checkUrl(add, `images.${index}.url`, image.url, 'The image address');
    checkLength(add, `images.${index}.alt`, image.alt, 'the description', LIMITS.imageAlt);
    checkLength(add, `images.${index}.caption`, image.caption, 'the caption', LIMITS.imageCaption);
  });

  // Keyed to the gallery as a whole, where the gallery prints it: the old key
  // `images.0.isCover` belonged to no control, so the Media badge said 1 and
  // the tab showed nothing to fix.
  const usable = (values.images ?? []).filter((image) => !isBlank(image.url));
  if (usable.length > 0 && !usable.some((image) => image.isCover === true)) {
    add('images', 'Choose which photograph is the cover.');
  }

  checkUrl(add, 'videoUrl', values.videoUrl, 'The video URL');
  checkUrl(add, 'virtualTourUrl', values.virtualTourUrl, 'The virtual-tour URL');
  checkUrl(add, 'brochureUrl', values.brochureUrl, 'The brochure URL');

  return errors;
}

export function validateAmenities() {
  // Amenities and badges are ids chosen from master data; there is nothing a
  // draft can get wrong. The activation warnings live in `validateForActivation`.
  return {};
}

export function validateHighlights(values) {
  const { errors, add } = collector();

  const highlights = values.highlights ?? [];
  if (highlights.length > HIGHLIGHTS_MAX) {
    add('highlights', `Keep the list to ${HIGHLIGHTS_MAX} highlights.`);
  }

  highlights.forEach((highlight, index) => {
    if (String(highlight ?? '').length > HIGHLIGHT_MAX_LENGTH) {
      add(`highlights.${index}`, `Keep a highlight to ${HIGHLIGHT_MAX_LENGTH} characters.`);
    }
  });

  // A value with nothing naming it is meaningless, so it is refused. A label
  // with nothing under it is merely unfinished — which is the whole point of
  // "Add standard rows", and an editor must be able to save the scaffolding
  // before the developer has sent the sheet that fills it in.
  const named = (rows, field) =>
    (rows ?? []).forEach((spec, index) => {
      if (isBlank(spec.label) && !isBlank(spec.value)) {
        add(`${field}.${index}.label`, 'Give this specification a label.');
      }
      checkLength(add, `${field}.${index}.label`, spec.label, 'the label', LIMITS.specLabel);
      checkLength(add, `${field}.${index}.value`, spec.value, 'the value', LIMITS.specValue);
    });

  named(values.specifications, 'specifications');
  named(values.constructionSpecs, 'constructionSpecs');

  return errors;
}

export function validateFloorPlans(values) {
  const { errors, add } = collector();

  (values.floorPlans ?? []).forEach((plan, index) => {
    const path = `floorPlans.${index}`;
    // Any field at all: a card with a PDF, an area and a price but no title
    // passed as untouched here and was then dropped on save as empty, taking
    // the PDF with it and saying nothing.
    const touched =
      !isBlank(plan.title) ||
      !isBlank(plan.imageUrl) ||
      !isBlank(plan.pdfUrl) ||
      !isBlank(plan.area) ||
      !isBlank(plan.price) ||
      !isBlank(plan.bedrooms);
    if (!touched) return;

    if (isBlank(plan.title)) add(`${path}.title`, 'Name this floor plan.');
    checkLength(add, `${path}.title`, plan.title, 'the title', LIMITS.floorPlanTitle);
    if (isBlank(plan.imageUrl)) add(`${path}.imageUrl`, 'A floor plan needs an image.');
    checkUrl(add, `${path}.imageUrl`, plan.imageUrl, 'The image address');
    checkUrl(add, `${path}.pdfUrl`, plan.pdfUrl, 'The PDF address');
    checkNonNegative(add, `${path}.area`, plan.area, 'The area');
    checkNonNegative(add, `${path}.price`, plan.price, 'The price');
    checkRange(add, `${path}.bedrooms`, plan.bedrooms, 'The number of bedrooms', {
      max: LIMITS.rooms,
    });
  });

  return errors;
}

export function validateDocuments(values) {
  const { errors, add } = collector();

  (values.documents ?? []).forEach((document, index) => {
    const path = `documents.${index}`;
    const touched = !isBlank(document.title) || !isBlank(document.url);
    if (!touched) return;

    if (isBlank(document.title)) add(`${path}.title`, 'Name this document.');
    checkLength(add, `${path}.title`, document.title, 'the title', LIMITS.documentTitle);
    if (isBlank(document.url)) add(`${path}.url`, 'A document needs a file address.');
    checkUrl(add, `${path}.url`, document.url, 'The file address');
  });

  return errors;
}

export function validateProject(values) {
  const { errors, add } = collector();
  const project = values.project ?? {};

  [
    ['totalUnits', 'The number of units'],
    ['totalTowers', 'The number of towers'],
    ['projectAreaAcres', 'The project area'],
  ].forEach(([key, label]) => checkNonNegative(add, `project.${key}`, project[key], label));
  checkRange(add, 'project.totalFloors', project.totalFloors, 'The number of floors', {
    max: LIMITS.floors,
  });

  if (!isBlank(project.openAreaPercent)) {
    const percent = Number(project.openAreaPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      add('project.openAreaPercent', 'The open area is a percentage between 0 and 100.');
    }
  }

  if (!isBlank(project.launchDate) && !isDate(project.launchDate)) {
    add('project.launchDate', 'Use a real date, as yyyy-mm-dd.');
  }

  if (!isBlank(values.constructionProgressPercent)) {
    const percent = Number(values.constructionProgressPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      add('constructionProgressPercent', 'Progress is a percentage between 0 and 100.');
    }
  }

  (values.constructionTimeline ?? []).forEach((entry, index) => {
    const path = `constructionTimeline.${index}`;
    // A photograph from the site is work too: a row holding one used to count
    // as untouched and was dropped on save with no word.
    const touched =
      !isBlank(entry.milestone) ||
      !isBlank(entry.date) ||
      !isBlank(entry.note) ||
      !isBlank(entry.imageUrl);
    if (!touched) return;

    if (isBlank(entry.milestone)) add(`${path}.milestone`, 'Name this milestone.');
    checkLength(add, `${path}.milestone`, entry.milestone, 'the milestone', LIMITS.milestone);
    checkLength(add, `${path}.note`, entry.note, 'the note', LIMITS.milestoneNote);
    if (!isBlank(entry.date) && !isDate(entry.date)) {
      add(`${path}.date`, 'Use a real date, as yyyy-mm-dd.');
    }
    checkUrl(add, `${path}.imageUrl`, entry.imageUrl, 'The image address');
  });

  return errors;
}

export function validateFaqs(values) {
  const { errors, add } = collector();

  (values.faqs ?? []).forEach((faq, index) => {
    const path = `faqs.${index}`;
    const question = String(faq.question ?? '').trim();
    const hasQuestion = question !== '';
    const hasAnswer = !isBlank(plainText(faq.answer));
    if (!hasQuestion && !hasAnswer) return;

    if (!hasQuestion) add(`${path}.question`, 'Write the question.');
    else if (question.length < FAQ_QUESTION_MIN) {
      add(`${path}.question`, `A question needs at least ${FAQ_QUESTION_MIN} characters.`);
    } else if (question.length > FAQ_QUESTION_MAX) {
      add(`${path}.question`, `Keep a question to ${FAQ_QUESTION_MAX} characters.`);
    }

    if (!hasAnswer) add(`${path}.answer`, 'Write the answer.');
    else if (SCRIPT_PATTERN.test(String(faq.answer ?? ''))) {
      add(
        `${path}.answer`,
        'An answer may hold formatting, not code — remove the script, the iframe or the event handler.'
      );
    }
  });

  return errors;
}

export function validateSimilar(values, { propertyId } = {}) {
  const { errors, add } = collector();
  const ids = values.similarPropertyIds ?? [];

  if (ids.length > SIMILAR_MAX) {
    add('similarPropertyIds', `Choose at most ${SIMILAR_MAX} listings.`);
  }
  if (propertyId !== undefined && propertyId !== null) {
    if (ids.some((id) => String(id) === String(propertyId))) {
      add('similarPropertyIds', 'A listing cannot be similar to itself.');
    }
  }
  if (new Set(ids.map(String)).size !== ids.length) {
    add('similarPropertyIds', 'The same listing is chosen twice.');
  }

  return errors;
}

export function validateVisibility(values) {
  const { errors, add } = collector();
  const visibility = values.sectionVisibility ?? {};

  // Eighteen booleans: any combination is a valid page (D86). What is refused
  // is a key that is neither — the toggle writes `true`/`false` explicitly, so
  // anything else reached the record from somewhere the form does not own.
  for (const [key, value] of Object.entries(visibility)) {
    if (value !== true && value !== false) {
      add(`sectionVisibility.${key}`, 'A section is either shown or hidden.');
    }
  }

  return errors;
}

export function validateAgent(values) {
  const { errors, add } = collector();
  const agent = values.agent ?? {};

  // Read as it will be stored (`toPayload`): "098450 12345" and "(98450)
  // 12345" are the ten digits the payload sends, and were refused (QA-61).
  const phone = tidyPhone(String(agent.phone ?? '').trim());
  if (phone && !INDIAN_MOBILE_PATTERN.test(phone)) {
    add('agent.phone', 'Use a ten-digit Indian mobile number.');
  }

  const whatsapp = tidyPhone(String(agent.whatsapp ?? '').trim());
  if (whatsapp && !INDIAN_MOBILE_PATTERN.test(whatsapp)) {
    add('agent.whatsapp', 'Use a ten-digit Indian mobile number.');
  }

  const email = String(agent.email ?? '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    add('agent.email', 'Use a valid e-mail address.');
  }

  checkLength(add, 'agent.name', agent.name, 'the name', LIMITS.agentName);

  checkUrl(add, 'agent.photoUrl', agent.photoUrl, 'The photo address');

  return errors;
}

/**
 * The SEO tab (§9.6).
 *
 * The 50–60 character guide the panel draws its meters against is **advice**,
 * not a rule: a long title is cut in a result, not refused, and a listing whose
 * title is sixty-eight characters must still be savable. The only lengths here
 * are the API's own, and what genuinely blocks a save is shared with every
 * other form through `validateSeoBranch` — a custom schema that would
 * invalidate the page's JSON-LD, a redirect with nowhere to go, and an address
 * past 500 characters.
 */
export function validateSeo(values) {
  const { errors, add } = collector();
  const seo = values.seo ?? {};

  if (String(seo.title ?? '').length > 200) add('seo.title', 'Keep the title to 200 characters.');
  if (String(seo.description ?? '').length > 320) {
    add('seo.description', 'Keep the description to 320 characters.');
  }
  if (String(seo.focusKeyword ?? '').length > FOCUS_KEYWORD_MAX) {
    add('seo.focusKeyword', `Keep the focus keyword to ${FOCUS_KEYWORD_MAX} characters.`);
  }
  checkUrl(add, 'seo.canonicalUrl', seo.canonicalUrl, 'The canonical URL');

  for (const [path, message] of Object.entries(validateSeoBranch(seo))) add(path, message);

  return errors;
}

/* ------------------------------------------------------------------ *
 * Activation (PROP-04)
 * ------------------------------------------------------------------ */

/**
 * What a listing owes the public before it may go live.
 *
 * The blockers only apply while `isActive` is true — a draft is allowed to be
 * anything. The warnings never block; the rail shows them so an editor knows
 * what a thin page is missing.
 *
 * @param {object} values
 * @returns {{errors: Record<string,string>, warnings: Array<{id: string, message: string}>}}
 */
export function validateForActivation(values) {
  const { errors, add } = collector();
  const warnings = [];

  const amenities = values.amenityIds ?? [];
  const highlights = (values.highlights ?? []).filter((entry) => !isBlank(entry));
  const faqs = (values.faqs ?? []).filter((faq) => !isBlank(faq.question));
  const plans = (values.floorPlans ?? []).filter((plan) => !isBlank(plan.imageUrl));
  const units = (values.unitConfigurations ?? []).filter((unit) => !isBlank(unit.name));

  // The blockers are the API's own (`config/propertyRules`): the list's
  // toggles and bulk bar are refused by the same rules, in the same words.
  if (values.isActive === true) {
    Object.entries(publishProblems(values)).forEach(([path, message]) => add(path, message));
  }

  const warn = (id, message) => warnings.push({ id, message });

  // Advice, not the publishing rule — which is 300 *characters* and sits on the
  // field. The two numbers side by side read as a contradiction, so this one
  // says what it is and why.
  const words = wordCount(values.description);
  if (words < DESCRIPTION_WARN_WORDS) {
    warn(
      'description-words',
      `The description has ${words} word${words === 1 ? '' : 's'}; ${DESCRIPTION_WARN_WORDS} or more reads better and ranks better.`
    );
  }
  if (amenities.length < AMENITY_WARN_COUNT) {
    warn('amenities', `Fewer than ${AMENITY_WARN_COUNT} amenities are selected.`);
  }
  if (highlights.length === 0) warn('highlights', 'No highlights are listed.');
  if (faqs.length === 0) warn('faqs', 'No FAQs are answered.');
  if (plans.length === 0 && units.length === 0) {
    warn('plans', 'No floor plan or unit configuration is given.');
  }
  if (values.project?.developerId && isBlank(values.reraNumber)) {
    warn('rera', 'A project listing has no RERA number.');
  }

  // Every field of `agent` is optional (§6.1) and a listing may lean on the
  // team member it names, so this is a warning rather than a refusal: what it
  // catches is the switch turned on over nothing at all.
  const agent = values.agent ?? {};
  const reachable = [agent.name, agent.phone, agent.whatsapp, agent.email].some(
    (value) => !isBlank(value)
  );
  if (agent.showOnListing === true && !reachable && isBlank(agent.teamMemberId)) {
    warn('agent', 'Contact details are switched on, but the listing carries none.');
  }

  return { errors, warnings };
}
