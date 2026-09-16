/**
 * `authors` — three desks rather than three people (§6.8, §14).
 *
 * Inventing a journalist with a biography and a photograph would put a
 * fictional person's byline on advice about somebody's largest purchase. The
 * seed credits desks instead, says in each biography that the record is a
 * placeholder, and leaves the client to replace them with real credits.
 */

const { fitDescription, makeSeo } = require('../lib/seo');
const { paragraphs } = require('../lib/text');

const AUTHORS = [
  {
    name: 'Editorial Team',
    designation: 'Editorial desk (placeholder)',
    focus:
      'The editorial desk writes and edits the buying guides, the locality pieces and the checklists on this site. Articles are reviewed against the current position of the relevant authority before publication and re-checked when a rule changes.',
    keyword: 'squares n acres editorial team',
  },
  {
    name: 'Research Desk',
    designation: 'Market research (placeholder)',
    focus:
      'The research desk tracks supply, pricing and absorption across the localities Squares N Acres covers, and writes the market pieces and the yield comparisons. Where a number comes from a third party, the piece says so.',
    keyword: 'squares n acres research desk',
  },
  {
    name: 'Legal Desk',
    designation: 'Legal and compliance (placeholder)',
    focus:
      'The legal desk covers registration, khata, approvals and the regulatory side of buying in Karnataka. Nothing it publishes is legal advice on a specific transaction; it is written to help you ask a lawyer the right questions.',
    keyword: 'squares n acres legal desk',
  },
];

module.exports = function authors({ stamps, slugify, media }) {
  return AUTHORS.map((entry, index) => {
    const slug = slugify(entry.name);

    return {
      id: index + 1,
      name: entry.name,
      slug,
      designation: entry.designation,
      bio: paragraphs(
        entry.focus,
        'This is a placeholder author record. Replace the name, the designation, the photograph and this biography with the client’s own editorial credits before the site goes live.'
      ),
      avatarUrl: media.photo({
        seed: `sna-author-${slug}`,
        width: 320,
        height: 320,
        alt: `${entry.name} (placeholder avatar)`,
        folder: 'authors',
        tags: ['author'],
      }),
      email: null,
      socialLinks: {
        linkedin: null,
        twitter: null,
        facebook: null,
        instagram: null,
        website: null,
      },
      isActive: true,
      seo: makeSeo({
        title: `${entry.name} — Squares N Acres`,
        description: fitDescription(
          `Articles by the ${entry.name.toLowerCase()} at Squares N Acres on buying, renting and investing in Bengaluru property.`
        ),
        focusKeyword: entry.keyword,
        secondaryKeywords: ['bengaluru property guides'],
        slug,
      }),
      ...stamps({ createdDaysAgo: 168 }),
    };
  });
};
