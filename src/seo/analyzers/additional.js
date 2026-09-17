/**
 * The checks that are not about the keyword and the meta tags but about the
 * page itself (SEO-07): does it link out, does it carry images with alt text,
 * does the property say what it costs, does the article say who wrote it.
 *
 * Eleven of them apply to every record; the rest belong to one entity type and
 * are skipped — not failed — everywhere else. The ones §4.4 of prompt 35 marks
 * "(warn)" are enhancements: their worst outcome is a warning, because a
 * listing without a RERA number is still a listing.
 */

import { SLUG_MAX_LENGTH, SLUG_PATTERN } from '../../utils/slug';
import { containsKeyword, density, duplicatesIn } from '../keywords';
import { isNofollow } from '../text';
import { isStopWord } from '../data/stopWords';
import { runGroup } from '../score';

/** The keyword density a body should sit inside, as a percentage (SEO-07). */
export const DENSITY = { min: 0.5, max: 2.5, warnMin: 0.3, warnMax: 3.5 };

/** How many images each kind of record needs (SEO-07). */
export const IMAGE_COUNT = { property: 5, article: 1 };

const NO_KEYWORD = 'Set a focus keyword first.';
const SET_KEYWORD = 'Type the phrase this record should rank for into the focus keyword field.';

const count = (list) => (Array.isArray(list) ? list.length : 0);

const tests = {
  'keyword-in-subheading': (input, context, make) => {
    const field = 'content';
    const subheadings = input.headings.filter((heading) => heading.level > 1);

    if (!input.focusKeyword) {
      return make('keyword-in-subheading', 'fail', {
        message: NO_KEYWORD,
        hint: SET_KEYWORD,
        field,
      });
    }
    if (!subheadings.length) {
      return make('keyword-in-subheading', 'fail', {
        message: 'There are no subheadings.',
        hint: 'Break the text up with H2s; one of them should name the keyword.',
        field,
      });
    }
    if (subheadings.some((heading) => containsKeyword(heading.text, input.focusKeyword))) {
      return make('keyword-in-subheading', 'pass', {
        message: 'A subheading carries the keyword.',
        field,
      });
    }
    return make('keyword-in-subheading', 'fail', {
      message: `None of the ${subheadings.length} subheadings carries the keyword.`,
      hint: `Work “${input.focusKeyword}” into one H2, where it reads naturally.`,
      field,
    });
  },

  'keyword-in-image-alt': (input, context, make) => {
    const field = 'images';
    if (!input.focusKeyword) {
      return make('keyword-in-image-alt', 'fail', {
        message: NO_KEYWORD,
        hint: SET_KEYWORD,
        field,
      });
    }
    if (!input.images.length) {
      return make('keyword-in-image-alt', 'fail', {
        message: 'There are no images.',
        hint: 'Add an image and describe it — the alt text is what a search engine reads.',
        field,
      });
    }
    if (input.images.some((image) => containsKeyword(image.alt, input.focusKeyword))) {
      return make('keyword-in-image-alt', 'pass', {
        message: 'An image describes itself with the keyword.',
        field,
      });
    }
    const missing = input.images.filter((image) => !image.alt.trim()).length;
    return make('keyword-in-image-alt', 'warn', {
      message: missing
        ? `${missing} of ${input.images.length} images have no alt text.`
        : 'No alt text carries the keyword.',
      hint: 'Describe one image in the words someone would search for.',
      field,
    });
  },

  'keyword-density': (input, context, make) => {
    const field = 'content';
    if (!input.focusKeyword) {
      return make('keyword-density', 'fail', { message: NO_KEYWORD, hint: SET_KEYWORD, field });
    }
    if (!input.wordCount) {
      return make('keyword-density', 'fail', {
        message: 'There is no body text to measure.',
        hint: 'Write the body first.',
        field,
      });
    }

    const value = density(input.contentText, input.focusKeyword);
    const rounded = Math.round(value * 100) / 100;
    const message = `Keyword density ${rounded} % (${DENSITY.min}–${DENSITY.max} % is the range).`;

    if (value >= DENSITY.min && value <= DENSITY.max) {
      return make('keyword-density', 'pass', { message, field, value: rounded });
    }
    if (value >= DENSITY.warnMin && value <= DENSITY.warnMax) {
      return make('keyword-density', 'warn', {
        message,
        hint: value < DENSITY.min ? 'Use the phrase once or twice more.' : 'Use the phrase less.',
        field,
        value: rounded,
      });
    }
    return make('keyword-density', 'fail', {
      message,
      hint:
        value < DENSITY.min
          ? 'The body barely mentions its own subject.'
          : 'This reads as keyword stuffing and is scored as such.',
      field,
      value: rounded,
    });
  },

  'slug-quality': (input, context, make) => {
    const field = 'slug';
    const slug = input.slug;
    if (!slug) {
      return make('slug-quality', 'fail', {
        message: 'No slug yet.',
        hint: 'Save the record, or set the slug by hand.',
        field,
      });
    }
    if (slug.length > SLUG_MAX_LENGTH) {
      return make('slug-quality', 'fail', {
        message: `The slug is ${slug.length} characters; the limit is ${SLUG_MAX_LENGTH}.`,
        hint: 'Keep the two or three words that matter and drop the rest.',
        field,
      });
    }
    if (!SLUG_PATTERN.test(slug)) {
      return make('slug-quality', 'fail', {
        message: 'The slug holds characters a URL should not: use a–z, 0–9 and hyphens.',
        hint: 'Capitals, spaces and underscores all become something else in a link.',
        field,
      });
    }
    if (/^[0-9-]+$/.test(slug)) {
      return make('slug-quality', 'fail', {
        message: 'The slug is only numbers.',
        hint: 'A URL is read by people too — name the page in it.',
        field,
      });
    }

    const stopWords = slug.split('-').filter(isStopWord);
    return make('slug-quality', 'pass', {
      message: `${slug.length} characters, lowercase, readable.`,
      hint: stopWords.length
        ? `It carries ${stopWords.length === 1 ? 'the word' : 'the words'} “${stopWords.join('”, “')}”, which a URL can usually do without.`
        : '',
      field,
    });
  },

  'internal-link': (input, context, make) => {
    const field = 'content';
    const internal = input.links.filter((link) => link.internal);
    if (internal.length) {
      return make('internal-link', 'pass', {
        message: `${internal.length} internal ${internal.length === 1 ? 'link' : 'links'}.`,
        field,
        value: internal.length,
      });
    }
    return make('internal-link', 'fail', {
      message: 'Nothing here links to another page of this site.',
      hint: 'Link to a related guide, a locality or a listing — it is how the rest gets found.',
      field,
    });
  },

  'external-dofollow-link': (input, context, make) => {
    const field = 'content';
    const external = input.links.filter((link) => !link.internal);
    const followed = external.filter((link) => !isNofollow(link));

    if (followed.length) {
      return make('external-dofollow-link', 'pass', {
        message: `${followed.length} outbound ${followed.length === 1 ? 'link' : 'links'} search engines will follow.`,
        field,
        value: followed.length,
      });
    }
    if (external.length) {
      return make('external-dofollow-link', 'warn', {
        message: `All ${external.length} outbound links are nofollow.`,
        hint: 'A citation to an authority — a regulator, a statute — is worth following.',
        field,
      });
    }
    return make('external-dofollow-link', 'fail', {
      message: 'Nothing here cites a source outside the site.',
      hint: 'Link the authority you are describing; it is what a guide is judged on.',
      field,
    });
  },

  'keyword-unique-site': (input, context, make) => {
    const field = 'seo.focusKeyword';
    if (!input.focusKeyword) {
      return make('keyword-unique-site', 'fail', { message: NO_KEYWORD, hint: SET_KEYWORD, field });
    }
    if (!Array.isArray(context.siteIndex) || !context.siteIndex.length) {
      return make('keyword-unique-site', 'skip', {
        message: 'The site-wide SEO list has not been loaded.',
        field,
      });
    }

    const duplicates = duplicatesIn(
      context.siteIndex,
      (row) => row?.seo?.focusKeyword ?? '',
      input.focusKeyword,
      { id: input.id, type: input.entityType }
    );

    if (!duplicates.length) {
      return make('keyword-unique-site', 'pass', {
        message: 'No other record targets this keyword.',
        field,
      });
    }
    return make('keyword-unique-site', 'warn', {
      message: `${duplicates.length} other ${duplicates.length === 1 ? 'record targets' : 'records target'} this keyword, starting with “${duplicates[0].title ?? duplicates[0].slug}”.`,
      hint: 'Two pages after one phrase split the result between them.',
      field,
    });
  },

  'image-count': (input, context, make) => {
    const field = 'images';
    const needed = IMAGE_COUNT[input.entityType] ?? 1;
    const images = input.images;
    const withoutAlt = images.filter((image) => !image.alt.trim()).length;

    if (!images.length) {
      return make('image-count', 'fail', {
        message: 'No images.',
        hint: `Add at least ${needed} ${needed === 1 ? 'image' : 'images'}, each with alt text.`,
        field,
        value: 0,
      });
    }
    if (images.length < needed) {
      return make('image-count', 'warn', {
        message: `${images.length} of the ${needed} images this kind of page needs.`,
        hint: 'A listing with photographs of every room is the one that gets enquiries.',
        field,
        value: images.length,
      });
    }
    if (withoutAlt) {
      return make('image-count', 'warn', {
        message: `${images.length} images, ${withoutAlt} without alt text.`,
        hint: 'Describe every image: it is what a search engine and a screen reader both read.',
        field,
        value: images.length,
      });
    }
    return make('image-count', 'pass', {
      message: `${images.length} images, all with alt text.`,
      field,
      value: images.length,
    });
  },

  'og-image-set': (input, context, make) => {
    const field = 'seo.og.imageUrl';
    if (input.seo.og.imageUrl) {
      return make('og-image-set', 'pass', {
        message: 'A social share image is set.',
        field,
      });
    }
    if (input.coverImageUrl) {
      return make('og-image-set', 'warn', {
        message: 'No share image: the cover image will be used instead.',
        hint: 'A 1200×630 image built for sharing survives the crop; a cover photo may not.',
        field,
      });
    }
    return make('og-image-set', 'fail', {
      message: 'No share image and no cover image — a share will show the site logo.',
      hint: 'Set a 1200×630 image.',
      field,
    });
  },

  'canonical-set': (input, context, make) => {
    const field = 'seo.canonicalUrl';
    if (!input.canonical) {
      return make('canonical-set', 'fail', {
        message: 'No canonical URL: this record has no address yet.',
        hint: 'Save the record so it gets a slug.',
        field,
      });
    }
    if (input.seo.canonicalUrl) {
      return make('canonical-set', 'pass', {
        message: `Canonical points at ${input.canonical}.`,
        field,
        value: input.canonical,
      });
    }
    return make('canonical-set', 'pass', {
      message: `Canonical: ${input.canonical}.`,
      field,
      value: input.canonical,
    });
  },

  indexable: (input, context, make) => {
    const field = 'seo.robots';
    const robots = input.seo.robots;

    if (robots.index === false) {
      return make('indexable', 'fail', {
        message: 'Robots are told not to index this page.',
        hint: 'Turn indexing back on unless this page is deliberately hidden.',
        field,
      });
    }
    if (!input.isPublished) {
      return make('indexable', 'fail', {
        message: 'Not published, so nothing can index it yet.',
        hint: 'Publish the record when it is ready.',
        field,
      });
    }
    return make('indexable', 'pass', { message: 'Published and indexable.', field });
  },

  'price-present': (input, context, make) => {
    const field = 'pricing';
    if (input.extras.priceOnRequest) {
      return make('price-present', 'pass', { message: 'Price on request acknowledged.', field });
    }
    if (input.extras.hasPrice) {
      return make('price-present', 'pass', { message: 'The listing states a price.', field });
    }
    return make('price-present', 'fail', {
      message: 'No price and no "price on request".',
      hint: 'A listing without a price is filtered out of every budget search.',
      field,
    });
  },

  'locality-in-title': (input, context, make) => {
    const field = 'seo.title';
    const locality = input.extras.localityName;
    if (!locality) {
      return make('locality-in-title', 'fail', {
        message: 'No locality is set on the listing.',
        hint: 'Choose the locality; it is half of what buyers search for.',
        field: 'location.localityId',
      });
    }
    if (containsKeyword(input.effectiveTitle, locality)) {
      return make('locality-in-title', 'pass', {
        message: `The title names ${locality}.`,
        field,
      });
    }
    return make('locality-in-title', 'fail', {
      message: `The title does not name ${locality}.`,
      hint: 'Nobody searches for a flat without saying where.',
      field,
    });
  },

  'rera-present': (input, context, make) => {
    const field = 'reraNumber';
    if (input.extras.reraNumber) {
      return make('rera-present', 'pass', { message: 'A RERA number is on the listing.', field });
    }
    return make('rera-present', 'warn', {
      message: 'No RERA number.',
      hint: 'Where a project is registered, the number is what a buyer checks first.',
      field,
    });
  },

  'faqs-min-3': (input, context, make) => {
    const field = 'faqs';
    const total = count(input.extras.faqs);
    if (total >= 3) {
      return make('faqs-min-3', 'pass', { message: `${total} FAQs.`, field, value: total });
    }
    return make('faqs-min-3', 'warn', {
      message: total ? `Only ${total} ${total === 1 ? 'FAQ' : 'FAQs'}.` : 'No FAQs.',
      hint: 'Three answers are what a FAQ result is built from.',
      field,
      value: total,
    });
  },

  'floor-plan-or-units': (input, context, make) => {
    const field = 'floorPlans';
    const plans = count(input.extras.floorPlans);
    const units = count(input.extras.unitConfigurations);
    if (plans || units) {
      return make('floor-plan-or-units', 'pass', {
        message: `${plans} floor ${plans === 1 ? 'plan' : 'plans'}, ${units} unit ${units === 1 ? 'configuration' : 'configurations'}.`,
        field,
      });
    }
    return make('floor-plan-or-units', 'warn', {
      message: 'No floor plan and no unit configuration.',
      hint: 'A layout is the first thing a serious buyer asks for.',
      field,
    });
  },

  'amenities-min-8': (input, context, make) => {
    const field = 'amenityIds';
    const total = count(input.extras.amenityIds);
    if (total >= 8) {
      return make('amenities-min-8', 'pass', {
        message: `${total} amenities.`,
        field,
        value: total,
      });
    }
    return make('amenities-min-8', 'warn', {
      message: total ? `Only ${total} amenities.` : 'No amenities selected.',
      hint: 'Amenities are what the listing filters match on.',
      field,
      value: total,
    });
  },

  'description-mentions-locality-and-type': (input, context, make) => {
    const field = 'seo.description';
    const locality = input.extras.localityName;
    const type = input.extras.propertyTypeName;
    const description = input.description || input.summary;

    if (!description.trim()) {
      return make('description-mentions-locality-and-type', 'fail', {
        message: 'No description to check.',
        hint: 'Name the property type and the locality in the first sentence.',
        field,
      });
    }

    const hasLocality = Boolean(locality) && containsKeyword(description, locality);
    const hasType = Boolean(type) && containsKeyword(description, type);

    if (hasLocality && hasType) {
      return make('description-mentions-locality-and-type', 'pass', {
        message: `The description names ${type} and ${locality}.`,
        field,
      });
    }
    if (hasLocality || hasType) {
      return make('description-mentions-locality-and-type', 'warn', {
        message: `The description names ${hasType ? 'the property type' : 'the locality'} but not ${hasType ? 'the locality' : 'the property type'}.`,
        hint: 'Buyers search for both together.',
        field,
      });
    }
    return make('description-mentions-locality-and-type', 'fail', {
      message: 'The description names neither the property type nor the locality.',
      hint: 'Name both in the first sentence.',
      field,
    });
  },

  'connectivity-present': (input, context, make) => {
    const field = 'connectivity';
    const total = count(input.extras.connectivity);
    if (total >= 3) {
      return make('connectivity-present', 'pass', {
        message: `${total} connectivity entries.`,
        field,
        value: total,
      });
    }
    if (total) {
      return make('connectivity-present', 'warn', {
        message: `Only ${total} connectivity ${total === 1 ? 'entry' : 'entries'}.`,
        hint: 'Metro, road, airport and railway is the set people look for.',
        field,
        value: total,
      });
    }
    return make('connectivity-present', 'fail', {
      message: 'No connectivity information.',
      hint: 'Distances to the metro, the ring road and the airport are why this page exists.',
      field,
      value: 0,
    });
  },

  'highlights-present': (input, context, make) => {
    const field = 'highlights';
    const total = count(input.extras.highlights);
    if (total >= 3) {
      return make('highlights-present', 'pass', {
        message: `${total} highlights.`,
        field,
        value: total,
      });
    }
    if (total) {
      return make('highlights-present', 'warn', {
        message: `Only ${total} ${total === 1 ? 'highlight' : 'highlights'}.`,
        hint: 'Three is where the list starts to say something.',
        field,
        value: total,
      });
    }
    return make('highlights-present', 'fail', {
      message: 'No highlights.',
      hint: 'Three short lines on what makes this place worth a visit.',
      field,
      value: 0,
    });
  },

  'excerpt-present': (input, context, make) => {
    const field = 'excerpt';
    const excerpt = String(input.extras.excerpt ?? '').trim();
    if (!excerpt) {
      return make('excerpt-present', 'fail', {
        message: 'No excerpt.',
        hint: 'The excerpt is what every card, every archive and every share shows.',
        field,
      });
    }
    if (excerpt.length < 60) {
      return make('excerpt-present', 'warn', {
        message: `The excerpt is ${excerpt.length} characters.`,
        hint: 'One or two full sentences read better on a card than a fragment.',
        field,
        value: excerpt.length,
      });
    }
    return make('excerpt-present', 'pass', {
      message: `${excerpt.length}-character excerpt.`,
      field,
      value: excerpt.length,
    });
  },

  'category-assigned': (input, context, make) => {
    const field = 'categoryId';
    if (input.extras.categoryId) {
      return make('category-assigned', 'pass', {
        message: input.extras.categoryName
          ? `Filed under ${input.extras.categoryName}.`
          : 'A category is assigned.',
        field,
      });
    }
    return make('category-assigned', 'fail', {
      message: 'No category.',
      hint: 'The category is the archive this article is found from.',
      field,
    });
  },

  'tags-min-2': (input, context, make) => {
    const field = 'tagIds';
    const total = count(input.extras.tagIds);
    if (total >= 2) {
      return make('tags-min-2', 'pass', { message: `${total} tags.`, field, value: total });
    }
    if (total === 1) {
      return make('tags-min-2', 'warn', {
        message: 'One tag.',
        hint: 'Two or three tags put the article on more than one archive.',
        field,
        value: total,
      });
    }
    return make('tags-min-2', 'fail', {
      message: 'No tags.',
      hint: 'Tags are how a reader finds the next article.',
      field,
      value: 0,
    });
  },

  'featured-image-alt-keyword': (input, context, make) => {
    const field = 'featuredImage';
    const featured = input.extras.featuredImage;
    if (!featured?.url) {
      return make('featured-image-alt-keyword', 'warn', {
        message: 'No featured image.',
        hint: 'It is the image every card and every share shows.',
        field,
      });
    }
    const alt = String(featured.alt ?? '').trim();
    if (!alt) {
      return make('featured-image-alt-keyword', 'warn', {
        message: 'The featured image has no alt text.',
        hint: 'Describe it in the words someone would search for.',
        field,
      });
    }
    if (input.focusKeyword && containsKeyword(alt, input.focusKeyword)) {
      return make('featured-image-alt-keyword', 'pass', {
        message: 'The featured image describes itself with the keyword.',
        field,
      });
    }
    return make('featured-image-alt-keyword', 'warn', {
      message: 'The featured image has alt text, but not the keyword.',
      field,
    });
  },

  'faq-block-present': (input, context, make) => {
    const field = 'faqs';
    const total = count(input.extras.faqs);
    if (total) {
      return make('faq-block-present', 'pass', {
        message: `${total} ${total === 1 ? 'question' : 'questions'} under the article.`,
        field,
        value: total,
      });
    }
    return make('faq-block-present', 'warn', {
      message: 'No FAQ block.',
      hint: 'Questions and answers are what an AI search engine quotes.',
      field,
      value: 0,
    });
  },

  'related-links-present': (input, context, make) => {
    const field = 'relatedArticleIds';
    const articles = count(input.extras.relatedArticleIds);
    const properties = count(input.extras.relatedPropertyIds);
    if (articles || properties) {
      return make('related-links-present', 'pass', {
        message: `${articles} related ${articles === 1 ? 'article' : 'articles'}, ${properties} related ${properties === 1 ? 'listing' : 'listings'}.`,
        field,
      });
    }
    return make('related-links-present', 'warn', {
      message: 'Nothing related is linked.',
      hint: 'A reader who finished this article is the easiest one to keep.',
      field,
    });
  },
};

/**
 * The additional group (SEO-07) for one record.
 *
 * @param {object} input the normalised record (`entityAdapters.toSeoInput`)
 * @param {object} [context] `{ siteIndex, seoSettings, … }`
 * @returns {Array<object>} one result per test, in catalogue order
 */
export const runAdditionalTests = (input, context = {}) =>
  runGroup('additional', tests, input, context);

export default runAdditionalTests;
