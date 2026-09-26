/**
 * The navigation builders: what the header, the footer and the bottom bar are
 * made of, without rendering any of them.
 */

import {
  BUDGET_BOUNDARIES,
  budgetBands,
  buildBottomNav,
  collapseMenus,
  buildFooterColumns,
  buildHeaderActions,
  buildHeaderMenus,
  buildHeaderNav,
  buildLegalLinks,
  FOOTER_COLUMN_LIMIT,
  headerCta,
} from '../navigation';
import { NAV } from '../copy';
import { PRICE_BUCKETS_SALE } from '../enums';
import { setKnownSegments } from '../segments';

const propertyTypes = [
  { id: 1, name: 'Apartments', slug: 'apartments', segment: 'residential', order: 1 },
  { id: 2, name: 'Villas', slug: 'villas', segment: 'residential', order: 2 },
  {
    id: 3,
    name: 'Independent Houses',
    slug: 'independent-houses',
    segment: 'residential',
    order: 3,
  },
  { id: 4, name: 'PG / Co-living', slug: 'pg-co-living', segment: 'residential', order: 4 },
  { id: 9, name: 'Residential Plots', slug: 'residential-plots', segment: 'land', order: 9 },
  { id: 11, name: 'Office Spaces', slug: 'office-spaces', segment: 'commercial', order: 11 },
  { id: 13, name: 'Retail Shops', slug: 'retail-shops', segment: 'commercial', order: 13 },
  { id: 14, name: 'Warehouses', slug: 'warehouses', segment: 'commercial', order: 14 },
  {
    id: 12,
    name: 'Co-working Spaces',
    slug: 'co-working-spaces',
    segment: 'commercial',
    order: 12,
  },
  {
    id: 99,
    name: 'Retired Type',
    slug: 'retired',
    segment: 'residential',
    order: 99,
    isActive: false,
  },
];

const localities = [
  { id: 1, name: 'Whitefield', slug: 'whitefield', isFeatured: true, order: 1 },
  { id: 2, name: 'Hebbal', slug: 'hebbal', isFeatured: true, order: 2 },
  { id: 3, name: 'Jayanagar', slug: 'jayanagar', isFeatured: false, order: 3 },
];

const pages = [
  { slug: 'about', title: 'About Us', headerMenu: 'company', footerColumn: 'company', order: 2 },
  {
    slug: 'buyer-assistance/home-loan',
    title: 'Home Loan Assistance',
    headerMenu: 'buyer-assistance',
    footerColumn: 'services',
    order: 7,
  },
  // Two built-in pages (QA-56): the Insights menu's first two entries are
  // pages placed in it now, not links spelled out in code.
  {
    slug: 'insights/articles',
    title: 'Articles',
    headerMenu: 'insights',
    footerColumn: 'insights',
    order: 10,
  },
  {
    slug: 'insights/faqs',
    title: 'FAQs',
    headerMenu: 'insights',
    footerColumn: 'insights',
    order: 11,
  },
  {
    slug: 'insights/real-estate-awareness',
    title: 'Real Estate Awareness',
    headerMenu: 'insights',
    footerColumn: 'insights',
    order: 12,
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    headerMenu: null,
    footerColumn: 'company',
    order: 13,
  },
  {
    slug: 'disclaimer',
    title: 'Disclaimer',
    headerMenu: null,
    footerColumn: 'company',
    order: 15,
  },
];

const settings = {
  general: {
    contactPhone: '+91 98450 00000',
    whatsappNumber: '919845000000',
    whatsappDefaultMessage: 'Hello',
  },
  navigation: {
    headerCtaLabel: 'Post Requirement',
    showCallButton: true,
    showWhatsappButton: true,
  },
  footer: {
    columns: [
      { title: 'Buy', links: [{ label: 'Ready to move', href: '/buy/ready-to-move' }] },
      {
        title: 'Services',
        links: [{ label: 'Our brochure', href: 'https://example.com/x.pdf', external: true }],
      },
    ],
  },
};

const menuByKey = (menus, key) => menus.find((menu) => menu.key === key);
const columnByKey = (menu, key) => menu.columns.find((column) => column.key === key);
const hrefs = (links) => links.map((link) => link.to);

describe('budget bands', () => {
  it('cuts the sale buckets into five contiguous bands', () => {
    const bands = budgetBands();

    expect(bands).toHaveLength(BUDGET_BOUNDARIES.length + 1);
    expect(bands[0]).toMatchObject({ min: 0, max: 5000000, label: 'Up to ₹50 L' });
    expect(bands.at(-1)).toMatchObject({ min: 25000000, max: null, label: '₹2.5 Cr+' });
  });

  it('leaves no gap between one band and the next', () => {
    const bands = budgetBands();
    bands.slice(1).forEach((band, index) => {
      expect(band.min).toBe(bands[index].max);
    });
  });

  it('cuts only where the enum has a boundary', () => {
    const edges = new Set(PRICE_BUCKETS_SALE.map((bucket) => bucket.max));
    BUDGET_BOUNDARIES.forEach((boundary) => expect(edges.has(boundary)).toBe(true));
  });
});

describe('buildHeaderMenus', () => {
  const menus = buildHeaderMenus({ propertyTypes, localities, pages });

  it('offers the ten menus in order', () => {
    expect(menus.map((menu) => menu.key)).toEqual([
      'buy',
      'rent',
      'commercial',
      'plots',
      'localities',
      'builders',
      'buyer-assistance',
      'insights',
      'company',
      'contact',
    ]);
  });

  it('builds the Buy mega-menu from status, type, budget and locality', () => {
    const buy = menuByKey(menus, 'buy');

    expect(buy.to).toBe('/buy');
    expect(buy.columns.map((column) => column.key)).toEqual([
      'status',
      'type',
      'budget',
      'localities',
    ]);
    expect(hrefs(columnByKey(buy, 'status').links)).toContain('/buy/ready-to-move');
    expect(hrefs(columnByKey(buy, 'type').links)).toEqual(
      expect.arrayContaining(['/buy/apartments', '/buy/residential-plots'])
    );
    expect(hrefs(columnByKey(buy, 'budget').links)[1]).toBe(
      '/buy?minPrice=5000000&maxPrice=10000000'
    );
    // The open-ended band carries no `maxPrice` at all.
    expect(hrefs(columnByKey(buy, 'budget').links).at(-1)).toBe('/buy?minPrice=25000000');
  });

  it('keeps an inactive property type out of every menu', () => {
    const buy = menuByKey(menus, 'buy');
    expect(hrefs(columnByKey(buy, 'type').links)).not.toContain('/buy/retired');
  });

  it('files a type by its segment’s kind, so an added segment’s types reach the menus (QA-52)', () => {
    setKnownSegments([
      { slug: 'luxury', name: 'Luxury Homes', kind: 'residential' },
      { slug: 'industrial', name: 'Industrial', kind: 'commercial' },
    ]);
    try {
      const withAdded = buildHeaderMenus({
        propertyTypes: [
          { id: 20, name: 'Mansions', slug: 'mansions', segment: 'luxury', order: 0 },
          { id: 21, name: 'Sheds', slug: 'sheds', segment: 'industrial', order: 0 },
        ],
        localities,
        pages,
      });
      const typeLinks = hrefs(columnByKey(menuByKey(withAdded, 'buy'), 'type').links);
      expect(typeLinks).toContain('/buy/mansions');
      expect(typeLinks).not.toContain('/buy/sheds');
    } finally {
      setKnownSegments([]);
    }
  });

  it('offers only featured localities, in order', () => {
    const buy = menuByKey(menus, 'buy');
    expect(hrefs(columnByKey(buy, 'localities').links)).toEqual([
      '/localities/whitefield',
      '/localities/hebbal',
    ]);
  });

  it('sends Rent to the rent routes and its commercial entry to lease', () => {
    const rent = menuByKey(menus, 'rent');
    expect(hrefs(rent.columns[0].links)).toEqual([
      '/rent/apartments',
      '/rent/villas',
      '/rent/independent-houses',
      '/rent/pg-co-living',
      '/lease',
    ]);
  });

  it('sends Commercial to the commercial routes plus lease', () => {
    const commercial = menuByKey(menus, 'commercial');
    expect(hrefs(commercial.columns[0].links)).toEqual([
      '/commercial/office-spaces',
      '/commercial/retail-shops',
      '/commercial/warehouses',
      '/commercial/co-working-spaces',
      '/lease',
    ]);
  });

  it('builds the page menus from the CMS and encodes a nested slug as a path', () => {
    expect(hrefs(menuByKey(menus, 'buyer-assistance').columns[0].links)).toEqual([
      '/buyer-assistance/home-loan',
    ]);
    expect(hrefs(menuByKey(menus, 'company').columns[0].links)).toEqual(['/about']);
  });

  it('builds Insights from the pages placed in it, the built-in ones among them (QA-56)', () => {
    const insights = menuByKey(menus, 'insights');
    const placed = insights.columns[0].links.filter((link) => !link.overview);

    expect(hrefs(placed)).toEqual([
      '/insights/articles',
      '/insights/faqs',
      '/insights/real-estate-awareness',
    ]);
    // The label goes to the articles, as it always has.
    expect(insights.to).toBe('/insights/articles');
  });

  it('lists Insights itself first in its panel, since its label is a link too (QA-57)', () => {
    const [first, ...rest] = menuByKey(menus, 'insights').columns[0].links;

    expect(first).toMatchObject({ label: 'Insights', to: '/insights/articles', overview: true });
    // The Articles page stays: it is the same address, but another entry.
    expect(rest.map((link) => link.label)).toEqual(['Articles', 'FAQs', 'Real Estate Awareness']);
  });

  it('adds no such entry where the label is no address of its own, nor to a generated menu', () => {
    for (const key of ['buyer-assistance', 'company', 'buy', 'rent', 'commercial']) {
      const links = menuByKey(menus, key).columns.flatMap((column) => column.links);
      expect(links.filter((link) => link.overview)).toEqual([]);
    }
    // A menu that is only a link has no panel to add it to.
    expect(menuByKey(menus, 'contact').columns).toBeUndefined();
  });

  it('drops a menu no page belongs to (§7)', () => {
    const withoutPages = buildHeaderMenus({ propertyTypes, localities, pages: [] });
    const keys = withoutPages.map((menu) => menu.key);

    expect(keys).not.toContain('buyer-assistance');
    expect(keys).not.toContain('company');
    // Insights owns three destinations of its own, so it survives.
    expect(keys).toContain('insights');
  });

  it('builds without master data rather than throwing', () => {
    const bare = buildHeaderMenus();
    expect(menuByKey(bare, 'buy').columns.map((column) => column.key)).toEqual([
      'status',
      'budget',
    ]);
    expect(menuByKey(bare, 'rent').columns[0].links).toHaveLength(1);
  });
});

describe('collapseMenus', () => {
  const menus = buildHeaderMenus({ propertyTypes, localities, pages });

  it('keeps the first five and folds the rest into More', () => {
    const folded = collapseMenus(menus);

    expect(folded).toHaveLength(6);
    expect(folded.slice(0, 5)).toEqual(menus.slice(0, 5));
    expect(folded[5]).toMatchObject({ key: 'more', label: 'More' });
  });

  it('loses nothing: every folded menu becomes a column of the panel', () => {
    const more = collapseMenus(menus)[5];

    expect(more.columns.map((column) => column.title)).toEqual([
      'Builders',
      'Buyer assistance',
      'Insights',
      'Company',
      'Contact',
    ]);
    // A menu with no panel of its own contributes its own destination.
    expect(hrefs(more.columns.at(-1).links)).toEqual(['/contact']);
    expect(hrefs(more.columns[0].links)).toEqual(['/builders']);
    // The column heading is not a link, so a folded Insights still opens with its own page.
    expect(more.columns[2].links[0]).toMatchObject({ label: 'Insights', overview: true });
  });

  it('leaves a list that already fits alone', () => {
    expect(collapseMenus(menus.slice(0, 6))).toHaveLength(6);
    expect(collapseMenus([])).toEqual([]);
    expect(collapseMenus()).toEqual([]);
  });
});

describe('buildHeaderMenus from the headerMenus collection (QA-56)', () => {
  const record = (slug, name, extra = {}) => ({
    slug,
    name,
    href: null,
    source: 'custom',
    submenus: [],
    links: [],
    isActive: true,
    order: 1,
    ...extra,
  });

  it('draws the shipped header when the collection is not there to read', () => {
    expect(
      buildHeaderMenus({ menus: null, propertyTypes, localities, pages }).map((menu) => menu.key)
    ).toEqual([
      'buy',
      'rent',
      'commercial',
      'plots',
      'localities',
      'builders',
      'buyer-assistance',
      'insights',
      'company',
      'contact',
    ]);
  });

  it('draws the menus an editor keeps, by their order, under their names, and skips a hidden one', () => {
    const menus = buildHeaderMenus({
      menus: [
        record('contact', 'Talk to us', { href: '/contact', order: 1 }),
        record('buy', 'Buy a home', { source: 'buy', href: '/buy', order: 2 }),
        record('plots', 'Plots', { href: '/plots', order: 3, isActive: false }),
      ],
      propertyTypes,
      localities,
      pages,
    });

    expect(menus.map((menu) => [menu.key, menu.label])).toEqual([
      ['contact', 'Talk to us'],
      ['buy', 'Buy a home'],
    ]);
    // A menu with nothing in its panel is a plain link.
    expect(menus[0]).toEqual({ key: 'contact', label: 'Talk to us', to: '/contact' });
    // A generated menu keeps its own columns.
    expect(menus[1].columns.map((column) => column.key)).toEqual([
      'status',
      'type',
      'budget',
      'localities',
    ]);
  });

  it('builds a new menu from the pages and links placed in it, submenu by submenu', () => {
    const menu = record('resources', 'Resources', {
      submenus: [
        { slug: 'guides', name: 'Guides' },
        { slug: 'tools', name: 'Tools' },
      ],
      links: [
        {
          label: 'EMI calculator',
          href: '/buyer-assistance/home-loan#emi',
          submenu: 'tools',
          order: 1,
        },
        {
          label: 'RERA portal',
          href: 'https://rera.karnataka.gov.in',
          submenu: 'tools',
          order: 2,
          newTab: true,
        },
        { label: 'Budget homes', href: '/buy?maxPrice=5000000', submenu: null, order: 1 },
      ],
    });
    const placed = [
      { slug: 'why-us', title: 'Why us', headerMenu: 'resources', headerSubmenu: null, order: 3 },
      {
        slug: 'first-home',
        title: 'First home',
        headerMenu: 'resources',
        headerSubmenu: 'guides',
        order: 2,
      },
      {
        slug: 'nri-guide',
        title: 'NRI guide',
        headerMenu: 'resources',
        headerSubmenu: 'guides',
        order: 1,
      },
    ];

    const [resources] = buildHeaderMenus({ menus: [menu], pages: placed });

    expect(resources.columns.map((column) => [column.title, hrefs(column.links)])).toEqual([
      ['Resources', ['/why-us', '/buy?maxPrice=5000000']],
      ['Guides', ['/nri-guide', '/first-home']],
      ['Tools', ['/buyer-assistance/home-loan#emi', 'https://rera.karnataka.gov.in']],
    ]);
    expect(resources.columns[2].links[1]).toMatchObject({ label: 'RERA portal', newTab: true });
    // With no address of its own, the label opens the first entry.
    expect(resources.to).toBe('/why-us');
  });

  it('gives a menu with an address, all of whose entries sit in submenus, a column for itself', () => {
    const menu = record('guides', 'Guides', {
      href: '/guides',
      submenus: [{ slug: 'nri', name: 'NRI' }],
    });
    const placed = [
      {
        slug: 'nri-guide',
        title: 'NRI guide',
        headerMenu: 'guides',
        headerSubmenu: 'nri',
        order: 1,
      },
    ];

    const [guides] = buildHeaderMenus({ menus: [menu], pages: placed });

    expect(guides.columns.map((column) => [column.title, hrefs(column.links)])).toEqual([
      ['Guides', ['/guides']],
      ['NRI', ['/nri-guide']],
    ]);
    expect(guides.columns[0].links[0]).toMatchObject({ label: 'Guides', overview: true });
  });

  it('adds the pages placed in a generated menu after its own columns', () => {
    const buy = record('buy', 'Buy', {
      source: 'buy',
      href: '/buy',
      submenus: [{ slug: 'guides', name: 'Buying guides' }],
    });
    const placed = [
      {
        slug: 'nri-guide',
        title: 'NRI guide',
        headerMenu: 'buy',
        headerSubmenu: 'guides',
        order: 1,
      },
      { slug: 'why-us', title: 'Why us', headerMenu: 'buy', headerSubmenu: null, order: 1 },
    ];

    const [menu] = buildHeaderMenus({ menus: [buy], propertyTypes, localities, pages: placed });

    expect(menu.columns.map((column) => column.title)).toEqual([
      'By status',
      'By type',
      'By budget',
      'Popular localities',
      'More',
      'Buying guides',
    ]);
  });

  it('keeps a page whose submenu is gone in the menu’s own list, and lists a destination once', () => {
    const company = record('company', 'Company', { submenus: [{ slug: 'team', name: 'Team' }] });
    const placed = [
      {
        slug: 'about',
        title: 'About Us',
        headerMenu: 'company',
        headerSubmenu: 'removed',
        order: 1,
      },
      { slug: 'careers', title: 'Careers', headerMenu: 'company', headerSubmenu: 'team', order: 2 },
    ];
    const [menu] = buildHeaderMenus({
      menus: [{ ...company, links: [{ label: 'About', href: '/about', submenu: 'team' }] }],
      pages: placed,
    });

    expect(menu.columns.map((column) => [column.title, hrefs(column.links)])).toEqual([
      ['Company', ['/about']],
      ['Team', ['/careers']],
    ]);
  });

  it('leaves out a menu with nothing in it and nowhere to go (§7)', () => {
    expect(buildHeaderMenus({ menus: [record('empty', 'Empty')], pages })).toEqual([]);
  });
});

describe('buildHeaderActions', () => {
  it('offers call, WhatsApp and the CTA from settings', () => {
    const actions = buildHeaderActions({ settings });

    expect(actions.map((action) => action.key)).toEqual(['call', 'whatsapp', 'cta']);
    expect(actions[0].href).toBe('tel:+919845000000');
    expect(actions[1].href).toContain('wa.me/919845000000');
    expect(actions[2]).toMatchObject({ kind: 'lead', label: 'Post Requirement' });
  });

  it('honours the two switches', () => {
    const actions = buildHeaderActions({
      settings: {
        ...settings,
        navigation: { ...settings.navigation, showWhatsappButton: false },
      },
    });

    expect(actions.map((action) => action.key)).toEqual(['call', 'cta']);
  });

  it('drops a button whose number settings do not carry', () => {
    const actions = buildHeaderActions({ settings: { general: {}, navigation: {} } });
    expect(actions.map((action) => action.key)).toEqual(['cta']);
  });

  it('always keeps the CTA, even with no settings at all', () => {
    expect(buildHeaderNav().actions.map((action) => action.key)).toEqual(['cta']);
  });
});

describe('headerCta — the "Call-to-action target" setting', () => {
  const withTarget = (headerCtaHref) => ({
    navigation: { headerCtaLabel: 'Talk to us', headerCtaHref },
  });

  it('opens the requirement form for #post-requirement and for no target', () => {
    expect(headerCta(withTarget('#post-requirement'))).toMatchObject({ kind: 'lead' });
    expect(headerCta(withTarget(''))).toMatchObject({ kind: 'lead' });
    expect(headerCta(null)).toMatchObject({ kind: 'lead', label: NAV.postRequirement });
  });

  it('is a router link for a path such as /contact', () => {
    expect(headerCta(withTarget('/contact'))).toMatchObject({
      kind: 'link',
      href: '/contact',
      internal: true,
      external: false,
      label: 'Talk to us',
    });
  });

  it('is an ordinary link, in a new tab, for another site', () => {
    expect(headerCta(withTarget('https://example.com/book'))).toMatchObject({
      kind: 'link',
      internal: false,
      external: true,
    });
  });

  it('is an ordinary link for tel:, mailto: and another anchor', () => {
    for (const href of ['tel:+919845000000', 'mailto:info@example.com', '#contact-form']) {
      expect(headerCta(withTarget(href))).toMatchObject({
        kind: 'link',
        href,
        internal: false,
        external: false,
      });
    }
  });

  it('is what buildHeaderActions puts last', () => {
    const actions = buildHeaderActions({ settings: withTarget('/contact') });
    expect(actions[actions.length - 1]).toMatchObject({ key: 'cta', kind: 'link' });
  });
});

describe('buildFooterColumns', () => {
  it("puts the editor's columns first, then every column pages were placed in, then tops the row up", () => {
    const columns = buildFooterColumns({ propertyTypes, localities, pages, settings });

    expect(columns.map((column) => column.title)).toEqual([
      'Buy',
      'Services',
      'Company',
      'Insights',
      'Buy by type',
    ]);
    expect(columns).toHaveLength(FOOTER_COLUMN_LIMIT);
  });

  // QA-56: "Company" fell off the end of a full row and "Services" and
  // "Insights" were never drawn, so a page the Pages screen listed as "in the
  // footer" was nowhere in it.
  it('shows every page placed in the footer, in a settings column of the same title if there is one', () => {
    const columns = buildFooterColumns({ propertyTypes, localities, pages, settings });
    const byTitle = (title) => columns.find((column) => column.title === title);

    expect(hrefs(byTitle('Services').links)).toEqual([
      'https://example.com/x.pdf',
      '/buyer-assistance/home-loan',
    ]);
    // The legal texts have the line under the copyright; they are not listed twice.
    expect(hrefs(byTitle('Company').links)).toEqual(['/about']);
    expect(hrefs(byTitle('Insights').links)).toEqual([
      '/insights/articles',
      '/insights/faqs',
      '/insights/real-estate-awareness',
    ]);
  });

  it('shows the placed columns even past the limit, and adds generated ones only into room left', () => {
    const crowded = {
      footer: {
        columns: ['One', 'Two', 'Three', 'Four', 'Five'].map((title) => ({
          title,
          links: [{ label: title, href: `/${title.toLowerCase()}` }],
        })),
      },
    };
    const columns = buildFooterColumns({ propertyTypes, localities, pages, settings: crowded });

    expect(columns.map((column) => column.title)).toEqual([
      'One',
      'Two',
      'Three',
      'Four',
      'Five',
      'Company',
      'Services',
      'Insights',
    ]);
  });

  it('marks an http link external and leaves an internal path alone', () => {
    const columns = buildFooterColumns({ settings });
    expect(columns[0].links[0]).toMatchObject({ to: '/buy/ready-to-move', external: false });
    expect(columns[1].links[0]).toMatchObject({ external: true });
  });

  it('builds the whole footer from the data when settings carry no columns', () => {
    const columns = buildFooterColumns({ propertyTypes, localities, pages });

    expect(columns.map((column) => column.key)).toEqual([
      'pages-company',
      'pages-services',
      'pages-insights',
      'buy-by-type',
      'popular-localities',
    ]);
  });

  it('leaves out a column with nothing in it', () => {
    expect(buildFooterColumns({ pages: [] })).toEqual([]);
  });
});

describe('buildLegalLinks', () => {
  it('links only the legal pages that exist, in the fixed order', () => {
    const links = buildLegalLinks(pages);
    expect(links.map((link) => link.label)).toEqual(['Privacy Policy', 'Disclaimer']);
    expect(hrefs(links)).toEqual(['/privacy-policy', '/disclaimer']);
  });

  it('is empty when nothing legal is published', () => {
    expect(buildLegalLinks([])).toEqual([]);
    expect(buildLegalLinks()).toEqual([]);
  });
});

describe('buildBottomNav', () => {
  it('is Home, Search, Shortlist, Enquire and Menu', () => {
    const items = buildBottomNav();

    expect(items.map((item) => item.key)).toEqual([
      'home',
      'search',
      'shortlist',
      'enquire',
      'menu',
    ]);
    expect(items.map((item) => item.kind)).toEqual(['link', 'link', 'shortlist', 'lead', 'menu']);
  });

  it('opens the listing with its filter sheet up', () => {
    const search = buildBottomNav().find((item) => item.key === 'search');
    expect(search.to).toBe('/properties?filters=open');
    expect(search.match).toBe('/properties');
  });
});
