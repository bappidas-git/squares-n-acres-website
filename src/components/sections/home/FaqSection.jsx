import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import LegacyHtml from '../../common/LegacyHtml';
import PATHS from '../../../routes/paths';
import masterDataService from '../../../services/masterDataService';
import styles from './FaqSection.module.css';
import useApi from '../../../hooks/useApi';
import useInView from '../../../hooks/useInView';
import { FAQ_CATEGORIES } from '../../../config/enums';

/**
 * The home FAQ block. `GET /faqs?showOnHome=true` decides what appears here,
 * so an editor curates the home selection instead of the component fetching
 * everything and filtering in the browser (BUG-18).
 */

const FaqItem = ({ faq, isOpen, onToggle }) => (
  <div className={`${styles.faqItem} ${isOpen ? styles.faqItemActive : ''}`}>
    <button className={styles.faqQuestion} onClick={onToggle} aria-expanded={isOpen} type="button">
      <div className={styles.faqLeft}>
        <Icon icon="mdi:help-circle-outline" className={styles.questionIcon} />
        <span>{faq.question}</span>
      </div>
      <Icon icon={isOpen ? 'mdi:minus' : 'mdi:plus'} className={styles.expandIcon} />
    </button>
    <AnimatePresence initial={false}>
      {isOpen ? (
        <motion.div
          className={styles.faqAnswer}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <LegacyHtml className={styles.answerInner} html={faq.answer} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  </div>
);

const HOME_FAQ_PARAMS = { showOnHome: true, perPage: 24, sort: 'order' };

const FaqSection = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });
  const [activeCategory, setActiveCategory] = useState(null);
  const [openId, setOpenId] = useState(null);

  const { data, loading } = useApi(
    (signal) => masterDataService.faqs.list(HOME_FAQ_PARAMS, { signal }),
    [],
    { initialData: [] }
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

  if (loading || faqs.length === 0) return null;

  const selectCategory = (value) => {
    setActiveCategory(value);
    setOpenId(null);
  };

  return (
    <section className={styles.section} ref={ref}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className={styles.title}>Frequently asked questions</h2>
          <p className={styles.subtitle}>
            The questions buyers, sellers and tenants ask us most often
          </p>
        </motion.div>

        {categories.length > 1 ? (
          <motion.div
            className={styles.tabBar}
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <div className={styles.tabScroller}>
              {categories.map((option) => (
                <button
                  key={option.value}
                  className={`${styles.tab} ${current === option.value ? styles.tabActive : ''}`}
                  onClick={() => selectCategory(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}

        <motion.div
          className={styles.faqList}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current ?? 'all'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {visible.map((faq) => (
                <FaqItem
                  key={faq.id}
                  faq={faq}
                  isOpen={openId === faq.id}
                  onToggle={() => setOpenId((previous) => (previous === faq.id ? null : faq.id))}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div className={styles.cta}>
          <Link to={PATHS.faqs} className={styles.ctaLink}>
            View all FAQs
            <Icon icon="mdi:arrow-right" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
