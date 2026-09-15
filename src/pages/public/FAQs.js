import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Icon } from '@iconify/react';
import { faqService } from '../../services/api';
import LeadForm from '../../components/common/LeadForm';
import styles from './FAQs.module.css';

const FAQ_CATEGORIES = [
  { value: 'all', label: 'All', icon: 'mdi:view-grid-outline' },
  { value: 'buying', label: 'Buying', icon: 'mdi:home-search-outline' },
  { value: 'selling', label: 'Selling', icon: 'mdi:tag-outline' },
  { value: 'renting', label: 'Renting', icon: 'mdi:key-outline' },
  { value: 'home-loan', label: 'Home Loans', icon: 'mdi:bank-outline' },
  { value: 'legal', label: 'Legal', icon: 'mdi:scale-balance' },
  { value: 'general', label: 'General', icon: 'mdi:information-outline' },
];

const Section = ({ children, className = '', delay = 0 }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  return (
    <motion.section
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.section>
  );
};

const FaqItem = ({ faq, isOpen, onToggle, index }) => (
  <motion.div
    className={`${styles.faqItem} ${isOpen ? styles.faqOpen : ''}`}
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.05, duration: 0.3 }}
  >
    <button
      className={styles.faqQuestion}
      onClick={onToggle}
      aria-expanded={isOpen}
    >
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
          <p>{faq.answer}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

const contactFields = [
  { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Your Name *' },
  { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Email Address *' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: 'Phone Number *' },
  { name: 'message', label: 'Your Question', type: 'textarea', required: true, placeholder: 'Type your question here *' },
];

const FAQs = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqId, setOpenFaqId] = useState(null);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const data = await faqService.getAll({ isActive: true });
        setFaqs(data);
      } catch (err) {
        // FAQs fetch failed — UI shows empty state
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const filtered = useMemo(() => {
    let result = faqs;
    if (activeCategory !== 'all') {
      result = result.filter((f) => f.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q)
      );
    }
    return result;
  }, [faqs, activeCategory, searchQuery]);

  // Group FAQs by category
  const groupedFaqs = useMemo(() => {
    if (activeCategory !== 'all') {
      return [{ category: activeCategory, items: filtered }];
    }
    const groups = {};
    filtered.forEach((faq) => {
      if (!groups[faq.category]) groups[faq.category] = [];
      groups[faq.category].push(faq);
    });
    return Object.entries(groups).map(([category, items]) => ({ category, items }));
  }, [filtered, activeCategory]);

  const toggleFaq = useCallback(
    (id) => setOpenFaqId((prev) => (prev === id ? null : id)),
    []
  );

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setOpenFaqId(null);
  };

  const formatCategoryLabel = (cat) => {
    const found = FAQ_CATEGORIES.find((c) => c.value === cat);
    return found ? found.label : cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  return (
    <>
      <Helmet>
        <title>Frequently Asked Questions | H.O.M Advisory</title>
        <meta
          name="description"
          content="Find answers to common questions about buying, selling, renting properties, home loans, legal processes, and more at H.O.M Advisory."
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
              Find answers to common questions about buying, selling, renting properties,
              home loans, and legal processes in Indian real estate.
            </p>
          </motion.div>
        </section>

        {/* FAQ Content */}
        <Section className={styles.section}>
          <div className={styles.container}>
            {/* Search */}
            <div className={styles.searchBar}>
              <Icon icon="mdi:magnify" className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search for a question..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setOpenFaqId(null);
                }}
                className={styles.searchInput}
              />
              {searchQuery && (
                <button
                  className={styles.clearSearch}
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <Icon icon="mdi:close" />
                </button>
              )}
            </div>

            {/* Category Tabs */}
            <div className={styles.categoryTabs}>
              {FAQ_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  className={`${styles.tab} ${activeCategory === cat.value ? styles.tabActive : ''}`}
                  onClick={() => handleCategoryChange(cat.value)}
                >
                  <Icon icon={cat.icon} />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* FAQ List */}
            {loading ? (
              <div className={styles.loadingState}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={styles.skeletonItem}>
                    <div className={styles.skeletonLine} style={{ width: `${70 + Math.random() * 20}%` }} />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className={styles.emptyState}>
                <Icon icon="mdi:help-circle-outline" className={styles.emptyIcon} />
                <h3>No questions found</h3>
                <p>Try a different search term or category.</p>
              </div>
            ) : (
              <div className={styles.faqGroups}>
                {groupedFaqs.map((group) => (
                  <div key={group.category} className={styles.faqGroup}>
                    {activeCategory === 'all' && (
                      <h3 className={styles.groupTitle}>{formatCategoryLabel(group.category)}</h3>
                    )}
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
                <h2 className={styles.contactTitle}>Can't find your answer?</h2>
                <p className={styles.contactText}>
                  Our real estate experts are here to help. Submit your question and we'll
                  get back to you with a detailed answer.
                </p>
                <div className={styles.contactMethods}>
                  <div className={styles.contactMethod}>
                    <Icon icon="mdi:phone-outline" className={styles.contactMethodIcon} />
                    <div>
                      <span className={styles.contactMethodLabel}>Call Us</span>
                      <span className={styles.contactMethodValue}>(555) 123-4567</span>
                    </div>
                  </div>
                  <div className={styles.contactMethod}>
                    <Icon icon="mdi:email-outline" className={styles.contactMethodIcon} />
                    <div>
                      <span className={styles.contactMethodLabel}>Email Us</span>
                      <span className={styles.contactMethodValue}>info@homadvisory.com</span>
                    </div>
                  </div>
                  <div className={styles.contactMethod}>
                    <Icon icon="mdi:whatsapp" className={styles.contactMethodIcon} />
                    <div>
                      <span className={styles.contactMethodLabel}>WhatsApp</span>
                      <span className={styles.contactMethodValue}>Chat with us</span>
                    </div>
                  </div>
                </div>
              </div>
              <LeadForm
                title="Ask Your Question"
                subtitle="We typically respond within 24 hours"
                fields={contactFields}
                source="faq_contact"
              />
            </div>
          </div>
        </Section>
      </div>
    </>
  );
};

export default FAQs;
