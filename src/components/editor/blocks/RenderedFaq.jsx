import FaqAccordion from '../../sections/shared/FaqAccordion';

import styles from './rendered.module.css';

/**
 * The `data-sna-block="faq"` placeholder, as the reader sees it.
 *
 * It is the site's one accordion rather than a second implementation, so a
 * question inside an article behaves exactly like a question on the FAQ page —
 * same keyboard handling, same headings, same reduced-motion behaviour. The
 * questions are also handed up to the page through `SafeHtml`'s `onFaqItems`,
 * which is how they reach the `FAQPage` structured data.
 *
 * @param {object} props
 * @param {Array<{id?: string|number, question: string, answer: string}>} props.items
 */
export default function RenderedFaq({ items = [] }) {
  const questions = items
    .filter((item) => item?.question)
    .map((item, index) => ({ ...item, id: item.id ?? `q-${index}` }));

  if (questions.length === 0) return null;

  return (
    <div className={styles.faq}>
      <FaqAccordion items={questions} headingLevel={3} />
    </div>
  );
}
