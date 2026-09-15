import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Icon } from '@iconify/react';
import LeadForm from '../../components/common/LeadForm';
import styles from './LegalAssistance.module.css';

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
const services = [
  {
    icon: 'mdi:file-search-outline',
    title: 'Title Verification',
    desc: 'Thorough verification of property title history to ensure clear and marketable ownership.',
    detail: 'Our legal experts conduct an exhaustive search of all title documents going back 30+ years. We verify the chain of ownership, check for encumbrances, liens, and pending litigation, and provide a comprehensive title report with our opinion on the property\'s legal status.',
  },
  {
    icon: 'mdi:file-document-edit-outline',
    title: 'Agreement Drafting',
    desc: 'Professional drafting and review of sale agreements, rental agreements, and MOUs.',
    detail: 'We draft airtight legal agreements that protect your interests. This includes sale deeds, sale agreements, lease agreements, joint development agreements, and memorandums of understanding. Every clause is carefully crafted to prevent future disputes.',
  },
  {
    icon: 'mdi:shield-check-outline',
    title: 'RERA Compliance',
    desc: 'Complete RERA registration verification and compliance checks for your property.',
    detail: 'We verify the RERA registration of the project, check compliance with RERA timelines and commitments, review the builder\'s track record, and ensure all statutory approvals are in place. This protects your investment and ensures legal compliance.',
  },
  {
    icon: 'mdi:home-account',
    title: 'Property Registration',
    desc: 'End-to-end assistance with property registration at the Sub-Registrar\'s office.',
    detail: 'Our team handles the entire registration process — from document preparation and stamp duty calculation to scheduling the appointment and accompanying you to the Sub-Registrar\'s office. We ensure the registration is completed correctly and efficiently.',
  },
  {
    icon: 'mdi:magnify-scan',
    title: 'Due Diligence',
    desc: 'Comprehensive legal due diligence covering all aspects of the property.',
    detail: 'Our due diligence covers property tax verification, encumbrance certificate analysis, land use and zoning compliance, building plan approvals, environmental clearances, and any pending litigation. We leave no stone unturned to protect your investment.',
  },
  {
    icon: 'mdi:scale-balance',
    title: 'Dispute Resolution',
    desc: 'Expert legal representation and resolution for property-related disputes.',
    detail: 'Whether it\'s a boundary dispute, possession issue, builder delay, or inheritance conflict, our experienced legal team provides strategic counsel and representation. We explore mediation, arbitration, and litigation options to achieve the best outcome for you.',
  },
];

const processSteps = [
  {
    icon: 'mdi:calendar-check-outline',
    title: 'Book Consultation',
    desc: 'Schedule a free consultation with our legal experts online or by phone.',
  },
  {
    icon: 'mdi:file-search-outline',
    title: 'Document Review',
    desc: 'Our team reviews your documents and conducts a thorough legal analysis.',
  },
  {
    icon: 'mdi:check-decagram-outline',
    title: 'Expert Guidance',
    desc: 'Receive a detailed report with recommendations and next steps.',
  },
];

const stats = [
  { value: '15+', label: 'Years of Experience', icon: 'mdi:calendar-star' },
  { value: '5,000+', label: 'Cases Handled', icon: 'mdi:briefcase-check-outline' },
  { value: '98%', label: 'Success Rate', icon: 'mdi:trending-up' },
  { value: '50+', label: 'Legal Experts', icon: 'mdi:account-group-outline' },
];

const faqs = [
  { q: 'How long does property title verification take?', a: 'A standard title verification takes 7-10 working days. For properties with complex ownership histories, it may take up to 15 days. We provide preliminary findings within 3-4 days.' },
  { q: 'What is the cost of property registration in Karnataka?', a: 'In Karnataka, stamp duty is 5% of the property value (3% for rural areas), and registration charges are 1%. Additional surcharge and cess may apply. We provide a complete cost breakdown during consultation.' },
  { q: 'Do I need a lawyer for property registration?', a: 'While not legally mandatory, having a lawyer is highly recommended. A legal expert ensures all documents are proper, the sale deed is correctly drafted, and your interests are protected during the registration process.' },
  { q: 'What is an encumbrance certificate and why is it important?', a: 'An Encumbrance Certificate (EC) is a document that certifies the property is free from any legal or monetary liabilities. It shows all registered transactions on the property and is essential for verifying clean title and obtaining home loans.' },
  { q: 'Can you help with inherited property disputes?', a: 'Yes, we have extensive experience handling inherited property matters including succession certificates, legal heir certificates, property partition, and dispute resolution among heirs. We recommend early legal intervention to avoid prolonged disputes.' },
  { q: 'What is RERA and how does it protect home buyers?', a: 'RERA (Real Estate Regulatory Authority) is a regulatory body that ensures transparency and accountability in real estate. It protects buyers by mandating project registration, timely delivery, quality standards, and providing a grievance redressal mechanism.' },
];

const leadFields = [
  { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Full Name *' },
  { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Email Address *' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: 'Phone Number *' },
  {
    name: 'serviceType',
    label: 'Service Required',
    type: 'select',
    required: true,
    placeholder: 'Select Service *',
    options: [
      { value: 'title-verification', label: 'Title Verification' },
      { value: 'agreement-drafting', label: 'Agreement Drafting' },
      { value: 'rera-compliance', label: 'RERA Compliance' },
      { value: 'property-registration', label: 'Property Registration' },
      { value: 'due-diligence', label: 'Due Diligence' },
      { value: 'dispute-resolution', label: 'Dispute Resolution' },
    ],
  },
  { name: 'message', label: 'Message', type: 'textarea', required: false, placeholder: 'Describe your requirement...' },
];

/* ── Component ─────────────────────────────────── */
const LegalAssistance = () => {
  const [expandedService, setExpandedService] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  const toggleService = useCallback((i) => setExpandedService((prev) => (prev === i ? null : i)), []);
  const toggleFaq = useCallback((i) => setOpenFaq((prev) => (prev === i ? null : i)), []);

  return (
    <>
      <Helmet>
        <title>Legal Assistance | H.O.M Advisory</title>
        <meta name="description" content="Expert legal assistance for property transactions. Title verification, RERA compliance, property registration, and dispute resolution in Bangalore." />
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
              <Icon icon="mdi:shield-check-outline" /> Buyer Assistance
            </span>
            <h1 className={styles.heroTitle}>Legal Assistance</h1>
            <p className={styles.heroSubtitle}>
              Protect your property investment with expert legal guidance. From title verification
              to registration, we ensure every transaction is legally sound.
            </p>
          </motion.div>
        </section>

        {/* ── Trust Indicators ────────────────────── */}
        <Section className={styles.statsSection}>
          <div className={styles.container}>
            <div className={styles.statsGrid}>
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  className={styles.statCard}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                >
                  <Icon icon={stat.icon} className={styles.statIcon} />
                  <span className={styles.statValue}>{stat.value}</span>
                  <span className={styles.statLabel}>{stat.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Our Legal Services ──────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Our Legal Services</h2>
              <p className={styles.sectionSubtitle}>Comprehensive legal support for all your property needs</p>
            </div>

            <div className={styles.servicesGrid}>
              {services.map((svc, i) => (
                <motion.div
                  key={i}
                  className={`${styles.serviceCard} ${expandedService === i ? styles.serviceExpanded : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                >
                  <div className={styles.serviceIcon}>
                    <Icon icon={svc.icon} />
                  </div>
                  <h3 className={styles.serviceTitle}>{svc.title}</h3>
                  <p className={styles.serviceDesc}>{svc.desc}</p>

                  <button
                    className={styles.learnMoreBtn}
                    onClick={() => toggleService(i)}
                    aria-expanded={expandedService === i}
                  >
                    {expandedService === i ? 'Show Less' : 'Learn More'}
                    <Icon icon={expandedService === i ? 'mdi:chevron-up' : 'mdi:chevron-down'} />
                  </button>

                  <AnimatePresence>
                    {expandedService === i && (
                      <motion.div
                        className={styles.serviceDetail}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <p>{svc.detail}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
              <p className={styles.sectionSubtitle}>Get expert legal support in three simple steps</p>
            </div>

            <div className={styles.processGrid}>
              {processSteps.map((step, i) => (
                <motion.div
                  key={i}
                  className={styles.processCard}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.4 }}
                >
                  <div className={styles.processNumber}>{i + 1}</div>
                  <div className={styles.processIcon}>
                    <Icon icon={step.icon} />
                  </div>
                  <h3 className={styles.processTitle}>{step.title}</h3>
                  <p className={styles.processDesc}>{step.desc}</p>
                  {i < processSteps.length - 1 && (
                    <div className={styles.processArrow}>
                      <Icon icon="mdi:arrow-right" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Lead Form ──────────────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.formSection}>
              <div className={styles.formInfo}>
                <h2 className={styles.sectionTitle}>Request Legal Consultation</h2>
                <p className={styles.formInfoText}>
                  Get expert legal advice tailored to your property transaction. Our team of
                  experienced property lawyers will guide you through every step.
                </p>
                <div className={styles.formBenefits}>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:phone-check-outline" className={styles.benefitIcon} />
                    <span>Free Initial Consultation</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:shield-lock-outline" className={styles.benefitIcon} />
                    <span>Confidential & Secure</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:account-tie-outline" className={styles.benefitIcon} />
                    <span>Experienced Property Lawyers</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:clock-check-outline" className={styles.benefitIcon} />
                    <span>Response Within 24 Hours</span>
                  </div>
                </div>
              </div>
              <LeadForm
                title="Request Legal Consultation"
                subtitle="Describe your legal needs and we'll connect you with the right expert"
                fields={leadFields}
                source="legal_assistance"
              />
            </div>
          </div>
        </Section>

        {/* ── FAQs ───────────────────────────────── */}
        <Section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
              <p className={styles.sectionSubtitle}>Common questions about property legal processes</p>
            </div>

            <div className={styles.faqList}>
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className={`${styles.faqItem} ${openFaq === i ? styles.faqOpen : ''}`}
                >
                  <button
                    className={styles.faqQuestion}
                    onClick={() => toggleFaq(i)}
                    aria-expanded={openFaq === i}
                  >
                    <span>{faq.q}</span>
                    <Icon
                      icon={openFaq === i ? 'mdi:chevron-up' : 'mdi:chevron-down'}
                      className={styles.faqArrow}
                    />
                  </button>
                  <motion.div
                    className={styles.faqAnswer}
                    initial={false}
                    animate={{
                      height: openFaq === i ? 'auto' : 0,
                      opacity: openFaq === i ? 1 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <p>{faq.a}</p>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>
    </>
  );
};

export default LegalAssistance;
