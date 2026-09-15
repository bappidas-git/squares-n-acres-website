import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { partnerService } from '../../../services/api';
import styles from './PartnersSection.module.css';

const PartnerCard = ({ partner }) => {
  const content = (
    <>
      <img
        src={partner.logo}
        alt={partner.name}
        className={styles.partnerLogo}
        loading="lazy"
      />
      <span className={styles.partnerName}>{partner.name}</span>
    </>
  );

  if (partner.website) {
    return (
      <a
        href={partner.website}
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
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const data = await partnerService.getActive();
        setPartners(data);
      } catch {
        setPartners([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPartners();
  }, []);

  if (loading) return null;
  if (!partners.length) return null;

  // Duplicate partners for seamless infinite marquee loop
  const displayPartners = [...partners, ...partners];

  return (
    <section className={styles.section} ref={ref}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className={styles.title}>Our Partners</h2>
          <p className={styles.subtitle}>Trusted developers we work with</p>
        </motion.div>

        <motion.div
          className={styles.marqueeWrapper}
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className={styles.marqueeTrack}>
            {displayPartners.map((partner, idx) => (
              <PartnerCard key={`${partner.id}-${idx}`} partner={partner} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PartnersSection;
