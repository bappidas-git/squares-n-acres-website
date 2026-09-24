/**
 * The site's navigation, built from data (00_MASTER_CONTEXT.md §6.10, §6.13).
 *
 * The header, the mobile drawer, the bottom bar and the footer all read this
 * module. Before it existed, `Header` and `MobileHeader` each declared the same
 * `navItems` literal and the footer knew nothing about the CMS at all, so a
 * property type an editor added was reachable from neither, and a menu fixed in
 * one file stayed wrong in the other (BUG-20, defect 6).
 *
 * Nothing here is hardcoded content: the header's menus are the `headerMenus`
 * collection (QA-56) — their names, their order, their submenus and the links
 * typed into them — the property types and localities are master data, the
 * pages in each menu and footer column are the published CMS pages that carry
 * `showInHeader` / `showInFooter`, and the call, WhatsApp and CTA buttons are
 * `siteSettings.navigation`. A menu with nothing behind it is not rendered — an
 * empty "Buyer Assistance" dropdown is worse than none (§7).
 *
 * The builders are pure functions of their inputs so the whole navigation can
 * be unit-tested without rendering a header.
 */

import PATHS from '../routes/paths';
import { DEFAULT_HEADER_MENUS } from './headerMenus';
import { NAV } from './copy';
import { CONSTRUCTION_STATUS, FOOTER_COLUMNS, PRICE_BUCKETS_SALE } from './enums';
import { segmentKind } from './segments';
import { formatPrice, formatPhoneForTel, whatsappLink } from '../utils/format';
import { serializeFilters } from '../utils/listingFilters';

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** `/buy?minPrice=5000000&maxPrice=10000000` — the listing's own parameters. */
function filterHref(path, filters) {
  const query = new URLSearchParams(serializeFilters(filters)).toString();
  return query ? `${path}?${query}` : path;
}

/** Active records in the editor's order. */
const active = (records) =>
  (Array.isArray(records) ? records : [])
    .filter((record) => record && record.isActive !== false)
    .slice()
    .sort(
      (left, right) =>
        (left.order ?? 0) - (right.order ?? 0) ||
        String(left.name ?? '').localeCompare(String(right.name ?? ''))
    );

/**
 * The property types of one kind of segment, in order — a type in a segment
 * an editor added of that kind among them (QA-52). Every link built from these
 * is `/buy/:slug`, which lists a type whatever its segment.
 */
const typesOf = (propertyTypes, kind) =>
  active(propertyTypes).filter((type) => segmentKind(type.segment) === kind);

/** One property type by slug, or `null` — a menu never invents a type. */
const typeBySlug = (propertyTypes, slug) =>
  active(propertyTypes).find((type) => type.slug === slug) ?? null;

/** Published pages an editor assigned to one footer column, in `order`. */
const pagesForColumn = (pages, column) =>
  (Array.isArray(pages) ? pages : [])
    .filter((page) => page?.footerColumn === column)
    .slice()
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));

/** A CMS page as a link. */
const pageLink = (page) => ({
  key: `page-${page.slug}`,
  label: page.title,
  to: PATHS.page(page.slug),
});

/**
 * Drops a repeat of a destination already in the list — or already in `seen`,
 * which a caller shares across the columns of one menu.
 */
function dedupe(links, seen = new Set()) {
  return links.filter((link) => {
    if (!link?.to || seen.has(link.to)) return false;
    seen.add(link.to);
    return true;
  });
}

/** A column with no links is not a column. */
const keepFilled = (columns) => columns.filter((column) => column && column.links.length > 0);

/* ------------------------------------------------------------------ *
 * Budget bands
 * ------------------------------------------------------------------ */

/**
 * Where the Buy menu's five budget bands are cut.
 *
 * `PRICE_BUCKETS_SALE` has nine buckets — right for a filter list, too many
 * for a menu — and picking five of them would leave gaps a visitor falls into
 * ("₹60 L? not on this menu"). So the menu merges the nine into five
 * **contiguous** bands at four of the enum's own boundaries; every rupee from
 * zero upwards is behind exactly one link.
 */
export const BUDGET_BOUNDARIES = [5000000, 10000000, 15000000, 25000000];

/** `Up to ₹50 L`, `₹50 L – ₹1 Cr`, `₹2.5 Cr+`. */
export function budgetLabel(min, max) {
  if (!min) return `Up to ${formatPrice(max)}`;
  if (max === null || max === undefined) return `${formatPrice(min)}+`;
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}

/**
 * The five `{ min, max, label }` bands of the Buy menu, folded out of
 * `PRICE_BUCKETS_SALE` at {@link BUDGET_BOUNDARIES}.
 *
 * Folding rather than listing means a boundary the enum stops offering merges
 * two bands instead of opening a hole between them.
 */
export function budgetBands() {
  const cuts = new Set(BUDGET_BOUNDARIES);
  const bands = [];
  let min = PRICE_BUCKETS_SALE[0]?.min ?? 0;

  for (const bucket of PRICE_BUCKETS_SALE) {
    const closes = bucket.max === null || bucket.max === undefined || cuts.has(bucket.max);
    if (!closes) continue;
    const max = bucket.max ?? null;
    bands.push({ min, max, label: budgetLabel(min, max) });
    min = max;
  }

  return bands;
}

/* ------------------------------------------------------------------ *
 * Header
 * ------------------------------------------------------------------ */

/** The Rent menu's picks, in the order it offers them (§4.7 of prompt 27). */
const RENT_TYPE_SLUGS = ['apartments', 'villas', 'independent-houses', 'pg-co-living'];

/** The Commercial menu's picks. */
const COMMERCIAL_TYPE_SLUGS = ['office-spaces', 'retail-shops', 'warehouses', 'co-working-spaces'];

/** The Buy mega-menu's columns: status, type, budget and the localities people ask for. */
function buyColumns({ propertyTypes, localities }) {
  const residential = typesOf(propertyTypes, 'residential');
  const land = typesOf(propertyTypes, 'land');
  const featured = active(localities).filter((locality) => locality.isFeatured);

  return [
    {
      key: 'status',
      title: NAV.byStatus,
      links: CONSTRUCTION_STATUS.entries.map((entry) => ({
        key: `status-${entry.value}`,
        label: entry.label,
        to: PATHS.buyStatus(entry.value),
      })),
    },
    {
      key: 'type',
      title: NAV.byType,
      links: [...residential, ...land].slice(0, 8).map((type) => ({
        key: `type-${type.slug}`,
        label: type.name,
        to: PATHS.buyType(type.slug),
      })),
    },
    {
      key: 'budget',
      title: NAV.byBudget,
      links: budgetBands().map((band) => ({
        key: `budget-${band.min}`,
        label: band.label,
        to: filterHref(PATHS.buy, {
          minPrice: band.min || undefined,
          maxPrice: band.max ?? undefined,
        }),
      })),
    },
    {
      key: 'localities',
      title: NAV.popularLocalities,
      links: featured.slice(0, 8).map((locality) => ({
        key: `locality-${locality.slug}`,
        label: locality.name,
        to: PATHS.locality(locality.slug),
      })),
    },
  ];
}

/** Rent: four residential types plus the commercial lease route. */
function rentColumns({ propertyTypes }) {
  const links = RENT_TYPE_SLUGS.map((slug) => typeBySlug(propertyTypes, slug))
    .filter(Boolean)
    .map((type) => ({ key: `rent-${type.slug}`, label: type.name, to: PATHS.rentType(type.slug) }));

  return [
    {
      key: 'rent',
      title: NAV.rent,
      links: [...links, { key: 'rent-commercial', label: NAV.commercial, to: PATHS.lease }],
    },
  ];
}

/** Commercial: four commercial types plus lease. */
function commercialColumns({ propertyTypes }) {
  const links = COMMERCIAL_TYPE_SLUGS.map((slug) => typeBySlug(propertyTypes, slug))
    .filter(Boolean)
    .map((type) => ({
      key: `commercial-${type.slug}`,
      label: type.name,
      to: PATHS.commercialType(type.slug),
    }));

  return [
    {
      key: 'commercial',
      title: NAV.commercial,
      links: [...links, { key: 'commercial-lease', label: NAV.lease, to: PATHS.lease }],
    },
  ];
}

/**
 * The menus the site generates, by `source` (`config/headerMenus.js`): the
 * columns master data gives each one, and where its label goes when the
 * editor has not said.
 */
const GENERATED_MENUS = {
  buy: { columns: buyColumns, to: PATHS.buy },
  rent: { columns: rentColumns, to: PATHS.rent },
  commercial: { columns: commercialColumns, to: PATHS.commercial },
};

/** Records in their `order`, ties by name. */
const byOrder = (left, right) =>
  (left?.order ?? 0) - (right?.order ?? 0) ||
  String(left?.name ?? left?.title ?? '').localeCompare(String(right?.name ?? right?.title ?? ''));

/** A link an editor typed into a menu, as a nav link. */
const typedLink = (menu, link, index) => ({
  key: `${menu.slug}-link-${index}`,
  label: link.label,
  to: link.href,
  newTab: Boolean(link.newTab),
});

/**
 * The links of one group of a menu — its own list (`submenu === null`) or one
 * submenu: the pages placed there, in their order, then the links typed there,
 * in theirs. A page or a link naming a submenu the menu no longer has is shown
 * in the menu's own list rather than lost.
 */
function groupLinks(menu, pages, submenu, known) {
  const groupOf = (value) => (value && known.has(value) ? value : null);

  const placed = (Array.isArray(pages) ? pages : [])
    .filter((page) => page?.headerMenu === menu.slug && groupOf(page.headerSubmenu) === submenu)
    .slice()
    .sort(byOrder)
    .map(pageLink);

  const typed = (Array.isArray(menu.links) ? menu.links : [])
    .map((link, index) => ({ link, index }))
    .filter(({ link }) => link?.label && link?.href && groupOf(link.submenu) === submenu)
    .sort(
      (left, right) => (left.link.order ?? 0) - (right.link.order ?? 0) || left.index - right.index
    )
    .map(({ link, index }) => typedLink(menu, link, index));

  return [...placed, ...typed];
}

/**
 * One menu of the bar, from its record.
 *
 * A generated menu keeps its own columns and takes the pages and links an
 * editor put in it on top — its own list under "More", each submenu under its
 * name. A menu of pages and links is its own list under its name, then its
 * submenus. With nothing in its panel a menu is a plain link when it has
 * somewhere to go, and is left out when it has not (§7).
 *
 * @param {object} menu a `headerMenus` record
 * @param {{propertyTypes: Array<object>, localities: Array<object>, pages: Array<object>}} input
 * @returns {{key: string, label: string, to: string, columns?: Array<object>}|null}
 */
function buildMenu(menu, input) {
  const generated = GENERATED_MENUS[menu.source] ?? null;
  const submenus = (Array.isArray(menu.submenus) ? menu.submenus : []).filter(
    (entry) => entry?.slug && entry?.name
  );
  const known = new Set(submenus.map((entry) => entry.slug));
  const seen = new Set();

  const columns = keepFilled(
    [
      ...(generated ? generated.columns(input) : []),
      {
        key: `${menu.slug}-own`,
        title: generated ? NAV.more : menu.name,
        links: groupLinks(menu, input.pages, null, known),
      },
      ...submenus.map((entry) => ({
        key: `${menu.slug}-${entry.slug}`,
        title: entry.name,
        links: groupLinks(menu, input.pages, entry.slug, known),
      })),
    ].map((column) => ({ ...column, links: dedupe(column.links, seen) }))
  );

  const to = menu.href || generated?.to || columns[0]?.links[0]?.to || null;
  if (!to) return null;

  const base = { key: menu.slug, label: menu.name, to };
  return columns.length > 0 ? { ...base, columns } : base;
}

/**
 * The header menus, left to right.
 *
 * @param {object} input
 * @param {Array<object>|null} [input.menus] `GET /header-menus`; the shipped
 *   menus (`config/headerMenus.js`) when the list is not there to read
 * @param {Array<object>} [input.propertyTypes] master data (§6.3)
 * @param {Array<object>} [input.localities] master data (§6.2)
 * @param {Array<object>} [input.pages] `GET /pages?showInHeader=true`
 * @returns {Array<{key: string, label: string, to: string, columns?: Array<object>}>}
 */
export function buildHeaderMenus({
  menus = null,
  propertyTypes = [],
  localities = [],
  pages = [],
} = {}) {
  const records = Array.isArray(menus) ? menus : DEFAULT_HEADER_MENUS;
  const input = { propertyTypes, localities, pages };

  return records
    .filter((menu) => menu?.slug && menu?.name && menu.isActive !== false)
    .slice()
    .sort(byOrder)
    .map((menu) => buildMenu(menu, input))
    .filter(Boolean);
}

/**
 * How many top-level menus a laptop-width header shows before the rest fold
 * into "More".
 *
 * Ten labels plus a logo plus the action buttons need about 1200 px. Below
 * that they do not shrink, they overlap — so between 900 px and 1199 px the
 * tail of the list moves into one more panel rather than off the edge of the
 * screen.
 */
export const MENU_LIMIT_MD = 5;

/**
 * Folds everything past `limit` into a trailing "More" mega-menu.
 *
 * Each folded menu becomes a column of the panel — its own label as the column
 * heading and its own links under it — so nothing is lost and nothing moves to
 * a second row.
 *
 * @param {Array<object>} menus
 * @param {number} limit
 * @returns {Array<object>}
 */
export function collapseMenus(menus = [], limit = MENU_LIMIT_MD) {
  if (!Array.isArray(menus) || menus.length <= limit + 1) return menus ?? [];

  const kept = menus.slice(0, limit);
  const folded = menus.slice(limit);

  return [
    ...kept,
    {
      key: 'more',
      label: NAV.more,
      to: folded[0].to,
      columns: folded.map((menu) => ({
        key: menu.key,
        title: menu.label,
        links: menu.columns?.flatMap((column) => column.links) ?? [
          { key: `more-${menu.key}`, label: menu.label, to: menu.to },
        ],
      })),
    },
  ];
}

/**
 * The buttons on the right of the header, from `siteSettings.navigation`
 * (§6.13) and `general` (D82).
 *
 * `kind` says what a host does with each: `tel`/`whatsapp` are links, `lead`
 * opens the post-requirement modal.
 *
 * @param {object} input
 * @param {object|null} [input.settings] the public settings object
 * @returns {Array<{key: string, kind: string, label: string, href?: string, icon: string}>}
 */
export function buildHeaderActions({ settings } = {}) {
  const navigation = settings?.navigation ?? {};
  const general = settings?.general ?? {};
  const actions = [];

  if (navigation.showCallButton !== false && general.contactPhone) {
    actions.push({
      key: 'call',
      kind: 'tel',
      label: general.contactPhone,
      title: `${NAV.call} ${general.contactPhone}`,
      href: `tel:${formatPhoneForTel(general.contactPhone)}`,
      icon: 'mdi:phone-outline',
    });
  }

  if (navigation.showWhatsappButton !== false && general.whatsappNumber) {
    actions.push({
      key: 'whatsapp',
      kind: 'whatsapp',
      label: NAV.whatsapp,
      title: NAV.whatsapp,
      href: whatsappLink(general.whatsappNumber, general.whatsappDefaultMessage),
      icon: 'mdi:whatsapp',
    });
  }

  actions.push({
    key: 'cta',
    kind: 'lead',
    label: navigation.headerCtaLabel || NAV.postRequirement,
    title: navigation.headerCtaLabel || NAV.postRequirement,
    icon: 'mdi:clipboard-text-outline',
  });

  return actions;
}

/**
 * The whole header: its menus and its right-hand buttons.
 *
 * @param {{menus?: Array<object>|null, propertyTypes?: Array<object>,
 *   localities?: Array<object>, pages?: Array<object>, settings?: object|null}} input
 * @returns {{menus: Array<object>, actions: Array<object>}}
 */
export function buildHeaderNav({ menus, propertyTypes, localities, pages, settings } = {}) {
  return {
    menus: buildHeaderMenus({ menus, propertyTypes, localities, pages }),
    actions: buildHeaderActions({ settings }),
  };
}

/* ------------------------------------------------------------------ *
 * Footer
 * ------------------------------------------------------------------ */

/** The slugs of the legal line under the copyright, in the order it shows them. */
export const LEGAL_SLUGS = ['privacy-policy', 'terms-of-use', 'disclaimer'];

/**
 * How many link columns the footer draws before it stops adding the generated
 * ones.
 *
 * §6 of prompt 27 asks for four or five. An editor's own columns and the
 * columns pages were placed in always show — they are decisions somebody made,
 * and the Pages screen says the page is in the footer — and the generated
 * ones (Buy by type, Popular localities) fill whatever room is left.
 */
export const FOOTER_COLUMN_LIMIT = 5;

/** An editor's `settings.footer.columns[]` entry as a nav column. */
const settingsColumn = (column, index) => ({
  key: `settings-${index}`,
  title: column.title,
  links: (Array.isArray(column.links) ? column.links : [])
    .filter((link) => link?.label && link?.href)
    .map((link, position) => ({
      key: `settings-${index}-${position}`,
      label: link.label,
      to: link.href,
      external: Boolean(link.external) || /^https?:\/\//i.test(link.href),
    })),
});

/** Titles compare without case or surrounding space: "Services" is "services ". */
const sameTitle = (left, right) =>
  String(left ?? '')
    .trim()
    .toLowerCase() ===
  String(right ?? '')
    .trim()
    .toLowerCase();

/**
 * The footer's link columns: what settings says, the pages placed in the
 * footer, then what the data already knows.
 *
 * Every page placed in a footer column is shown in it (QA-56). The pages of
 * the "Company" column used to fall off the end of a full row, and "Services"
 * and "Insights" were never drawn at all, so the Pages screen listed pages "in
 * the footer" that no visitor could find. A column an editor wrote in settings
 * under the same title takes the pages in rather than being repeated; the
 * legal texts have the line under the copyright and are not listed twice.
 *
 * @param {object} input
 * @param {Array<object>} [input.propertyTypes]
 * @param {Array<object>} [input.localities]
 * @param {Array<object>} [input.pages] `GET /pages?showInFooter=true`
 * @param {object|null} [input.settings]
 * @returns {Array<{key: string, title: string, links: Array<object>}>}
 */
export function buildFooterColumns({
  propertyTypes = [],
  localities = [],
  pages = [],
  settings = null,
} = {}) {
  const fromSettings = (Array.isArray(settings?.footer?.columns) ? settings.footer.columns : [])
    .filter((column) => column?.title)
    .map(settingsColumn);

  const listed = (Array.isArray(pages) ? pages : []).filter(
    (page) => !LEGAL_SLUGS.includes(page?.slug)
  );

  const ownColumns = [];
  for (const { value, label } of FOOTER_COLUMNS.entries) {
    const links = pagesForColumn(listed, value).map((page) => ({
      ...pageLink(page),
      key: `footer-page-${page.slug}`,
    }));
    if (links.length === 0) continue;

    const host = fromSettings.find((column) => sameTitle(column.title, label));
    if (host) host.links = dedupe([...host.links, ...links]);
    else ownColumns.push({ key: `pages-${value}`, title: label, links });
  }

  const generated = [
    {
      key: 'buy-by-type',
      title: 'Buy by type',
      links: typesOf(propertyTypes, 'residential')
        .slice(0, 6)
        .map((type) => ({
          key: `footer-type-${type.slug}`,
          label: type.name,
          to: PATHS.buyType(type.slug),
        })),
    },
    {
      key: 'popular-localities',
      title: NAV.popularLocalities,
      links: active(localities)
        .filter((locality) => locality.isFeatured)
        .slice(0, 8)
        .map((locality) => ({
          key: `footer-locality-${locality.slug}`,
          label: locality.name,
          to: PATHS.locality(locality.slug),
        })),
    },
  ];

  const chosen = keepFilled([...fromSettings, ...ownColumns]);
  const room = Math.max(0, FOOTER_COLUMN_LIMIT - chosen.length);
  return [...chosen, ...keepFilled(generated).slice(0, room)];
}

/**
 * The "Privacy · Terms · Disclaimer" line, from the pages that actually exist.
 *
 * A legal page an editor has not published yet is simply not linked, rather
 * than being a dead link in every footer of the site.
 *
 * @param {Array<object>} pages `GET /pages?showInFooter=true`
 * @returns {Array<{key: string, label: string, to: string}>}
 */
export function buildLegalLinks(pages = []) {
  const bySlug = new Map((Array.isArray(pages) ? pages : []).map((page) => [page.slug, page]));
  return LEGAL_SLUGS.map((slug) => bySlug.get(slug))
    .filter(Boolean)
    .map(pageLink);
}

/* ------------------------------------------------------------------ *
 * Bottom navigation
 * ------------------------------------------------------------------ */

/**
 * The five items of the phone's bottom bar.
 *
 * `kind` tells `BottomNav` what each one is: a `link`, the `shortlist` link
 * that carries a badge, the `lead` button that opens the enquiry modal, and
 * the `menu` button that opens the drawer.
 *
 * @returns {Array<{key: string, label: string, icon: string, activeIcon: string,
 *   kind: string, to?: string, match?: string}>}
 */
export function buildBottomNav() {
  return [
    {
      key: 'home',
      kind: 'link',
      label: NAV.home,
      to: PATHS.home,
      exact: true,
      icon: 'mdi:home-outline',
      activeIcon: 'mdi:home',
    },
    {
      key: 'search',
      kind: 'link',
      label: NAV.search,
      // On a phone "Search" means "narrow this down", so it lands on the
      // listing with the filter sheet already open (prompt 26).
      to: `${PATHS.properties}?filters=open`,
      match: PATHS.properties,
      icon: 'mdi:magnify',
      activeIcon: 'mdi:magnify',
    },
    {
      key: 'shortlist',
      kind: 'shortlist',
      label: NAV.shortlist,
      to: PATHS.shortlist,
      icon: 'mdi:heart-outline',
      activeIcon: 'mdi:heart',
    },
    {
      key: 'enquire',
      kind: 'lead',
      label: NAV.enquire,
      icon: 'mdi:message-text-outline',
      activeIcon: 'mdi:message-text',
    },
    {
      key: 'menu',
      kind: 'menu',
      label: NAV.menu,
      icon: 'mdi:menu',
      activeIcon: 'mdi:menu',
    },
  ];
}

const navigation = {
  buildHeaderNav,
  collapseMenus,
  buildHeaderMenus,
  buildHeaderActions,
  buildFooterColumns,
  buildLegalLinks,
  buildBottomNav,
  budgetBands,
  budgetLabel,
};

export default navigation;
