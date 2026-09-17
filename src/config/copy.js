/**
 * Microcopy that belongs to the product rather than to one component
 * (00_MASTER_CONTEXT.md §8.5).
 *
 * Everything a *client* would want to change lives in settings or in a CMS
 * page; what is left is the site's own voice — the band that invites a seller
 * to list with us, the label on a menu, the sentence under an empty shortlist.
 * Keeping it here means those strings are reviewed once (prompt 43) instead of
 * being hunted through JSX.
 *
 * Nothing in this file may state a fact about the company (§14): no counts, no
 * years, no promises of a response time.
 */

/** The band between the last section of a page and the newsletter. */
export const CTA_BAND = {
  eyebrow: 'Sell or let',
  title: 'Looking to sell or let your property?',
  text: 'Tell us what you own and where it is. We value it, photograph it, list it and handle the enquiries, so you only meet buyers and tenants who are serious.',
  buttonLabel: 'List your property',
};

/** The header, drawer and bottom-navigation labels (`config/navigation.js`). */
export const NAV = {
  buy: 'Buy',
  rent: 'Rent',
  commercial: 'Commercial',
  plots: 'Plots',
  localities: 'Localities',
  builders: 'Builders',
  buyerAssistance: 'Buyer Assistance',
  insights: 'Insights',
  company: 'Company',
  contact: 'Contact',
  more: 'More',

  byStatus: 'By status',
  byType: 'By type',
  byBudget: 'By budget',
  popularLocalities: 'Popular localities',

  call: 'Call',
  whatsapp: 'WhatsApp',
  postRequirement: 'Post Requirement',
  shortlist: 'Shortlist',
  enquire: 'Enquire',
  menu: 'Menu',
  search: 'Search',
  home: 'Home',
};

/** The home page's own headings, in the order the page renders them. */
export const HOME = {
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
};

const copy = { CTA_BAND, NAV, HOME };

export default copy;
