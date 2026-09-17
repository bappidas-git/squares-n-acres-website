/**
 * The trail above the result (§9.3), from the same array the `<Breadcrumbs>`
 * component draws — one source, so the crumb a visitor sees and the crumb
 * Google reads can never disagree.
 */

import { absolute, compact } from './graph';

/**
 * @param {{items?: Array<{name: string, url?: string}>, canonical?: string}} input
 * @param {{siteUrl?: string, seoSettings?: object}} [context]
 * @returns {object|null} a `BreadcrumbList` node, or `null` when there is no trail
 */
export function breadcrumbNode(input = {}, context = {}) {
  const items = (Array.isArray(input.items) ? input.items : []).filter((item) => item?.name);
  if (!items.length) return null;

  const siteUrl = String(context.siteUrl ?? context.seoSettings?.siteUrl ?? '').replace(/\/+$/, '');
  const canonical = input.canonical ?? '';

  return compact({
    '@type': 'BreadcrumbList',
    '@id': canonical ? `${canonical}#breadcrumb` : undefined,
    itemListElement: items.map((item, index) =>
      compact({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: absolute(siteUrl, item.url),
      })
    ),
  });
}

export default breadcrumbNode;
