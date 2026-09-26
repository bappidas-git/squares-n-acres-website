/**
 * Whether the body is one a person can read (SEO-09).
 *
 * Nine measurements over the text an article, a page or a locality guide
 * carries — a property's description is not measured here, because a listing
 * is a specification rather than an essay and scoring it for transition words
 * would be scoring it for the wrong thing.
 *
 * `heading-hierarchy` is the ninth: §7 of prompt 35 requires an `<h1>` inside
 * a body to be flagged, since the page already has one (§9.7), and the same
 * check catches a body that jumps from an H2 to an H4.
 */

import {
  MAX_PARAGRAPH_WORDS,
  MAX_SENTENCE_WORDS,
  MAX_WORDS_BETWEEN_SUBHEADINGS,
  MIN_FLESCH,
  MIN_TRANSITION_RATIO,
  MAX_PASSIVE_RATIO,
  fleschLabel,
  fleschReadingEase,
  paragraphStats,
  passiveVoice,
  sentenceStats,
  subheadingDistribution,
  transitionWords,
} from '../readability';
import { runGroup } from '../score';

/** The soft edge of each hard limit: past this, a warning becomes a failure. */
const SENTENCE_WARN = 30;
const SUBHEADING_WARN = 450;
const TRANSITION_WARN = 0.12;
const LONG_PARAGRAPH_SHARE = 0.2;

const NO_CONTENT = 'There is no body text to read.';
const WRITE_FIRST = 'Write the body first.';

const noContent = (make, id, field = 'content') =>
  make(id, 'fail', { message: NO_CONTENT, hint: WRITE_FIRST, field });

const tests = {
  'toc-present': (input, context, make) => {
    const field = 'tableOfContents';
    const h2s = input.headings.filter((heading) => heading.level === 2).length;

    if (h2s < 3) {
      return make('toc-present', 'skip', {
        message: `${h2s} H2 ${h2s === 1 ? 'heading' : 'headings'}: too short for a contents list.`,
        field,
      });
    }
    if (input.extras.tableOfContents) {
      return make('toc-present', 'pass', {
        message: `A contents list is on, over ${h2s} sections.`,
        field,
      });
    }
    return make('toc-present', 'fail', {
      message: `${h2s} sections and no contents list.`,
      hint: 'Turn the contents list on: it is what a long guide is navigated by.',
      field,
    });
  },

  'short-paragraphs': (input, context, make) => {
    const field = 'content';
    const stats = paragraphStats(input.contentHtml);
    if (!stats.count) return noContent(make, 'short-paragraphs', field);

    if (!stats.long) {
      return make('short-paragraphs', 'pass', {
        message: `${stats.count} paragraphs, longest ${stats.longest} words.`,
        field,
        value: stats.longest,
      });
    }
    const share = stats.long / stats.count;
    const message = `${stats.long} of ${stats.count} paragraphs run past ${MAX_PARAGRAPH_WORDS} words (longest ${stats.longest}).`;

    if (share <= LONG_PARAGRAPH_SHARE) {
      return make('short-paragraphs', 'warn', {
        message,
        hint: 'Split the long ones; a paragraph is a thought, not a page.',
        field,
        value: stats.longest,
      });
    }
    return make('short-paragraphs', 'fail', {
      message,
      hint: 'On a phone this is a wall of text. Break it up.',
      field,
      value: stats.longest,
    });
  },

  'has-media': (input, context, make) => {
    const field = 'content';
    const inBody = input.contentImages.length;
    const total = input.images.length;
    const video = Boolean(input.extras.videoUrl);

    if (inBody || video) {
      return make('has-media', 'pass', {
        message: video ? 'The page carries a video.' : `${inBody} images in the body.`,
        field,
      });
    }
    if (total) {
      return make('has-media', 'warn', {
        message: 'The only image is the cover: the body itself has none.',
        hint: 'A diagram, a photograph or a table every few hundred words.',
        field,
      });
    }
    return make('has-media', 'fail', {
      message: 'No images and no video.',
      hint: 'A body of pure text is the one readers leave first.',
      field,
    });
  },

  'flesch-reading-ease': (input, context, make) => {
    const field = 'content';
    const score = fleschReadingEase(input.contentText);
    if (score === null) return noContent(make, 'flesch-reading-ease', field);

    const message = `Flesch Reading Ease ${score} — ${fleschLabel(score)}.`;
    if (score >= MIN_FLESCH) {
      return make('flesch-reading-ease', 'pass', { message, field, value: score });
    }
    return make('flesch-reading-ease', 'warn', {
      message,
      hint: 'Shorter sentences and plainer words; a legal subject still reads in plain English.',
      field,
      value: score,
    });
  },

  'sentence-length': (input, context, make) => {
    const field = 'content';
    const stats = sentenceStats(input.contentText);
    if (!stats.count) return noContent(make, 'sentence-length', field);

    const message = `${stats.averageWords} words per sentence on average; ${stats.long} of ${stats.count} run past ${MAX_SENTENCE_WORDS}.`;
    if (stats.averageWords <= MAX_SENTENCE_WORDS) {
      return make('sentence-length', 'pass', { message, field, value: stats.averageWords });
    }
    if (stats.averageWords <= SENTENCE_WARN) {
      return make('sentence-length', 'warn', {
        message,
        hint: 'Cut the longest ones in two.',
        field,
        value: stats.averageWords,
      });
    }
    return make('sentence-length', 'fail', {
      message,
      hint: 'Sentences this long are read twice or not at all.',
      field,
      value: stats.averageWords,
    });
  },

  'subheading-distribution': (input, context, make) => {
    const field = 'content';
    const stats = subheadingDistribution(input.contentHtml);
    if (!stats.sections.length) return noContent(make, 'subheading-distribution', field);

    const message = `Longest stretch without a subheading: ${stats.longest} words.`;
    if (stats.longest <= MAX_WORDS_BETWEEN_SUBHEADINGS) {
      return make('subheading-distribution', 'pass', { message, field, value: stats.longest });
    }
    if (stats.longest <= SUBHEADING_WARN) {
      return make('subheading-distribution', 'warn', {
        message,
        hint: `A subheading every ${MAX_WORDS_BETWEEN_SUBHEADINGS} words keeps a reader oriented.`,
        field,
        value: stats.longest,
      });
    }
    return make('subheading-distribution', 'fail', {
      message,
      hint: 'Add H2s: this is where a reader loses the thread.',
      field,
      value: stats.longest,
    });
  },

  'passive-voice': (input, context, make) => {
    const field = 'content';
    const stats = passiveVoice(input.contentText);
    if (!stats.count) return noContent(make, 'passive-voice', field);

    const message = `${stats.percent} % of sentences read as passive (${stats.passive} of ${stats.count}).`;
    if (stats.ratio <= MAX_PASSIVE_RATIO) {
      return make('passive-voice', 'pass', { message, field, value: stats.percent });
    }
    return make('passive-voice', 'warn', {
      message,
      hint: 'Say who does what: "the promoter files the plan", not "the plan is filed".',
      field,
      value: stats.percent,
    });
  },

  'transition-words': (input, context, make) => {
    const field = 'content';
    const stats = transitionWords(input.contentText);
    if (!stats.count) return noContent(make, 'transition-words', field);

    const message = `${stats.percent} % of sentences use a transition word (${Math.round(MIN_TRANSITION_RATIO * 100)} % is the target).`;
    if (stats.ratio >= MIN_TRANSITION_RATIO) {
      return make('transition-words', 'pass', { message, field, value: stats.percent });
    }
    if (stats.ratio >= TRANSITION_WARN) {
      return make('transition-words', 'warn', {
        message,
        hint: 'However, because, in practice — the joins that make an argument follow.',
        field,
        value: stats.percent,
      });
    }
    return make('transition-words', 'fail', {
      message,
      hint: 'The text reads as a list of facts rather than as an argument.',
      field,
      value: stats.percent,
    });
  },

  'heading-hierarchy': (input, context, make) => {
    const field = 'content';
    if (!input.contentText) return noContent(make, 'heading-hierarchy', field);

    const list = input.headings;
    if (!list.length) {
      return make('heading-hierarchy', 'fail', {
        message: 'No headings at all.',
        hint: 'A body of any length needs H2s.',
        field,
      });
    }

    const h1s = list.filter((heading) => heading.level === 1).length;
    if (h1s) {
      return make('heading-hierarchy', 'warn', {
        message: `${h1s} H1 ${h1s === 1 ? 'heading' : 'headings'} inside the body.`,
        hint: 'The page title is the H1. Demote these to H2.',
        field,
      });
    }

    const skipped = list.find(
      (heading, index) => index > 0 && heading.level - list[index - 1].level > 1
    );
    if (skipped) {
      return make('heading-hierarchy', 'warn', {
        message: `The outline jumps a level at “${skipped.text}”.`,
        hint: 'Go H2, then H3 — a skipped level reads as a missing section.',
        field,
      });
    }
    if (list[0].level > 2) {
      return make('heading-hierarchy', 'warn', {
        message: `The body opens at H${list[0].level}.`,
        hint: 'Open at H2, under the page title.',
        field,
      });
    }

    return make('heading-hierarchy', 'pass', {
      message: `${list.length} headings, in order.`,
      field,
    });
  },
};

/**
 * The content readability group (SEO-09) for one record.
 *
 * @param {object} input the normalised record (`entityAdapters.toSeoInput`)
 * @param {object} [context]
 * @returns {Array<object>} one result per test, in catalogue order
 */
export const runContentReadabilityTests = (input, context = {}) =>
  runGroup('contentReadability', tests, input, context);

export default runContentReadabilityTests;
