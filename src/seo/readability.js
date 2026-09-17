/**
 * Is this readable? (SEO-09)
 *
 * Seven measurements over the same body: how hard the sentences are
 * (Flesch Reading Ease), how long they run, how long the paragraphs run, how
 * far a reader goes between subheadings, how much of it is written in the
 * passive, and how much of it is joined up with transition words.
 *
 * Every one of them is a heuristic, and the analysers treat them as such: the
 * hard limits are failures, the soft ones are warnings, and the number itself
 * is always in the message so an editor can argue with it.
 */

import { paragraphs, parseHtml, sentences, stripHtml, wordCount, words } from './text';
import { hasTransitionWord } from './data/transitionWords';

/** The thresholds the analysers read (documented in `docs/SEO_ENGINE.md`). */
export const MAX_SENTENCE_WORDS = 25;
export const MAX_PARAGRAPH_WORDS = 150;
export const MAX_WORDS_BETWEEN_SUBHEADINGS = 300;
export const MIN_FLESCH = 50;
export const MAX_PASSIVE_RATIO = 0.1;
export const MIN_TRANSITION_RATIO = 0.2;

/**
 * How many syllables a word has, near enough to count with.
 *
 * The classic vowel-group heuristic: drop a silent final `e`, then count runs
 * of vowels. A number is read digit by digit, because "2026" in a headline is
 * four syllables and a zero would drag the whole score up.
 *
 * @param {string} word
 * @returns {number}
 */
export function countSyllables(word) {
  const value = String(word ?? '').toLowerCase();
  if (!value) return 0;

  const digits = value.replace(/[^0-9]/g, '');
  if (digits && !/[a-z]/.test(value)) return Math.max(1, digits.length);

  const letters = value.replace(/[^a-z]/g, '');
  if (!letters) return 0;
  if (letters.length <= 3) return 1;

  const trimmed = letters.replace(/(?:[^laeiouy]es|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
}

/**
 * The Flesch Reading Ease of a body: 100 is a children's book, 60 is plain
 * English, 30 is a legal notice.
 *
 * @param {string} input HTML or text
 * @returns {number|null} `null` when there is nothing to score
 */
export function fleschReadingEase(input) {
  const list = sentences(input);
  const allWords = words(input);
  if (!list.length || !allWords.length) return null;

  const syllables = allWords.reduce((total, word) => total + countSyllables(word), 0);
  const score =
    206.835 - 1.015 * (allWords.length / list.length) - 84.6 * (syllables / allWords.length);

  return Math.round(score * 10) / 10;
}

/** What a Flesch score means in words, for the analyser's message. */
export function fleschLabel(score) {
  if (score === null || score === undefined) return 'not measurable';
  if (score >= 80) return 'very easy';
  if (score >= 60) return 'plain English';
  if (score >= 50) return 'fairly hard';
  if (score >= 30) return 'hard';
  return 'very hard';
}

const summarise = (items, limit) => {
  const counts = items.map((item) => wordCount(item));
  const total = counts.reduce((sum, value) => sum + value, 0);

  return {
    count: items.length,
    words: total,
    averageWords: items.length ? Math.round((total / items.length) * 10) / 10 : 0,
    longest: counts.length ? Math.max(...counts) : 0,
    long: counts.filter((value) => value > limit).length,
    limit,
  };
};

/**
 * Sentence lengths.
 *
 * @param {string} input HTML or text
 * @param {{maxWords?: number}} [options]
 */
export const sentenceStats = (input, { maxWords = MAX_SENTENCE_WORDS } = {}) =>
  summarise(sentences(input), maxWords);

/**
 * Paragraph lengths.
 *
 * @param {string} input HTML or text
 * @param {{maxWords?: number}} [options]
 */
export const paragraphStats = (input, { maxWords = MAX_PARAGRAPH_WORDS } = {}) =>
  summarise(paragraphs(input), maxWords);

const isHeadingTag = (tag) => /^h[1-6]$/.test(tag);

/**
 * How far a reader goes between subheadings.
 *
 * @param {string} input HTML or text
 * @param {{maxWords?: number}} [options]
 * @returns {{sections: Array<{heading: string|null, words: number}>, longest: number,
 *   over: number, limit: number}}
 */
export function subheadingDistribution(input, { maxWords = MAX_WORDS_BETWEEN_SUBHEADINGS } = {}) {
  const source = String(input ?? '');
  const sections = [];
  let heading = null;
  let buffer = [];
  let headingParts = [];
  let inHeading = false;

  const flush = () => {
    const count = wordCount(buffer.join(' '));
    if (count > 0 || heading !== null) sections.push({ heading, words: count });
    buffer = [];
  };

  for (const event of parseHtml(source)) {
    if (event.kind === 'open' && isHeadingTag(event.tag)) {
      flush();
      inHeading = true;
      headingParts = [];
      continue;
    }
    if (event.kind === 'close' && isHeadingTag(event.tag)) {
      inHeading = false;
      heading = headingParts.join(' ').replace(/\s+/g, ' ').trim();
      continue;
    }
    if (event.kind === 'text') (inHeading ? headingParts : buffer).push(event.value);
  }
  flush();

  if (!sections.length) {
    const total = wordCount(source);
    if (total > 0) sections.push({ heading: null, words: total });
  }

  const longest = sections.length ? Math.max(...sections.map((section) => section.words)) : 0;
  return {
    sections,
    longest,
    over: sections.filter((section) => section.words > maxWords).length,
    limit: maxWords,
  };
}

/** Irregular past participles — the ones no `-ed` rule would ever find. */
const IRREGULAR_PARTICIPLES = new Set([
  'born',
  'bought',
  'brought',
  'built',
  'caught',
  'chosen',
  'come',
  'cut',
  'dealt',
  'done',
  'drawn',
  'driven',
  'eaten',
  'fallen',
  'felt',
  'found',
  'given',
  'gone',
  'grown',
  'held',
  'hit',
  'kept',
  'known',
  'laid',
  'left',
  'let',
  'lost',
  'made',
  'meant',
  'met',
  'paid',
  'put',
  'run',
  'said',
  'seen',
  'sent',
  'set',
  'shown',
  'sold',
  'spent',
  'split',
  'taken',
  'taught',
  'thought',
  'told',
  'won',
  'written',
]);

/** Words that end in `-ed` or `-en` and are not participles at all. */
const NOT_PARTICIPLES = new Set([
  'bed',
  'between',
  'bred',
  'citizen',
  'deed',
  'dozen',
  'even',
  'fed',
  'fled',
  'freed',
  'garden',
  'golden',
  'green',
  'greed',
  'indeed',
  'keen',
  'kitchen',
  'kitten',
  'led',
  'linen',
  'need',
  'often',
  'open',
  'oven',
  'queen',
  'red',
  'screen',
  'seed',
  'seven',
  'shed',
  'sled',
  'sped',
  'speed',
  'teen',
  'ten',
  'then',
  'token',
  'weed',
  'when',
  'wooden',
]);

const AUXILIARIES = '(?:is|are|was|were|be|been|being|am|get|gets|got|gotten)';
const PASSIVE = new RegExp(
  `\\b${AUXILIARIES}\\b(?:\\s+(?:not|also|already|still|now|only|being|[a-z]+ly))*\\s+([a-z]+)`,
  'gi'
);

/** Whether a word is a past participle, as far as the heuristic can tell. */
function looksLikeParticiple(word) {
  const value = String(word ?? '').toLowerCase();
  if (!value || NOT_PARTICIPLES.has(value)) return false;
  if (IRREGULAR_PARTICIPLES.has(value)) return true;
  return value.length >= 4 && /(?:ed|en)$/.test(value);
}

/**
 * Whether one sentence is written in the passive, by the "auxiliary + past
 * participle" rule of SEO-09. A heuristic, and a deliberately conservative
 * one: it looks for the shape, not for the grammar.
 *
 * @param {string} sentence
 * @returns {boolean}
 */
export function isPassiveSentence(sentence) {
  const text = String(sentence ?? '');
  if (!text) return false;

  PASSIVE.lastIndex = 0;
  let match;
  while ((match = PASSIVE.exec(text))) {
    if (looksLikeParticiple(match[1])) return true;
  }
  return false;
}

/**
 * The share of sentences written in the passive.
 *
 * @param {string} input HTML or text
 * @returns {{ratio: number, passive: number, count: number, percent: number}}
 */
export function passiveVoice(input) {
  const list = sentences(input);
  const passive = list.filter(isPassiveSentence).length;
  const ratio = list.length ? passive / list.length : 0;

  return { ratio, passive, count: list.length, percent: Math.round(ratio * 1000) / 10 };
}

/**
 * The share of sentences that carry a transition word.
 *
 * @param {string} input HTML or text
 * @returns {{ratio: number, withTransition: number, count: number, percent: number}}
 */
export function transitionWords(input) {
  const list = sentences(input);
  const withTransition = list.filter(hasTransitionWord).length;
  const ratio = list.length ? withTransition / list.length : 0;

  return { ratio, withTransition, count: list.length, percent: Math.round(ratio * 1000) / 10 };
}

/**
 * Every readability measurement of one body, computed once.
 *
 * @param {string} input HTML or text
 * @returns {object}
 */
export function readability(input) {
  const text = stripHtml(input);

  return {
    text,
    words: wordCount(text),
    flesch: fleschReadingEase(text),
    sentences: sentenceStats(text),
    paragraphs: paragraphStats(input),
    subheadings: subheadingDistribution(input),
    passive: passiveVoice(text),
    transitions: transitionWords(text),
  };
}

const readabilityModule = {
  MAX_PARAGRAPH_WORDS,
  MAX_PASSIVE_RATIO,
  MAX_SENTENCE_WORDS,
  MAX_WORDS_BETWEEN_SUBHEADINGS,
  MIN_FLESCH,
  MIN_TRANSITION_RATIO,
  countSyllables,
  fleschLabel,
  fleschReadingEase,
  isPassiveSentence,
  paragraphStats,
  passiveVoice,
  readability,
  sentenceStats,
  subheadingDistribution,
  transitionWords,
};

export default readabilityModule;
