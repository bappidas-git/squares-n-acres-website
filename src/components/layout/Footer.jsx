import React from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import NewsletterSection from '../common/NewsletterSection';
import styles from './Footer.module.css';
import { Logo } from '../ui';
import { formatPhoneForTel } from '../../utils/format';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';

/**
 * The site footer, entirely driven by `siteSettings.footer` and
 * `siteSettings.general` (§6.13). Nothing here is hardcoded: the columns, the
 * about text, the disclaimer and the copyright line are what an editor typed
 * in Admin → Settings, and an empty branch simply does not render.
 */

const SOCIAL_ICONS = {
  facebook: 'mdi:facebook',
  instagram: 'mdi:instagram',
  linkedin: 'mdi:linkedin',
  youtube: 'mdi:youtube',
  x: 'mdi:twitter',
  pinterest: 'mdi:pinterest',
};

const SOCIAL_LABELS = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  x: 'X',
  pinterest: 'Pinterest',
};

/** `© %year% Squares N Acres…` with the placeholder filled in. */
const withYear = (text) => String(text ?? '').replace(/%year%/g, String(new Date().getFullYear()));

/** An internal path renders as a `<Link>`; anything else as an `<a>`. */
const FooterLink = ({ link }) => {
  const href = link?.href ?? '';
  if (!href) return null;

  if (link.external || /^https?:\/\//i.test(href)) {
    return (
      <a href={href} className={styles.footerLink} target="_blank" rel="noopener noreferrer">
        {link.label}
      </a>
    );
  }
  return (
    <Link to={href} className={styles.footerLink}>
      {link.label}
    </Link>
  );
};

const Footer = () => {
  const { settings, siteName, tagline, getContact } = useSiteSettings();

  const footer = settings?.footer ?? {};
  const contact = getContact();
  const columns = Array.isArray(footer.columns) ? footer.columns : [];
  const gallery = footer.showGallery ? (footer.galleryImageUrls ?? []).slice(0, 6) : [];

  const social = Object.entries(settings?.social ?? {})
    .filter(([, url]) => Boolean(url))
    .map(([key, url]) => ({
      key,
      href: url,
      icon: SOCIAL_ICONS[key] ?? 'mdi:link-variant',
      label: SOCIAL_LABELS[key] ?? key,
    }));

  const newsletterEnabled =
    settings?.newsletter?.enabled !== false && footer.showNewsletter !== false;

  const addressLine = [
    contact.address?.line1,
    contact.address?.line2,
    contact.address?.locality,
    contact.address?.city,
    contact.address?.state,
    contact.address?.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <>
      {newsletterEnabled ? <NewsletterSection /> : null}

      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.brandSection}>
            <Logo height={40} className={styles.brandLogo} />
            {footer.aboutText ? <p className={styles.brandTagline}>{footer.aboutText}</p> : null}
            {tagline ? <div className={styles.brandElevating}>{tagline}</div> : null}

            {social.length > 0 ? (
              <div className={styles.socialIcons}>
                {social.map((item) => (
                  <a
                    key={item.key}
                    href={item.href}
                    className={styles.socialIcon}
                    aria-label={item.label}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon icon={item.icon} />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {gallery.length > 0 ? (
            <div className={styles.imageCollage}>
              {gallery.map((src) => (
                <div key={src} className={styles.collageCell}>
                  <img
                    src={src}
                    alt=""
                    className={styles.collageImage}
                    loading="lazy"
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.footerBottom}>
          {columns.map((column) => (
            <div key={column.title} className={styles.footerColumn}>
              <h4>{column.title}</h4>
              {(column.links ?? []).map((link) => (
                <FooterLink key={`${column.title}-${link.label}`} link={link} />
              ))}
            </div>
          ))}

          <div className={styles.footerColumn}>
            <h4>Contact</h4>
            {contact.phone ? (
              <div className={styles.contactItem}>
                <span className={styles.contactIcon}>
                  <Icon icon="mdi:phone" />
                </span>
                <a href={`tel:${formatPhoneForTel(contact.phone)}`}>{contact.phone}</a>
              </div>
            ) : null}
            {contact.email ? (
              <div className={styles.contactItem}>
                <span className={styles.contactIcon}>
                  <Icon icon="mdi:email-outline" />
                </span>
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </div>
            ) : null}
            {addressLine ? (
              <div className={styles.contactItem}>
                <span className={styles.contactIcon}>
                  <Icon icon="mdi:map-marker-outline" />
                </span>
                <span>{addressLine}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.copyright}>
          {footer.disclaimer ? <p className={styles.disclaimer}>{footer.disclaimer}</p> : null}
          <p>
            {footer.copyrightText
              ? withYear(footer.copyrightText)
              : `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`}
          </p>
        </div>
      </footer>
    </>
  );
};

export default Footer;
