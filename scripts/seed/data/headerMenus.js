/**
 * `headerMenus` — the header's menus, left to right (`docs/DECISIONS.md`, QA-56).
 *
 * The ten of `src/config/headerMenus.js` reproduce the header exactly as
 * `src/config/navigation.js` used to spell it out: the three mega menus the
 * site generates (Buy, Rent, Commercial), three plain links (Plots,
 * Localities, Builders), the three menus built from the pages placed in them
 * (Buyer assistance, Insights, Company) and Contact. Every one of them is a
 * record an editor can rename, reorder, hide and give submenus and links, and
 * — the seven that are not generated — delete; a page joins one by naming its
 * slug in `headerMenu`.
 *
 * The slugs of the three page menus are the three values the old enum had, so
 * no page's `headerMenu` changed when the enum became this collection.
 */

const { DEFAULT_HEADER_MENUS } = require('../../../src/config/headerMenus');

module.exports = function headerMenus({ stamps }) {
  return DEFAULT_HEADER_MENUS.map((menu, index) => ({
    id: index + 1,
    name: menu.name,
    slug: menu.slug,
    href: menu.href,
    source: menu.source,
    submenus: [],
    links: [],
    isActive: true,
    order: menu.order,
    ...stamps({ createdDaysAgo: 150 }),
  }));
};
