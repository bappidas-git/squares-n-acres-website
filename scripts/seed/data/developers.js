/**
 * `developers` — eight builders (§6.5).
 *
 * Every one of them is **fictional** (§14). The names, the founding years, the
 * project counts and the RERA strings are placeholders so that the builder
 * pages, the property detail page and the admin master data have something
 * structurally real to render; each description says so in its last sentence,
 * because a developer profile that reads as fact and is not is the one piece
 * of seed content that could actually mislead somebody.
 */

const { fitDescription, makeSeo } = require('../lib/seo');
const { paragraphs } = require('../lib/text');

const DEVELOPERS = [
  {
    name: 'Aurelia Estates',
    establishedYear: 2004,
    totalProjects: 26,
    ongoingProjects: 5,
    completedProjects: 21,
    isFeatured: true,
    short:
      'Mid-rise gated apartment projects across east Bengaluru, built around courtyards and clubhouses rather than towers.',
    focus:
      'Aurelia Estates builds mid-rise gated apartment projects across east Bengaluru, mostly in the eight to eighteen storey range, planned around a central landscaped court with the clubhouse on the podium.',
    approach:
      'The design brief repeats across their projects: cross-ventilated layouts, a balcony to every bedroom, covered parking at basement level and full power backup for common areas. Handover packages include the completion certificate, the approved plan set and the association handover documents.',
    highlights: [
      'Mid-rise gated projects in the eight to eighteen storey range',
      'Cross-ventilated layouts with a balcony to every bedroom',
      'Clubhouse, pool and podium landscaping as standard',
      'Completion certificate and plan set handed over with the keys',
    ],
  },
  {
    name: 'Nandi Ridge Developers',
    establishedYear: 2009,
    totalProjects: 18,
    ongoingProjects: 4,
    completedProjects: 14,
    isFeatured: true,
    short:
      'Plotted layouts and villa communities in north Bengaluru, sold with approvals in place and infrastructure laid before handover.',
    focus:
      'Nandi Ridge Developers works almost entirely in north Bengaluru, on plotted layouts and villa communities along the airport corridor. Their sites are sold by dimension with the layout approvals already in place.',
    approach:
      'Roads, storm-water drains, street lighting and the underground utility network are laid before sites are handed over, and the villa designs are offered as a fixed set of three plans rather than bespoke construction. Buyers get the approved layout plan and the release certificate at registration.',
    highlights: [
      'Plotted layouts with approvals in place before sale',
      'Roads, drains and utilities laid before handover',
      'Three standard villa plans rather than bespoke construction',
      'Concentrated on the northern and airport corridors',
    ],
  },
  {
    name: 'Cauvery Homes',
    establishedYear: 1998,
    totalProjects: 41,
    ongoingProjects: 6,
    completedProjects: 35,
    isFeatured: true,
    short:
      'A long-running south Bengaluru builder of two- and three-bedroom apartments at the practical end of the market.',
    focus:
      'Cauvery Homes has built two- and three-bedroom apartments in south Bengaluru for more than two decades, at the practical end of the market rather than the luxury end. Their projects are typically four to eight floors on a single block.',
    approach:
      'Specifications are modest and consistent: vitrified flooring throughout, granite kitchen counters, a lift and a generator per block, and a small common terrace instead of a clubhouse. Where a project is large enough, a gym and a play area are added.',
    highlights: [
      'Two decades of two- and three-bedroom apartments in south Bengaluru',
      'Four to eight floor blocks rather than high-rise towers',
      'Consistent, modest specifications across projects',
      'Priced at the practical end of each locality band',
    ],
  },
  {
    name: 'Prakriti Builders',
    establishedYear: 2012,
    totalProjects: 12,
    ongoingProjects: 3,
    completedProjects: 9,
    isFeatured: true,
    short:
      'Environment-led residential projects with rainwater harvesting, treated-water reuse and solar common-area lighting designed in from the start.',
    focus:
      'Prakriti Builders designs its residential projects around the resource question first: rainwater harvesting sized to the roof area, a sewage treatment plant whose output is reused for landscaping, and solar lighting for the common areas.',
    approach:
      'Blocks are oriented to reduce west-facing glazing, the landscape planting is chosen for low water use, and every project is handed over with an operations manual for the association. The trade-off is a slightly higher per-square-foot rate, which the maintenance bill is meant to recover.',
    highlights: [
      'Rainwater harvesting and treated-water reuse designed in',
      'Solar lighting for common areas and basements',
      'Block orientation planned to limit west-facing glazing',
      'Operations manual handed to the association at completion',
    ],
  },
  {
    name: 'Skyline Bengaluru',
    establishedYear: 2007,
    totalProjects: 15,
    ongoingProjects: 4,
    completedProjects: 11,
    isFeatured: false,
    short:
      'High-rise apartment and penthouse projects on the Outer Ring Road corridors, with full amenity decks and basement parking.',
    focus:
      'Skyline Bengaluru builds high-rise apartment projects on the Outer Ring Road corridors — towers of eighteen to thirty floors with an amenity deck at podium level and two or three basements of parking.',
    approach:
      'The upper floors are usually configured as larger three- and four-bedroom units, with one or two penthouses per tower. Fire systems, refuge floors and the lift specification are the parts of the brief they talk about most, which is the right conversation for a building of that height.',
    highlights: [
      'High-rise towers of eighteen to thirty floors',
      'Podium amenity decks and multi-level basement parking',
      'Larger three- and four-bedroom units on the upper floors',
      'Fire systems and refuge floors specified to the building height',
    ],
  },
  {
    name: 'Trident Habitat',
    establishedYear: 2015,
    totalProjects: 9,
    ongoingProjects: 3,
    completedProjects: 6,
    isFeatured: false,
    short:
      'Compact homes, studios and co-living blocks built close to the employment corridors for first-time buyers and tenants.',
    focus:
      'Trident Habitat builds small: studios, one-bedroom flats and managed co-living blocks placed deliberately close to the employment corridors, where the commute rather than the floor area is what a tenant is paying for.',
    approach:
      'Units are handed over semi-furnished with fitted wardrobes and a modular kitchenette, and the common areas carry the amenity load — a shared kitchen, a laundry and a work lounge on the ground floor of each block.',
    highlights: [
      'Studios, one-bedroom flats and managed co-living blocks',
      'Sited within a short commute of the employment corridors',
      'Semi-furnished handover with fitted wardrobes and kitchenette',
      'Shared kitchen, laundry and work lounge in every block',
    ],
  },
  {
    name: 'Vasanth Constructions',
    establishedYear: 1994,
    totalProjects: 58,
    ongoingProjects: 5,
    completedProjects: 53,
    isFeatured: false,
    short:
      'Builder floors and small redevelopment blocks on old sites in central and south Bengaluru, usually four to eight flats at a time.',
    focus:
      'Vasanth Constructions works on old sites in central and south Bengaluru: a single house comes down and four to eight flats go up, one or two to a floor, usually under a joint development agreement with the landowner.',
    approach:
      'Because the sites are small, the specification is where the value sits — solid-core doors, concealed plumbing with accessible shafts, and a lift even in three-floor buildings. The undivided land share attached to each flat is set out in the sale deed rather than left to be asked about.',
    highlights: [
      'Redevelopment of old sites into four to eight flat blocks',
      'Usually structured as a joint development with the landowner',
      'A lift even in three-floor buildings',
      'Undivided land share stated plainly in the sale deed',
    ],
  },
  {
    name: 'Greenfield Realty',
    establishedYear: 2011,
    totalProjects: 21,
    ongoingProjects: 6,
    completedProjects: 15,
    isFeatured: false,
    short:
      'Commercial developer of office blocks, retail units and warehousing on the eastern and northern corridors, leased rather than sold.',
    focus:
      'Greenfield Realty is a commercial developer: office blocks on the eastern corridor, high-street retail units, and warehousing and light-industrial sheds on the northern highways. Most of the portfolio is leased rather than sold.',
    approach:
      'Office floors are handed over as warm shell with the air-conditioning, fire systems and washrooms in place; the sheds come with dock levellers, a defined floor loading and three-phase power. Lease terms run to a standard lock-in, and the fit-out period is negotiated project by project.',
    highlights: [
      'Office blocks, retail units, warehousing and industrial sheds',
      'Warm-shell office handover with services already in place',
      'Dock levellers, floor loading and three-phase power on the sheds',
      'Portfolio leased rather than sold',
    ],
  },
];

module.exports = function developers({ stamps, slugify, media }) {
  return DEVELOPERS.map((entry, index) => {
    const slug = slugify(entry.name);

    return {
      id: index + 1,
      name: entry.name,
      slug,
      logoUrl: media.photo({
        seed: `sna-developer-${slug}-logo`,
        width: 200,
        height: 80,
        alt: `${entry.name} logo (placeholder)`,
        folder: 'developers',
        tags: ['developer', 'logo'],
      }),
      coverImageUrl: media.photo({
        seed: `sna-developer-${slug}-cover`,
        width: 1600,
        height: 600,
        alt: `${entry.name} — project photography (placeholder)`,
        folder: 'developers',
        tags: ['developer', 'cover'],
      }),
      description: paragraphs(
        entry.focus,
        entry.approach,
        `${entry.name} is a fictional builder created for this dataset. The projects, the counts and the registration numbers attributed to it are placeholders, and the record should be replaced with the client's own builder data before the site goes live.`
      ),
      shortDescription: entry.short,
      establishedYear: entry.establishedYear,
      headquarters: 'Bengaluru, Karnataka',
      website: null,
      totalProjects: entry.totalProjects,
      ongoingProjects: entry.ongoingProjects,
      completedProjects: entry.completedProjects,
      reraIds: [`PRM/KA/RERA/1251/446/PR/${200 + index}/placeholder`],
      highlights: entry.highlights,
      isFeatured: entry.isFeatured,
      isActive: true,
      order: index + 1,
      seo: makeSeo({
        title: `${entry.name} — Projects in Bengaluru`,
        description: fitDescription(entry.short),
        focusKeyword: `${entry.name.toLowerCase()} bengaluru`,
        secondaryKeywords: [`${entry.name.toLowerCase()} projects`, 'builders in bengaluru'],
        slug,
      }),
      // Master data is set up by the administrator (prompt 51).
      createdBy: 1,
      updatedBy: 1,
      ...stamps({ createdDaysAgo: 172 }),
    };
  });
};
