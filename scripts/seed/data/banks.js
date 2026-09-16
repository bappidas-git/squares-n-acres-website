/**
 * `banks` — six **fictional** lenders (§6.6, §14).
 *
 * Real bank brands are the one category of placeholder that could do actual
 * harm: a rate card with a recognisable name on it reads as a quotation. Every
 * name here is invented, every rate is inside a plausible band, and both the
 * `processingFeeNote` and the first feature line say the numbers are
 * indicative. When no active bank exists the finance section hides itself, so
 * the client can empty this collection rather than correct it.
 */

const BANKS = [
  {
    name: 'Garden City Bank',
    interestRateMin: 8.35,
    interestRateMax: 8.95,
    maxLtvPercent: 80,
    minLoanAmount: 500000,
    maxLoanAmount: 75000000,
    features: [
      'Indicative rates; confirm the current card with the lender',
      'Balance transfer from another lender with top-up',
      'Doorstep document collection across Bengaluru',
    ],
  },
  {
    name: 'Southern Housing Finance',
    interestRateMin: 8.55,
    interestRateMax: 9.15,
    maxLtvPercent: 85,
    minLoanAmount: 300000,
    maxLoanAmount: 50000000,
    features: [
      'Indicative rates; confirm the current card with the lender',
      'Self-employed income assessed on three years of returns',
      'Part-prepayment allowed without a charge on floating rates',
    ],
  },
  {
    name: 'Nandi Cooperative Bank',
    interestRateMin: 8.75,
    interestRateMax: 9.25,
    maxLtvPercent: 80,
    minLoanAmount: 250000,
    maxLoanAmount: 25000000,
    features: [
      'Indicative rates; confirm the current card with the lender',
      'Branch-led processing with a single point of contact',
      'Plot-plus-construction loans on approved layouts',
    ],
  },
  {
    name: 'Cauvery Home Finance',
    interestRateMin: 8.45,
    interestRateMax: 9.05,
    maxLtvPercent: 90,
    minLoanAmount: 500000,
    maxLoanAmount: 40000000,
    features: [
      'Indicative rates; confirm the current card with the lender',
      'Higher loan-to-value on smaller ticket sizes',
      'Co-applicant income combined for eligibility',
    ],
  },
  {
    name: 'Metro Capital Bank',
    interestRateMin: 8.4,
    interestRateMax: 9.0,
    maxLtvPercent: 85,
    minLoanAmount: 1000000,
    maxLoanAmount: 150000000,
    features: [
      'Indicative rates; confirm the current card with the lender',
      'Sanction valid for six months while you shortlist',
      'Project-approved lists for most large developments',
    ],
  },
  {
    name: 'Prime Housing NBFC',
    interestRateMin: 8.85,
    interestRateMax: 9.25,
    maxLtvPercent: 90,
    minLoanAmount: 300000,
    maxLoanAmount: 30000000,
    features: [
      'Indicative rates; confirm the current card with the lender',
      'Considers applicants with a thin or short credit history',
      'Step-up repayment for early-career borrowers',
    ],
  },
];

module.exports = function banks({ stamps, slugify, media }) {
  return BANKS.map((entry, index) => {
    const slug = slugify(entry.name);

    return {
      id: index + 1,
      name: entry.name,
      slug,
      logoUrl: media.photo({
        seed: `sna-bank-${slug}`,
        width: 200,
        height: 80,
        alt: `${entry.name} logo (placeholder)`,
        folder: 'banks',
        tags: ['bank', 'logo'],
      }),
      interestRateMin: entry.interestRateMin,
      interestRateMax: entry.interestRateMax,
      processingFeeNote: 'Indicative; confirm with the bank',
      maxTenureYears: 30,
      maxLtvPercent: entry.maxLtvPercent,
      minLoanAmount: entry.minLoanAmount,
      maxLoanAmount: entry.maxLoanAmount,
      features: entry.features,
      applyUrl: null,
      isActive: true,
      order: index + 1,
      ...stamps({ createdDaysAgo: 170 }),
    };
  });
};
