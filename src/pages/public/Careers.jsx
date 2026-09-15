import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Icon } from '@iconify/react';
import { leadService } from '../../services/api';
import { useToast } from '../../components/common/ToastProvider';
import { getNameErrorMessage, getEmailErrorMessage, getMobileErrorMessage } from '../../utils/validators';
import styles from './Careers.module.css';

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
const cultureItems = [
  { icon: 'mdi:account-group-outline', title: 'Collaborative Environment', desc: 'Work alongside talented professionals who value teamwork, open communication, and shared success.' },
  { icon: 'mdi:trending-up', title: 'Growth Opportunities', desc: 'Continuous learning programs, mentorship, and clear career paths to help you reach your full potential.' },
  { icon: 'mdi:lightbulb-on-outline', title: 'Innovation First', desc: 'We encourage fresh ideas and creative approaches to solving real estate challenges.' },
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
  { icon: 'mdi:currency-inr', title: 'Competitive Salary', desc: 'Industry-leading compensation with performance bonuses' },
  { icon: 'mdi:hospital-box-outline', title: 'Health Insurance', desc: 'Comprehensive medical coverage for you and your family' },
  { icon: 'mdi:school-outline', title: 'Learning Budget', desc: 'Annual allowance for courses, certifications, and conferences' },
  { icon: 'mdi:clock-outline', title: 'Flexible Hours', desc: 'Work-life balance with flexible scheduling options' },
  { icon: 'mdi:home-outline', title: 'Work from Home', desc: 'Hybrid work model with remote work flexibility' },
  { icon: 'mdi:party-popper', title: 'Team Events', desc: 'Regular outings, celebrations, and team-building activities' },
];

/* ── Component ─────────────────────────────────── */
const Careers = () => {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    coverLetter: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const openModal = useCallback((positionTitle) => {
    setSelectedPosition(positionTitle);
    setFormData((prev) => ({ ...prev, position: positionTitle }));
    setModalOpen(true);
    setSubmitted(false);
    setSubmitError('');
    setErrors({});
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setSelectedPosition('');
  }, []);

  const validate = () => {
    const newErrors = {};
    const nameErr = getNameErrorMessage(formData.name);
    if (nameErr) newErrors.name = nameErr;
    const emailErr = getEmailErrorMessage(formData.email, true);
    if (emailErr) newErrors.email = emailErr;
    const phoneErr = getMobileErrorMessage(formData.phone);
    if (phoneErr) newErrors.phone = phoneErr;
    if (!formData.position) newErrors.position = 'Position is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;
    try {
      setSubmitting(true);
      await leadService.create({ ...formData, source: 'careers' });
      setSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch {
      setSubmitError('Something went wrong. Please try again.');
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Careers | H.O.M Advisory</title>
        <meta name="description" content="Join H.O.M Advisory and build a rewarding career in real estate. Explore open positions and be part of Bangalore's leading property advisory firm." />
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
              <p className={styles.sectionSubtitle}>What makes H.O.M Advisory a great place to work</p>
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
                        <span className={`${styles.metaItem} ${styles.typeBadge}`}>
                          {pos.type}
                        </span>
                      </div>
                    </div>
                    <button
                      className={styles.applyBtn}
                      onClick={() => openModal(pos.title)}
                    >
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

        {/* ── Application Modal ───────────────────── */}
        <AnimatePresence>
          {modalOpen && (
            <motion.div
              className={styles.modalBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
            >
              <motion.div
                className={styles.modal}
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button className={styles.modalClose} onClick={closeModal} aria-label="Close">
                  <Icon icon="mdi:close" />
                </button>

                {submitted ? (
                  <div className={styles.modalSuccess}>
                    <Icon icon="mdi:check-circle" className={styles.successIcon} />
                    <h3 className={styles.successTitle}>Application Submitted!</h3>
                    <p className={styles.successText}>
                      Thank you for applying for <strong>{selectedPosition}</strong>.
                      We'll review your application and get back to you.
                    </p>
                    <button className={styles.closeBtn} onClick={closeModal}>Close</button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className={styles.modalForm}>
                    <h2 className={styles.modalTitle}>Apply for {selectedPosition}</h2>
                    <p className={styles.modalSubtitle}>Fill in your details to submit your application.</p>

                    <div className={styles.modalFields}>
                      <div className={styles.modalField}>
                        <input
                          type="text"
                          name="name"
                          placeholder="Full Name *"
                          value={formData.name}
                          onChange={handleChange}
                          className={`${styles.modalInput} ${errors.name ? styles.inputError : ''}`}
                        />
                        {errors.name && <span className={styles.errorText}>{errors.name}</span>}
                      </div>
                      <div className={styles.modalField}>
                        <input
                          type="email"
                          name="email"
                          placeholder="Email Address *"
                          value={formData.email}
                          onChange={handleChange}
                          inputMode="email"
                          autoComplete="email"
                          className={`${styles.modalInput} ${errors.email ? styles.inputError : ''}`}
                        />
                        {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                      </div>
                      <div className={styles.modalField}>
                        <input
                          type="tel"
                          name="phone"
                          placeholder="Phone Number *"
                          value={formData.phone}
                          onChange={handleChange}
                          inputMode="tel"
                          autoComplete="tel"
                          className={`${styles.modalInput} ${errors.phone ? styles.inputError : ''}`}
                        />
                        {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
                      </div>
                      <div className={styles.modalField}>
                        <select
                          name="position"
                          value={formData.position}
                          onChange={handleChange}
                          className={`${styles.modalSelect} ${errors.position ? styles.inputError : ''}`}
                        >
                          <option value="">Select Position *</option>
                          {positions.map((p) => (
                            <option key={p.id} value={p.title}>{p.title}</option>
                          ))}
                        </select>
                        {errors.position && <span className={styles.errorText}>{errors.position}</span>}
                      </div>
                      <div className={styles.modalField}>
                        <div className={styles.fileUpload}>
                          <Icon icon="mdi:file-upload-outline" />
                          <span>Upload Resume (PDF, DOC)</span>
                          <input type="file" accept=".pdf,.doc,.docx" className={styles.fileInput} />
                        </div>
                      </div>
                      <div className={styles.modalField}>
                        <textarea
                          name="coverLetter"
                          placeholder="Cover Letter (optional)"
                          value={formData.coverLetter}
                          onChange={handleChange}
                          rows={4}
                          className={styles.modalTextarea}
                        />
                      </div>
                    </div>

                    {submitError && (
                      <p className={styles.submitErrorText}>
                        <Icon icon="mdi:alert-circle-outline" /> {submitError}
                      </p>
                    )}

                    <button type="submit" className={styles.submitBtn} disabled={submitting}>
                      {submitting ? (
                        <span className={styles.spinner} />
                      ) : (
                        <>Submit Application <Icon icon="mdi:send" /></>
                      )}
                    </button>
                  </form>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default Careers;
