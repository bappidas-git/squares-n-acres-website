import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Icon } from '@iconify/react';
import LeadForm from '../../components/common/LeadForm';
import styles from './SellLet.module.css';

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
const benefits = [
  { icon: 'mdi:currency-inr', title: 'Expert Pricing', desc: 'Our market analysts ensure your property is priced right with comprehensive comparative market analysis for maximum returns.' },
  { icon: 'mdi:bullhorn-outline', title: 'Wide Reach', desc: 'Your property gets exposure across multiple platforms, portals, and our extensive network of verified buyers and tenants.' },
  { icon: 'mdi:account-tie-outline', title: 'Dedicated Support', desc: 'A personal property advisor handles everything — from listing to closing — so you can sit back and relax.' },
  { icon: 'mdi:shield-check-outline', title: 'Hassle-Free Process', desc: 'We manage documentation, verification, legal checks, and negotiations. No stress, no surprises.' },
];

const steps = [
  { icon: 'mdi:clipboard-list-outline', title: 'List Your Property', desc: 'Fill out our simple form with your property details. Our team will review and get in touch within 24 hours.' },
  { icon: 'mdi:check-decagram-outline', title: 'Verify & Assess', desc: 'Our experts visit your property for assessment, professional photography, and market valuation.' },
  { icon: 'mdi:image-multiple-outline', title: 'Showcase & Market', desc: 'We create a compelling listing with professional photos and promote it across all major platforms.' },
  { icon: 'mdi:handshake-outline', title: 'Sell or Rent', desc: 'We handle buyer/tenant screening, negotiations, and documentation until the deal is successfully closed.' },
];

const stats = [
  { value: '2,500+', label: 'Properties Listed' },
  { value: '95%', label: 'Closure Rate' },
  { value: '30 Days', label: 'Average Time to Close' },
  { value: '₹500Cr+', label: 'Property Value Managed' },
];

const leadFields = [
  { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Full Name *' },
  { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Email Address *' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: 'Phone Number *' },
  {
    name: 'propertyType',
    label: 'Property Type',
    type: 'select',
    required: true,
    placeholder: 'Select Property Type *',
    options: [
      { value: 'apartment', label: 'Apartment' },
      { value: 'villa', label: 'Villa / Independent House' },
      { value: 'plot', label: 'Plot / Land' },
      { value: 'commercial', label: 'Commercial Property' },
      { value: 'penthouse', label: 'Penthouse' },
    ],
  },
  { name: 'location', label: 'Location', type: 'text', required: true, placeholder: 'Property Location *' },
  { name: 'askingPrice', label: 'Asking Price', type: 'text', required: false, placeholder: 'Expected Price (optional)' },
  { name: 'description', label: 'Description', type: 'textarea', required: false, placeholder: 'Brief description of your property...' },
];

/* ── Component ─────────────────────────────────── */
const SellLet = () => {
  return (
    <>
      <Helmet>
        <title>Sell / Let Your Property | H.O.M Advisory</title>
        <meta name="description" content="List your property with H.O.M Advisory. Get expert pricing, wide market reach, and hassle-free selling or renting experience in Bangalore." />
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
              <Icon icon="mdi:home-plus-outline" /> Property Owners
            </span>
            <h1 className={styles.heroTitle}>List Your Property with Us</h1>
            <p className={styles.heroSubtitle}>
              Whether you want to sell or rent, we provide the expertise, reach, and support
              to get you the best deal for your property.
            </p>
          </motion.div>
        </section>

        {/* ── Stats Bar ───────────────────────────── */}
        <Section className={styles.statsBar}>
          <div className={styles.container}>
            <div className={styles.statsGrid}>
              {stats.map((stat, i) => (
                <div key={i} className={styles.statItem}>
                  <span className={styles.statValue}>{stat.value}</span>
                  <span className={styles.statLabel}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Benefits ────────────────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Why List with H.O.M?</h2>
              <p className={styles.sectionSubtitle}>We offer everything you need for a successful property transaction</p>
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

        {/* ── How It Works ────────────────────────── */}
        <Section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>How It Works</h2>
              <p className={styles.sectionSubtitle}>A simple 4-step process to sell or rent your property</p>
            </div>

            <div className={styles.stepsGrid}>
              {steps.map((s, i) => (
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

        {/* ── Lead Form ───────────────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.formSection}>
              <div className={styles.formInfo}>
                <h2 className={styles.sectionTitle}>List Your Property</h2>
                <p className={styles.formInfoText}>
                  Share your property details and our team will get in touch within 24 hours
                  to start the listing process.
                </p>
                <div className={styles.formBenefits}>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:check-circle-outline" className={styles.benefitIconSm} />
                    <span>Free property valuation</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:check-circle-outline" className={styles.benefitIconSm} />
                    <span>Professional photography</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:check-circle-outline" className={styles.benefitIconSm} />
                    <span>Multi-platform promotion</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:check-circle-outline" className={styles.benefitIconSm} />
                    <span>Zero upfront charges</span>
                  </div>
                </div>
              </div>
              <LeadForm
                title="Submit Property Details"
                subtitle="Our team will review and connect within 24 hours"
                fields={leadFields}
                source="sell_let"
              />
            </div>
          </div>
        </Section>
      </div>
    </>
  );
};

export default SellLet;
