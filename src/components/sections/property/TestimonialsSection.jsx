import { useMemo } from 'react';

import Rating from '../../ui/Rating';
import SectionShell from './SectionShell';
import SharedTestimonials, { isRenderable } from '../shared/TestimonialsSection';

import styles from './TestimonialsSection.module.css';

/** Two cards across the page's main column; it is narrower than a full band. */
const ITEMS_PER_VIEW = { xs: 1.1, sm: 2, md: 2, lg: 2 };

/**
 * The testimonials a property page may show: active, and not a seeded sample
 * in a production build (D41). The page counts these, not the API's answer,
 * before it offers the section — a listing whose only quote is a sample has
 * nothing to scroll to on the live site.
 *
 * Exported for the page and the unit test.
 *
 * @param {Array<object>} testimonials `GET /testimonials?propertyId=`
 * @returns {Array<object>}
 */
export function shownTestimonials(testimonials) {
  return (Array.isArray(testimonials) ? testimonials : []).filter(isRenderable);
}

/** The mean rating, to one decimal place; `null` when nothing is rated. */
export function averageRating(testimonials) {
  const rated = (Array.isArray(testimonials) ? testimonials : []).filter(
    (testimonial) => Number(testimonial?.rating) > 0
  );
  if (rated.length === 0) return null;

  const total = rated.reduce((sum, testimonial) => sum + Number(testimonial.rating), 0);
  return Math.round((total / rated.length) * 10) / 10;
}

/**
 * What clients who bought or rented this listing say — the testimonials an
 * editor tied to it with the "Property" box of the testimonial form.
 *
 * The quotes are fetched by the page rather than here, for the reason the
 * similar row is: the section navigation may only offer the item once the API
 * has answered with something (BUG-06). The carousel is the one the home and
 * About pages use, so a quote reads the same wherever it appears; the heading
 * is this page's, with the clients' mean rating beside it.
 *
 * @param {object} props
 * @param {object} props.property the listing being viewed
 * @param {Array<object>} props.testimonials what the API answered with
 * @param {'bg'|'surface'} [props.background]
 */
export default function TestimonialsSection({ property, testimonials = [], background = 'bg' }) {
  const shown = useMemo(() => shownTestimonials(testimonials), [testimonials]);

  if (shown.length === 0) return null;

  const subject = property?.projectName || property?.title || 'this property';
  const average = averageRating(shown);

  return (
    <SectionShell
      id="testimonials"
      title={`What clients say about ${subject}`}
      subtitle={
        shown.length === 1
          ? 'From a client who bought or rented here.'
          : 'From clients who bought or rented here.'
      }
      background={background}
      action={
        average !== null ? (
          <Rating value={average} count={shown.length} className={styles.summary} />
        ) : null
      }
    >
      <SharedTestimonials
        items={shown}
        title=""
        itemsPerView={ITEMS_PER_VIEW}
        className={background === 'surface' ? styles.onSurface : ''}
      />
    </SectionShell>
  );
}
