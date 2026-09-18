import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import NewsletterSection from '../common/NewsletterSection';
import styles from './Footer.module.css';
import useNavPages from '../../hooks/useNavPages';
import { Logo } from '../ui';
import { buildFooterColumns, buildLegalLinks } from '../../config/navigation';
import { formatPhoneForTel } from '../../utils/format';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';

/**
 * The site footer: `siteSettings.footer` plus the columns the data already
 * knows (§6.13, prompt 27 §4.7).
 *
 * An editor's own columns come first and the generated ones — Buy by type,
 * Popular localities, Insights, Company — fill the row up to five, so a
 * settings file that already fills the footer is never overruled, and a site
 * whose settings carry no columns at all still has a usable footer.
 *
 * The legal line is built from the published pages that actually exist: a
 * privacy policy nobody has published yet is not linked, rather than being a
 * dead link in every footer of the site.
 *
 * D3: a light surface with charcoal text, so the wordmark sits on it as-is.
 * D79: the boilerplate's image collage survives as an opt-in setting, drawn
 * only once it has three pictures to draw.
 */

/** What `footer.showGallery` can draw, and what it takes to be worth drawing. */
const MAX_GALLERY = 6;
const MIN_GALLERY = 3;

const SOCIAL = {
  facebook: { icon: 'mdi:facebook', label: 'Facebook' },
  instagram: { icon: 'mdi:instagram', label: 'Instagram' },
  linkedin: { icon: 'mdi:linkedin', label: 'LinkedIn' },
  youtube: { icon: 'mdi:youtube', label: 'YouTube' },
  x: { icon: 'mdi:twitter', label: 'X' },
  pinterest: { icon: 'mdi:pinterest', label: 'Pinterest' },
};

/** `© %year% Squares N Acres…` with the placeholder filled in. */
const withYear = (text) => String(text ?? '').replace(/%year%/g, String(new Date().getFullYear()));

/** An internal path renders as a `<Link>`; anything else as an `<a>`. */
function FooterLink({ link }) {
  if (!link?.to) return null;

  if (link.external) {
    return (
      <a href={link.to} className={styles.link} target="_blank" rel="noopener noreferrer">
        {link.label}
      </a>
    );
  }
  return (
    <Link to={link.to} className={styles.link}>
      {link.label}
    </Link>
  );
}

export default function Footer() {
  const { settings, siteName, tagline, getContact } = useSiteSettings();
  const general = settings?.general ?? {};
  const { propertyTypes, localities } = useMasterData();
  const { footer: pages } = useNavPages();

  const footer = settings?.footer ?? {};
  const contact = getContact();
  const columns = buildFooterColumns({ propertyTypes, localities, pages, settings });
  const legal = buildLegalLinks(pages);
  // D79: the collage is opt-in, and three pictures is the point at which it
  // reads as one. Below that the footer leaves it out rather than drawing a
  // lonely picture the row has no shape for.
  const gallery = footer.showGallery
    ? (footer.galleryImageUrls ?? []).filter(Boolean).slice(0, MAX_GALLERY)
    : [];
  const showGallery = gallery.length >= MIN_GALLERY;

  const social = Object.entries(settings?.social ?? {})
    .filter(([key, url]) => Boolean(url) && SOCIAL[key])
    .map(([key, url]) => ({ key, href: url, ...SOCIAL[key] }));

  const newsletterEnabled =
    settings?.newsletter?.enabled !== false && footer.showNewsletter !== false;

  // The firm's own registrations (§6.13 `general`), not a listing's: a RERA
  // registration is required to be displayed, and the footer is where it goes.
  const registration = [
    general.reraNumber ? `RERA ${general.reraNumber}` : '',
    general.gstNumber ? `GST ${general.gstNumber}` : '',
  ].filter(Boolean);

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
        <div className={styles.inner}>
          <div className={styles.brand}>
            <Logo height={40} className={styles.brandLogo} />
            {footer.aboutText ? <p className={styles.about}>{footer.aboutText}</p> : null}
            {tagline ? <p className={styles.tagline}>{tagline}</p> : null}

            <div className={styles.contact}>
              {contact.phone ? (
                <a href={`tel:${formatPhoneForTel(contact.phone)}`} className={styles.contactItem}>
                  <Icon icon="mdi:phone-outline" aria-hidden="true" />
                  {contact.phone}
                </a>
              ) : null}
              {contact.email ? (
                <a href={`mailto:${contact.email}`} className={styles.contactItem}>
                  <Icon icon="mdi:email-outline" aria-hidden="true" />
                  {contact.email}
                </a>
              ) : null}
              {addressLine ? (
                <span className={styles.contactItem}>
                  <Icon icon="mdi:map-marker-outline" aria-hidden="true" />
                  {addressLine}
                </span>
              ) : null}
            </div>

            {social.length > 0 ? (
              <div className={styles.social}>
                {social.map((item) => (
                  <a
                    key={item.key}
                    href={item.href}
                    className={styles.socialIcon}
                    aria-label={item.label}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon icon={item.icon} aria-hidden="true" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <nav className={styles.columns} aria-label="Footer">
            {columns.map((column) => (
              <div key={column.key} className={styles.column}>
                <h2 className={styles.columnTitle}>{column.title}</h2>
                {column.links.map((link) => (
                  <FooterLink key={link.key} link={link} />
                ))}
              </div>
            ))}
          </nav>
        </div>

        {showGallery ? (
          <div className={styles.gallery}>
            {gallery.map((src) => (
              <div key={src} className={styles.galleryCell}>
                <img src={src} alt="" className={styles.galleryImage} loading="lazy" />
              </div>
            ))}
          </div>
        ) : null}

        <div className={styles.legal}>
          {registration.length > 0 ? (
            <p className={styles.registration}>{registration.join(' · ')}</p>
          ) : null}
          {footer.disclaimer ? <p className={styles.disclaimer}>{footer.disclaimer}</p> : null}
          <div className={styles.legalRow}>
            <p className={styles.copyright}>
              {footer.copyrightText
                ? withYear(footer.copyrightText)
                : `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`}
            </p>
            {legal.length > 0 ? (
              <p className={styles.legalLinks}>
                {legal.map((link, index) => (
                  <span key={link.key}>
                    {index > 0 ? <span aria-hidden="true"> · </span> : null}
                    <Link to={link.to} className={styles.legalLink}>
                      {link.label}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        </div>
      </footer>
    </>
  );
}
