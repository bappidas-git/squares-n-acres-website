import React, { useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { Section } from '../../components/ui';
import { useLeadCapture } from '../../contexts/LeadCaptureContext';
import styles from './Careers.module.css';
import { BRAND, SITE } from '../../config/site';

/* ── Animated section wrapper ──────────────────── */
/* ── Static data ───────────────────────────────── */
const cultureItems = [
  {
    icon: 'mdi:account-group-outline',
    title: 'Collaborative Environment',
    desc: 'Work alongside talented professionals who value teamwork, open communication, and shared success.',
  },
  {
    icon: 'mdi:trending-up',
    title: 'Growth Opportunities',
    desc: 'Continuous learning programs, mentorship, and clear career paths to help you reach your full potential.',
  },
  {
    icon: 'mdi:lightbulb-on-outline',
    title: 'Innovation First',
    desc: 'We encourage fresh ideas and creative approaches to solving real estate challenges.',
  },
];

const positions = [
  {
    id: 1,
    title: 'Real Estate Advisor',
    department: 'Sales',
    location: 'Bangalore',
    type: 'Full-time',
    desc: 'Guide clients through property buying and investment decisions. Build relationships, understand client needs, and match them with the perfect property from our portfolio.',
  },
  {
    id: 2,
    title: 'Digital Marketing Specialist',
    department: 'Marketing',
    location: 'Bangalore',
    type: 'Full-time',
    desc: 'Drive online visibility and lead generation through SEO, social media, content marketing, and paid campaigns. Manage our digital presence across all platforms.',
  },
  {
    id: 3,
    title: 'Property Analyst',
    department: 'Research',
    location: 'Bangalore',
    type: 'Full-time',
    desc: 'Analyze market trends, property valuations, and investment opportunities. Prepare detailed reports that help clients and our team make data-driven decisions.',
  },
  {
    id: 4,
    title: 'Customer Relations Manager',
    department: 'Operations',
    location: 'Bangalore',
    type: 'Part-time',
    desc: 'Ensure exceptional client satisfaction throughout the property transaction lifecycle. Manage client communications, feedback, and post-sale support.',
  },
];

const perks = [
  {
    icon: 'mdi:currency-inr',
    title: 'Competitive Salary',
    desc: 'Industry-leading compensation with performance bonuses',
  },
  {
    icon: 'mdi:hospital-box-outline',
    title: 'Health Insurance',
    desc: 'Comprehensive medical coverage for you and your family',
  },
  {
    icon: 'mdi:school-outline',
    title: 'Learning Budget',
    desc: 'Annual allowance for courses, certifications, and conferences',
  },
  {
    icon: 'mdi:clock-outline',
    title: 'Flexible Hours',
    desc: 'Work-life balance with flexible scheduling options',
  },
  {
    icon: 'mdi:home-outline',
    title: 'Work from Home',
    desc: 'Hybrid work model with remote work flexibility',
  },
  {
    icon: 'mdi:party-popper',
    title: 'Team Events',
    desc: 'Regular outings, celebrations, and team-building activities',
  },
];

/* ── Component ─────────────────────────────────── */
const Careers = () => {
  const { openLeadModal } = useLeadCapture();

  // The shared dialog, with the role in `meta` so the desk sees what was
  // applied for (D56). A real application — the résumé upload and the
  // `jobApplications` record — is prompt 31's; this keeps the entry point
  // working and files the enquiry under the canonical `careers` source (D91).
  const openModal = useCallback(
    (positionTitle) =>
      openLeadModal({
        entry: 'careers',
        title: `Apply for ${positionTitle}`,
        subtitle: 'Tell us about yourself and an advisor will come back to you.',
        meta: { position: positionTitle },
      }),
    [openLeadModal]
  );

  return (
    <>
      <Helmet>
        <title>{`Careers | ${SITE.name}`}</title>
        <meta
          name="description"
          content={`Join ${SITE.name} and build a rewarding career in real estate. Explore open positions and be part of Bangalore's leading property advisory firm.`}
        />
      </Helmet>

      <div className={styles.page}>
        {/* ── Hero ────────────────────────────────── */}
        <section className={styles.hero}>
          <div className={styles.heroOverlay} />
          <motion.div
            className={styles.heroContent}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className={styles.heroBadge}>
              <Icon icon="mdi:briefcase-outline" /> Careers
            </span>
            <h1 className={styles.heroTitle}>Build Your Career with Us</h1>
            <p className={styles.heroSubtitle}>
              Join a team of passionate professionals who are transforming the real estate
              experience. Grow your career while making a difference.
            </p>
          </motion.div>
        </section>

        {/* ── Culture ─────────────────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Our Culture</h2>
              <p className={styles.sectionSubtitle}>
                What makes {BRAND.name} a great place to work
              </p>
            </div>

            <div className={styles.cultureGrid}>
              {cultureItems.map((item, i) => (
                <motion.div
                  key={i}
                  className={styles.cultureCard}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                >
                  <div className={styles.cultureIcon}>
                    <Icon icon={item.icon} />
                  </div>
                  <h3 className={styles.cultureTitle}>{item.title}</h3>
                  <p className={styles.cultureDesc}>{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Open Positions ──────────────────────── */}
        <Section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Open Positions</h2>
              <p className={styles.sectionSubtitle}>Find your next opportunity with us</p>
            </div>

            <div className={styles.positionsList}>
              {positions.map((pos, i) => (
                <motion.div
                  key={pos.id}
                  className={styles.positionCard}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                >
                  <div className={styles.positionHeader}>
                    <div>
                      <h3 className={styles.positionTitle}>{pos.title}</h3>
                      <div className={styles.positionMeta}>
                        <span className={styles.metaItem}>
                          <Icon icon="mdi:domain" /> {pos.department}
                        </span>
                        <span className={styles.metaItem}>
                          <Icon icon="mdi:map-marker-outline" /> {pos.location}
                        </span>
                        <span className={`${styles.metaItem} ${styles.typeBadge}`}>{pos.type}</span>
                      </div>
                    </div>
                    <button className={styles.applyBtn} onClick={() => openModal(pos.title)}>
                      Apply Now <Icon icon="mdi:arrow-right" />
                    </button>
                  </div>
                  <p className={styles.positionDesc}>{pos.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Perks & Benefits ────────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Perks & Benefits</h2>
              <p className={styles.sectionSubtitle}>We take care of our people</p>
            </div>

            <div className={styles.perksGrid}>
              {perks.map((perk, i) => (
                <motion.div
                  key={i}
                  className={styles.perkCard}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                >
                  <Icon icon={perk.icon} className={styles.perkIcon} />
                  <h3 className={styles.perkTitle}>{perk.title}</h3>
                  <p className={styles.perkDesc}>{perk.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>
      </div>
    </>
  );
};

export default Careers;
