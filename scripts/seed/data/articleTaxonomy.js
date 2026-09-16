/**
 * `articleCategories` (four, D76) and `articleTags` (fifteen, §6.8).
 *
 * The four categories are the ones the master context fixes, and every seeded
 * article belongs to exactly one of them; the tags are the cross-cuts — a
 * stamp-duty piece is `legal-rera` by category and `stamp-duty`,
 * `registration` by tag.
 */

const { fitDescription, makeSeo } = require('../lib/seo');

const CATEGORIES = [
  [
    'Buying Guides',
    'buying-guides',
    'Step-by-step guidance for buyers, from shortlisting a locality to collecting the keys.',
    'property buying guide bangalore',
  ],
  [
    'Market Trends',
    'market-trends',
    'What is actually happening to supply, prices and rents across Bengaluru, locality by locality.',
    'bangalore property market trends',
  ],
  [
    'Legal & RERA',
    'legal-rera',
    'Registration, khata, approvals and the regulatory side of buying property in Karnataka.',
    'property legal guide karnataka',
  ],
  [
    'Investment & Finance',
    'investment-finance',
    'Home loans, eligibility, yields and the arithmetic behind a property decision.',
    'property investment bangalore',
  ],
];

const TAGS = [
  ['RERA', 'rera'],
  ['Khata', 'khata'],
  ['Stamp Duty', 'stamp-duty'],
  ['Home Loan', 'home-loan'],
  ['Whitefield', 'whitefield'],
  ['Sarjapur Road', 'sarjapur-road'],
  ['North Bangalore', 'north-bangalore'],
  ['NRI', 'nri'],
  ['Rental Yield', 'rental-yield'],
  ['Plots', 'plots'],
  ['First-time Buyer', 'first-time-buyer'],
  ['Checklist', 'checklist'],
  ['EMI', 'emi'],
  ['Registration', 'registration'],
  ['Investment', 'investment'],
];

module.exports = function articleTaxonomy({ stamps }) {
  const articleCategories = CATEGORIES.map(([name, slug, description, focusKeyword], index) => ({
    id: index + 1,
    name,
    slug,
    description,
    seo: makeSeo({
      title: `${name} — Bengaluru Property Insights`,
      description: fitDescription(
        `${description} Written by the Squares N Acres desks and updated when the rules change.`
      ),
      focusKeyword,
      secondaryKeywords: ['bengaluru real estate articles'],
      slug,
    }),
    order: index + 1,
    isActive: true,
    ...stamps({ createdDaysAgo: 166 }),
  }));

  const articleTags = TAGS.map(([name, slug], index) => ({
    id: index + 1,
    name,
    slug,
    ...stamps({ createdDaysAgo: 165 }),
  }));

  return { articleCategories, articleTags };
};
