import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import PATHS from '../../../routes/paths';
import SafeHtml from '../../editor/SafeHtml';
import { Avatar } from '../../ui';

import styles from './AuthorBox.module.css';

/** The three links §6.8 gives an author, and the icon each one gets. */
const SOCIAL = [
  { key: 'linkedin', label: 'LinkedIn', icon: 'mdi:linkedin' },
  { key: 'twitter', label: 'X', icon: 'mdi:alpha-x-box-outline' },
  { key: 'website', label: 'Website', icon: 'mdi:web' },
];

/**
 * Who wrote this.
 *
 * `variant="compact"` is the card under an article — a photograph, a name that
 * links to the archive and the biography; `variant="hero"` is the top of
 * `/insights/authors/:slug`, where the same record is the page's subject and
 * the name is its `h1`.
 *
 * The outbound links carry `rel="noopener noreferrer nofollow me"`: `me` says the profile
 * belongs to this person, `nofollow` keeps a contributor's own site from
 * inheriting the site's ranking, and `noopener` is what every external link on
 * the site carries.
 *
 * @param {object} props
 * @param {object} props.author a §6.8 author
 * @param {'compact'|'hero'} [props.variant]
 */
export default function AuthorBox({ author, variant = 'compact', className = '' }) {
  if (!author) return null;

  const hero = variant === 'hero';
  const Heading = hero ? 'h1' : 'h2';
  const links = SOCIAL.map((social) => ({
    ...social,
    href: author.socialLinks?.[social.key] ?? '',
  })).filter((social) => Boolean(social.href));

  return (
    <div
      className={[styles.box, hero ? styles.hero : styles.compactBox, className]
        .filter(Boolean)
        .join(' ')}
    >
      <Avatar
        src={author.avatarUrl}
        name={author.name}
        size={hero ? 112 : 72}
        className={styles.avatar}
      />

      <div className={styles.body}>
        {hero ? null : <p className={styles.eyebrow}>Written by</p>}

        <Heading className={styles.name}>
          {hero || !author.slug ? (
            author.name
          ) : (
            <Link to={PATHS.author(author.slug)} className={styles.nameLink}>
              {author.name}
            </Link>
          )}
        </Heading>

        {author.designation ? <p className={styles.designation}>{author.designation}</p> : null}

        {author.bio ? (
          <SafeHtml html={author.bio} className={styles.bio} propertyCards={false} />
        ) : null}

        {links.length > 0 ? (
          <ul className={styles.social}>
            {links.map((social) => (
              <li key={social.key}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow me"
                  className={styles.socialLink}
                >
                  <Icon icon={social.icon} width="18" height="18" aria-hidden="true" />
                  <span className={styles.srOnly}>
                    {author.name} on {social.label}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
