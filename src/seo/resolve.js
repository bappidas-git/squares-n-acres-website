/**
 * What a record actually publishes: the title, the description, the canonical,
 * the robots directive and the two social cards, resolved exactly once.
 *
 * §9.3 describes this resolution in prose and two screens need it — the SEO
 * panel's "Resolved values" box, which exists to show an editor what their
 * overrides add up to, and the public `<Seo>` component, which puts the same
 * strings in the head. Writing it twice would guarantee that the box and the
 * page eventually disagree, which is the one thing the box must never do.
 *
 * Pure, like the rest of `src/seo`: a record, the settings, and the master data
 * the title templates read go in; strings come out.
 */

import { BRAND } from '../config/site';
import { toSeoInput } from './entityAdapters';
import { buildVariables, resolveTemplate, resolveTitleTemplate } from './variables';

/** `og:type` per entity type (§9.3) — an article is an article, everything else is a page. */
export const OG_TYPE_OF = {
  article: 'article',
  articleCategory: 'website',
  author: 'profile',
};

/** The entity types whose records are never indexed while they are not published. */
const PUBLISHABLE = new Set(['property', 'article', 'page', 'locality', 'developer']);

const trimmed = (value) => String(value ?? '').trim();

/**
 * The robots directive as a search engine reads it (§9.3, §9.6).
 *
 * The two switches come first because they are the ones that matter, then the
 * three "do not" flags, then the three limits — each of which is only printed
 * when it has been set, since `max-snippet:-1` and no `max-snippet` at all mean
 * the same thing to a crawler and only one of them is noise.
 *
 * @param {object} robots the §9.6 `seo.robots` branch
 * @param {{indexable?: boolean}} [options] `indexable: false` forces `noindex`
 * @returns {string[]} the directives, in order
 */
export function robotsDirectives(robots = {}, { indexable = true } = {}) {
  const out = [];

  out.push(indexable && robots.index !== false ? 'index' : 'noindex');
  out.push(robots.follow === false ? 'nofollow' : 'follow');

  if (robots.noarchive) out.push('noarchive');
  if (robots.nosnippet) out.push('nosnippet');
  if (robots.noimageindex) out.push('noimageindex');

  if (Number.isFinite(Number(robots.maxSnippet)) && robots.maxSnippet !== null) {
    out.push(`max-snippet:${Number(robots.maxSnippet)}`);
  }
  if (robots.maxImagePreview) out.push(`max-image-preview:${robots.maxImagePreview}`);
  if (Number.isFinite(Number(robots.maxVideoPreview)) && robots.maxVideoPreview !== null) {
    out.push(`max-video-preview:${Number(robots.maxVideoPreview)}`);
  }

  return out;
}

/** The same directives as the one string the `<meta name="robots">` carries. */
export const robotsContent = (robots, options) => robotsDirectives(robots, options).join(', ');

/**
 * Everything one record publishes about itself.
 *
 * @param {string} entityType one of `SEO_ENTITY_TYPES`
 * @param {object} entity the record, as the form holds it
 * @param {object} [seoSettings] `GET /seo/settings`
 * @param {object} [context] `{ siteSettings, localities, cities, propertyTypes,
 *   developers, categories, authors, siteUrl, now }` — the master data the
 *   title templates resolve against
 * @returns {{title: string, titleSource: 'own'|'template', description: string,
 *   descriptionSource: 'own'|'default'|'none', canonical: string|null,
 *   canonicalSource: 'own'|'auto'|'none', robots: string,
 *   robotsList: string[], indexable: boolean, ogType: string,
 *   og: {title: string, description: string, imageUrl: string|null, type: string,
 *     url: string|null, siteName: string, locale: string},
 *   twitter: {card: string, title: string, description: string, imageUrl: string|null}}}
 */
export function resolveSeoOutput(entityType, entity = {}, seoSettings = {}, context = {}) {
  const settings = seoSettings ?? {};
  const siteUrl = context.siteUrl ?? settings.siteUrl ?? '';
  const full = { ...context, seoSettings: settings, siteUrl };

  const input = toSeoInput(entityType, entity, full);
  const seo = input.seo;
  const variables = buildVariables(entityType, entity, full);

  // §9.3: an explicit title is used verbatim — but a template variable inside
  // it is still a variable, so an editor can write "%bhk% in %locality%" by
  // hand and get the same substitution the site-wide template gets.
  const own = trimmed(seo.title);
  const title = own
    ? resolveTemplate(own, variables)
    : resolveTitleTemplate(entityType, entity, full);

  const ownDescription = trimmed(seo.description);
  const fallbackDescription = trimmed(settings.defaults?.metaDescription);
  const description = ownDescription || fallbackDescription;

  const isPublished = PUBLISHABLE.has(entityType) ? input.isPublished !== false : true;
  const indexable = isPublished && settings.defaults?.robots?.index !== false;

  const ogType = OG_TYPE_OF[entityType] ?? 'website';
  const imageUrl =
    trimmed(seo.og?.imageUrl) ||
    trimmed(input.coverImageUrl) ||
    trimmed(settings.defaults?.ogImageUrl) ||
    BRAND.ogImageUrl;

  const ogTitle = trimmed(seo.og?.title) || title;
  const ogDescription = trimmed(seo.og?.description) || description;

  return {
    title,
    titleSource: own ? 'own' : 'template',
    description,
    descriptionSource: ownDescription ? 'own' : fallbackDescription ? 'default' : 'none',
    canonical: input.canonical,
    canonicalSource: seo.canonicalUrl ? 'own' : input.canonical ? 'auto' : 'none',
    robots: robotsContent(seo.robots, { indexable }),
    robotsList: robotsDirectives(seo.robots, { indexable }),
    indexable: indexable && seo.robots?.index !== false,
    ogType,
    og: {
      title: ogTitle,
      description: ogDescription,
      imageUrl: imageUrl || null,
      type: ogType,
      url: input.canonical,
      siteName: variables.sitename,
      locale: 'en_IN',
    },
    twitter: {
      card: seo.twitter?.card || settings.defaults?.twitterCard || 'summary_large_image',
      title: trimmed(seo.twitter?.title) || ogTitle,
      description: trimmed(seo.twitter?.description) || ogDescription,
      imageUrl: trimmed(seo.twitter?.imageUrl) || imageUrl || null,
    },
  };
}

const resolve = { OG_TYPE_OF, resolveSeoOutput, robotsContent, robotsDirectives };

export default resolve;
