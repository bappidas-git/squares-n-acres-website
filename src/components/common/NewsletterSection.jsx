import NewsletterForm from './NewsletterForm';
import { LEADS } from '../../config/copy';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';

import styles from './NewsletterSection.module.css';

/**
 * The newsletter band. The copy comes from `siteSettings.newsletter`; the form
 * itself is the shared `NewsletterForm`, so this band and the sidebar of the
 * articles index ask in exactly the same way — with a visible label, the
 * `website` honeypot and the ten-second throttle every form on the site has
 * (§5.11, D43, ADD-09).
 *
 * The reCAPTCHA notice only appears when a site key is actually configured;
 * the boilerplate showed it unconditionally, which was untrue (BUG-15).
 *
 * `compact` is the same band as a sidebar card: no gradient, no centring and a
 * heading at the size the cards around it use. The copy, the form and the
 * notice are the ones the full-width band shows, so the ask is identical
 * wherever a reader meets it.
 *
 * @param {object} props
 * @param {boolean} [props.compact]
 */
const NewsletterSection = ({ compact = false, className = '' }) => {
  const { settings } = useSiteSettings();

  const section = settings?.newsletter ?? {};
  const hasRecaptcha = Boolean(settings?.integrations?.recaptchaSiteKey);

  return (
    <section
      className={[styles.newsletter, compact ? styles.compact : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.inner}>
        <h2 className={styles.heading}>{section.title || LEADS.newsletter.title}</h2>
        {section.subtitle ? <p className={styles.subtitle}>{section.subtitle}</p> : null}

        <NewsletterForm
          className={styles.form}
          successMessage={section.successMessage || undefined}
        />

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
