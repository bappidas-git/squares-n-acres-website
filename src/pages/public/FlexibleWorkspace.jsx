import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Icon } from '@iconify/react';
import LeadForm from '../../components/common/LeadForm';
import styles from './FlexibleWorkspace.module.css';

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
const workspaceTypes = [
  { icon: 'mdi:desk', title: 'Hot Desks', desc: 'Flexible day-use desks in premium shared environments — ideal for freelancers and remote workers.' },
  { icon: 'mdi:door-closed-lock', title: 'Dedicated Desks', desc: 'Your own permanent desk in a shared office — perfect for individuals who need consistency.' },
  { icon: 'mdi:office-building-outline', title: 'Private Offices', desc: 'Fully furnished private offices for teams of 2 to 50+ with customisable layouts.' },
  { icon: 'mdi:account-group-outline', title: 'Meeting Rooms', desc: 'Professional meeting and conference rooms available on-demand with AV equipment.' },
  { icon: 'mdi:domain', title: 'Virtual Offices', desc: 'A prestigious business address with mail handling, call forwarding, and access to meeting rooms.' },
  { icon: 'mdi:calendar-month-outline', title: 'Day Passes', desc: 'Pay-as-you-go access to coworking spaces — no commitment, full flexibility.' },
];

const benefits = [
  { icon: 'mdi:map-marker-outline', title: 'Prime Locations', desc: 'Access workspaces in top business districts across the city.' },
  { icon: 'mdi:cash-multiple', title: 'Cost Effective', desc: 'Save up to 40% compared to traditional office leases with all-inclusive pricing.' },
  { icon: 'mdi:arrow-expand-all', title: 'Scale Freely', desc: 'Start with a single desk and scale to a full floor as your team grows.' },
  { icon: 'mdi:wifi', title: 'Fully Equipped', desc: 'High-speed internet, printing, pantry, and housekeeping — all included.' },
];

const leadFields = [
  { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Full Name *' },
  { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Email Address *' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: 'Phone Number *' },
  {
    name: 'workspaceType',
    label: 'Workspace Type',
    type: 'select',
    required: true,
    placeholder: 'Select Workspace Type *',
    options: [
      { value: 'hot-desk', label: 'Hot Desk' },
      { value: 'dedicated-desk', label: 'Dedicated Desk' },
      { value: 'private-office', label: 'Private Office' },
      { value: 'meeting-room', label: 'Meeting Room' },
      { value: 'virtual-office', label: 'Virtual Office' },
    ],
  },
  { name: 'teamSize', label: 'Team Size', type: 'text', required: false, placeholder: 'Number of seats needed (optional)' },
  { name: 'message', label: 'Requirements', type: 'textarea', required: false, placeholder: 'Any specific requirements...' },
];

/* ── Component ─────────────────────────────────── */
const FlexibleWorkspace = () => {
  return (
    <>
      <Helmet>
        <title>Flexible Workspace Solutions | H.O.M Advisory</title>
        <meta name="description" content="Find flexible workspace solutions — coworking spaces, private offices, meeting rooms, and virtual offices in prime business locations." />
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
              <Icon icon="mdi:desk" /> Flexible Workspaces
            </span>
            <h1 className={styles.heroTitle}>Workspace That Adapts to You</h1>
            <p className={styles.heroSubtitle}>
              From hot desks to private offices, find flexible workspace solutions
              in premium locations designed to fuel productivity and growth.
            </p>
          </motion.div>
        </section>

        {/* ── Workspace Types ───────────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Workspace Solutions</h2>
              <p className={styles.sectionSubtitle}>Choose the workspace model that fits your business needs</p>
            </div>

            <div className={styles.typesGrid}>
              {workspaceTypes.map((type, i) => (
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
              <h2 className={styles.sectionTitle}>Why Flexible Workspace?</h2>
              <p className={styles.sectionSubtitle}>The smarter way to work</p>
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

        {/* ── Lead Form ─────────────────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.formSection}>
              <div className={styles.formInfo}>
                <h2 className={styles.sectionTitle}>Find Your Workspace</h2>
                <p className={styles.formInfoText}>
                  Tell us your requirements and our workspace consultants will connect you
                  with the best options within 24 hours.
                </p>
                <div className={styles.formBenefits}>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:check-circle-outline" className={styles.benefitIconSm} />
                    <span>No brokerage fees</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:check-circle-outline" className={styles.benefitIconSm} />
                    <span>Flexible lease terms</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:check-circle-outline" className={styles.benefitIconSm} />
                    <span>Move-in ready spaces</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:check-circle-outline" className={styles.benefitIconSm} />
                    <span>All-inclusive pricing</span>
                  </div>
                </div>
              </div>
              <LeadForm
                title="Enquire About Workspaces"
                subtitle="Our team will curate the best options for you"
                fields={leadFields}
                source="flexible_workspace"
              />
            </div>
          </div>
        </Section>
      </div>
    </>
  );
};

export default FlexibleWorkspace;
