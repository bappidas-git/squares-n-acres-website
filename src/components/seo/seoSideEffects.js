/**
 * The one thing saving `seo` does beyond saving `seo`.
 *
 * §9.6: "Saving `seo.redirect.enabled` creates/updates a `redirects` record
 * (`fromPath` = the entity's current public path)." That write cannot happen
 * inside the panel, because the panel does not know when its host form saved —
 * and it must happen *after* the entity save, because a new record has no slug
 * until the API gives it one, and the slug is the path being redirected.
 *
 * So every host form calls this with the record the API answered with:
 *
 *   const saved = await propertyService.update(id, payload);
 *   await applySeoSideEffects('property', saved.data);
 *
 * It never throws. A redirect that could not be written is worth a warning in
 * the console and nothing else: the listing is saved, and a failed side effect
 * must not be reported to an editor as a failed save.
 */

import redirectService from '../../services/redirectService';
import { URL_MAX_LENGTH } from '../../services/schemas/limits';
import { EVENTS, emit } from '../../utils/events';
import { parseCustom } from '../../seo/schema/graph';
import { publicPathFor } from '../../seo/urls';

/**
 * Writes what a saved record's `seo` branch implies, and tells the rest of the
 * admin that the site's SEO index is now stale.
 *
 * @param {string} entityType one of `SEO_ENTITY_TYPES`
 * @param {object} entity the record **as the API answered it** — its slug is
 *   the path the redirect comes from
 * @param {{signal?: AbortSignal}} [opts]
 * @returns {Promise<{redirect: 'created'|'updated'|'disabled'|'none',
 *   error: Error|null}>}
 */
export async function applySeoSideEffects(entityType, entity, opts) {
  emit(EVENTS.seoChanged, { entityType, id: entity?.id ?? null });

  const redirect = entity?.seo?.redirect ?? {};
  const fromPath = publicPathFor(entityType, entity ?? {});

  // No page, no redirect from it. A record saved without a slug — which the API
  // does not allow, but a form may attempt — has nothing to redirect.
  if (!fromPath) return { redirect: 'none', error: null };

  // Nothing to write and nothing to switch off: a record that has never asked
  // for a redirect keeps its target empty, and looking one up on every save of
  // every listing would be a request nobody needs.
  if (!redirect.enabled && !String(redirect.toPath ?? '').trim()) {
    return { redirect: 'none', error: null };
  }

  try {
    if (redirect.enabled && String(redirect.toPath ?? '').trim()) {
      const existing = await redirectService.findByFromPath(fromPath, opts);
      await redirectService.upsertByFromPath(
        {
          fromPath,
          toPath: String(redirect.toPath).trim(),
          statusCode: Number(redirect.statusCode) || 301,
          isActive: true,
        },
        opts
      );
      return { redirect: existing ? 'updated' : 'created', error: null };
    }

    const stopped = await redirectService.deactivateByFromPath(fromPath, opts);
    return { redirect: stopped ? 'disabled' : 'none', error: null };
  } catch (thrown) {
    console.warn('The redirect for this record could not be saved.', thrown);
    return { redirect: 'none', error: thrown };
  }
}

/**
 * Whether a `seo` branch asks for a redirect that is not complete enough to
 * write — the validation a host form runs before it saves.
 *
 * @param {object} [seo] the §9.6 branch
 * @returns {Record<string, string>} dotted path → message, empty when it is fine
 */
export function validateSeoSideEffects(seo = {}) {
  const redirect = seo?.redirect ?? {};
  if (!redirect.enabled) return {};

  const toPath = String(redirect.toPath ?? '').trim();
  if (!toPath) {
    return { 'seo.redirect.toPath': 'A redirect needs somewhere to send visitors.' };
  }
  if (!/^(\/|https?:\/\/)/.test(toPath)) {
    return {
      'seo.redirect.toPath':
        'Start with “/” for a page on this site, or with https:// for another.',
    };
  }
  return {};
}

/** The branch's addresses, by the words a sentence uses for the panel's fields. */
const SEO_URLS = [
  ['canonicalUrl', 'The canonical URL'],
  ['og.imageUrl', 'The share image address'],
  ['twitter.imageUrl', 'The X image address'],
];

/**
 * The rules of the `seo` branch that stop a save, whatever form is doing the
 * saving.
 *
 * **Custom schema.** Invalid JSON-LD in a page is worse than none: it
 * invalidates the whole `<script type="application/ld+json">`, generated nodes
 * included. So the block must parse and survive the structural validator, or
 * be empty — an editor cannot save their way past it.
 *
 * **A redirect with nowhere to go.** The switch is on and the target is blank:
 * the rule cannot be written, and saving it would leave an editor believing the
 * page had moved.
 *
 * **An address past 500 characters.** The API refuses it (QA-65), and its
 * sentence names the key — "The seo.og.imageUrl may not be greater than 500
 * characters." — as does the schema's, which every host form but the property
 * form and the SEO dialog checks too; this one, run after it, names the field.
 *
 * Everything else about the branch is advice. A title of eighty characters is
 * cut in a result, not refused; the panel says so and the save goes through.
 *
 * @param {object} [seo] the §9.6 branch
 * @returns {Record<string, string>} dotted path → message
 */
export function validateSeoBranch(seo = {}) {
  const errors = { ...validateSeoSideEffects(seo) };

  const custom = String(seo?.schema?.custom ?? '').trim();
  if (custom) {
    const { valid, errors: found } = parseCustom(custom);
    if (!valid) {
      errors['seo.schema.custom'] = found[0]?.message
        ? `The custom schema cannot be published: ${found[0].message}`
        : 'The custom schema is not valid JSON-LD.';
    }
  }

  for (const [path, label] of SEO_URLS) {
    const value = path.split('.').reduce((node, key) => node?.[key], seo);
    if (typeof value === 'string' && value.trim().length > URL_MAX_LENGTH) {
      errors[`seo.${path}`] = `${label} can be at most ${URL_MAX_LENGTH} characters.`;
    }
  }

  return errors;
}

const seoSideEffects = { applySeoSideEffects, validateSeoBranch, validateSeoSideEffects };

export default seoSideEffects;
