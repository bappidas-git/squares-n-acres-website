import { useState } from 'react';

import styles from './Avatar.module.css';

/** "Priya Sharma" -> "PS"; falls back to the first character. */
function initialsOf(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return words[0].slice(0, 2);
  return `${words[0][0]}${words[words.length - 1][0]}`;
}

/**
 * @param {object} props
 * @param {string} [props.src]
 * @param {string} [props.name] drives the initials fallback and the alt text
 * @param {number} [props.size] px
 * @param {boolean} [props.square]
 */
export default function Avatar({
  src,
  name = '',
  size = 40,
  square = false,
  className = '',
  ...rest
}) {
  const [failed, setFailed] = useState(false);
  const initials = initialsOf(name);

  return (
    <span
      className={[styles.avatar, square ? styles.square : '', className].filter(Boolean).join(' ')}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      {...rest}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={name}
          className={styles.image}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden={initials ? undefined : 'true'}>{initials}</span>
      )}
    </span>
  );
}
