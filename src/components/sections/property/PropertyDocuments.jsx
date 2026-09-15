import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useInView } from 'react-intersection-observer';
import styles from './PropertyDocuments.module.css';

const INITIAL_VISIBLE = 2;

const DocCard = ({ doc, idx, inView, onDownloadClick }) => (
  <motion.div
    className={styles.docItem}
    initial={{ opacity: 0, x: -10 }}
    animate={inView ? { opacity: 1, x: 0 } : {}}
    transition={{ duration: 0.3, delay: idx * 0.08 }}
  >
    <div className={styles.docIcon}>
      <Icon icon={doc.icon || 'mdi:file-document'} />
    </div>
    <span className={styles.docName}>{doc.name || 'Document'}</span>
    <div className={styles.docRight}>
      <div className={styles.docStatus}>
        <Icon icon="mdi:check-circle" className={styles.checkIcon} />
        <span>Available</span>
      </div>
      <div className={styles.downloadBtnWrap}>
        <button
          className={styles.downloadBtn}
          onClick={() => onDownloadClick && onDownloadClick(doc.name || 'Document')}
          aria-label={`Download ${doc.name || 'Document'}`}
        >
          <Icon icon="mdi:download" />
        </button>
        <span className={styles.tooltip}>Download {doc.name || 'Document'}</span>
      </div>
    </div>
  </motion.div>
);

const PropertyDocuments = ({ documents = [], onDownloadClick }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const [expanded, setExpanded] = useState(false);

  if (documents.length === 0) return null;

  const initialDocs = documents.slice(0, INITIAL_VISIBLE);
  const extraDocs = documents.slice(INITIAL_VISIBLE);
  const remainingCount = extraDocs.length;

  return (
    <section className={styles.section} ref={ref} id="documents">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <h2 className={styles.title}>Property Documents</h2>

        <div className={styles.list}>
          {/* Always-visible first 2 cards */}
          {initialDocs.map((doc, idx) => (
            <DocCard
              key={idx}
              doc={doc}
              idx={idx}
              inView={inView}
              onDownloadClick={onDownloadClick}
            />
          ))}

          {/* Expandable extra cards */}
          <AnimatePresence initial={false}>
            {expanded &&
              extraDocs.map((doc, idx) => (
                <motion.div
                  key={`extra-${idx}`}
                  className={styles.docItem}
                  initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.3, delay: idx * 0.06 }}
                >
                  <div className={styles.docIcon}>
                    <Icon icon={doc.icon || 'mdi:file-document'} />
                  </div>
                  <span className={styles.docName}>{doc.name}</span>
                  <div className={styles.docRight}>
                    <div className={styles.docStatus}>
                      <Icon icon="mdi:check-circle" className={styles.checkIcon} />
                      <span>Available</span>
                    </div>
                    <div className={styles.downloadBtnWrap}>
                      <button
                        className={styles.downloadBtn}
                        onClick={() => onDownloadClick && onDownloadClick(doc.name)}
                        aria-label={`Download ${doc.name}`}
                      >
                        <Icon icon="mdi:download" />
                      </button>
                      <span className={styles.tooltip}>Download {doc.name}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>

        {/* View More / Show Less button */}
        {remainingCount > 0 && (
          <button
            className={styles.viewMoreBtn}
            onClick={() => setExpanded((prev) => !prev)}
          >
            <Icon icon={expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} />
            {expanded
              ? 'Show Less'
              : `View ${remainingCount} More Document${remainingCount > 1 ? 's' : ''}`}
          </button>
        )}
      </motion.div>
    </section>
  );
};

export default PropertyDocuments;
