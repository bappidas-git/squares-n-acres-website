import headerMenuService from '../../../services/headerMenuService';
import PATHS from '../../../routes/paths';
import useApi from '../../../hooks/useApi';

/**
 * What the three Pages screens share (QA-56): the header's menus, how a
 * page's place in them reads, and how the list's search box reads an address.
 */

/** The admin screen that edits what a built-in page shows (`config/pages.js`). */
export const MANAGED_AT = {
  properties: { label: 'Properties', to: PATHS.adminProperties },
  localities: { label: 'Master data → Localities', to: PATHS.adminLocalities },
  developers: { label: 'Master data → Developers', to: PATHS.adminDevelopers },
  articles: { label: 'Articles', to: PATHS.adminArticles },
  faqs: { label: 'FAQs', to: PATHS.adminFaqs },
};

/**
 * Every header menu, the hidden ones included, left to right.
 *
 * @param {{enabled?: boolean}} [options]
 * @returns {{menus: Array<object>, loading: boolean, error: object|null, refetch: Function}}
 */
export function useHeaderMenus({ enabled = true } = {}) {
  const { data, loading, error, refetch } = useApi(
    (signal) =>
      headerMenuService.adminList({ perPage: 'all', sort: 'order', order: 'asc' }, { signal }),
    [],
    { enabled, initialData: [] }
  );

  return { menus: Array.isArray(data) ? data : [], loading, error, refetch };
}

/**
 * "Company › Who we are" — where a page sits in the header, in the menus'
 * own names. The list printed the three names the old enum knew, so a page
 * placed in any other menu read as its raw key (QA-56).
 *
 * @param {{showInHeader?: boolean, headerMenu?: string|null, headerSubmenu?: string|null}} page
 * @param {Array<object>} menus
 * @returns {string} `''` when the page is not in the header
 */
export function headerPlacementLabel(page, menus) {
  if (!page?.showInHeader || !page.headerMenu) return '';

  const menu = (Array.isArray(menus) ? menus : []).find((entry) => entry.slug === page.headerMenu);
  if (!menu) return page.headerMenu;

  const submenu = (menu.submenus ?? []).find((entry) => entry.slug === page.headerSubmenu);
  const label = submenu ? `${menu.name} › ${submenu.name}` : menu.name;
  return menu.isActive === false ? `${label} (hidden)` : label;
}

/**
 * The search box's text as the API's `q` reads it.
 *
 * The list prints each page's address as `/buyer-assistance/home-loan`, and
 * the box says "Title or URL" — but a search for the address as printed, or as
 * copied from the browser, found nothing: the slug has no leading slash and no
 * origin (QA-56). Both are dropped here, and so is a trailing slash.
 *
 * @param {string} text
 * @returns {string}
 */
export function normaliseSearch(text) {
  const value = String(text ?? '').trim();
  if (!value) return '';

  const withoutOrigin = value.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]+/i, '');
  const addressed = withoutOrigin !== value || value.startsWith('/');
  if (!addressed) return value;

  const trimmed = withoutOrigin.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
  // The site's root is the home page's address (`PATHS.page('home')`).
  return trimmed || 'home';
}
