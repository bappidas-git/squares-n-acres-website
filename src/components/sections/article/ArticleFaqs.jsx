import FaqAccordion from '../shared/FaqAccordion';

import styles from './ArticleFaqs.module.css';
import { BLOG } from '../../../config/copy';

/**
 * The questions under an article: the ones the record carries (§6.8 `faqs`)
 * and the ones an editor dropped into the body as a FAQ block, merged into one
 * list by the page above. Two accordions saying the same thing in different
 * places is what merging them avoids.
 *
 * It exists as a component of its own — rather than the page reaching for
 * `FaqAccordion` directly — so that the accordion's stylesheet enters the
 * blog's chunk at one fixed point in `index.js`'s order. See the note there.
 *
 * @param {object} props
 * @param {Array<{id: string|number, question: string, answer: string}>} props.items
 * @param {string} [props.title]
 */
export default function ArticleFaqs({ items = [], title = BLOG.faqs, className = '' }) {
  if (items.length === 0) return null;

  return (
    <section className={[styles.faqs, className].filter(Boolean).join(' ')}>
      <h2 className={styles.title}>{title}</h2>
      <FaqAccordion items={items} headingLevel={3} />
    </section>
  );
}
