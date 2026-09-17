import { useMemo } from 'react';

import FaqAccordion from '../shared/FaqAccordion';
import SectionShell from './SectionShell';

import styles from './FaqsSection.module.css';

/**
 * The questions asked about this listing, in the editor's order.
 *
 * Exported for the unit test.
 *
 * @param {Array<{id: number, question: string, answer: string, order?: number}>} faqs
 * @returns {Array<object>}
 */
export function orderedFaqs(faqs) {
  return (Array.isArray(faqs) ? faqs : [])
    .filter((faq) => faq && String(faq.question ?? '').trim() !== '')
    .map((faq, index) => ({ faq, index }))
    .sort((a, b) => {
      const order = (entry) =>
        entry.faq.order === null || entry.faq.order === undefined ? null : Number(entry.faq.order);
      if (order(a) !== null && order(b) !== null && order(a) !== order(b)) {
        return order(a) - order(b);
      }
      return a.index - b.index;
    })
    .map((entry) => entry.faq);
}

/**
 * The listing's own FAQs, in the one accordion the whole site uses.
 *
 * The `FAQPage` structured data for these items is emitted by `<Seo faqs>` on
 * `PropertyDetails`, which merges them with the questions the description
 * carries — the accordion is the reading experience, not the markup.
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 * @param {'bg'|'surface'} [props.background]
 */
export default function FaqsSection({ property, background = 'bg' }) {
  const faqs = useMemo(() => orderedFaqs(property?.faqs), [property]);

  if (faqs.length === 0) return null;

  const subject = property?.projectName || property?.title || 'this property';

  return (
    <SectionShell id="faqs" title={`FAQs about ${subject}`} background={background}>
      <FaqAccordion items={faqs} defaultOpenId={faqs[0].id} className={styles.accordion} />
    </SectionShell>
  );
}
