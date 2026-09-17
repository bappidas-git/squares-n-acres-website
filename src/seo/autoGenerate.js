/**
 * The "Generate" button: a title, a description, a focus keyword and a share
 * image, from what the record already says.
 *
 * The rule the boilerplate got wrong (ADD-27) and this does not: **a generated
 * value never replaces one a person wrote.** Everything an editor has typed
 * comes back unchanged unless the caller explicitly asks to overwrite, which
 * is what the panel's "Regenerate everything" does and what its per-field
 * "Generate" buttons do not.
 */

import { paragraphs, stripHtml } from './text';
import { suggestKeywords } from './suggestions';
import { resolveTitleTemplate } from './variables';

/** Where a generated description is cut (inside the 120–160 character guide). */
export const DESCRIPTION_TARGET = 155;

/**
 * A string cut to `max` characters at a word boundary, with the punctuation
 * the cut left behind trimmed off.
 *
 * @param {string} text
 * @param {number} [max]
 * @returns {string}
 */
export function trimToLength(text, max = DESCRIPTION_TARGET) {
  const value = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (value.length <= max) return value;

  const head = value.slice(0, max);
  const cut = head.lastIndexOf(' ');
  return (cut > max * 0.6 ? head.slice(0, cut) : head).replace(/[\s,;:.–—-]+$/, '');
}

/** The sentence a record leads with: its summary, or the first paragraph of its body. */
function summaryOf(entityType, entity) {
  const direct =
    entity.shortDescription ??
    entity.excerpt ??
    (entityType === 'articleCategory' || entityType === 'propertyType' ? entity.description : '');

  if (typeof direct === 'string' && direct.trim() && !/^</.test(direct.trim())) {
    return stripHtml(direct);
  }

  const body =
    entity.content ??
    entity.description ??
    entity.bio ??
    (typeof direct === 'string' ? direct : '');
  return paragraphs(body)[0] ?? stripHtml(body);
}

/** The image a share card should use: the cover, the featured image, the hero. */
function imageOf(entity) {
  const cover = (Array.isArray(entity.images) ? entity.images : []).find((image) => image?.isCover);
  return (
    cover?.url ??
    entity.featuredImage?.url ??
    entity.heroImageUrl ??
    entity.coverImageUrl ??
    entity.images?.[0]?.url ??
    entity.logoUrl ??
    entity.avatarUrl ??
    null
  );
}

/**
 * The SEO defaults for one record.
 *
 * @param {string} entityType one of `SEO_ENTITY_TYPES`
 * @param {object} entity the record, as the form holds it
 * @param {object} [seoSettings] `GET /seo/settings`
 * @param {{overwrite?: boolean, context?: object}} [options] `overwrite` replaces
 *   values the editor already wrote; `context` carries the master data the title
 *   templates read (localities, property types, developers, …)
 * @returns {{title: string, description: string, focusKeyword: string, og: {imageUrl: string|null}}}
 */
export function generateDefaults(entityType, entity = {}, seoSettings = {}, options = {}) {
  const record = entity ?? {};
  const { overwrite = false, context = {} } = options;
  const existing = record.seo ?? {};
  const settings = { ...context, seoSettings: seoSettings ?? {} };

  const keep = (value) => (overwrite ? '' : String(value ?? '').trim());

  const title = keep(existing.title) || resolveTitleTemplate(entityType, record, settings);
  const description =
    keep(existing.description) || trimToLength(summaryOf(entityType, record), DESCRIPTION_TARGET);
  const focusKeyword =
    keep(existing.focusKeyword) || suggestKeywords(entityType, record, context)[0] || '';
  const imageUrl = (overwrite ? null : (existing.og?.imageUrl ?? null)) ?? imageOf(record);

  return { title, description, focusKeyword, og: { imageUrl: imageUrl ?? null } };
}

const autoGenerate = { DESCRIPTION_TARGET, generateDefaults, trimToLength };

export default autoGenerate;
