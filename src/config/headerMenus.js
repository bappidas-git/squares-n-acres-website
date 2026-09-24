/**
 * The header's menus as the site ships them (`docs/DECISIONS.md`, QA-56).
 *
 * The menus are the `headerMenus` collection: an editor renames, reorders,
 * hides and adds them in Admin → Pages → Header menu, and a page joins one by
 * naming its slug. This list is what the seed writes and what the header falls
 * back to when the collection cannot be read — the bar a visitor saw before
 * the menus were data, so an unreachable API costs the editor's changes and
 * nothing else.
 *
 * `buy`, `rent` and `commercial` are **generated**: their panels are built
 * from master data (`config/navigation.js`), they come with the site and are
 * never deleted. Every other menu is made of the pages placed in it and the
 * links typed into it.
 *
 * CommonJS (D36b): the seed builder and the mock server `require` it.
 */

const { NAV } = require('./copy');

/** The sources whose panel the site generates. */
const GENERATED_MENU_SOURCES = ['buy', 'rent', 'commercial'];

/** Whether a menu's panel is generated from master data. */
const isGeneratedMenu = (menu) => GENERATED_MENU_SOURCES.includes(menu?.source);

/** `[slug, name, href, source]`, left to right. */
const DEFAULTS = [
  ['buy', NAV.buy, '/buy', 'buy'],
  ['rent', NAV.rent, '/rent', 'rent'],
  ['commercial', NAV.commercial, '/commercial', 'commercial'],
  ['plots', NAV.plots, '/plots', 'custom'],
  ['localities', NAV.localities, '/localities', 'custom'],
  ['builders', NAV.builders, '/builders', 'custom'],
  // No address: the label opens the first page of the menu, as it always has.
  ['buyer-assistance', NAV.buyerAssistance, null, 'custom'],
  ['insights', NAV.insights, '/insights/articles', 'custom'],
  ['company', NAV.company, null, 'custom'],
  ['contact', NAV.contact, '/contact', 'custom'],
];

/** The shipped menus, as records. */
const DEFAULT_HEADER_MENUS = DEFAULTS.map(([slug, name, href, source], index) => ({
  slug,
  name,
  href,
  source,
  submenus: [],
  links: [],
  isActive: true,
  order: index + 1,
}));

module.exports = { GENERATED_MENU_SOURCES, DEFAULT_HEADER_MENUS, isGeneratedMenu };
