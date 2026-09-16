import React, { useState } from 'react';

import newsletterService from '../../services/newsletterService';
import styles from './NewsletterSection.module.css';
import { getEmailErrorMessage, sanitizeInput } from '../../utils/validators';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { useToast } from './ToastProvider';

/**
 * The newsletter band. Copy comes from `siteSettings.newsletter`; the address
 * goes to `POST /newsletter/subscribe`, which answers 200 with "Already
 * subscribed" for a duplicate rather than an error (§5.14) — so a second
 * attempt reads as a success, not a failure (BUG-15/ADD-09).
 *
 * The reCAPTCHA notice only appears when a site key is actually configured;
 * the boilerplate showed it unconditionally, which was untrue.
 */

const NewsletterSection = () => {
  const { settings } = useSiteSettings();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [loading, setLoading] = useState(false);

  const copy = settings?.newsletter ?? {};
  const hasRecaptcha = Boolean(settings?.integrations?.recaptchaSiteKey);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const value = sanitizeInput(email);
    const message = getEmailErrorMessage(value, true);
    if (message) {
      setFieldError(message);
      return;
    }

    setFieldError('');
    setLoading(true);
    try {
      const response = await newsletterService.subscribe({ email: value, source: 'newsletter' });
      setEmail('');
      toast.success(response?.message || copy.successMessage || 'Thank you for subscribing.');
    } catch (error) {
      setFieldError(error?.fieldError?.('email') ?? '');
      toast.error(error?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.newsletter}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>{copy.title || 'Property insight, once a month'}</h2>
        {copy.subtitle ? <p className={styles.subtitle}>{copy.subtitle}</p> : null}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.inputWrapper}>
            <label className={styles.srOnly} htmlFor="newsletter-email">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              placeholder="Email address"
              className={styles.input}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (fieldError) setFieldError('');
              }}
              inputMode="email"
              autoComplete="email"
              aria-invalid={fieldError ? 'true' : undefined}
              aria-describedby={fieldError ? 'newsletter-email-error' : undefined}
            />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : 'Subscribe'}
          </button>
        </form>

        {fieldError ? (
          <p className={styles.error} id="newsletter-email-error" role="alert">
            {fieldError}
          </p>
        ) : null}

        {hasRecaptcha ? (
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
        ) : null}
      </div>
    </section>
  );
};

export default NewsletterSection;
