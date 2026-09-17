import { createContext, useContext } from 'react';

/**
 * What a tab and a part of the SEO panel are given.
 *
 * The panel has four tabs and about fifteen parts, and every one of them needs
 * the same six things: the record, its `seo` branch, the writer, the analysis,
 * the settings and the master data the templates resolve against. Threading
 * that through fifteen components as props would be fifteen chances to pass a
 * stale one, so it goes through a context exactly like the property form's own
 * (`PropertyFormContext`), and a part reads what it needs.
 *
 * @typedef {object} SeoPanelApi
 * @property {string} entityType one of `SEO_ENTITY_TYPES`
 * @property {object} entity the record, as the host form holds it
 * @property {object} seo the §9.6 branch, with every field present
 * @property {(patch: object) => void} setSeo merges a patch into `seo`
 * @property {(path: string, value: unknown) => void} setField one dotted path
 *   inside `seo` (`og.title`, `robots.maxSnippet`)
 * @property {object} analysis `{ score, band, testsPassed, testsTotal, groups }`
 * @property {boolean} analysing true while the first analysis is still pending
 * @property {() => void} reanalyse runs the analysis now, skipping the debounce
 * @property {object} resolved `resolveSeoOutput` for this record
 * @property {object} seoSettings `GET /seo/settings`
 * @property {string} siteUrl
 * @property {object} context the master data + site index `analyze` reads
 * @property {Record<string, string>} errors dotted paths, host-form keyspace
 *   (`seo.schema.custom`)
 * @property {(path: string) => void} focusField asks the host to open and focus
 *   a field — `seo.*` stays in the panel, anything else is the host's own
 * @property {(slug: string) => void} [setSlug] D34: the panel edits the entity's
 *   slug, not a copy of it
 * @property {Function} [checkSlug] the host's availability check
 * @property {number|string|null} [excludeId]
 * @property {string} slugBase the path the slug hangs off, e.g. `/properties/`
 * @property {boolean} disabled
 * @property {'full'|'compact'} variant
 */

const SeoPanelContext = createContext(null);

export const SeoPanelProvider = SeoPanelContext.Provider;

/**
 * The panel API, from inside a tab or a part.
 *
 * @returns {SeoPanelApi}
 */
export function useSeoPanel() {
  const value = useContext(SeoPanelContext);
  if (!value) throw new Error('useSeoPanel must be used inside <SeoPanel>.');
  return value;
}

export default SeoPanelContext;
