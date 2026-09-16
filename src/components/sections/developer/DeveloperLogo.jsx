import { LazyImage } from '../../ui';

import styles from './DeveloperSections.module.css';

/** "Aurelia Estates" → "AE"; a one-word name keeps its first two letters. */
function initialsOf(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

/**
 * A builder's mark in the white box §6 asks for: the logo scaled to fit
 * rather than cropped, so a wide wordmark and a square mark both read.
 *
 * A developer without a logo — or whose logo URL fails — keeps the box and
 * shows its own initials. The site's monogram is the wrong mark here: it would
 * put Squares N Acres' name on somebody else's card (§2.2, §7).
 *
 * The logo is decorative in both places that use it: the card's `<h3>` and the
 * page's `<h1>` already carry the name.
 *
 * @param {object} props
 * @param {string} props.name
 * @param {string} [props.logoUrl]
 * @param {'md'|'lg'} [props.size] `lg` is the hero's box
 * @param {'lazy'|'eager'} [props.loading]
 */
export default function DeveloperLogo({ name, logoUrl, size = 'md', loading, className = '' }) {
  return (
    <span
      className={[styles.logoBox, size === 'lg' ? styles.logoBoxLg : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <LazyImage
        src={logoUrl}
        alt=""
        ratio="2/1"
        fit="contain"
        loading={loading}
        className={styles.logoImage}
        onErrorFallback={
          <span className={styles.logoInitials} aria-hidden="true">
            {initialsOf(name)}
          </span>
        }
      />
    </span>
  );
}
