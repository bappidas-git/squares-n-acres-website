import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import FaqAccordion from '../shared/FaqAccordion';
import PATHS from '../../../routes/paths';
import masterDataService from '../../../services/masterDataService';
import useApi from '../../../hooks/useApi';
import useDeferredSection from '../../../hooks/useDeferredSection';
import { Container, Section, SectionHeader } from '../../ui';
import { FAQ_CATEGORIES } from '../../../config/enums';

import styles from './FaqSection.module.css';

/**
 * The home FAQ block.
 *
 * `GET /faqs?showOnHome=true` decides what appears here, so an editor curates
 * the home selection in Admin → FAQs instead of the component fetching
 * everything and filtering in the browser (BUG-18). The accordion itself is
 * the shared one, so a question reads and behaves the same here as it does on
 * `/insights/faqs`.
 */
const HOME_FAQ_PARAMS = { showOnHome: true, perPage: 24, sort: 'order' };

export default function FaqSection() {
  const [activeCategory, setActiveCategory] = useState(null);
  const { ref, ready } = useDeferredSection();

  const { data, loading } = useApi(
    (signal) => masterDataService.faqs.list(HOME_FAQ_PARAMS, { signal }),
    [],
    { enabled: ready, initialData: [] }
  );

  const faqs = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  /** The categories present in the answer set, in the enum's own order. */
  const categories = useMemo(() => {
    const present = new Set(faqs.map((faq) => faq.category).filter(Boolean));
    return FAQ_CATEGORIES.options.filter((option) => present.has(option.value));
  }, [faqs]);

  const current =
    categories.find((option) => option.value === activeCategory)?.value ??
    categories[0]?.value ??
    null;

  const visible = current ? faqs.filter((faq) => faq.category === current) : faqs;

  // Nothing to answer yet, or the answer is still on its way: the home page
  // goes straight from one band to the next rather than showing an empty one.
  // Until the band is scrolled to, the answer has not even been asked for
  // (§8.6); the empty div is the observer's target and draws no box.
  if (!ready || loading || faqs.length === 0) {
    return <div ref={ref} aria-hidden="true" />;
  }

  return (
    <Section background="bg" spacing="lg">
      <Container size="narrow">
        <SectionHeader
          title="Frequently asked questions"
          subtitle="The questions buyers, sellers and tenants ask us most often"
          align="center"
        />

        {categories.length > 1 ? (
          <div className={styles.tabBar}>
            <div className={styles.tabScroller} role="tablist" aria-label="FAQ categories">
              {categories.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={current === option.value}
                  className={`${styles.tab} ${current === option.value ? styles.tabActive : ''}`}
                  onClick={() => setActiveCategory(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <FaqAccordion items={visible} className={styles.list} />

        <div className={styles.cta}>
          <Link to={PATHS.faqs} className={styles.ctaLink}>
            View all FAQs
            <Icon icon="mdi:arrow-right" width="18" height="18" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </Section>
  );
}
