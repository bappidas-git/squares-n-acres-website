import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import Avatar from '../../ui/Avatar';
import Carousel from '../../ui/Carousel';
import Chip from '../../ui/Chip';
import Modal from '../../ui/Modal';
import Rating from '../../ui/Rating';
import SectionHeader from '../../ui/SectionHeader';

import styles from './TestimonialsSection.module.css';

/** Cards per view, by breakpoint (§8.1). */
const ITEMS_PER_VIEW = { xs: 1.1, sm: 2, md: 3, lg: 3 };

/** Roughly the six lines a card shows before "Read more" earns its place. */
const CLAMP_CHARACTERS = 260;

/**
 * Whether a testimonial may be rendered at all.
 *
 * Inactive records never appear. Sample records — the seeded placeholders the
 * layouts were built against — appear while the site is being built and are
 * dropped from a production build (D41), so nobody has to remember to delete
 * them before go-live: the build does it.
 *
 * @param {object} testimonial
 * @returns {boolean}
 */
export function isRenderable(testimonial) {
  if (!testimonial || testimonial.isActive === false) return false;
  return !(testimonial.isSample && process.env.NODE_ENV === 'production');
}

/**
 * The testimonial carousel, shared by the home page (prompt 27), the About
 * page (prompt 30) and the CMS `testimonials` block.
 *
 * The section hides itself when nothing survives the filtering — an empty
 * band of quotation marks says less than no band at all (§8.2).
 *
 * @param {object} props
 * @param {Array<object>} props.items §6.9 testimonials
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {string} [props.eyebrow]
 */
export default function TestimonialsSection({
  items = [],
  title = 'What our clients say',
  subtitle = '',
  eyebrow = '',
  className = '',
}) {
  const [reading, setReading] = useState(null);

  const visible = useMemo(() => items.filter(isRenderable), [items]);

  if (visible.length === 0) return null;

  return (
    <div className={[styles.section, className].filter(Boolean).join(' ')}>
      {title ? (
        <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} align="center" />
      ) : null}

      <Carousel itemsPerView={ITEMS_PER_VIEW} label="Client testimonials" className={styles.rail}>
        {visible.map((testimonial) => (
          <TestimonialCard
            key={testimonial.id}
            testimonial={testimonial}
            onRead={() => setReading(testimonial)}
          />
        ))}
      </Carousel>

      <Modal
        open={Boolean(reading)}
        onClose={() => setReading(null)}
        mobile="sheet"
        size="sm"
        title={reading?.name}
        description={subtitleOf(reading)}
      >
        {reading ? (
          <>
            <Rating value={reading.rating ?? 0} showValue={false} className={styles.modalRating} />
            <p className={styles.modalMessage}>{reading.message}</p>
          </>
        ) : null}
      </Modal>
    </div>
  );
}

/** One quote. */
function TestimonialCard({ testimonial, onRead }) {
  const message = String(testimonial.message ?? '');
  const isLong = message.length > CLAMP_CHARACTERS;

  return (
    <article className={styles.card}>
      <Icon
        icon="mdi:format-quote-open"
        width="32"
        height="32"
        className={styles.quote}
        aria-hidden="true"
      />

      <Rating value={testimonial.rating ?? 0} showValue={false} className={styles.rating} />

      <p className={styles.message}>{message}</p>

      {isLong ? (
        <button type="button" className={styles.readMore} onClick={onRead}>
          Read more
          <span className={styles.srOnly}> of {testimonial.name}’s review</span>
        </button>
      ) : null}

      <footer className={styles.author}>
        <Avatar src={testimonial.avatarUrl} name={testimonial.name} size={44} />
        <span className={styles.authorText}>
          <span className={styles.authorName}>{testimonial.name}</span>
          {subtitleOf(testimonial) ? (
            <span className={styles.authorMeta}>{subtitleOf(testimonial)}</span>
          ) : null}
        </span>
        {testimonial.isSample ? (
          <Chip tone="warning" size="sm">
            Sample
          </Chip>
        ) : null}
      </footer>
    </article>
  );
}

/** "Home buyer · Whitefield, Bengaluru", with whatever half is missing left out. */
const subtitleOf = (testimonial) =>
  [testimonial?.designation, testimonial?.location].filter(Boolean).join(' · ');
