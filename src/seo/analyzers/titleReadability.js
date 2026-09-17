/**
 * Whether the title is one a person would click (SEO-08).
 *
 * The keyword near the front, a number, a word that promises something, no
 * shouting, and not a title another page already has. Three of the five are
 * warnings: they are the difference between a good headline and a fine one,
 * and an editor is allowed to disagree.
 */

import { duplicatesIn, firstOccurrencePercent } from '../keywords';
import { findPowerWord } from '../data/powerWords';
import { runGroup } from '../score';

/** Initialisms that are written in capitals because that is how they are written. */
const ACRONYMS = new Set([
  'BBMP',
  'BDA',
  'BHK',
  'BMRDA',
  'CCTV',
  'EMI',
  'GST',
  'IGBC',
  'IT',
  'KYC',
  'LEED',
  'NRI',
  'OC',
  'ORR',
  'PG',
  'RERA',
  'SBI',
  'STP',
  'TDR',
  'UPVC',
]);

/** How far into the title the keyword may start and still count as "at the start". */
const START_PERCENT = 30;

const NO_TITLE = 'There is no title to check.';

const tests = {
  'keyword-at-start': (input, context, make) => {
    const field = 'seo.title';
    if (!input.focusKeyword) {
      return make('keyword-at-start', 'fail', {
        message: 'Set a focus keyword first.',
        hint: 'Type the phrase this record should rank for into the focus keyword field.',
        field,
      });
    }
    const position = firstOccurrencePercent(input.effectiveTitle, input.focusKeyword);
    if (position === null) {
      return make('keyword-at-start', 'fail', {
        message: 'The title does not carry the focus keyword at all.',
        hint: 'Open the title with the phrase people search for.',
        field,
      });
    }
    if (position === 0) {
      return make('keyword-at-start', 'pass', {
        message: 'The title opens with the keyword.',
        field,
      });
    }
    if (position <= START_PERCENT) {
      return make('keyword-at-start', 'warn', {
        message: 'The keyword is near the start of the title, but not at it.',
        hint: 'A result is scanned left to right; the first three words do the work.',
        field,
      });
    }
    return make('keyword-at-start', 'fail', {
      message: 'The keyword is buried in the second half of the title.',
      hint: 'Move it to the front and push the brand to the end.',
      field,
    });
  },

  'title-has-number': (input, context, make) => {
    const field = 'seo.title';
    const title = input.effectiveTitle;
    if (!title) return make('title-has-number', 'fail', { message: NO_TITLE, field });
    if (/\d/.test(title)) {
      return make('title-has-number', 'pass', { message: 'The title carries a number.', field });
    }
    return make('title-has-number', 'warn', {
      message: 'No number in the title.',
      hint: 'A price, a year, a count of rooms or "7 things" all raise the click rate.',
      field,
    });
  },

  'title-power-word': (input, context, make) => {
    const field = 'seo.title';
    const title = input.effectiveTitle;
    if (!title) return make('title-power-word', 'fail', { message: NO_TITLE, field });

    const word = findPowerWord(title, context.now ? new Date(context.now) : undefined);
    if (word) {
      return make('title-power-word', 'pass', { message: `The title promises “${word}”.`, field });
    }
    return make('title-power-word', 'warn', {
      message: 'The title uses none of the words that make a result worth clicking.',
      hint: 'Ready-to-move, verified, complete, premium, the year — one is enough.',
      field,
    });
  },

  'title-not-all-caps': (input, context, make) => {
    const field = 'seo.title';
    const title = input.effectiveTitle;
    if (!title) return make('title-not-all-caps', 'fail', { message: NO_TITLE, field });

    const letters = title.replace(/[^\p{L}]/gu, '');
    if (letters && letters === letters.toUpperCase()) {
      return make('title-not-all-caps', 'fail', {
        message: 'The whole title is in capitals.',
        hint: 'Google rewrites shouted titles, and readers skip them.',
        field,
      });
    }

    const shouty = title
      .split(/\s+/)
      .map((word) => word.replace(/[^\p{L}]/gu, ''))
      .filter((word) => word.length >= 4 && word === word.toUpperCase() && !ACRONYMS.has(word));

    if (shouty.length > 1) {
      return make('title-not-all-caps', 'warn', {
        message: `${shouty.length} words are in capitals: “${shouty.join('”, “')}”.`,
        hint: 'Capitals for initialisms only.',
        field,
      });
    }
    return make('title-not-all-caps', 'pass', {
      message: 'Sentence case, as it should be.',
      field,
    });
  },

  'title-unique-site': (input, context, make) => {
    const field = 'seo.title';
    const title = input.effectiveTitle;
    if (!title) return make('title-unique-site', 'fail', { message: NO_TITLE, field });
    if (!Array.isArray(context.siteIndex) || !context.siteIndex.length) {
      return make('title-unique-site', 'skip', {
        message: 'The site-wide SEO list has not been loaded.',
        field,
      });
    }

    const duplicates = duplicatesIn(
      context.siteIndex,
      (row) => row?.seo?.title || row?.title || '',
      title,
      { id: input.id, type: input.entityType }
    );

    if (!duplicates.length) {
      return make('title-unique-site', 'pass', {
        message: 'No other record uses this title.',
        field,
      });
    }
    return make('title-unique-site', 'warn', {
      message: `${duplicates.length} other ${duplicates.length === 1 ? 'record uses' : 'records use'} this title, starting with “${duplicates[0].title ?? duplicates[0].slug}”.`,
      hint: 'Two identical titles in one result page look like two copies of one page.',
      field,
    });
  },
};

/**
 * The title readability group (SEO-08) for one record.
 *
 * @param {object} input the normalised record (`entityAdapters.toSeoInput`)
 * @param {object} [context]
 * @returns {Array<object>} one result per test, in catalogue order
 */
export const runTitleReadabilityTests = (input, context = {}) =>
  runGroup('titleReadability', tests, input, context);

export default runTitleReadabilityTests;
