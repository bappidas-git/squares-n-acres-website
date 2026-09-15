import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Icon } from '@iconify/react';
import { leadService } from '../../services/api';
import { useToast } from '../../components/common/ToastProvider';
import { getNameErrorMessage, getEmailErrorMessage, getMobileErrorMessage, sanitizeInput } from '../../utils/validators';
import styles from './Contact.module.css';

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
const contactInfo = [
  { icon: 'mdi:phone-outline', label: 'Phone', value: '+91 98765 43210', href: 'tel:+919876543210' },
  { icon: 'mdi:email-outline', label: 'Email', value: 'info@homadvisory.com', href: 'mailto:info@homadvisory.com' },
  {
    icon: 'mdi:map-marker-outline',
    label: 'Address',
    value: '123, Brigade Road, Ashok Nagar, Bangalore, Karnataka 560025',
    href: null,
  },
];

const socialLinks = [
  { icon: 'mdi:facebook', label: 'Facebook', href: '#' },
  { icon: 'mdi:instagram', label: 'Instagram', href: '#' },
  { icon: 'mdi:twitter', label: 'Twitter', href: '#' },
  { icon: 'mdi:linkedin', label: 'LinkedIn', href: '#' },
  { icon: 'mdi:youtube', label: 'YouTube', href: '#' },
];

const subjectOptions = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'property-inquiry', label: 'Property Inquiry' },
  { value: 'buyer-assistance', label: 'Buyer Assistance' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'careers', label: 'Careers' },
  { value: 'other', label: 'Other' },
];

const workingHours = [
  { days: 'Monday - Saturday', hours: '9:00 AM - 7:00 PM' },
  { days: 'Sunday', hours: '10:00 AM - 5:00 PM' },
];

/* ── Component ─────────────────────────────────── */
const Contact = () => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validate = () => {
    const newErrors = {};
    const nameErr = getNameErrorMessage(formData.name);
    if (nameErr) newErrors.name = nameErr;
    const emailErr = getEmailErrorMessage(formData.email, true);
    if (emailErr) newErrors.email = emailErr;
    const phoneErr = getMobileErrorMessage(formData.phone);
    if (phoneErr) newErrors.phone = phoneErr;
    if (!formData.subject) newErrors.subject = 'Please select a subject';
    if (!sanitizeInput(formData.message)) newErrors.message = 'Message is required';
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
      await leadService.create({ ...formData, source: 'contact' });
      setSubmitted(true);
      toast.success('Message sent successfully! We\'ll get back to you soon.');
    } catch {
      setSubmitError('Something went wrong. Please try again.');
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Contact Us | H.O.M Advisory</title>
        <meta name="description" content="Get in touch with H.O.M Advisory. Reach out for property inquiries, partnership opportunities, or any questions about real estate in Bangalore." />
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
              <Icon icon="mdi:message-text-outline" /> Get In Touch
            </span>
            <h1 className={styles.heroTitle}>Contact Us</h1>
            <p className={styles.heroSubtitle}>
              Have a question or need assistance? We're here to help you every step of the way
              on your real estate journey.
            </p>
          </motion.div>
        </section>

        {/* ── Contact Section ─────────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.contactGrid}>
              {/* Left: Form */}
              <div className={styles.formSide}>
                {submitted ? (
                  <motion.div
                    className={styles.successState}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Icon icon="mdi:check-circle" className={styles.successIcon} />
                    <h3 className={styles.successTitle}>Thank You!</h3>
                    <p className={styles.successText}>
                      We've received your message. Our team will get back to you within 24 hours.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className={styles.form}>
                    <h2 className={styles.formTitle}>Send us a Message</h2>
                    <p className={styles.formSubtitle}>Fill out the form below and we'll respond promptly.</p>

                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <input
                          type="text"
                          name="name"
                          placeholder="Full Name *"
                          value={formData.name}
                          onChange={handleChange}
                          autoComplete="name"
                          className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                        />
                        {errors.name && <span className={styles.errorText}>{errors.name}</span>}
                      </div>
                      <div className={styles.field}>
                        <input
                          type="email"
                          name="email"
                          placeholder="Email Address *"
                          value={formData.email}
                          onChange={handleChange}
                          inputMode="email"
                          autoComplete="email"
                          className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                        />
                        {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                      </div>
                    </div>

                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <input
                          type="tel"
                          name="phone"
                          placeholder="Phone Number *"
                          value={formData.phone}
                          onChange={handleChange}
                          inputMode="tel"
                          autoComplete="tel"
                          className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                        />
                        {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
                      </div>
                      <div className={styles.field}>
                        <select
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          className={`${styles.select} ${errors.subject ? styles.inputError : ''}`}
                        >
                          <option value="">Select Subject *</option>
                          {subjectOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        {errors.subject && <span className={styles.errorText}>{errors.subject}</span>}
                      </div>
                    </div>

                    <div className={styles.field}>
                      <textarea
                        name="message"
                        placeholder="Your Message *"
                        value={formData.message}
                        onChange={handleChange}
                        rows={5}
                        className={`${styles.textarea} ${errors.message ? styles.inputError : ''}`}
                      />
                      {errors.message && <span className={styles.errorText}>{errors.message}</span>}
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
                        <>
                          Send Message
                          <Icon icon="mdi:send" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* Right: Contact Info */}
              <div className={styles.infoSide}>
                <h2 className={styles.infoTitle}>Contact Information</h2>
                <p className={styles.infoSubtitle}>
                  Reach out through any of these channels. We're always happy to hear from you.
                </p>

                <div className={styles.infoItems}>
                  {contactInfo.map((item, i) => (
                    <motion.div
                      key={i}
                      className={styles.infoItem}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.4 }}
                    >
                      <div className={styles.infoIcon}>
                        <Icon icon={item.icon} />
                      </div>
                      <div>
                        <span className={styles.infoLabel}>{item.label}</span>
                        {item.href ? (
                          <a href={item.href} className={styles.infoValue}>{item.value}</a>
                        ) : (
                          <span className={styles.infoValue}>{item.value}</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Working Hours */}
                <div className={styles.hoursBlock}>
                  <h3 className={styles.hoursTitle}>
                    <Icon icon="mdi:clock-outline" /> Working Hours
                  </h3>
                  {workingHours.map((wh, i) => (
                    <div key={i} className={styles.hoursRow}>
                      <span className={styles.hoursDays}>{wh.days}</span>
                      <span className={styles.hoursTime}>{wh.hours}</span>
                    </div>
                  ))}
                </div>

                {/* Social Links */}
                <div className={styles.socialBlock}>
                  <h3 className={styles.socialTitle}>Follow Us</h3>
                  <div className={styles.socialLinks}>
                    {socialLinks.map((link, i) => (
                      <a
                        key={i}
                        href={link.href}
                        className={styles.socialLink}
                        aria-label={link.label}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Icon icon={link.icon} />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Map Section ─────────────────────────── */}
        <Section className={styles.mapSection}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Find Us</h2>
              <p className={styles.sectionSubtitle}>Visit our office in the heart of Bangalore</p>
            </div>
            <div className={styles.mapContainer}>
              <iframe
                title="H.O.M Advisory Office Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.0131!2d77.6070!3d12.9716!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae1670c9b44e6d%3A0xf8dfc3e8517e4fe0!2sBrigade%20Road%2C%20Bangalore!5e0!3m2!1sen!2sin!4v1700000000000"
                width="100%"
                height="400"
                style={{ border: 0, borderRadius: 'var(--radius-lg)' }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </Section>
      </div>
    </>
  );
};

export default Contact;
