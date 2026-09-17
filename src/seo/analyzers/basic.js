/**
 * The ten checks every record answers (SEO-06): is there a focus keyword, is
 * it where it needs to be, and are the title and the description the length a
 * result can show.
 *
 * Two deliberate rules run through the group. A test whose subject is missing
 * **fails** rather than passing vacuously — "is the title in capitals?" is not
 * a pass when there is no title. And the description tests measure the
 * record's own `seo.description` only: the site-wide default of
 * `seoSettings.defaults.metaDescription` is what a visitor would see, but it
 * is the same sentence on every page, which is the thing this group exists to
 * prevent.
 */

import { containsKeyword, duplicatesIn, inFirstPercent } from '../keywords';
import {
  DESCRIPTION_CHARS,
  DESCRIPTION_MAX_PX,
  TITLE_CHARS,
  TITLE_MAX_PX,
  descriptionWidth,
  titleWidth,
} from '../snippet';
import { runGroup } from '../score';

/** How much body text each kind of record needs (`docs/SEO_ENGINE.md`). */
export const CONTENT_LENGTH = {
  property: { good: 300, ok: 150 },
  article: { good: 600, ok: 300 },
  page: { good: 300, ok: 150 },
  locality: { good: 200, ok: 100 },
  developer: { good: 200, ok: 100 },
};

const NO_KEYWORD = 'Set a focus keyword first.';
const SET_KEYWORD = 'Type the phrase this record should rank for into the focus keyword field.';

const tests = {
  'focus-keyword-set': (input, context, make) => {
    const keyword = input.focusKeyword.trim();
    if (!keyword) {
      return make('focus-keyword-set', 'fail', {
        message: 'No focus keyword.',
        hint: SET_KEYWORD,
        field: 'seo.focusKeyword',
      });
    }
    return make('focus-keyword-set', 'pass', {
      message: `Focus keyword: “${keyword}”.`,
      field: 'seo.focusKeyword',
      value: keyword,
    });
  },

  'keyword-in-title': (input, context, make) => {
    const field = 'seo.title';
    if (!input.focusKeyword) {
      return make('keyword-in-title', 'fail', { message: NO_KEYWORD, hint: SET_KEYWORD, field });
    }
    if (containsKeyword(input.effectiveTitle, input.focusKeyword)) {
      return make('keyword-in-title', 'pass', { message: 'The title carries the keyword.', field });
    }
    return make('keyword-in-title', 'fail', {
      message: 'The title does not carry the focus keyword.',
      hint: `Work “${input.focusKeyword}” into the SEO title.`,
      field,
    });
  },

  'keyword-in-description': (input, context, make) => {
    const field = 'seo.description';
    if (!input.focusKeyword) {
      return make('keyword-in-description', 'fail', {
        message: NO_KEYWORD,
        hint: SET_KEYWORD,
        field,
      });
    }
    if (!input.description.trim()) {
      return make('keyword-in-description', 'fail', {
        message: 'No meta description.',
        hint: 'Write a description of 120–160 characters that uses the focus keyword.',
        field,
      });
    }
    if (containsKeyword(input.description, input.focusKeyword)) {
      return make('keyword-in-description', 'pass', {
        message: 'The description carries the keyword.',
        field,
      });
    }
    return make('keyword-in-description', 'fail', {
      message: 'The description does not carry the focus keyword.',
      hint: `Use “${input.focusKeyword}” in the first sentence of the description.`,
      field,
    });
  },

  'keyword-in-slug': (input, context, make) => {
    const field = 'slug';
    if (!input.focusKeyword) {
      return make('keyword-in-slug', 'fail', { message: NO_KEYWORD, hint: SET_KEYWORD, field });
    }
    if (!input.slug) {
      return make('keyword-in-slug', 'fail', {
        message: 'No slug yet.',
        hint: 'Save the record, or set the slug by hand.',
        field,
      });
    }
    if (containsKeyword(input.slug.replace(/-/g, ' '), input.focusKeyword)) {
      return make('keyword-in-slug', 'pass', { message: 'The URL carries the keyword.', field });
    }
    return make('keyword-in-slug', 'fail', {
      message: 'The URL does not carry the focus keyword.',
      hint: 'A slug is worth changing only before the page is published or linked.',
      field,
    });
  },

  'keyword-in-first-10-percent': (input, context, make) => {
    const field = 'content';
    if (!input.focusKeyword) {
      return make('keyword-in-first-10-percent', 'fail', {
        message: NO_KEYWORD,
        hint: SET_KEYWORD,
        field,
      });
    }
    if (!input.contentText) {
      return make('keyword-in-first-10-percent', 'fail', {
        message: 'There is no body text to open with.',
        hint: 'Write an opening paragraph that names the keyword.',
        field,
      });
    }
    if (inFirstPercent(input.contentText, input.focusKeyword, 10)) {
      return make('keyword-in-first-10-percent', 'pass', {
        message: 'The keyword appears in the opening tenth of the text.',
        field,
      });
    }
    return make('keyword-in-first-10-percent', 'fail', {
      message: 'The keyword does not appear in the opening tenth of the text.',
      hint: 'Name the subject in the first paragraph, the way a reader expects.',
      field,
    });
  },

  'keyword-in-content': (input, context, make) => {
    const field = 'content';
    if (!input.focusKeyword) {
      return make('keyword-in-content', 'fail', { message: NO_KEYWORD, hint: SET_KEYWORD, field });
    }
    if (containsKeyword(input.contentText, input.focusKeyword)) {
      return make('keyword-in-content', 'pass', { message: 'The body uses the keyword.', field });
    }
    return make('keyword-in-content', 'fail', {
      message: 'The body never uses the focus keyword.',
      hint: `Use “${input.focusKeyword}” where it reads naturally — twice is usually enough.`,
      field,
    });
  },

  'content-length': (input, context, make) => {
    const field = 'content';
    const limits = CONTENT_LENGTH[input.entityType] ?? { good: 300, ok: 150 };
    const count = input.wordCount;
    const message = `${count} ${count === 1 ? 'word' : 'words'} of body text.`;

    if (count >= limits.good)
      return make('content-length', 'pass', { message, field, value: count });
    if (count >= limits.ok) {
      return make('content-length', 'warn', {
        message,
        hint: `${limits.good} words or more is where this kind of page starts to rank.`,
        field,
        value: count,
      });
    }
    return make('content-length', 'fail', {
      message,
      hint: `Write at least ${limits.ok} words, and ${limits.good} for a page that has to compete.`,
      field,
      value: count,
    });
  },

  'title-length': (input, context, make) => {
    const field = 'seo.title';
    const title = input.effectiveTitle;
    const chars = [...title].length;
    const pixels = titleWidth(title);
    const message = `${chars} characters, ${pixels} px of the ${TITLE_MAX_PX} px a result shows.`;

    if (!chars) {
      return make('title-length', 'fail', {
        message: 'No title.',
        hint: `Write an SEO title of ${TITLE_CHARS.min}–${TITLE_CHARS.max} characters.`,
        field,
        value: 0,
      });
    }

    let status = 'fail';
    if (chars >= TITLE_CHARS.min && chars <= TITLE_CHARS.max) status = 'pass';
    else if (
      (chars >= TITLE_CHARS.warnMin && chars < TITLE_CHARS.min) ||
      (chars > TITLE_CHARS.max && chars <= TITLE_CHARS.warnMax)
    ) {
      status = 'warn';
    }
    if (status === 'pass' && pixels > TITLE_MAX_PX) status = 'warn';

    return make('title-length', status, {
      message,
      hint:
        status === 'pass'
          ? ''
          : pixels > TITLE_MAX_PX
            ? 'Google will cut this title off. Shorten it or move the brand to the end.'
            : `Aim for ${TITLE_CHARS.min}–${TITLE_CHARS.max} characters.`,
      field,
      value: chars,
    });
  },

  'description-length': (input, context, make) => {
    const field = 'seo.description';
    const description = input.description;
    const chars = [...description].length;
    const pixels = descriptionWidth(description);

    if (!chars) {
      return make('description-length', 'fail', {
        message: 'No meta description.',
        hint: `Write ${DESCRIPTION_CHARS.min}–${DESCRIPTION_CHARS.max} characters; without one Google writes its own.`,
        field,
        value: 0,
      });
    }

    let status = 'fail';
    if (chars >= DESCRIPTION_CHARS.min && chars <= DESCRIPTION_CHARS.max) status = 'pass';
    else if (
      (chars >= DESCRIPTION_CHARS.warnMin && chars < DESCRIPTION_CHARS.min) ||
      (chars > DESCRIPTION_CHARS.max && chars <= DESCRIPTION_CHARS.warnMax)
    ) {
      status = 'warn';
    }
    if (status === 'pass' && pixels > DESCRIPTION_MAX_PX) status = 'warn';

    return make('description-length', status, {
      message: `${chars} characters, ${pixels} px of the ${DESCRIPTION_MAX_PX} px a result shows.`,
      hint:
        status === 'pass'
          ? ''
          : chars < DESCRIPTION_CHARS.min
            ? `Aim for ${DESCRIPTION_CHARS.min}–${DESCRIPTION_CHARS.max} characters.`
            : 'Google will cut this description off — put the point in the first sentence.',
      field,
      value: chars,
    });
  },

  'description-unique': (input, context, make) => {
    const field = 'seo.description';
    if (!input.description.trim()) {
      return make('description-unique', 'fail', {
        message: 'No meta description to compare.',
        hint: 'Write a description that belongs to this record alone.',
        field,
      });
    }
    if (!Array.isArray(context.siteIndex) || !context.siteIndex.length) {
      return make('description-unique', 'skip', {
        message: 'The site-wide SEO list has not been loaded.',
        field,
      });
    }

    const duplicates = duplicatesIn(
      context.siteIndex,
      (row) => row?.seo?.description ?? '',
      input.description,
      { id: input.id, type: input.entityType }
    );

    if (!duplicates.length) {
      return make('description-unique', 'pass', {
        message: 'No other record uses this description.',
        field,
      });
    }
    return make('description-unique', 'warn', {
      message: `${duplicates.length} other ${duplicates.length === 1 ? 'record uses' : 'records use'} this description, starting with “${duplicates[0].title ?? duplicates[0].slug}”.`,
      hint: 'Two pages with one description compete with each other for the same result.',
      field,
    });
  },
};

/**
 * The basic group (SEO-06) for one record.
 *
 * @param {object} input the normalised record (`entityAdapters.toSeoInput`)
 * @param {object} [context] `{ siteIndex, seoSettings, … }`
 * @returns {Array<object>} one result per test, in catalogue order
 */
export const runBasicTests = (input, context = {}) => runGroup('basic', tests, input, context);

export default runBasicTests;
