import React, { useState, useEffect } from 'react';
import { newsletterService, leadService, siteSettingsService } from '../../services/api';
import { useToast } from './ToastProvider';
import styles from './NewsletterSection.module.css';

const DEFAULT_HEADING = 'Get latest real estate updates in your inbox';

const NewsletterSection = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [heading, setHeading] = useState(DEFAULT_HEADING);
  const [subtitle, setSubtitle] = useState('');
  const toast = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await siteSettingsService.get();
        if (data?.newsletterText) setHeading(data.newsletterText);
        if (data?.newsletterSubtitle) setSubtitle(data.newsletterSubtitle);
      } catch {
        // Silently fall back to defaults
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !email.includes('@')) return;

    setLoading(true);
    try {
      // Subscribe to newsletter mailing list
      await newsletterService.subscribe(email);
      // Also capture as a lead so it appears in Admin → Leads
      try {
        await leadService.create({ email, source: 'newsletter' });
      } catch {
        // Lead capture is secondary — don't block the success flow
      }
      setEmail('');
      toast.success('Successfully subscribed to our newsletter!');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.newsletter}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>{heading}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputWrapper}>
            <input
              type="email"
              placeholder="Email Address*"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              inputMode="email"
              autoComplete="email"
              aria-label="Email address"
            />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : 'Subscribe'}
          </button>
        </form>

        <p className={styles.disclaimer}>
          This site is protected by reCAPTCHA and the Google{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            Privacy Notice
          </a>{' '}
          and{' '}
          <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </a>{' '}
          apply.
        </p>
      </div>
    </section>
  );
};

export default NewsletterSection;
