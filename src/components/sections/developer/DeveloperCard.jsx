import { memo } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import DeveloperLogo from './DeveloperLogo';
import PATHS from '../../../routes/paths';

import styles from './DeveloperCard.module.css';

/**
 * One builder, as the index grid and the home row show it.
 *
 * Two variants, one record: `default` is the card of `/builders` — the logo in
 * its white box, the name, the project count and the short description clamped
 * to two lines — and `compact` is the home page's "Top builders" tile, which
 * drops the description so a row of eight stays a row (prompt 27).
 *
 * A builder with no listings is still a builder: the card says "0 projects"
 * rather than disappearing (§7).
 *
 * @param {object} props
 * @param {object} props.developer a §6.5 record
 * @param {'default'|'compact'} [props.variant]
 * @param {2|3} [props.headingLevel] `3` inside a section that already has an h2;
 *   `2` on an index whose own h1 is the heading above these cards
 */
const DeveloperCard = memo(function DeveloperCard({
  developer,
  variant = 'default',
  headingLevel = 3,
}) {
  if (!developer) return null;

  const Heading = `h${headingLevel}`;

  const { name, slug, logoUrl, shortDescription, propertyCount, isFeatured } = developer;
  const count = typeof propertyCount === 'number' ? propertyCount : null;
  const countLabel = count === null ? null : `${count} ${count === 1 ? 'project' : 'projects'}`;
  const compact = variant === 'compact';

  return (
    <Link
      to={PATHS.builder(slug)}
      className={[styles.card, compact ? styles.compact : ''].filter(Boolean).join(' ')}
    >
      <div className={styles.head}>
        <DeveloperLogo name={name} logoUrl={logoUrl} />
        {isFeatured ? (
          <span className={styles.featured}>
            <Icon icon="mdi:star" width="14" height="14" aria-hidden="true" />
            Featured
          </span>
        ) : null}
      </div>

      <Heading className={styles.name}>{name}</Heading>

      {countLabel ? (
        <span className={styles.count}>
          <Icon icon="mdi:home-city-outline" width="16" height="16" aria-hidden="true" />
          {countLabel}
        </span>
      ) : null}

      {!compact && shortDescription ? <p className={styles.summary}>{shortDescription}</p> : null}
    </Link>
  );
});

export default DeveloperCard;
