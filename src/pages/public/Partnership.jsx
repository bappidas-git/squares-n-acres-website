import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Icon } from '@iconify/react';
import LeadForm from '../../components/common/LeadForm';
import styles from './Partnership.module.css';

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
const whyPartner = [
  { icon: 'mdi:account-group-outline', title: 'Extensive Reach', desc: 'Access our vast network of qualified buyers, investors, and tenants across Bangalore and beyond.' },
  { icon: 'mdi:chart-line', title: 'Market Expertise', desc: 'Leverage our deep knowledge of Bangalore real estate market trends, pricing, and demand patterns.' },
  { icon: 'mdi:bullhorn-outline', title: 'Marketing Power', desc: 'Benefit from our multi-channel marketing engine — digital campaigns, social media, events, and more.' },
  { icon: 'mdi:cog-outline', title: 'Technology Platform', desc: 'Use our advanced CRM, analytics, and property management tools to streamline operations.' },
];

const partnerTypes = [
  { icon: 'mdi:office-building-outline', title: 'Builders & Developers', desc: 'Partner with us to market your residential and commercial projects to our qualified buyer network.' },
  { icon: 'mdi:badge-account-outline', title: 'Real Estate Agents', desc: 'Join our agent network for shared inventory access, referral programs, and co-marketing opportunities.' },
  { icon: 'mdi:bank-outline', title: 'Financial Institutions', desc: 'Collaborate on home loan solutions, insurance products, and financial advisory services for buyers.' },
  { icon: 'mdi:palette-outline', title: 'Interior Designers', desc: 'Connect with homebuyers who need interior design and furnishing services for their new properties.' },
];

const partners = [
  { name: 'Prestige Group', type: 'Builder' },
  { name: 'Brigade Enterprises', type: 'Builder' },
  { name: 'Sobha Ltd', type: 'Builder' },
  { name: 'Godrej Properties', type: 'Builder' },
  { name: 'SBI Home Loans', type: 'Financial' },
  { name: 'HDFC Home Finance', type: 'Financial' },
  { name: 'Design Cafe', type: 'Interior' },
  { name: 'HomeLane', type: 'Interior' },
];

const leadFields = [
  { name: 'companyName', label: 'Company Name', type: 'text', required: true, placeholder: 'Company Name *' },
  { name: 'name', label: 'Contact Person', type: 'text', required: true, placeholder: 'Contact Person *' },
  { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Email Address *' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: 'Phone Number *' },
  {
    name: 'partnershipType',
    label: 'Partnership Type',
    type: 'select',
    required: true,
    placeholder: 'Select Partnership Type *',
    options: [
      { value: 'builder', label: 'Builder / Developer' },
      { value: 'agent', label: 'Real Estate Agent' },
      { value: 'financial', label: 'Financial Institution' },
      { value: 'interior', label: 'Interior Designer' },
      { value: 'other', label: 'Other' },
    ],
  },
  { name: 'message', label: 'Message', type: 'textarea', required: false, placeholder: 'Tell us about your partnership interest...' },
];

/* ── Component ─────────────────────────────────── */
const Partnership = () => {
  return (
    <>
      <Helmet>
        <title>Partnership | H.O.M Advisory</title>
        <meta name="description" content="Partner with H.O.M Advisory. Builders, agents, financial institutions, and interior designers — grow your business through our extensive network in Bangalore." />
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
              <Icon icon="mdi:handshake-outline" /> Partnerships
            </span>
            <h1 className={styles.heroTitle}>Let's Grow Together</h1>
            <p className={styles.heroSubtitle}>
              Partner with Bangalore's leading real estate advisory firm. Together, we can
              create exceptional value for our clients and grow our businesses.
            </p>
          </motion.div>
        </section>

        {/* ── Why Partner ─────────────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Why Partner with Us</h2>
              <p className={styles.sectionSubtitle}>The advantages of joining the H.O.M Advisory ecosystem</p>
            </div>

            <div className={styles.whyGrid}>
              {whyPartner.map((item, i) => (
                <motion.div
                  key={i}
                  className={styles.whyCard}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                >
                  <div className={styles.whyIcon}>
                    <Icon icon={item.icon} />
                  </div>
                  <h3 className={styles.whyTitle}>{item.title}</h3>
                  <p className={styles.whyDesc}>{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Partner Types ───────────────────────── */}
        <Section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Partnership Opportunities</h2>
              <p className={styles.sectionSubtitle}>We partner with diverse industry players</p>
            </div>

            <div className={styles.typesGrid}>
              {partnerTypes.map((type, i) => (
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

        {/* ── Current Partners ────────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Our Partners</h2>
              <p className={styles.sectionSubtitle}>Trusted by leading brands in real estate and allied industries</p>
            </div>

            <div className={styles.partnersGrid}>
              {partners.map((partner, i) => (
                <motion.div
                  key={i}
                  className={styles.partnerCard}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                  <Icon icon="mdi:domain" className={styles.partnerLogo} />
                  <span className={styles.partnerName}>{partner.name}</span>
                  <span className={styles.partnerType}>{partner.type}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Lead Form ───────────────────────────── */}
        <Section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.formSection}>
              <div className={styles.formInfo}>
                <h2 className={styles.sectionTitle}>Become a Partner</h2>
                <p className={styles.formInfoText}>
                  Interested in partnering with H.O.M Advisory? Share your details and our
                  partnerships team will reach out to discuss opportunities.
                </p>
                <div className={styles.formBenefits}>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:check-circle-outline" className={styles.benefitIcon} />
                    <span>Dedicated partnership manager</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:check-circle-outline" className={styles.benefitIcon} />
                    <span>Co-marketing opportunities</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:check-circle-outline" className={styles.benefitIcon} />
                    <span>Shared lead network</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:check-circle-outline" className={styles.benefitIcon} />
                    <span>Technology integration support</span>
                  </div>
                </div>
              </div>
              <LeadForm
                title="Partnership Inquiry"
                subtitle="Tell us about your company and partnership interest"
                fields={leadFields}
                source="partnership"
              />
            </div>
          </div>
        </Section>
      </div>
    </>
  );
};

export default Partnership;
