import { useMemo } from 'react';

import FaqAccordion from '../../sections/shared/FaqAccordion';
import masterDataService from '../../../services/masterDataService';
import useApi from '../../../hooks/useApi';
import { Container, Section, SectionHeader } from '../../ui';

/**
 * Questions and answers (§6.10 `faq`).
 *
 * Two sources, and a page may use both: `faqIds` names records of the FAQ
 * library — fetched with `GET /faqs?ids=` so they arrive in the order the
 * editor picked them, and so editing an answer under Content → FAQs changes it
 * on every page that shows it — while `items[]` holds questions written on the
 * page itself, for the ones that belong to nothing else.
 */
export default function FaqBlock({ data = {}, background = 'bg' }) {
  const ids = Array.isArray(data.faqIds) ? data.faqIds : [];
  const idsKey = ids.join(',');

  const { data: fetched } = useApi(
    (signal) => masterDataService.faqs.list({ ids: idsKey, perPage: ids.length }, { signal }),
    [idsKey],
    { enabled: ids.length > 0, initialData: [] }
  );

  const items = useMemo(() => {
    const fromLibrary = (Array.isArray(fetched) ? fetched : []).map((faq) => ({
      id: `faq-${faq.id}`,
      question: faq.question,
      answer: faq.answer,
    }));

    const written = (Array.isArray(data.items) ? data.items : [])
      .filter((item) => item?.question)
      .map((item, index) => ({
        id: `item-${index}`,
        question: item.question,
        answer: item.answer,
      }));

    return [...fromLibrary, ...written];
  }, [fetched, data.items]);

  if (items.length === 0) return null;

  return (
    <Section background={background} spacing="lg">
      <Container size="narrow">
        {data.title ? <SectionHeader title={data.title} align="center" /> : null}
        <FaqAccordion items={items} />
      </Container>
    </Section>
  );
}

FaqBlock.isEmpty = (data) =>
  (Array.isArray(data?.faqIds) ? data.faqIds : []).length === 0 &&
  !(Array.isArray(data?.items) ? data.items : []).some((item) => item?.question);
