/**
 * `testimonials` — eight **samples** (§6.9, D41).
 *
 * Every record carries `isSample: true`, which is what keeps them off a
 * production build: a fabricated client quote is the seed content most likely
 * to be mistaken for real, and the "Sample —" prefix plus the initialled
 * name make the status obvious even in a screenshot.
 */

const TESTIMONIALS = [
  {
    name: 'Sample — A. Rao',
    designation: 'Sample testimonial',
    location: 'Whitefield, Bengaluru',
    rating: 5,
    property: 1,
    message:
      'Sample copy for layout purposes. The advisor shortlisted four projects that actually matched our brief instead of twenty that did not, and told us plainly which of them had a possession risk. Replace with a genuine client quote before go-live.',
  },
  {
    name: 'Sample — S. Menon',
    designation: 'Sample testimonial',
    location: 'HSR Layout, Bengaluru',
    rating: 5,
    property: null,
    message:
      'Sample copy for layout purposes. We were relocating from another city and did the first six visits over video; nothing on the ground contradicted what we had been told. Replace with a genuine client quote before go-live.',
  },
  {
    name: 'Sample — R. Krishnan',
    designation: 'Sample testimonial',
    location: 'Sarjapur Road, Bengaluru',
    rating: 4,
    property: null,
    message:
      'Sample copy for layout purposes. The documentation check caught a khata problem that would have delayed our loan by weeks. Replace with a genuine client quote before go-live.',
  },
  {
    name: 'Sample — P. Shetty',
    designation: 'Sample testimonial',
    location: 'Hebbal, Bengaluru',
    rating: 5,
    property: null,
    message:
      'Sample copy for layout purposes. What we valued was one person staying with the file from the first call to registration, rather than being handed between departments. Replace with a genuine client quote before go-live.',
  },
  {
    name: 'Sample — N. Iyer',
    designation: 'Sample testimonial',
    location: 'Koramangala, Bengaluru',
    rating: 4,
    property: null,
    message:
      'Sample copy for layout purposes. We let our flat through them and the tenant screening was thorough enough that we have had no issue in a full cycle. Replace with a genuine client quote before go-live.',
  },
  {
    name: 'Sample — V. Reddy',
    designation: 'Sample testimonial',
    location: 'Devanahalli, Bengaluru',
    rating: 5,
    property: null,
    message:
      'Sample copy for layout purposes. Buying a site is mostly about approvals, and we were walked through each one rather than being told it was all in order. Replace with a genuine client quote before go-live.',
  },
  {
    name: 'Sample — K. Bhat',
    designation: 'Sample testimonial',
    location: 'Jayanagar, Bengaluru',
    rating: 4,
    property: null,
    message:
      'Sample copy for layout purposes. The valuation advice was honest about what our flat would not fetch, which saved us two months of an unsold listing. Replace with a genuine client quote before go-live.',
  },
  {
    name: 'Sample — T. Fernandes',
    designation: 'Sample testimonial',
    location: 'Indiranagar, Bengaluru',
    rating: 5,
    property: null,
    message:
      'Sample copy for layout purposes. The loan coordination was the part we had dreaded, and it turned out to be the part we spent least time on. Replace with a genuine client quote before go-live.',
  },
];

module.exports = function testimonials({ stamps, propertyIds }) {
  return TESTIMONIALS.map((entry, index) => ({
    id: index + 1,
    name: entry.name,
    designation: entry.designation,
    location: entry.location,
    rating: entry.rating,
    message: entry.message,
    avatarUrl: null,
    propertyId: entry.property && propertyIds.includes(entry.property) ? entry.property : null,
    isFeatured: index < 4,
    isActive: true,
    order: index + 1,
    isSample: true,
    ...stamps({ minAge: 40, maxAge: 150 }),
  }));
};
