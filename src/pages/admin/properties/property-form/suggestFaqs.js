/**
 * Six questions every buyer asks, answered from what the listing already says
 * (00_MASTER_CONTEXT.md §6.1, PROP-02 tab 12).
 *
 * This is a pure function of the form's values — no fetch, no React, no random
 * phrasing — so the FAQs tab can preview what it is about to add and a test can
 * assert every branch of it.
 *
 * The phrasing rule is the whole point: **an answer never claims more than the
 * record holds.** A listing with no price says the price is on request rather
 * than inventing a figure; a project with no possession date says no date has
 * been announced rather than promising a quarter; and a question whose answer
 * would be empty — no amenities, no configurations, no locality — is not
 * suggested at all. Nothing here is a marketing sentence; every clause maps
 * onto a field.
 *
 * Suggestions an editor already asked are left out, matched on the **shape** of
 * the question rather than its characters, so "What is the price of Lakeview
 * Heights?" is not offered beside "what is the price of lakeview heights".
 */

import {
  formatArea,
  formatBhk,
  formatMonthYear,
  formatNumber,
  formatPrice,
} from '../../../../utils/format';
import { AREA_UNITS, CONSTRUCTION_STATUS } from '../../../../config/enums';

/** How many suggestions the dialog offers at once (§2 of prompt 20). */
export const SUGGESTION_LIMIT = 5;

/** How many amenities an answer names before it counts the rest. */
export const AMENITIES_NAMED = 8;

/** How many nearby places an answer names. */
export const NEARBY_NAMED = 3;

const text = (value) => String(value ?? '').trim();

const has = (value) => value !== null && value !== undefined && value !== '';

const number = (value) => {
  if (!has(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** The five characters that would otherwise close a tag the answer opened. */
const escapeHtml = (value) =>
  text(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Sentences → one `<p>`, which is the HTML the answer field stores (§6.1). */
const paragraph = (...sentences) => `<p>${sentences.filter(Boolean).join(' ')}</p>`;

/** `A`, `A and B`, `A, B and C`. */
const sentenceList = (items) => {
  const rows = items.filter(Boolean);
  if (rows.length === 0) return '';
  if (rows.length === 1) return rows[0];
  return `${rows.slice(0, -1).join(', ')} and ${rows[rows.length - 1]}`;
};

/**
 * A question reduced to the words it is made of, so two spellings of one
 * question are one question.
 *
 * @param {string} question
 * @returns {string}
 */
export const normaliseQuestion = (question) =>
  String(question ?? '')
    .replace(/<[^>]*>/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Rent and lease are quoted per month (D90). */
const isRental = (values) => values.listingType === 'rent' || values.listingType === 'lease';

/** The listing's own name, and the project's — a phase has a title, a project has a name. */
const subjectOf = (values) => escapeHtml(text(values.title) || 'this property');
const projectOf = (values) =>
  escapeHtml(text(values.projectName) || text(values.title) || 'this project');

/** The lowest and highest figure across the configurations that are on offer. */
const unitPriceRange = (values) => {
  const prices = (values.unitConfigurations ?? [])
    .filter((unit) => unit.isActive !== false && unit.priceOnRequest !== true)
    .map((unit) => number(unit.price))
    .filter((price) => price !== null && price > 0);

  if (prices.length === 0) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
};

/* ------------------------------------------------------------------ *
 * One builder per question
 * ------------------------------------------------------------------ */

function priceQuestion(values) {
  const pricing = values.pricing ?? {};
  const title = subjectOf(values);
  const question = `What is the price of ${text(values.title) || 'this property'}?`;

  if (pricing.priceOnRequest === true) {
    return {
      question,
      answer: paragraph(
        'Price is available on request.',
        'Send an enquiry from this page and the current price will be shared with you.'
      ),
    };
  }

  const sentences = [];

  if (isRental(values)) {
    const rent = number(pricing.rentPerMonth);
    if (rent === null) return null;
    sentences.push(`The rent for ${title} is ${formatPrice(rent, { perMonth: true })}.`);

    const deposit = number(pricing.securityDeposit);
    if (deposit !== null) sentences.push(`The security deposit is ${formatPrice(deposit)}.`);

    const maintenance = number(pricing.maintenanceChargesMonthly);
    if (maintenance !== null) {
      sentences.push(`Maintenance is ${formatPrice(maintenance, { perMonth: true })}.`);
    }

    return { question, answer: paragraph(...sentences) };
  }

  const rangeMin = number(pricing.priceRangeMin);
  const rangeMax = number(pricing.priceRangeMax);
  const units = unitPriceRange(values);
  const price = number(pricing.price);

  if (rangeMin !== null && rangeMax !== null && rangeMin !== rangeMax) {
    sentences.push(
      `Prices at ${title} run from ${formatPrice(rangeMin)} to ${formatPrice(rangeMax)}.`
    );
  } else if (price !== null) {
    sentences.push(`${title} is priced at ${formatPrice(price)}.`);
  } else if (units && units.min !== units.max) {
    sentences.push(
      `Prices at ${title} run from ${formatPrice(units.min)} to ${formatPrice(units.max)}.`
    );
  } else if (units) {
    sentences.push(`${title} is priced at ${formatPrice(units.min)}.`);
  } else {
    return null;
  }

  const booking = number(pricing.bookingAmount);
  if (booking !== null) sentences.push(`The booking amount is ${formatPrice(booking)}.`);
  if (pricing.priceNegotiable === true) sentences.push('The price is negotiable.');

  return { question, answer: paragraph(...sentences) };
}

function possessionQuestion(values, developer) {
  const project = projectOf(values);
  const question = `When is ${text(values.projectName) || text(values.title) || 'this project'} ready for possession?`;
  const status = values.constructionStatus;
  const label = CONSTRUCTION_STATUS.labelOf(status);
  const builder = text(developer?.name)
    ? `It is a ${escapeHtml(text(developer.name))} project.`
    : '';

  if (status === 'ready-to-move') {
    return {
      question,
      answer: paragraph(`${project} is ready to move in, so possession is immediate.`, builder),
    };
  }

  if (status === 'resale') {
    return {
      question,
      answer: paragraph(`${project} is a resale property and is ready to move in.`, builder),
    };
  }

  const possession = text(values.possessionDate);
  if (possession) {
    return {
      question,
      answer: paragraph(
        `Possession at ${project} is scheduled for ${formatMonthYear(possession)}.`,
        label ? `The listing is marked “${label}”.` : '',
        builder
      ),
    };
  }

  return {
    question,
    answer: paragraph(
      label ? `${project} is marked “${label}”.` : `${project} is still being built.`,
      'A possession date has not been announced yet.',
      builder
    ),
  };
}

function reraQuestion(values) {
  const title = subjectOf(values);
  const question = `Is ${text(values.title) || 'this property'} RERA registered?`;
  const registration = text(values.reraNumber);

  if (registration) {
    return {
      question,
      answer: paragraph(
        values.reraRegistered === true ? 'Yes.' : '',
        `The RERA registration number for ${title} is ${escapeHtml(registration)}.`
      ),
    };
  }

  return {
    question,
    answer: paragraph('Registration details will be shared on request.'),
  };
}

function amenitiesQuestion(values, names) {
  if (names.length === 0) return null;

  const title = subjectOf(values);
  const named = names.slice(0, AMENITIES_NAMED).map(escapeHtml);
  const rest = names.length - named.length;

  return {
    question: `What amenities does ${text(values.title) || 'this property'} offer?`,
    answer: paragraph(
      `${title} offers ${sentenceList(named)}.`,
      rest > 0
        ? `${rest} further ${rest === 1 ? 'amenity is' : 'amenities are'} listed on this page.`
        : ''
    ),
  };
}

function locationQuestion(values, { locality, city }) {
  const title = subjectOf(values);
  const place = [text(locality?.name), text(city?.name)].filter(Boolean).join(', ');
  const address = text(values.location?.address);

  if (!place && !address) return null;

  const sentences = [];
  if (place) sentences.push(`${title} is in ${escapeHtml(place)}.`);
  else sentences.push(`${title} is at ${escapeHtml(address)}.`);

  const nearby = (values.nearbyPlaces ?? [])
    .filter((entry) => text(entry.name))
    .slice(0, NEARBY_NAMED)
    .map((entry) => {
      const distance = number(entry.distanceKm);
      return distance === null
        ? escapeHtml(entry.name)
        : `${escapeHtml(entry.name)} (${formatNumber(distance, { maximumFractionDigits: 1 })} km)`;
    });

  if (nearby.length > 0) sentences.push(`Close by: ${sentenceList(nearby)}.`);

  return {
    question: `Where is ${text(values.title) || 'this property'} located?`,
    answer: paragraph(...sentences),
  };
}

function configurationQuestion(values, propertyType) {
  const title = subjectOf(values);
  const question = 'What configurations are available?';
  // The master-data name is plural ("Apartments", "Office Spaces"), so it is
  // used in a sentence that stays plural rather than being singularised.
  const kind = text(propertyType?.name)
    ? `All configurations are ${escapeHtml(text(propertyType.name).toLowerCase())}.`
    : '';

  const units = (values.unitConfigurations ?? [])
    .filter((unit) => unit.isActive !== false && text(unit.name))
    .map((unit) => {
      const area = number(unit.superBuiltUpArea);
      if (area === null) return escapeHtml(unit.name);
      const unitLabel = AREA_UNITS.labelOf(unit.areaUnit || 'sqft');
      return `${escapeHtml(unit.name)} (${formatArea(area, unitLabel)})`;
    });

  if (units.length > 0) {
    return {
      question,
      answer: paragraph(`${title} is offered as ${sentenceList(units)}.`, kind),
    };
  }

  const bedrooms = number(values.configuration?.bedrooms);
  if (bedrooms === null) return null;

  const bathrooms = number(values.configuration?.bathrooms);
  return {
    question,
    answer: paragraph(
      `${title} is offered as ${formatBhk(bedrooms)}.`,
      bathrooms === null
        ? ''
        : `It has ${formatNumber(bathrooms)} ${bathrooms === 1 ? 'bathroom' : 'bathrooms'}.`,
      kind
    ),
  };
}

/* ------------------------------------------------------------------ *
 * The suggestion set
 * ------------------------------------------------------------------ */

/**
 * The names of the amenities a listing holds, in master-data order.
 *
 * Accepts either the ids the form holds plus the master list, or the embedded
 * `amenities` a `GET` returns (§6.1) — whichever the caller has.
 */
const amenityNames = (values, amenities) => {
  const embedded = (values.amenities ?? []).map((entry) => text(entry?.name)).filter(Boolean);
  if (embedded.length > 0) return embedded;

  const chosen = new Set((values.amenityIds ?? []).map((id) => String(id)));
  return (amenities ?? [])
    .filter((entry) => chosen.has(String(entry?.id)))
    .map((entry) => text(entry?.name))
    .filter(Boolean);
};

/**
 * Up to five questions this listing can answer, none of them already asked.
 *
 * @param {object} values the property form's values (§6.1)
 * @param {object} [context] what the form knows that the record only holds ids for
 * @param {{name?: string}|null} [context.locality]
 * @param {{name?: string}|null} [context.city]
 * @param {{name?: string}|null} [context.propertyType]
 * @param {{name?: string}|null} [context.developer]
 * @param {Array<{id: number|string, name: string}>} [context.amenities] master data, in order
 * @returns {Array<{question: string, answer: string}>} `answer` is `<p>` HTML
 */
export default function suggestFaqs(values = {}, context = {}) {
  const names = amenityNames(values, context.amenities);

  const candidates = [
    priceQuestion(values),
    possessionQuestion(values, context.developer),
    reraQuestion(values),
    amenitiesQuestion(values, names),
    locationQuestion(values, context),
    configurationQuestion(values, context.propertyType),
  ].filter(Boolean);

  const asked = new Set(
    (values.faqs ?? []).map((faq) => normaliseQuestion(faq?.question)).filter(Boolean)
  );

  const suggestions = [];
  for (const candidate of candidates) {
    const key = normaliseQuestion(candidate.question);
    if (asked.has(key)) continue;
    asked.add(key);
    suggestions.push(candidate);
    if (suggestions.length === SUGGESTION_LIMIT) break;
  }

  return suggestions;
}
