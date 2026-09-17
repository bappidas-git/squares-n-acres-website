import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import LeadForm from '../../components/common/LeadForm';
import { Section } from '../../components/ui';
import { leadFormProps } from '../../utils/leadSources';
import styles from './Contact.module.css';
import { BRAND, SITE } from '../../config/site';

/* ── Animated section wrapper ──────────────────── */
/* ── Static data ───────────────────────────────── */
const contactInfo = [
  {
    icon: 'mdi:phone-outline',
    label: 'Phone',
    value: '+91 98765 43210',
    href: 'tel:+919876543210',
  },
  {
    icon: 'mdi:email-outline',
    label: 'Email',
    value: 'info@squaresnacres.com',
    href: 'mailto:info@squaresnacres.com',
  },
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

const workingHours = [
  { days: 'Monday - Saturday', hours: '9:00 AM - 7:00 PM' },
  { days: 'Sunday', hours: '10:00 AM - 5:00 PM' },
];

/* ── Component ─────────────────────────────────── */
const Contact = () => {
  return (
    <>
      <Helmet>
        <title>{`Contact Us | ${SITE.name}`}</title>
        <meta
          name="description"
          content={`Get in touch with ${SITE.name}. Reach out for property inquiries, partnership opportunities, or any questions about real estate in Bangalore.`}
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
              <Icon icon="mdi:message-text-outline" /> Get In Touch
            </span>
            <h1 className={styles.heroTitle}>Contact Us</h1>
            <p className={styles.heroSubtitle}>
              Have a question or need assistance? We're here to help you every step of the way on
              your real estate journey.
            </p>
          </motion.div>
        </section>

        {/* ── Contact Section ─────────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.contactGrid}>
              {/* Left: Form */}
              <div className={styles.formSide}>
                <LeadForm
                  {...leadFormProps('contact-page')}
                  submitLabel="Send message"
                  className={styles.form}
                />
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
                          <a href={item.href} className={styles.infoValue}>
                            {item.value}
                          </a>
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
                title={`${BRAND.name} Office Location`}
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
