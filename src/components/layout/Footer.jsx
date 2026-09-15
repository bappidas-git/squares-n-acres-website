import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { siteSettingsService } from '../../services/api';
import logo from '../../assets/images/logo.png';
import styles from './Footer.module.css';

// Defaults used when the API hasn't responded yet or fields are missing
const DEFAULT_SOCIAL = [
  { icon: 'mdi:instagram', label: 'Instagram', href: '#' },
  { icon: 'mdi:facebook', label: 'Facebook', href: '#' },
  { icon: 'mdi:twitter', label: 'Twitter', href: '#' },
  { icon: 'mdi:linkedin', label: 'LinkedIn', href: '#' },
];

const DEFAULT_LINK_GROUPS = [
  {
    title: 'Homes',
    links: [
      { label: 'Buy', path: '/buy/ready-to-move' },
      { label: 'Rent', path: '/rent/apartments' },
      { label: 'Sell/Let', path: '/sell-let' },
    ],
  },
  {
    title: 'Offices',
    links: [
      { label: 'Flexible Workspace', path: '/flexible-workspace' },
      { label: 'Direct Lease & Retails', path: '/direct-lease-retails' },
    ],
  },
  {
    title: 'Market',
    links: [
      { label: 'Home Loans', path: '/buyer-assistance/home-loan' },
      { label: 'Legal', path: '/buyer-assistance/legal-assistance' },
      { label: 'Home Interiors', path: '/buyer-assistance/interior-designing' },
    ],
  },
];

const SOCIAL_ICON_MAP = {
  instagram: 'mdi:instagram',
  facebook: 'mdi:facebook',
  twitter: 'mdi:twitter',
  linkedin: 'mdi:linkedin',
  youtube: 'mdi:youtube',
};

const Footer = () => {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await siteSettingsService.get();
        setSettings(data);
      } catch {
        // Silently fall back to defaults
      }
    };
    fetchSettings();
  }, []);

  // Derive data from API settings, falling back to defaults
  const companyName = settings?.companyName || 'H.O.M Advisory';
  const companySubtitle = settings?.companySubtitle || 'HOME OFFICE MARKET';
  const description = settings?.companyDescription || 'Your connection to the finest homes and experiences no matter the destination or lifestyle.';
  const tagline = settings?.tagline || 'ELEVATING EVERY EXPERIENCE IN REAL ESTATE';
  const contactInfo = settings?.contactInfo || {};

  // Social links from API
  const socialLinks = settings?.socialLinks
    ? Object.entries(settings.socialLinks)
        .filter(([, url]) => url)
        .map(([key, url]) => ({
          icon: SOCIAL_ICON_MAP[key] || `mdi:${key}`,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          href: url,
        }))
    : DEFAULT_SOCIAL;

  // Footer link groups from API
  const linkGroups = Array.isArray(settings?.footerLinkGroups) && settings.footerLinkGroups.length > 0
    ? settings.footerLinkGroups
    : DEFAULT_LINK_GROUPS;

  // Gallery images from API — exactly 6 images for consistent 3x2 grid layout
  const rawGallery = Array.isArray(settings?.footerGallery) ? settings.footerGallery : [];
  const galleryImages = rawGallery.slice(0, 6);

  const [imgErrors, setImgErrors] = useState({});
  const handleImgError = (idx) => {
    setImgErrors((prev) => ({ ...prev, [idx]: true }));
  };

  return (
    <footer className={styles.footer}>
      {/* Top Section */}
      <div className={styles.footerTop}>
        {/* Brand */}
        <div className={styles.brandSection}>
          <img src={logo} alt={companyName} className={styles.brandLogo} />
          <div className={styles.brandSubtitle}>{companySubtitle}</div>
          <p className={styles.brandTagline}>{description}</p>
          <div className={styles.brandElevating}>{tagline}</div>
          <div className={styles.socialIcons}>
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className={styles.socialIcon}
                aria-label={social.label}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon icon={social.icon} />
              </a>
            ))}
          </div>
        </div>

        {/* Image Collage — render exactly 6 images in a 3x2 grid */}
        {galleryImages.length > 0 && (
          <div className={styles.imageCollage}>
            {galleryImages.map((src, index) => (
              <div key={index} className={styles.collageCell}>
                {imgErrors[index] ? (
                  <div className={styles.collageFallback} />
                ) : (
                  <img
                    src={src}
                    alt={`Property ${index + 1}`}
                    className={styles.collageImage}
                    loading="lazy"
                    onError={() => handleImgError(index)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Columns */}
      <div className={styles.footerBottom}>
        {linkGroups.map((column) => (
          <div key={column.title} className={styles.footerColumn}>
            <h4>{column.title}</h4>
            {(column.links || []).map((link) => (
              <Link key={link.label} to={link.path} className={styles.footerLink}>
                {link.label}
              </Link>
            ))}
          </div>
        ))}

        {/* Contact Column */}
        <div className={styles.footerColumn}>
          <h4>Contact</h4>
          {contactInfo.phone && (
            <div className={styles.contactItem}>
              <span className={styles.contactIcon}>
                <Icon icon="mdi:phone" />
              </span>
              <a href={`tel:${contactInfo.phone.replace(/[^\d+]/g, '')}`}>{contactInfo.phone}</a>
            </div>
          )}
          {contactInfo.email && (
            <div className={styles.contactItem}>
              <span className={styles.contactIcon}>
                <Icon icon="mdi:email-outline" />
              </span>
              <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
            </div>
          )}
          {contactInfo.address && (
            <div className={styles.contactItem}>
              <span className={styles.contactIcon}>
                <Icon icon="mdi:map-marker-outline" />
              </span>
              <span>{contactInfo.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Copyright */}
      <div className={styles.copyright}>
        &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
