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
import { validateSeoBranch } from '../../../../../components/seo/seoSideEffects';

/** Title length the contract asks for (§6.1). */
export const TITLE_MIN = 10;

/** Characters of description a listing needs before it may go live (PROP-04). */
export const DESCRIPTION_MIN = 300;

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

/** HTML → the text a reader actually sees, for the length rules. */
export const plainText = (html) =>
  String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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

const checkUrl = (add, path, value, label) => {
  if (isBlank(value)) return;
  if (!isUrl(value)) add(path, `${label} must start with http:// or https://.`);
};

/** The two statuses that promise a date (§6.1). */
const NEEDS_POSSESSION_DATE = ['pre-launch', 'under-construction'];

/** Rent and lease are quoted per month; a sale is quoted once (D90). */
const rental = (values) => values.listingType === 'rent' || values.listingType === 'lease';

/** Whether a visitor would find a number — of any of the three kinds — on the page. */
const isPriced = (values) => {
  const pricing = values.pricing ?? {};
  if (pricing.priceOnRequest === true) return true;
  if (rental(values)) return !isBlank(pricing.rentPerMonth);
  return (
    !isBlank(pricing.price) || (!isBlank(pricing.priceRangeMin) && !isBlank(pricing.priceRangeMax))
  );
};

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
  } else if (!isBlank(possession) && !isDate(possession)) {
    add('possessionDate', 'Use a real date, as yyyy-mm-dd.');
  }

  checkNonNegative(add, 'ageOfPropertyYears', values.ageOfPropertyYears, 'The age');
  checkNonNegative(add, 'totalFloors', values.totalFloors, 'The number of floors');

  if (!isBlank(values.floorNumber) && !isNumber(values.floorNumber)) {
    add('floorNumber', 'The floor must be a number.');
  }

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

  (values.nearbyPlaces ?? []).forEach((place, index) => {
    // A row exists because somebody added it, and a row without a name is
    // dropped on save — so it is refused here rather than lost silently.
    if (isBlank(place.name)) add(`nearbyPlaces.${index}.name`, 'Name this place.');
    checkNonNegative(add, `nearbyPlaces.${index}.distanceKm`, place.distanceKm, 'The distance');
    checkNonNegative(
      add,
      `nearbyPlaces.${index}.travelTimeMin`,
      place.travelTimeMin,
      'The travel time'
    );
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
    ['bedrooms', 'The bedrooms'],
    ['bathrooms', 'The bathrooms'],
    ['balconies', 'The balconies'],
    ['parkingCovered', 'The covered parking'],
    ['parkingOpen', 'The open parking'],
  ].forEach(([key, label]) =>
    checkNonNegative(add, `configuration.${key}`, configuration[key], label)
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
    if (!measured && !priced) {
      add(`${path}.superBuiltUpArea`, 'Add an area or a price.');
    }

    checkNonNegative(add, `${path}.superBuiltUpArea`, unit.superBuiltUpArea, 'The area');
    checkNonNegative(add, `${path}.carpetArea`, unit.carpetArea, 'The carpet area');
    checkNonNegative(add, `${path}.price`, unit.price, 'The price');
    checkNonNegative(add, `${path}.bedrooms`, unit.bedrooms, 'The bedrooms');
    checkNonNegative(add, `${path}.bathrooms`, unit.bathrooms, 'The bathrooms');
    checkNonNegative(add, `${path}.availableUnits`, unit.availableUnits, 'The available units');
    checkUrl(add, `${path}.floorPlanImageUrl`, unit.floorPlanImageUrl, 'The floor-plan image');
    checkUrl(add, `${path}.floorPlanPdfUrl`, unit.floorPlanPdfUrl, 'The floor-plan PDF');
  });

  return errors;
}

export function validateMedia(values) {
  const { errors, add } = collector();

  (values.images ?? []).forEach((image, index) => {
    if (isBlank(image.url)) return;
    checkUrl(add, `images.${index}.url`, image.url, 'The image address');
    if (isBlank(image.alt)) {
      add(
        `images.${index}.alt`,
        'Describe this image — screen readers and search engines read it.'
      );
    }
  });

  const usable = (values.images ?? []).filter((image) => !isBlank(image.url));
  if (usable.length > 0 && !usable.some((image) => image.isCover === true)) {
    add('images.0.isCover', 'Choose which photograph is the cover.');
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
    });

  named(values.specifications, 'specifications');
  named(values.constructionSpecs, 'constructionSpecs');

  return errors;
}

export function validateFloorPlans(values) {
  const { errors, add } = collector();

  (values.floorPlans ?? []).forEach((plan, index) => {
    const path = `floorPlans.${index}`;
    const touched = !isBlank(plan.title) || !isBlank(plan.imageUrl);
    if (!touched) return;

    if (isBlank(plan.title)) add(`${path}.title`, 'Name this floor plan.');
    if (isBlank(plan.imageUrl)) add(`${path}.imageUrl`, 'A floor plan needs an image.');
    checkUrl(add, `${path}.imageUrl`, plan.imageUrl, 'The image address');
    checkUrl(add, `${path}.pdfUrl`, plan.pdfUrl, 'The PDF address');
    checkNonNegative(add, `${path}.area`, plan.area, 'The area');
    checkNonNegative(add, `${path}.price`, plan.price, 'The price');
    checkNonNegative(add, `${path}.bedrooms`, plan.bedrooms, 'The bedrooms');
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
    ['totalFloors', 'The number of floors'],
    ['projectAreaAcres', 'The project area'],
  ].forEach(([key, label]) => checkNonNegative(add, `project.${key}`, project[key], label));

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
    const touched = !isBlank(entry.milestone) || !isBlank(entry.date) || !isBlank(entry.note);
    if (!touched) return;

    if (isBlank(entry.milestone)) add(`${path}.milestone`, 'Name this milestone.');
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

  const phone = String(agent.phone ?? '').replace(/[\s-]/g, '');
  if (phone && !INDIAN_MOBILE_PATTERN.test(phone)) {
    add('agent.phone', 'Use a ten-digit Indian mobile number.');
  }

  const whatsapp = String(agent.whatsapp ?? '').replace(/[\s-]/g, '');
  if (whatsapp && !INDIAN_MOBILE_PATTERN.test(whatsapp)) {
    add('agent.whatsapp', 'Use a ten-digit Indian mobile number.');
  }

  const email = String(agent.email ?? '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    add('agent.email', 'Use a valid e-mail address.');
  }

  checkUrl(add, 'agent.photoUrl', agent.photoUrl, 'The photo address');

  return errors;
}

/**
 * The SEO tab (§9.6).
 *
 * The 50–60 character guide the panel draws its meters against is **advice**,
 * not a rule: a long title is cut in a result, not refused, and a listing whose
 * title is sixty-eight characters must still be savable. The only lengths here
 * are the API's own, and the only two things that genuinely block a save are
 * shared with every other form through `validateSeoBranch` — a custom schema
 * that would invalidate the page's JSON-LD, and a redirect with nowhere to go.
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

  const images = (values.images ?? []).filter((image) => !isBlank(image.url));
  const described = images.filter((image) => !isBlank(image.alt));
  const description = plainText(values.description);
  const amenities = values.amenityIds ?? [];
  const highlights = (values.highlights ?? []).filter((entry) => !isBlank(entry));
  const faqs = (values.faqs ?? []).filter((faq) => !isBlank(faq.question));
  const plans = (values.floorPlans ?? []).filter((plan) => !isBlank(plan.imageUrl));
  const units = (values.unitConfigurations ?? []).filter((unit) => !isBlank(unit.name));

  if (values.isActive === true) {
    if (described.length === 0) {
      add('images.0.url', 'A published listing needs at least one image with a description.');
    }
    if (description.length < DESCRIPTION_MIN) {
      add(
        'description',
        `A published listing needs a description of at least ${DESCRIPTION_MIN} characters (this one has ${description.length}).`
      );
    }
    if (isBlank(values.shortDescription)) {
      add('shortDescription', 'A published listing needs a one-line summary.');
    }
    if (!isPriced(values)) {
      const field = rental(values) ? 'pricing.rentPerMonth' : 'pricing.price';
      add(
        field,
        rental(values)
          ? 'A published rental needs a monthly rent, or “Price on request”.'
          : 'A published listing needs a price, a price range, or “Price on request”.'
      );
    }
  }

  const warn = (id, message) => warnings.push({ id, message });

  if (wordCount(values.description) < DESCRIPTION_WARN_WORDS) {
    warn('description-words', `The description is under ${DESCRIPTION_WARN_WORDS} words.`);
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
