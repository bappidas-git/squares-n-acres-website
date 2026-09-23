/**
 * `segments` — the three every install starts with (§6.17's `SEGMENTS`).
 *
 * A segment is master data now, so an editor can add one — "Industrial",
 * "Agricultural" — without a release. What the three seeded here have that an
 * added one does not is that the site is built on them: `/commercial` lists
 * `segment=commercial`, `/plots` lists `segment=land`, and the menus, the hero
 * search and the sitemap name them. So each one's slug is its `kind`, and the
 * API keeps both fixed and refuses to delete it (`src/config/segments.js`,
 * `docs/DECISIONS.md` QA-52).
 *
 * The `kind` is what decides which fields a listing carries — rooms for a home,
 * built-up areas for an office, a plot's measurements for land — and an added
 * segment borrows one of these three.
 */

const { SEGMENTS } = require('../../../src/config/enums');

/** What each built-in segment holds, in the words the admin screen shows. */
const DESCRIPTIONS = {
  residential: 'Homes to buy or rent: apartments, villas, houses and co-living.',
  commercial: 'Space to work or trade from: offices, shops, co-working and warehouses.',
  land: 'Residential, farm and commercial plots, measured by the plot rather than a building.',
};

const ICONS = {
  residential: 'mdi:home-city-outline',
  commercial: 'mdi:office-building-outline',
  land: 'mdi:land-plots',
};

module.exports = function segments({ stamps }) {
  return SEGMENTS.entries.map(({ value, label }, index) => ({
    id: index + 1,
    name: label,
    slug: value,
    kind: value,
    description: DESCRIPTIONS[value],
    icon: ICONS[value],
    isActive: true,
    order: index + 1,
    ...stamps({ createdDaysAgo: 180 }),
  }));
};
