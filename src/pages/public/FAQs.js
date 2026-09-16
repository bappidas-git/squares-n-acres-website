import React, { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Icon } from '@iconify/react';

import LeadForm from '../../components/common/LeadForm';
import LegacyHtml from '../../components/common/LegacyHtml';
import masterDataService from '../../services/masterDataService';
import styles from './FAQs.module.css';
import useApiList from '../../hooks/useApiList';
import { ErrorState, Section } from '../../components/ui';
import { FAQ_CATEGORIES as CATEGORY_ENUM } from '../../config/enums';
import { SITE } from '../../config/site';
import { formatPhoneForTel } from '../../utils/format';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';

/** One icon per category of §6.17; the labels come from the enum. */
const CATEGORY_ICONS = {
  buying: 'mdi:home-search-outline',
  selling: 'mdi:tag-outline',
  renting: 'mdi:key-outline',
  'home-loan': 'mdi:bank-outline',
  legal: 'mdi:scale-balance',
  rera: 'mdi:file-certificate-outline',
  nri: 'mdi:earth',
  general: 'mdi:information-outline',
};

const TABS = [
  { value: '', label: 'All', icon: 'mdi:view-grid-outline' },
  ...CATEGORY_ENUM.options.map((option) => ({
    ...option,
    icon: CATEGORY_ICONS[option.value] ?? 'mdi:help-circle-outline',
  })),
];

const LIST_DEFAULTS = { page: 1, perPage: 100, category: '', q: '' };
const LIST_PARAM_KEYS = { category: 'string', q: 'string' };

const FaqItem = ({ faq, isOpen, onToggle, index }) => (
  <motion.div
    className={`${styles.faqItem} ${isOpen ? styles.faqOpen : ''}`}
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.05, duration: 0.3 }}
  >
    <button className={styles.faqQuestion} onClick={onToggle} aria-expanded={isOpen}>
      <span className={styles.faqQuestionText}>{faq.question}</span>
      <motion.span
        className={styles.faqArrow}
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <Icon icon="mdi:chevron-down" />
      </motion.span>
    </button>
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          className={styles.faqAnswer}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <LegacyHtml html={faq.answer} />
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

const contactFields = [
  { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Your Name *' },
  { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Email Address *' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: 'Phone Number *' },
  {
    name: 'message',
    label: 'Your Question',
    type: 'textarea',
    required: true,
    placeholder: 'Type your question here *',
  },
];

const FAQs = () => {
  const [openFaqId, setOpenFaqId] = useState(null);
  const { getContact, getWhatsappLink } = useSiteSettings();
  const contact = getContact();

  const { items, loading, error, params, setFilters, refetch } = useApiList(
    (listParams, options) => masterDataService.faqs.list(listParams, options),
    {
      syncToUrl: true,
      paramKeys: LIST_PARAM_KEYS,
      defaults: LIST_DEFAULTS,
      debounceMs: 300,
    }
  );

  const activeCategory = params.category ?? '';

  /** Without a category tab the list is grouped, so the page stays scannable. */
  const groupedFaqs = useMemo(() => {
    if (activeCategory) return [{ category: activeCategory, items }];

    const groups = new Map();
    items.forEach((faq) => {
      if (!groups.has(faq.category)) groups.set(faq.category, []);
      groups.get(faq.category).push(faq);
    });
    return [...groups.entries()].map(([category, rows]) => ({ category, items: rows }));
  }, [items, activeCategory]);

  const toggleFaq = useCallback(
    (id) => setOpenFaqId((previous) => (previous === id ? null : id)),
    []
  );

  const handleCategoryChange = (category) => {
    setFilters({ category });
    setOpenFaqId(null);
  };

  return (
    <>
      <Helmet>
        <title>{`Frequently Asked Questions | ${SITE.name}`}</title>
        <meta
          name="description"
          content={`Find answers to common questions about buying, selling, renting properties, home loans, legal processes, and more at ${SITE.name}.`}
        />
      </Helmet>

      <div className={styles.page}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroOverlay} />
          <motion.div
            className={styles.heroContent}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className={styles.heroBadge}>
              <Icon icon="mdi:frequently-asked-questions" /> Help Center
            </span>
            <h1 className={styles.heroTitle}>Frequently Asked Questions</h1>
            <p className={styles.heroSubtitle}>
              Find answers to common questions about buying, selling, renting properties, home
              loans, and legal processes in Indian real estate.
            </p>
          </motion.div>
        </section>

        {/* FAQ Content */}
        <Section className={styles.section}>
          <div className={styles.container}>
            {/* Search */}
            <div className={styles.searchBar}>
              <Icon icon="mdi:magnify" className={styles.searchIcon} />
              <label className={styles.srOnly} htmlFor="faq-search">
                Search questions
              </label>
              <input
                id="faq-search"
                type="text"
                placeholder="Search for a question"
                value={params.q ?? ''}
                onChange={(event) => {
                  setFilters({ q: event.target.value });
                  setOpenFaqId(null);
                }}
                className={styles.searchInput}
              />
              {params.q ? (
                <button
                  className={styles.clearSearch}
                  onClick={() => setFilters({ q: '' })}
                  aria-label="Clear search"
                  type="button"
                >
                  <Icon icon="mdi:close" />
                </button>
              ) : null}
            </div>

            {/* Category Tabs */}
            <div className={styles.categoryTabs}>
              {TABS.map((tab) => (
                <button
                  key={tab.value || 'all'}
                  className={`${styles.tab} ${activeCategory === tab.value ? styles.tabActive : ''}`}
                  onClick={() => handleCategoryChange(tab.value)}
                  type="button"
                >
                  <Icon icon={tab.icon} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* FAQ List */}
            {error ? (
              <ErrorState
                title="We could not load the questions"
                text={error.message}
                onRetry={refetch}
              />
            ) : loading ? (
              <div className={styles.loadingState}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={styles.skeletonItem}>
                    <div
                      className={styles.skeletonLine}
                      style={{ width: `${70 + Math.random() * 20}%` }}
                    />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className={styles.emptyState}>
                <Icon icon="mdi:help-circle-outline" className={styles.emptyIcon} />
                <h2>No questions found</h2>
                <p>Try a different search term, or another category.</p>
              </div>
            ) : (
              <div className={styles.faqGroups}>
                {groupedFaqs.map((group) => (
                  <div key={group.category} className={styles.faqGroup}>
                    {!activeCategory ? (
                      <h2 className={styles.groupTitle}>
                        {CATEGORY_ENUM.labelOf(group.category) || group.category}
                      </h2>
                    ) : null}
                    <div className={styles.faqList}>
                      {group.items.map((faq, i) => (
                        <FaqItem
                          key={faq.id}
                          faq={faq}
                          isOpen={openFaqId === faq.id}
                          onToggle={() => toggleFaq(faq.id)}
                          index={i}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* Can't find answer? */}
        <Section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.contactSection}>
              <div className={styles.contactInfo}>
                <h2 className={styles.contactTitle}>Still have questions?</h2>
                <p className={styles.contactText}>
                  Send it over and an advisor will come back to you with a proper answer rather than
                  a brochure.
                </p>
                <div className={styles.contactMethods}>
                  {contact.phone ? (
                    <a
                      className={styles.contactMethod}
                      href={`tel:${formatPhoneForTel(contact.phone)}`}
                    >
                      <Icon icon="mdi:phone-outline" className={styles.contactMethodIcon} />
                      <span>
                        <span className={styles.contactMethodLabel}>Call us</span>
                        <span className={styles.contactMethodValue}>{contact.phone}</span>
                      </span>
                    </a>
                  ) : null}
                  {contact.email ? (
                    <a className={styles.contactMethod} href={`mailto:${contact.email}`}>
                      <Icon icon="mdi:email-outline" className={styles.contactMethodIcon} />
                      <span>
                        <span className={styles.contactMethodLabel}>Email us</span>
                        <span className={styles.contactMethodValue}>{contact.email}</span>
                      </span>
                    </a>
                  ) : null}
                  {contact.whatsappNumber ? (
                    <a
                      className={styles.contactMethod}
                      href={getWhatsappLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon icon="mdi:whatsapp" className={styles.contactMethodIcon} />
                      <span>
                        <span className={styles.contactMethodLabel}>WhatsApp</span>
                        <span className={styles.contactMethodValue}>Chat with us</span>
                      </span>
                    </a>
                  ) : null}
                </div>
              </div>
              <LeadForm
                title="Ask your question"
                subtitle="We answer as soon as we can"
                fields={contactFields}
                source="contact-page"
              />
            </div>
          </div>
        </Section>
      </div>
    </>
  );
};

export default FAQs;
