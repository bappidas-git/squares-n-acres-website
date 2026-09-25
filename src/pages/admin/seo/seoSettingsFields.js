/**
 * What the SEO settings page's messages call each key of the record, and which
 * field shows a message about a list's entry.
 *
 * The schema and the API name a field by its key — "The defaults.ogImageUrl
 * must be a valid URL.", "The knowledgeGraph.sameAs.0 may not be greater than
 * 500 characters." — and those sentences reached the screen as they were: the
 * form passed `useForm` no labels. These are the words the tabs label the
 * fields with, as Site settings has had since QA-64 (`settingsLabel`).
 */

import { NOINDEX_RULES, TEMPLATE_KEYS } from './settings-tabs/TitlesMetaTab';
import { SITEMAP_ENTITIES } from './settings-tabs/SitemapTab';
import { VERIFICATION_FIELDS } from './settings-tabs/VerificationTab';

/** "Properties" → "properties"; "CMS pages" stays as it is. */
const inSentence = (label) =>
  /^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label;

/** The words for each key of the record, as a sentence says them. */
const FIELD_LABELS = {
  // Titles & meta
  siteUrl: 'site URL',
  separator: 'separator',
  titleTemplates: 'title templates',
  ...Object.fromEntries(
    TEMPLATE_KEYS.map(({ key, label }) => [`titleTemplates.${key}`, `“${label}” title template`])
  ),
  defaults: 'defaults',
  'defaults.metaDescription': 'default meta description',
  'defaults.ogImageUrl': 'default share image address',
  'defaults.twitterCard': 'default Twitter card',
  'defaults.robots': 'default robots directives',
  'defaults.robots.index': 'indexing switch',
  'defaults.robots.follow': 'follow-links switch',
  noindex: 'automatic noindex rules',
  ...Object.fromEntries(
    NOINDEX_RULES.map(({ key, label }) => [
      `noindex.${key}`,
      `noindex switch for ${inSentence(label)}`,
    ])
  ),

  // Knowledge graph
  knowledgeGraph: 'knowledge graph',
  'knowledgeGraph.type': 'organisation type',
  'knowledgeGraph.name': 'organisation name',
  'knowledgeGraph.legalName': 'legal name',
  'knowledgeGraph.logoUrl': 'logo address',
  'knowledgeGraph.description': 'organisation description',
  'knowledgeGraph.phone': 'phone number',
  'knowledgeGraph.email': 'e-mail',
  'knowledgeGraph.address': 'address',
  'knowledgeGraph.address.streetAddress': 'street address',
  'knowledgeGraph.address.addressLocality': 'locality',
  'knowledgeGraph.address.addressRegion': 'state',
  'knowledgeGraph.address.postalCode': 'PIN code',
  'knowledgeGraph.address.addressCountry': 'country',
  'knowledgeGraph.geo': 'map position',
  'knowledgeGraph.geo.latitude': 'latitude',
  'knowledgeGraph.geo.longitude': 'longitude',
  'knowledgeGraph.openingHours': 'opening hours',
  'knowledgeGraph.priceRange': 'price range',
  'knowledgeGraph.areaServed': 'areas served',
  'knowledgeGraph.sameAs': 'profiles',

  // Verification
  verification: 'verification tokens',
  ...Object.fromEntries(
    VERIFICATION_FIELDS.map(({ key, label }) => [`verification.${key}`, `${label} token`])
  ),

  // Sitemap
  sitemap: 'sitemap settings',
  'sitemap.enabled': 'sitemaps switch',
  'sitemap.changefreq': 'change frequencies',
  'sitemap.priority': 'priorities',
  'sitemap.excludeUrls': 'excluded URLs',
  ...Object.fromEntries(
    SITEMAP_ENTITIES.flatMap(({ key, include, label }) => {
      const sitemap = `${inSentence(label)} sitemap`;
      return [
        [`sitemap.${include}`, `${sitemap} switch`],
        [`sitemap.changefreq.${key}`, `change frequency of the ${sitemap}`],
        [`sitemap.priority.${key}`, `priority of the ${sitemap}`],
      ];
    })
  ),

  // robots.txt, llms.txt, Breadcrumbs, Custom HTML
  robotsTxt: 'robots.txt document',
  llmsTxt: 'llms.txt document',
  breadcrumbs: 'breadcrumb settings',
  'breadcrumbs.enabled': 'breadcrumbs switch',
  'breadcrumbs.homeLabel': 'label for the home step',
  customHeadHtml: 'custom head HTML',
  customBodyEndHtml: 'custom body HTML',
};

/** The entries of the lists, numbered from 1 as a person counts them. */
const ROW_LABELS = [
  [/^knowledgeGraph\.openingHours\.(\d+)$/, (row) => `opening-hours entry ${row}`],
  [/^knowledgeGraph\.areaServed\.(\d+)$/, (row) => `area served ${row}`],
  [/^knowledgeGraph\.sameAs\.(\d+)$/, (row) => `profile ${row}`],
  [/^sitemap\.excludeUrls\.(\d+)$/, (row) => `excluded URL ${row}`],
];

/**
 * What a sentence calls a key of the SEO settings record — `useForm`'s `labels`.
 *
 * @param {string} key a dotted path, `knowledgeGraph.sameAs.2`
 * @returns {string|undefined}
 */
export function seoSettingsLabel(key) {
  const path = String(key ?? '');
  if (FIELD_LABELS[path]) return FIELD_LABELS[path];
  for (const [pattern, label] of ROW_LABELS) {
    const match = pattern.exec(path);
    if (match) return label(Number(match[1]) + 1);
  }
  return undefined;
}

/**
 * The fields that show one message for a whole list: the opening hours, the
 * areas served, the profiles and the excluded URLs are chips, and a chip has
 * no message of its own. A message about one entry (`knowledgeGraph.sameAs.2`,
 * the schema's or an API's 422) was never shown at all — the save was refused
 * and the list said nothing.
 */
const LIST_FIELDS = [
  'knowledgeGraph.openingHours',
  'knowledgeGraph.areaServed',
  'knowledgeGraph.sameAs',
  'sitemap.excludeUrls',
];

/**
 * The field that shows the message of a key.
 *
 * @param {string} key
 * @returns {string}
 */
export function displayedAt(key) {
  const path = String(key ?? '');
  return LIST_FIELDS.find((list) => path.startsWith(`${list}.`)) ?? path;
}

/**
 * The message a field shows: its own, or — for a list — the first about one of
 * its entries.
 *
 * @param {Record<string, string>} errors the form's flat map
 * @param {string} path
 * @returns {string|undefined}
 */
export function fieldError(errors, path) {
  if (errors?.[path]) return errors[path];
  if (!LIST_FIELDS.includes(path)) return undefined;
  const entry = Object.keys(errors ?? {}).find((key) => displayedAt(key) === path);
  return entry ? errors[entry] : undefined;
}
