import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useInView } from 'react-intersection-observer';
import { faqService } from '../../../services/api';
import styles from './FaqSection.module.css';

const FaqItem = ({ faq, isOpen, onToggle }) => {
  return (
    <div className={`${styles.faqItem} ${isOpen ? styles.faqItemActive : ''}`}>
      <button className={styles.faqQuestion} onClick={onToggle} aria-expanded={isOpen}>
        <div className={styles.faqLeft}>
          <Icon icon="mdi:help-circle-outline" className={styles.questionIcon} />
          <span>{faq.question}</span>
        </div>
        <Icon
          icon={isOpen ? 'mdi:minus' : 'mdi:plus'}
          className={styles.expandIcon}
        />
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
            <div className={styles.answerInner}>{faq.answer}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FaqSection = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('general');
  const [openId, setOpenId] = useState(null);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const data = await faqService.getAll({ isActive: true });
        const activeFaqs = (Array.isArray(data) ? data : []).filter(
          (f) => f.isActive !== false
        );
        setFaqs(activeFaqs);
      } catch {
        setFaqs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  // Derive categories dynamically from API data
  const categories = useMemo(() => {
    const catSet = new Map();
    faqs.forEach((faq) => {
      if (faq.category && !catSet.has(faq.category)) {
        const label = faq.category
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        catSet.set(faq.category, label);
      }
    });

    // Ensure "general" comes first if it exists
    const entries = Array.from(catSet.entries());
    entries.sort((a, b) => {
      if (a[0] === 'general') return -1;
      if (b[0] === 'general') return 1;
      return a[1].localeCompare(b[1]);
    });

    return entries.map(([value, label]) => ({ value, label }));
  }, [faqs]);

  // Set default tab to "general" if available, else first category
  useEffect(() => {
    if (categories.length > 0 && !categories.find((c) => c.value === activeCategory)) {
      setActiveCategory(categories[0].value);
    }
  }, [categories, activeCategory]);

  // Filter FAQs by active category
  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => faq.category === activeCategory);
  }, [faqs, activeCategory]);

  const handleTabChange = (category) => {
    setActiveCategory(category);
    setOpenId(null);
  };

  const handleToggle = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  if (loading) return null;
  if (!faqs.length) return null;

  return (
    <section className={styles.section} ref={ref}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className={styles.title}>Frequently Asked Questions</h2>
          <p className={styles.subtitle}>
            Get answers to common questions about buying and selling properties
          </p>
        </motion.div>

        {/* Category Tabs */}
        {categories.length > 1 && (
          <motion.div
            className={styles.tabBar}
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <div className={styles.tabScroller}>
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  className={`${styles.tab} ${
                    activeCategory === cat.value ? styles.tabActive : ''
                  }`}
                  onClick={() => handleTabChange(cat.value)}
                  type="button"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* FAQ List */}
        <motion.div
          className={styles.faqList}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq) => (
                  <FaqItem
                    key={faq.id}
                    faq={faq}
                    isOpen={openId === faq.id}
                    onToggle={() => handleToggle(faq.id)}
                  />
                ))
              ) : (
                <div className={styles.emptyCategory}>
                  <Icon icon="mdi:help-circle-outline" className={styles.emptyIcon} />
                  <p className={styles.emptyText}>
                    No FAQs available in this category yet.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div className={styles.cta}>
          <Link to="/insights/faqs" className={styles.ctaLink}>
            View All FAQs
            <Icon icon="mdi:arrow-right" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
