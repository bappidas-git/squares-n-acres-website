import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Icon } from '@iconify/react';
import LeadForm from '../../components/common/LeadForm';
import styles from './DirectLeaseRetails.module.css';

/* ── Animated section wrapper ──────────────────── */
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

/* ── Static data ───────────────────────────────── */
const spaceTypes = [
  { icon: 'mdi:store-outline', title: 'Retail Shops', desc: 'High-footfall retail spaces in malls, high streets, and mixed-use developments.' },
  { icon: 'mdi:office-building-outline', title: 'Office Spaces', desc: 'Grade-A commercial office spaces available on direct lease from landlords.' },
  { icon: 'mdi:warehouse', title: 'Showrooms', desc: 'Large-format showroom spaces for automobile, furniture, and lifestyle brands.' },
  { icon: 'mdi:food-outline', title: 'F&B Outlets', desc: 'Ready-to-operate food court and restaurant spaces in prime dining destinations.' },
];

const benefits = [
  { icon: 'mdi:handshake-outline', title: 'Direct from Landlord', desc: 'No intermediaries — negotiate directly with property owners for the best terms.' },
  { icon: 'mdi:cash-remove', title: 'Zero Brokerage', desc: 'Save lakhs in brokerage fees with our direct landlord connections.' },
  { icon: 'mdi:file-document-check-outline', title: 'Transparent Terms', desc: 'Clear lease agreements with no hidden charges or escalation surprises.' },
  { icon: 'mdi:map-marker-check-outline', title: 'Prime Locations', desc: 'Access to premium retail and commercial spaces in high-demand areas.' },
];

const process = [
  { icon: 'mdi:clipboard-list-outline', title: 'Share Requirements', desc: 'Tell us your space needs — type, size, budget, and preferred locations.' },
  { icon: 'mdi:magnify', title: 'Curated Options', desc: 'We shortlist the best matching spaces from our direct landlord network.' },
  { icon: 'mdi:eye-outline', title: 'Site Visits', desc: 'Visit shortlisted properties with our commercial real estate experts.' },
  { icon: 'mdi:file-sign', title: 'Lease & Move In', desc: 'We facilitate the lease agreement and handover for a smooth transition.' },
];

const leadFields = [
  { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Full Name *' },
  { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Email Address *' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: 'Phone Number *' },
  {
    name: 'spaceType',
    label: 'Space Type',
    type: 'select',
    required: true,
    placeholder: 'Select Space Type *',
    options: [
      { value: 'retail-shop', label: 'Retail Shop' },
      { value: 'office-space', label: 'Office Space' },
      { value: 'showroom', label: 'Showroom' },
      { value: 'fnb-outlet', label: 'F&B Outlet' },
      { value: 'other', label: 'Other' },
    ],
  },
  { name: 'areaRequired', label: 'Area Required', type: 'text', required: false, placeholder: 'Approx. area in sq.ft (optional)' },
  { name: 'message', label: 'Requirements', type: 'textarea', required: false, placeholder: 'Location preference, budget, or any specific needs...' },
];

/* ── Component ─────────────────────────────────── */
const DirectLeaseRetails = () => {
  return (
    <>
      <Helmet>
        <title>Direct Lease & Retails | H.O.M Advisory</title>
        <meta name="description" content="Find retail shops, office spaces, showrooms, and F&B outlets on direct lease from landlords. Zero brokerage, transparent terms, prime locations." />
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
              <Icon icon="mdi:store-outline" /> Direct Lease
            </span>
            <h1 className={styles.heroTitle}>Direct Lease & Retail Spaces</h1>
            <p className={styles.heroSubtitle}>
              Access premium commercial and retail spaces directly from landlords —
              no intermediaries, zero brokerage, transparent terms.
            </p>
          </motion.div>
        </section>

        {/* ── Space Types ───────────────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Space Categories</h2>
              <p className={styles.sectionSubtitle}>Commercial spaces to power your business</p>
            </div>

            <div className={styles.typesGrid}>
              {spaceTypes.map((type, i) => (
                <motion.div
                  key={i}
                  className={styles.typeCard}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                >
                  <div className={styles.typeIcon}>
                    <Icon icon={type.icon} />
                  </div>
                  <h3 className={styles.typeTitle}>{type.title}</h3>
                  <p className={styles.typeDesc}>{type.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Benefits ──────────────────────────────── */}
        <Section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Why Direct Lease?</h2>
              <p className={styles.sectionSubtitle}>The advantages of leasing directly</p>
            </div>

            <div className={styles.benefitsGrid}>
              {benefits.map((b, i) => (
                <motion.div
                  key={i}
                  className={styles.benefitCard}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                >
                  <div className={styles.benefitIcon}>
                    <Icon icon={b.icon} />
                  </div>
                  <h3 className={styles.benefitTitle}>{b.title}</h3>
                  <p className={styles.benefitDesc}>{b.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Process ───────────────────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>How It Works</h2>
              <p className={styles.sectionSubtitle}>A simple process from search to move-in</p>
            </div>

            <div className={styles.stepsGrid}>
              {process.map((s, i) => (
                <motion.div
                  key={i}
                  className={styles.stepCard}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                >
                  <div className={styles.stepNumber}>{i + 1}</div>
                  <div className={styles.stepIcon}>
                    <Icon icon={s.icon} />
                  </div>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Lead Form ─────────────────────────────── */}
        <Section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.formSection}>
              <div className={styles.formInfo}>
                <h2 className={styles.sectionTitle}>Find Your Space</h2>
                <p className={styles.formInfoText}>
                  Share your requirements and our commercial real estate experts will
                  present the best options within 48 hours.
                </p>
                <div className={styles.formBenefits}>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:check-circle-outline" className={styles.benefitIconSm} />
                    <span>Zero brokerage</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:check-circle-outline" className={styles.benefitIconSm} />
                    <span>Direct landlord connect</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:check-circle-outline" className={styles.benefitIconSm} />
                    <span>Lease negotiation support</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:check-circle-outline" className={styles.benefitIconSm} />
                    <span>End-to-end assistance</span>
                  </div>
                </div>
              </div>
              <LeadForm
                title="Enquire About Spaces"
                subtitle="Our team will curate the best options for you"
                fields={leadFields}
                source="direct_lease_retails"
              />
            </div>
          </div>
        </Section>
      </div>
    </>
  );
};

export default DirectLeaseRetails;
