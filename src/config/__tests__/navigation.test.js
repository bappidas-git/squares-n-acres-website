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
} from '../navigation';
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

  it('keeps the three insight destinations and does not repeat a CMS page', () => {
    const insights = menuByKey(menus, 'insights');
    const links = hrefs(insights.columns[0].links);

    expect(links.slice(0, 3)).toEqual([
      '/insights/articles',
      '/insights/faqs',
      '/insights/real-estate-awareness',
    ]);
    // The awareness CMS page points at the same URL as the static entry.
    expect(links).toHaveLength(3);
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
  });

  it('leaves a list that already fits alone', () => {
    expect(collapseMenus(menus.slice(0, 6))).toHaveLength(6);
    expect(collapseMenus([])).toEqual([]);
    expect(collapseMenus()).toEqual([]);
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

describe('buildFooterColumns', () => {
  it("puts the editor's columns first and tops the row up", () => {
    const columns = buildFooterColumns({ propertyTypes, localities, pages, settings });

    expect(columns.map((column) => column.title)).toEqual([
      'Buy',
      'Services',
      'Buy by type',
      'Popular localities',
      'Insights',
    ]);
    expect(columns).toHaveLength(FOOTER_COLUMN_LIMIT);
  });

  it('marks an http link external and leaves an internal path alone', () => {
    const columns = buildFooterColumns({ settings });
    expect(columns[0].links[0]).toMatchObject({ to: '/buy/ready-to-move', external: false });
    expect(columns[1].links[0]).toMatchObject({ external: true });
  });

  it('generates the whole footer when settings carry no columns', () => {
    const columns = buildFooterColumns({ propertyTypes, localities, pages });

    expect(columns.map((column) => column.key)).toEqual([
      'buy-by-type',
      'popular-localities',
      'insights',
      'company',
    ]);
    expect(hrefs(columns[3].links)).toEqual(['/about', '/privacy-policy', '/disclaimer']);
  });

  it('leaves out a column with nothing in it', () => {
    const columns = buildFooterColumns({ pages: [] });
    expect(columns.map((column) => column.key)).toEqual(['insights']);
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
