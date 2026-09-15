import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useInView } from 'react-intersection-observer';
import styles from './PropertyFaq.module.css';

const FaqItem = ({ faq, isOpen, onToggle }) => (
  <div className={`${styles.faqItem} ${isOpen ? styles.faqItemActive : ''}`}>
    <button className={styles.faqQuestion} onClick={onToggle} aria-expanded={isOpen}>
      <span className={styles.questionText}>{faq.question}</span>
      <Icon icon={isOpen ? 'mdi:minus' : 'mdi:plus'} className={styles.expandIcon} />
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

const PropertyFaq = ({ property }) => {
  const [openIdx, setOpenIdx] = useState(null);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  // Return null if no FAQs from API — no auto-generated fallback
  const faqs = property?.faqs;
  if (!faqs || faqs.length === 0) return null;

  return (
    <section className={styles.section} ref={ref} id="faqs">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <h2 className={styles.title}>FAQs About This Project</h2>

        <div className={styles.faqList}>
          {faqs.map((faq, idx) => (
            <FaqItem
              key={idx}
              faq={faq}
              index={idx}
              isOpen={openIdx === idx}
              onToggle={() => setOpenIdx((prev) => (prev === idx ? null : idx))}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default PropertyFaq;
