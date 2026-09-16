import React from 'react';
import { motion } from 'framer-motion';

import masterDataService from '../../../services/masterDataService';
import styles from './PartnersSection.module.css';
import useApi from '../../../hooks/useApi';
import useInView from '../../../hooks/useInView';

/**
 * The partner marquee. `GET /partners` returns active partners in `order`
 * (§5.14); the logos are whatever an editor uploaded.
 */

const PartnerCard = ({ partner }) => {
  const content = (
    <>
      {partner.logoUrl ? (
        <img
          src={partner.logoUrl}
          alt={partner.name}
          className={styles.partnerLogo}
          loading="lazy"
        />
      ) : null}
      <span className={styles.partnerName}>{partner.name}</span>
    </>
  );

  if (partner.websiteUrl) {
    return (
      <a
        href={partner.websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.partnerCard}
      >
        {content}
      </a>
    );
  }

  return <div className={styles.partnerCard}>{content}</div>;
};

const PartnersSection = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });
  const { data, loading } = useApi(
    (signal) => masterDataService.partners.list({ perPage: 24 }, { signal }),
    [],
    { initialData: [] }
  );

  const partners = Array.isArray(data) ? data : [];
  if (loading || partners.length === 0) return null;

  // The track is duplicated so the marquee loops without a visible seam.
  const track = [...partners, ...partners];

  return (
    <section className={styles.section} ref={ref}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className={styles.title}>Our partners</h2>
          <p className={styles.subtitle}>Developers and specialists we work with</p>
        </motion.div>

        <motion.div
          className={styles.marqueeWrapper}
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className={styles.marqueeTrack}>
            {track.map((partner, index) => (
              <PartnerCard key={`${partner.id}-${index}`} partner={partner} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PartnersSection;
