/**
 * Every word the **public** site says on its own behalf
 * (00_MASTER_CONTEXT.md §8.5; the admin's own words are in `adminCopy.js`).
 *
 * Anything a *client* would want to change lives in settings or in a CMS page;
 * what is left is the site's own voice — the label on a menu, the sentence
 * under an empty shortlist, the button that retries a failed request. Keeping
 * it here means it is reviewed once (prompt 43) instead of being hunted
 * through JSX, and that two screens cannot drift into saying the same thing
 * two ways.
 *
 * House style (§8.5), applied to every string below:
 *
 *   - **Sentence case** for buttons, labels, headings and menu items. Proper
 *     nouns and the Indian vocabulary keep their own case: BHK, RERA, EMI,
 *     FOIR, NRI, FAQs, WhatsApp, sq ft.
 *   - No exclamation marks, anywhere.
 *   - No promise the client has not made: never "within 24 hours" — a response
 *     time is a fact about the company, so it comes from settings or it is not
 *     said (§14). "As soon as possible" is what the site may say by itself.
 *   - Errors say what to do next; successes are short and positive; a toast
 *     stays under 60 characters so a phone shows all of it.
 *   - Indian vocabulary throughout: BHK, sq ft, carpet area, khata, RERA,
 *     possession, EMI, lakh/crore (the numbers themselves are `utils/format`).
 *
 * Nothing in this file may state a fact about the company (§14): no counts, no
 * years, no awards, no service-level promises.
 *
 * Authored in CommonJS (D36b, as `routes/paths.js` and `seo/pageTypes.js`
 * already are, extended by D108): `src/seo/pageTypes.js` reads `SEO.indexPages`
 * from here and is itself `require`d by `scripts/` with no bundler in front of
 * it. `module.exports` carries every named export, so
 * `import copy, { NAV } from '../config/copy'` keeps working unchanged.
 */

/* ------------------------------------------------------------------ *
 * nav — header, mega menu, drawer, bottom bar and footer labels
 * ------------------------------------------------------------------ */

/** The header, drawer and bottom-navigation labels (`config/navigation.js`). */
const NAV = {
  buy: 'Buy',
  rent: 'Rent',
  lease: 'Lease',
  commercial: 'Commercial',
  plots: 'Plots',
  localities: 'Localities',
  builders: 'Builders',
  buyerAssistance: 'Buyer assistance',
  insights: 'Insights',
  company: 'Company',
  contact: 'Contact',
  more: 'More',

  byStatus: 'By status',
  byType: 'By type',
  byBudget: 'By budget',
  popularLocalities: 'Popular localities',

  articles: 'Articles',
  faqs: 'FAQs',
  awareness: 'Real estate awareness',

  call: 'Call',
  whatsapp: 'WhatsApp',
  postRequirement: 'Post requirement',
  shortlist: 'Shortlist',
  enquire: 'Enquire',
  menu: 'Menu',
  search: 'Search',
  home: 'Home',

  footerLandmark: 'Footer',
  skipToContent: 'Skip to content',
};

/* ------------------------------------------------------------------ *
 * hero — the home page's first screen
 * ------------------------------------------------------------------ */

const HERO = {
  /** Used when `siteSettings.hero.title` is empty. */
  title: 'Find your next home in Bengaluru',
  searchPlaceholder: 'Try “Whitefield”, a project or a builder',
  tabsLabel: 'What are you looking for?',
  intentLabel: 'Buy or lease',
  anyType: 'Any type',
  anyBudget: 'Any budget',
  search: 'Search',
};

/* ------------------------------------------------------------------ *
 * home — the bands of `/`, in the order the page renders them
 * ------------------------------------------------------------------ */

const HOME = {
  categories: {
    title: 'Where would you like to start?',
    subtitle: 'Six ways into the same inventory, each with its own page and filters.',
  },
  featured: {
    title: 'Featured properties',
    subtitle: 'Listings our advisors are recommending this month.',
  },
  newLaunches: {
    title: 'New launches',
    subtitle: 'Projects announced or under construction, with the possession date stated.',
  },
  readyToMove: {
    title: 'Ready to move',
    subtitle: 'Completed homes you can visit, register and move into without waiting.',
  },
  rentals: {
    title: 'Homes to rent',
    subtitle: 'Rentals with the monthly rent, the deposit and the furnishing stated upfront.',
  },
  localities: {
    title: 'Explore localities',
    subtitle: 'Where we know the streets, not just the listings.',
  },
  propertyTypes: {
    title: 'Browse by property type',
    subtitle: 'Apartments, villas, plots, offices and everything in between.',
  },
  builders: {
    title: 'Top builders',
    subtitle: 'The developers whose projects we work with most often.',
  },
  testimonials: {
    title: 'What our clients say',
    subtitle: '',
  },
  insights: {
    title: 'Latest insights',
    subtitle: 'Guides, market notes and the legal detail that decides a transaction.',
  },
  viewAll: 'View all',

  /** The six tiles of `CategoryTiles`, keyed by the tile's own `key`. */
  tiles: {
    'ready-to-move': { label: 'Ready to move', caption: 'Move in now' },
    'under-construction': { label: 'Under construction', caption: 'Possession dated' },
    'pre-launch': { label: 'New launch', caption: 'Early pricing' },
    plots: { label: 'Plots and land', caption: 'Build your own' },
    rent: { label: 'Rent a home', caption: 'Rent, deposit, furnishing' },
    commercial: { label: 'Commercial', caption: 'Offices, shops, sheds' },
  },
};

/** The band between the last section of a page and the newsletter. */
const CTA_BAND = {
  eyebrow: 'Sell or let',
  title: 'Looking to sell or let your property?',
  text: 'Tell us what you own and where it is. We value it, photograph it, list it and handle the enquiries, so you only meet buyers and tenants who are serious.',
  buttonLabel: 'List your property',
};

/* ------------------------------------------------------------------ *
 * listing — the search engine: header, filters, sort, results
 * ------------------------------------------------------------------ */

const LISTING = {
  searching: 'Searching…',
  /** `formatNumber(total)` in front of one of these two. */
  resultOne: 'property',
  resultMany: 'properties',

  filters: 'Filters',
  filtersLandmark: 'Filters',
  filtersChipLabel: 'Filters:',
  filtersLocked: '(set by this page)',
  noFilters: 'No filters applied',
  clearAll: 'Clear all filters',
  clearFilters: 'Clear filters',
  resetFilters: 'Reset filters',
  reset: 'Reset',
  removeFilter: 'Remove filter',
  /** `%count%` — a small integer, so no thousands separator is needed. */
  filtersAppliedOne: '%count% filter applied',
  filtersAppliedMany: '%count% filters applied',
  showResults: 'Show results',
  /** `%count%` — already formatted for India by `utils/format`. */
  showCount: 'Show %count% results',
  noResults: 'No results',

  sortLabel: 'Sort by',
  viewLabel: 'Result layout',
  gridView: 'Grid view',
  listView: 'List view',
  resultsLabel: 'Property results',
  recentlyViewed: 'Recently viewed',

  search: 'Search',
  searchLabel: 'Search properties',
  searchPlaceholder: 'Search by locality, project or builder',
  suggestionsLabel: 'Search suggestions',
  recentSearches: 'Recent searches',
  /** `%term%` — what the visitor typed. */
  searchFor: 'Search for “%term%”',
  noMatches: 'No matches',

  /** Suggestion groups of the search popover. */
  groups: {
    localities: 'Localities',
    properties: 'Properties',
    propertyTypes: 'Property types',
    developers: 'Developers',
  },
};

/* ------------------------------------------------------------------ *
 * property — the details page and the card
 * ------------------------------------------------------------------ */

const PROPERTY = {
  saveToShortlist: 'Save to shortlist',
  savedToShortlist: 'Saved to shortlist',
  removeFromShortlist: 'Remove from shortlist',
  save: 'Save',
  saved: 'Saved',
  remove: 'Remove',
  shortlistAdded: 'Saved to shortlist',
  shortlistRemoved: 'Removed from shortlist',
  shortlistView: 'View',

  share: 'Share',
  copyLink: 'Copy link',
  linkCopied: 'Link copied',
  linkCopyFailed: 'The link could not be copied',

  priceOnRequest: 'Price on request',
  perMonth: 'per month',

  enquire: 'Enquire',
  bookVisit: 'Book a site visit',
  downloadBrochure: 'Download brochure',
  viewFloorPlans: 'View floor plans',

  /** The `/shortlist` page (§9.3 makes it `noindex, nofollow`). */
  shortlist: {
    title: 'Your shortlist',
    sharedTitle: 'A shared shortlist',
    subtitle:
      'Saved on this device. Prices and availability are read live, so nothing here is out of date.',
    sharedSubtitle: 'Somebody sent you these properties. Save them to keep them on this device.',
    saveAll: 'Save all',
    clear: 'Clear shortlist',
    shareTitle: 'My property shortlist',
    shareText: 'Have a look at these properties',
    clearTitle: 'Clear your shortlist?',
    /** `%count%` — the number of saved listings on this device. */
    clearMessageOne: 'This removes the 1 saved property from this device.',
    clearMessageMany: 'This removes all %count% saved properties from this device.',
    cleared: 'Shortlist cleared',
    /** `%count%` — how many of the shared listings were newly saved. */
    savedOne: '1 property saved to your shortlist',
    savedMany: '%count% properties saved to your shortlist',
    allSaved: 'Everything here is already in your shortlist',
    /** `%count%` — listings in the link that have since been taken down. */
    goneOne: '1 saved property is no longer listed and is not shown.',
    goneMany: '%count% saved properties are no longer listed and are not shown.',
  },

  /** The gate in front of a document, a plan or a phone number. */
  gated: {
    title: 'Share your details to continue',
    text: 'One form and the brochure, the floor plans and the advisor’s number are yours for this device.',
    action: 'Get access',
  },
};

/* ------------------------------------------------------------------ *
 * leads — every enquiry form on the site
 * ------------------------------------------------------------------ */

const LEADS = {
  submit: 'Submit',
  send: 'Send',
  sending: 'Sending…',
  enquiryTitle: 'Enquiry',

  /** `%siteName%` comes from settings — never spell the company out here. */
  consent: 'By submitting you agree to be contacted by %siteName%',
  consentRequired: 'Please agree to be contacted so we can reply',

  successTitle: 'Request received',
  successMessage:
    'Thank you — we have your details. An advisor will get back to you as soon as possible.',
  whatsapp: 'Message on WhatsApp',
  close: 'Close',

  /** §5.11: what the API says when it is rate limiting a form. */
  rateLimited: 'Too many requests, please wait a minute',
  invalidFields: 'Please check the highlighted fields.',
  failed: 'Something went wrong. Please try again.',

  newsletter: {
    /** Used when `siteSettings.newsletter.title` is empty. */
    title: 'Property insight, once a month',
    submit: 'Subscribe',
    success: 'Thank you for subscribing.',
    alreadySubscribed: 'You’re already subscribed',
    nameLabel: 'Your name',
  },
};

/* ------------------------------------------------------------------ *
 * blog — insights index, article page and its furniture
 * ------------------------------------------------------------------ */

const BLOG = {
  /** `%minutes%` — an integer, already rounded by the API. */
  readTime: '%minutes% min read',
  contents: 'In this article',
  relatedArticles: 'Read next',
  relatedProperties: 'Listings mentioned in this article',
  moreInCategory: 'More in this category',
  trending: 'Most read',
  tags: 'Browse by topic',
  faqs: 'Frequently asked questions',
  cta: 'Want help with your property search?',
  sidebarLead: 'Need advice on a purchase?',
  /** `%network%` — Facebook, X, WhatsApp… */
  shareOn: 'Share on %network%',
};

/* ------------------------------------------------------------------ *
 * footer
 * ------------------------------------------------------------------ */

const FOOTER = {
  landmark: 'Footer',
  /** `%year%` and `%siteName%` are filled in by the component. */
  copyright: '© %year% %siteName%. All rights reserved.',
  reraPrefix: 'RERA',
  gstPrefix: 'GST',
};

/* ------------------------------------------------------------------ *
 * forms — the verbs and the field words shared by every form
 * ------------------------------------------------------------------ */

const FORMS = {
  submit: 'Submit',
  save: 'Save',
  saveChanges: 'Save changes',
  cancel: 'Cancel',
  close: 'Close',
  clear: 'Clear',
  apply: 'Apply',
  search: 'Search',
  next: 'Next',
  back: 'Back',
  optional: 'Optional',
  required: 'Required',
  loading: 'Loading…',
  dismiss: 'Dismiss notification',
};

/* ------------------------------------------------------------------ *
 * errors — what a failure says, everywhere
 * ------------------------------------------------------------------ */

const ERRORS = {
  /** `ErrorState`'s own defaults (§8.2). */
  title: 'Something went wrong',
  text: 'We could not load this right now. Please try again.',
  retry: 'Try again',

  network: 'We could not reach the server. Check your connection and try again.',
  properties: 'We could not load these properties',
  property: 'We could not load this property',
  localities: 'We could not load the localities',
  locality: 'We could not load this locality',
  builders: 'We could not load the builders',
  builder: 'We could not load this builder',
  articles: 'We could not load these articles',
  article: 'We could not load this article',
  faqs: 'We could not load the questions',
  page: 'We could not load this page',
  shortlist: 'We could not load your shortlist',
  job: 'We could not load this role',

  /** The `ErrorBoundary` crash screen (§8.2). */
  boundary: {
    title: 'Something went wrong',
    text: 'The page could not be displayed. Reloading usually fixes it; if it does not, head back to the home page.',
    reload: 'Reload',
    reloadPage: 'Reload this page',
    goHome: 'Go home',
  },

  /** The 404 page (§8.2, BUG-10: the listing reads `?q=`). */
  notFound: {
    title: 'We couldn’t find that page',
    subtitle:
      'The address may be mistyped, or the listing may have been taken down. Search for what you were after, or pick up one of the trails below.',
    description:
      'There is nothing published at this address. Search the listings, or start from one of the popular pages.',
    searchLabel: 'Search properties',
    searchPlaceholder: 'Search by locality, project or builder',
    popular: 'Popular pages',
    browse: 'Browse properties',
    goHome: 'Go to the home page',

    /**
     * What each detail page says instead of the generic sentence when the API
     * answers 404 for the slug in the address. Same page, different first two
     * lines: a visitor who followed a dead listing is told that, not that "the
     * page" is missing.
     */
    pages: {
      property: {
        title: 'Property not found',
        subtitle:
          'This listing is no longer available, or the address has changed. Browse what is on the market instead.',
      },
      listing: {
        title: 'Page not found',
        subtitle:
          'We have no listings under that address. Search below, or browse every property we have.',
      },
      article: {
        title: 'Article not found',
        subtitle:
          'There is nothing published at this address. It may have moved, or never existed.',
      },
      articleCategory: {
        title: 'Category not found',
        subtitle: 'There is no article category at this address. It may have been renamed.',
      },
      articleTag: {
        title: 'Tag not found',
        subtitle: 'Nothing on the site is filed under this tag.',
      },
      author: {
        title: 'Author not found',
        subtitle: 'Nobody writes here under that name.',
      },
      job: {
        title: 'This role is no longer listed',
        subtitle:
          'The opening you followed has been taken down. The current ones are on the careers page.',
      },
      cms: {
        title: 'Page not found',
        subtitle:
          'There is nothing published at this address. It may have moved, or never existed.',
      },
    },
  },
};

/* ------------------------------------------------------------------ *
 * empty — "nothing here", with the way out (§8.2)
 * ------------------------------------------------------------------ */

const EMPTY = {
  title: 'Nothing here yet',

  listing: {
    title: 'No properties match these filters',
    widen: 'Widening one of these usually brings results back.',
    text: 'Try a different locality, or tell us what you are looking for and we will find it.',
    /** `%locality%` — the one locality the search is narrowed to. */
    viewAllIn: 'View all in %locality%',
  },

  shortlist: {
    title: 'Your shortlist is empty',
    text: 'Tap the heart on any property to keep it here and compare later.',
    action: 'Browse properties',
    sharedTitle: 'These properties are no longer listed',
    sharedText: 'The listings in this link have been taken down. Browse what is available now.',
  },

  search: {
    /** `%term%` — what the visitor typed. */
    title: 'No matches for “%term%”',
    text: 'Check the spelling, or search for a locality, a project or a builder.',
  },

  articles: {
    title: 'No articles found',
    text: 'Try another category, or a different search.',
    action: 'Clear the filters',
  },

  localities: {
    title: 'No localities here yet',
    text: 'Localities will appear here as soon as they are published.',
    filtered: 'Nothing is listed in this zone at the moment. Try another one.',
    action: 'Show all zones',
  },

  builders: {
    title: 'No builders match that search',
    text: 'Builders will appear here as soon as they are published.',
    /** `%term%` — what the visitor typed. */
    filtered: 'Nothing here is called “%term%”. Try part of the name, or clear the search.',
    action: 'Clear the search',
  },

  faqs: {
    title: 'No questions match',
    text: 'There is nothing in this category yet. Try another one, or ask us below.',
    /** `%term%` — what the visitor typed. */
    filtered: 'Nothing here mentions “%term%”. Try another word, or ask us below.',
    action: 'Clear search',
    actionCategory: 'Show all questions',
  },

  jobs: {
    title: 'No openings right now',
    text: 'Nothing is advertised at the moment. Do write in if you think you would fit.',
  },
};

/* ------------------------------------------------------------------ *
 * seo — the index pages, which are routes rather than records (§9.3)
 * ------------------------------------------------------------------ */

/**
 * Titles and descriptions for the pages that have no record behind them.
 *
 * They go **through** the type's title template like any record's would, so
 * "Localities in Bengaluru" becomes "Localities in Bengaluru | Squares N Acres"
 * and changing the separator in Admin → SEO changes it here too. A page may
 * still pass its own `title`/`description` and win.
 *
 * `src/seo/pageTypes.js` exports this table as `INDEX_PAGES`.
 */
const SEO = {
  indexPages: {
    localities: {
      title: 'Localities in Bengaluru',
      description:
        'Explore neighbourhoods across Bengaluru: connectivity, prices and lifestyle at a glance.',
    },
    builders: {
      title: 'Builders and developers in Bengaluru',
      description:
        'The builders behind the projects we list in Bengaluru — their track record, their registrations and what they have available now.',
    },
    blog: {
      title: 'Real estate insights and guides for Bengaluru',
      description:
        'Buying guides, market notes, legal explainers and investment thinking on Bengaluru property, from Squares N Acres.',
    },
    faqs: {
      title: 'Frequently asked questions',
      description:
        'Answers to the questions buyers, sellers, tenants and NRIs ask us most often about property in Bengaluru — buying, renting, home loans, legal checks and RERA.',
    },
    jobs: {
      title: 'Careers',
      description: 'Open roles at Squares N Acres, and what it is like to work here.',
    },
    shortlist: {
      title: 'Your shortlist',
      description: 'The properties you have saved on this device.',
    },
    search: {
      title: 'Search results',
      description: 'What we have that matches your search.',
    },
    notFound: {
      title: 'Page not found',
      description: 'There is nothing published at this address.',
    },
    error: {
      title: 'Something went wrong',
      description: 'This page could not be loaded.',
    },
  },
};

/* ------------------------------------------------------------------ */

/**
 * `'Saved %count% items'` + `{ count: 3 }` → `'Saved 3 items'`.
 *
 * The one templating rule of both copy files: `%name%`, filled from a plain
 * object. A missing key leaves its placeholder alone rather than printing
 * `undefined`, which is the failure mode that reaches production.
 *
 * @param {string} template
 * @param {Record<string, string|number>} [values]
 * @returns {string}
 */
function fill(template, values = {}) {
  return String(template ?? '').replace(/%(\w+)%/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  );
}

module.exports = {
  NAV,
  HERO,
  HOME,
  CTA_BAND,
  LISTING,
  PROPERTY,
  LEADS,
  BLOG,
  FOOTER,
  FORMS,
  ERRORS,
  EMPTY,
  SEO,
  fill,
};
