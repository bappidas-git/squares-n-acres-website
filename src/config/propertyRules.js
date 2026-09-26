/**
 * What a listing needs before it may go live (00_MASTER_CONTEXT.md §6.1,
 * PROP-04).
 *
 * The form has refused to publish a listing that breaks these since prompt 21;
 * since QA-62 the API does too — `POST`, `PUT`, a `PATCH` that publishes or
 * touches what the rules read, and the bulk "activate". The rules lived in the
 * form alone, and the list's eye toggle, its row menu and its bulk bar never go
 * through the form: they put a listing with no photograph, no description and
 * no price on the site — and, featured, into the home page's Featured row. One
 * module states the rules for both sides, so the sentence an editor reads under
 * a field is the sentence the API answers with — the article rules' pattern
 * (`articleRules.js`, QA-55).
 *
 * CommonJS (D36b), like `enums.js`: the mock server requires it.
 */

/** A published listing's description needs this many characters of text. */
const DESCRIPTION_MIN = 300;

/**
 * What an image without a description is told — only when the listing goes
 * live (prompt 51): a draft with twenty-five photographs is saved as it is, and
 * the descriptions are asked for when they are about to be read.
 */
const ALT_MESSAGE = 'Describe this image — screen readers and search engines read it.';

/** `images.3.alt` — the key a missing description is refused under. */
const ALT_KEY = /^images\.\d+\.alt$/;

/**
 * The fields the rules read. A `PATCH` that sends none of them — a featured
 * star, a priority — is not asked: it changes nothing the rules are about.
 */
const PUBLISH_FIELDS = [
  'isActive',
  'listingType',
  'images',
  'description',
  'shortDescription',
  'pricing',
];

const isBlank = (value) => value === null || value === undefined || String(value).trim() === '';

/** HTML → the text a reader actually sees, for the length rule. */
const plainText = (html) =>
  String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isRental = (property) =>
  property?.listingType === 'rent' || property?.listingType === 'lease';

/**
 * Whether a visitor would find a number — of any of the three kinds — on the
 * page: a price, a range with both ends, a monthly rent; or "Price on request".
 *
 * @param {object} property a record of §6.1, or the property form's values
 * @returns {boolean}
 */
function isPriced(property) {
  const pricing = property?.pricing ?? {};
  if (pricing.priceOnRequest === true) return true;
  if (isRental(property)) return !isBlank(pricing.rentPerMonth);
  return (
    !isBlank(pricing.price) || (!isBlank(pricing.priceRangeMin) && !isBlank(pricing.priceRangeMax))
  );
}

/**
 * What stands between a listing and the site, keyed the way a 422 keys it.
 *
 * @param {object} property a record of §6.1, or the property form's values
 * @returns {Record<string, string>} `{}` when the listing may go live
 */
function publishProblems(property) {
  const found = {};

  const images = Array.isArray(property?.images) ? property.images : [];
  // The gallery as a whole: with no image there is no `images.0` to hang the
  // message on.
  if (!images.some((image) => !isBlank(image?.url))) {
    found.images = 'A published listing needs at least one image with a description.';
  }
  // …and every image it shows is described, each under its own box.
  images.forEach((image, index) => {
    if (!isBlank(image?.url) && isBlank(image?.alt)) found[`images.${index}.alt`] = ALT_MESSAGE;
  });

  const length = plainText(property?.description).length;
  if (length < DESCRIPTION_MIN) {
    found.description = `A published listing needs a description of at least ${DESCRIPTION_MIN} characters (this one has ${length}).`;
  }

  if (isBlank(property?.shortDescription)) {
    found.shortDescription = 'A published listing needs a one-line summary.';
  }

  if (!isPriced(property)) {
    if (isRental(property)) {
      found['pricing.rentPerMonth'] =
        'A published rental needs a monthly rent, or “Price on request”.';
    } else {
      found['pricing.price'] =
        'A published listing needs a price, a price range, or “Price on request”.';
    }
  }

  return found;
}

/**
 * The same problems as short phrases — "no price", "120 of 300 characters of
 * description" — for a list that names several listings at once.
 *
 * @param {Record<string, string>} problems what {@link publishProblems} found
 * @param {object} property the listing they were found on
 * @returns {Array<string>}
 */
function publishGaps(problems, property) {
  const gaps = [];
  if (problems.images) gaps.push('no photograph with a description');
  const undescribed = Object.keys(problems).filter((key) => ALT_KEY.test(key)).length;
  if (undescribed > 0) {
    gaps.push(
      `${undescribed} ${undescribed === 1 ? 'photograph' : 'photographs'} without a description`
    );
  }
  if (problems.description) {
    gaps.push(
      `${plainText(property?.description).length} of ${DESCRIPTION_MIN} characters of description`
    );
  }
  if (problems.shortDescription) gaps.push('no one-line summary');
  if (problems['pricing.rentPerMonth']) gaps.push('no rent');
  if (problems['pricing.price']) gaps.push('no price');
  return gaps;
}

/**
 * The sentence a refusal leads with: `“Aurelia Court” is not ready to go live:
 * no price, no one-line summary.`
 *
 * @param {object} property
 * @param {Array<string>} gaps what {@link publishGaps} made of the problems
 * @returns {string}
 */
const notReadyMessage = (property, gaps) =>
  `“${property?.title || 'This listing'}” is not ready to go live: ${gaps.join(', ')}.`;

module.exports = {
  ALT_MESSAGE,
  DESCRIPTION_MIN,
  PUBLISH_FIELDS,
  isPriced,
  notReadyMessage,
  plainText,
  publishGaps,
  publishProblems,
};
