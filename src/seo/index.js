/**
 * The SEO engine (§9.1) — pure functions, no React, no network, no DOM it
 * cannot do without.
 *
 * `analyze(entityType, entity, context)` is the whole surface most callers
 * need: it answers with the score, the band and the four groups of results
 * that §9.6 stores on the record. The rest is exported for the panel, the
 * dashboard and the `<Seo>` component, which each need one part of it: the
 * template resolver, the snippet widths, the keyword suggestions, the URL
 * rules and the JSON-LD generators.
 *
 * Namespaces (`schema`, `urls`, `text`, `keywords`, `readability`, `snippet`)
 * are exported as objects on purpose: `text.links` and `keywords.normalize`
 * read as what they are, and flattening them would collide.
 */

import { analyze, isEmptyRecord } from './analyze';
import { runAllAnalyzers } from './analyzers';
import { generateDefaults, trimToLength } from './autoGenerate';
import { blocksToHtml, readSeo, toSeoInput } from './entityAdapters';
import keywords from './keywords';
import readability from './readability';
import {
  APPLICABILITY,
  GROUP_OF,
  POINTS,
  TEST_GROUPS,
  TEST_IDS,
  WEIGHTS,
  applies,
  computeScore,
  weightOf,
} from './score';
import schema from './schema';
import snippet, {
  DESCRIPTION_CHARS,
  DESCRIPTION_MAX_PX,
  TITLE_CHARS,
  TITLE_MAX_PX,
  descriptionWidth,
  measureSnippet,
  titleWidth,
  truncateToWidth,
} from './snippet';
import { MAX_SUGGESTIONS, suggestKeywords, titleNgrams } from './suggestions';
import text from './text';
import urls from './urls';
import {
  buildVariables,
  cleanTitle,
  listVariables,
  resolveTemplate,
  resolveTitleTemplate,
} from './variables';

export {
  APPLICABILITY,
  DESCRIPTION_CHARS,
  DESCRIPTION_MAX_PX,
  GROUP_OF,
  MAX_SUGGESTIONS,
  POINTS,
  TEST_GROUPS,
  TEST_IDS,
  TITLE_CHARS,
  TITLE_MAX_PX,
  WEIGHTS,
  analyze,
  applies,
  blocksToHtml,
  buildVariables,
  cleanTitle,
  computeScore,
  descriptionWidth,
  generateDefaults,
  isEmptyRecord,
  keywords,
  listVariables,
  measureSnippet,
  readSeo,
  readability,
  resolveTemplate,
  resolveTitleTemplate,
  runAllAnalyzers,
  schema,
  snippet,
  suggestKeywords,
  text,
  titleNgrams,
  titleWidth,
  toSeoInput,
  trimToLength,
  truncateToWidth,
  urls,
  weightOf,
};

const seo = {
  WEIGHTS,
  analyze,
  buildVariables,
  computeScore,
  descriptionWidth,
  generateDefaults,
  keywords,
  listVariables,
  readability,
  resolveTemplate,
  schema,
  snippet,
  suggestKeywords,
  text,
  titleWidth,
  toSeoInput,
  urls,
};

export default seo;
