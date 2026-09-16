/**
 * `partners` — six **fictional** organisations across the five categories of
 * §6.9 (D78 put the starter seed's three in `developer`; the full seed uses
 * the whole enum so the partners page and its category filter have something
 * to show).
 */

const PARTNERS = [
  ['Aurelia Estates', 'developer'],
  ['Garden City Bank', 'bank'],
  ['Kaveri Legal Associates', 'legal'],
  ['Studio Terracotta Interiors', 'interior'],
  ['Meridian Facility Services', 'other'],
  ['Nandi Ridge Developers', 'developer'],
];

module.exports = function partners({ stamps, slugify, media }) {
  return PARTNERS.map(([name, category], index) => ({
    id: index + 1,
    name,
    logoUrl: media.photo({
      seed: `sna-partner-${slugify(name)}`,
      width: 200,
      height: 80,
      alt: `${name} logo (placeholder)`,
      folder: 'partners',
      tags: ['partner', category],
    }),
    websiteUrl: null,
    category,
    order: index + 1,
    isActive: true,
    ...stamps({ createdDaysAgo: 162 }),
  }));
};
