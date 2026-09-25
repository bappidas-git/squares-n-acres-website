import { useState } from 'react';

import styles from './Avatar.module.css';

/**
 * The first character of a word as a reader sees it. An emoji, or any letter
 * outside the Basic Multilingual Plane, is two UTF-16 units, and `word[0]` cut
 * it in half: "Asha 🙂" drew "A�" in the header (QA-65).
 */
const firstOf = (word) => Array.from(word)[0] ?? '';

/** "Priya Sharma" -> "PS"; falls back to the first two characters. */
export function initialsOf(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join('');
  return `${firstOf(words[0])}${firstOf(words[words.length - 1])}`;
}

/**
 * @param {object} props
 * @param {string} [props.src]
 * @param {string} [props.name] drives the initials fallback and the alt text
 * @param {number} [props.size] px
 * @param {boolean} [props.square]
 * @param {(src: string) => void} [props.onImageError] the picture at `src`
 *   could not be loaded, and the initials are showing instead
 */
export default function Avatar({
  src,
  name = '',
  size = 40,
  square = false,
  onImageError,
  className = '',
  ...rest
}) {
  // The address that failed, not a flag: the header's avatar stays mounted
  // from one screen to the next, and once one address had failed, the
  // corrected one saved on "My profile" was never tried — the initials stayed
  // until a reload (QA-65).
  const [failedSrc, setFailedSrc] = useState(null);
  const failed = Boolean(src) && failedSrc === src;
  const initials = initialsOf(name);

  return (
    <span
      className={[styles.avatar, square ? styles.square : '', className].filter(Boolean).join(' ')}
      // 38 % of the circle, but never under 13px: a 28px avatar's initials
      // came out at 11 and are the only thing in it (§8.1's mobile floor).
      style={{ width: size, height: size, fontSize: Math.max(13, Math.round(size * 0.38)) }}
      {...rest}
    >
      {src && !failed ? (
        <img
          // A new address is a new picture, with nothing of the last one's
          // load or failure carried over.
          key={src}
          src={src}
          alt={name}
          className={styles.image}
          loading="lazy"
          decoding="async"
          onError={() => {
            setFailedSrc(src);
            onImageError?.(src);
          }}
        />
      ) : (
        <span aria-hidden={initials ? undefined : 'true'}>{initials}</span>
      )}
    </span>
  );
}
