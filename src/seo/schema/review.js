/**
 * Testimonials as reviews (§9.3) — and only the genuine ones.
 *
 * Seed testimonials carry `isSample: true`, and publishing a sample review as
 * a real one is exactly the misrepresentation review markup is policed for. So
 * the sample records are dropped here rather than left to a caller to remember.
 */

import { compact } from './graph';

const genuine = (testimonials) =>
  (Array.isArray(testimonials) ? testimonials : []).filter(
    (row) => row && row.isSample !== true && row.isActive !== false && Number(row.rating) > 0
  );

/**
 * @param {{testimonials?: Array<object>, canonical?: string}} input
 * @param {object} [_context] unused; the testimonials come from the caller
 * @returns {Array<object>} `Review` nodes, empty when nothing is publishable
 */
export function reviewNodes(input = {}, _context = {}) {
  const canonical = input.canonical ?? '';

  return genuine(input.testimonials).map((testimonial, index) =>
    compact({
      '@type': 'Review',
      '@id': canonical ? `${canonical}#review-${testimonial.id ?? index + 1}` : undefined,
      author: { '@type': 'Person', name: testimonial.name },
      datePublished: testimonial.createdAt ? String(testimonial.createdAt).slice(0, 10) : undefined,
      reviewBody: testimonial.message,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: Number(testimonial.rating),
        bestRating: 5,
        worstRating: 1,
      },
    })
  );
}

/**
 * The rating summary the organisation node carries.
 *
 * @param {Array<object>} testimonials
 * @returns {object|null}
 */
export function aggregateRatingNode(testimonials = []) {
  const rows = genuine(testimonials);
  if (!rows.length) return null;

  const total = rows.reduce((sum, row) => sum + Number(row.rating), 0);
  return {
    '@type': 'AggregateRating',
    ratingValue: Math.round((total / rows.length) * 10) / 10,
    reviewCount: rows.length,
    bestRating: 5,
    worstRating: 1,
  };
}

export default reviewNodes;
