/**
 * What a listing, a locality or a builder page is a list of (§9.3).
 *
 * One `ItemList` of the results actually on the page, in the order they are on
 * it — a list that claims more than the page shows is the kind of mismatch a
 * manual action is written for.
 */

import { absolute, compact } from './graph';

/**
 * @param {{items?: Array<{name?: string, title?: string, url?: string}>, canonical?: string,
 *   name?: string, startFrom?: number}} input
 * @param {{siteUrl?: string, seoSettings?: object}} [context]
 * @returns {object|null}
 */
export function itemListNode(input = {}, context = {}) {
  const items = (Array.isArray(input.items) ? input.items : []).filter(Boolean);
  if (!items.length) return null;

  const siteUrl = String(context.siteUrl ?? context.seoSettings?.siteUrl ?? '').replace(/\/+$/, '');
  const canonical = input.canonical ?? '';
  const startFrom = Number(input.startFrom) || 1;

  return compact({
    '@type': 'ItemList',
    '@id': canonical ? `${canonical}#itemlist` : undefined,
    name: input.name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) =>
      compact({
        '@type': 'ListItem',
        position: startFrom + index,
        name: item.name ?? item.title,
        url: absolute(siteUrl, item.url),
      })
    ),
  });
}

export default itemListNode;
