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

/** A question as two questions are compared: case, spacing and the final "?" aside. */
const questionKey = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\s?？]+$/, '')
    .trim();

/**
 * The listing's own questions, then the FAQ library's questions tied to its
 * property type (QA-59).
 *
 * Admin → FAQs has always let an editor tie a question to a property type —
 * "it also appears on those listings" — and `GET /faqs?propertyTypeId=` has
 * always answered them, but no page asked: a question tied to "Office Spaces"
 * appeared on no office at all. The listing's own questions come first and
 * keep their order; the type's follow in the library's; a question the
 * listing already asks is not asked twice. A library record's id is prefixed,
 * so it can never collide with the id of one of the listing's own.
 *
 * @param {Array<object>} listingFaqs `property.faqs`
 * @param {Array<object>} typeFaqs the library's answer, in its order
 * @returns {Array<object>}
 */
export function withTypeFaqs(listingFaqs, typeFaqs) {
  const own = orderedFaqs(listingFaqs);
  const asked = new Set(own.map((faq) => questionKey(faq.question)));

  const library = (Array.isArray(typeFaqs) ? typeFaqs : [])
    .filter((faq) => faq && String(faq.question ?? '').trim() !== '')
    .filter((faq) => {
      const key = questionKey(faq.question);
      if (asked.has(key)) return false;
      asked.add(key);
      return true;
    })
    .map((faq) => ({
      id: `faq-${faq.id}`,
      question: faq.question,
      answer: faq.answer,
      order: null,
    }));

  return [...own, ...library];
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
