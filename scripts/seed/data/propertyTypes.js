/**
 * `propertyTypes` — the seventeen types of §6.3 with their plural URL slugs
 * (D25), which are what `/buy/:slug`, `/rent/:slug` and `/commercial/:slug`
 * resolve against after the four construction-status slugs.
 *
 * The `segment` decides which fields a listing of that type carries: `land`
 * types have a plot area and no bedrooms, `commercial` types have neither
 * bedrooms nor a BHK in their title.
 */

const { fitDescription, makeSeo } = require('../lib/seo');

/** name, slug, segment, icon, description, focus keyword. */
const TYPES = [
  [
    'Apartments',
    'apartments',
    'residential',
    'mdi:home-city-outline',
    'Flats in gated projects and standalone buildings across Bengaluru.',
    'apartments in bangalore',
  ],
  [
    'Villas',
    'villas',
    'residential',
    'mdi:home-modern',
    'Independent villas in gated communities, with private gardens and covered parking.',
    'villas in bangalore',
  ],
  [
    'Independent Houses',
    'independent-houses',
    'residential',
    'mdi:home-outline',
    'Standalone houses on their own plot, sold with the land.',
    'independent houses in bangalore',
  ],
  [
    'Row Houses',
    'row-houses',
    'residential',
    'mdi:home-group',
    'Shared-wall houses in planned rows, usually inside a gated layout.',
    'row houses in bangalore',
  ],
  [
    'Penthouses',
    'penthouses',
    'residential',
    'mdi:city-variant-outline',
    'Top-floor homes with private terraces and larger floor plates.',
    'penthouses in bangalore',
  ],
  [
    'Duplexes',
    'duplexes',
    'residential',
    'mdi:stairs',
    'Two-level homes inside an apartment block or a row development.',
    'duplex apartments in bangalore',
  ],
  [
    'Studios',
    'studios',
    'residential',
    'mdi:bed-outline',
    'Single-room homes with an attached kitchenette, close to the workplaces.',
    'studio apartments in bangalore',
  ],
  [
    'Builder Floors',
    'builder-floors',
    'residential',
    'mdi:home-floor-2',
    'One apartment per floor in a low-rise building, often with a private entrance.',
    'builder floors in bangalore',
  ],
  [
    'Residential Plots',
    'residential-plots',
    'land',
    'mdi:map-outline',
    'Approved sites in layouts, sold by dimension and ready to build on.',
    'residential plots in bangalore',
  ],
  [
    'Farm Land',
    'farm-land',
    'land',
    'mdi:sprout-outline',
    'Agricultural and farmhouse land on the outskirts, measured in acres.',
    'farm land near bangalore',
  ],
  [
    'Office Spaces',
    'office-spaces',
    'commercial',
    'mdi:office-building-outline',
    'Fitted and bare-shell offices for lease in business districts.',
    'office space for lease in bangalore',
  ],
  [
    'Co-working Spaces',
    'co-working-spaces',
    'commercial',
    'mdi:desk',
    'Managed desks, cabins and private suites on flexible terms.',
    'coworking space in bangalore',
  ],
  [
    'Retail Shops',
    'retail-shops',
    'commercial',
    'mdi:storefront-outline',
    'High-street and mall retail units for lease, with frontage and footfall.',
    'retail shop for rent in bangalore',
  ],
  [
    'Warehouses',
    'warehouses',
    'commercial',
    'mdi:warehouse',
    'Storage and distribution sheds with dock levellers and container access.',
    'warehouse for lease in bangalore',
  ],
  [
    'Industrial Sheds',
    'industrial-sheds',
    'commercial',
    'mdi:factory',
    'Light-industrial units with power load, height and truck movement.',
    'industrial shed in bangalore',
  ],
  [
    'Commercial Plots',
    'commercial-plots',
    'land',
    'mdi:map-marker-radius-outline',
    'Corner and main-road sites approved for commercial development.',
    'commercial plots in bangalore',
  ],
  [
    'PG & Co-living',
    'pg-co-living',
    'residential',
    'mdi:account-group-outline',
    'Managed shared living with meals, housekeeping and a single monthly bill.',
    'pg and coliving in bangalore',
  ],
];

module.exports = function propertyTypes({ stamps }) {
  return TYPES.map(([name, slug, segment, icon, description, focusKeyword], index) => ({
    id: index + 1,
    name,
    slug,
    segment,
    icon,
    description,
    isActive: true,
    order: index + 1,
    seo: makeSeo({
      title: `${name} in Bengaluru`,
      description: fitDescription(
        `${description} Browse verified listings with prices and locality guidance.`
      ),
      focusKeyword,
      secondaryKeywords: [`${name.toLowerCase()} for sale bengaluru`],
      slug,
    }),
    ...stamps({ createdDaysAgo: 180 }),
  }));
};
