import { memo } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import PATHS from '../../../routes/paths';
import { Chip, LazyImage } from '../../ui';
import { LOCALITY_ZONES } from '../../../config/enums';
import { formatNumber } from '../../../utils/format';

import styles from './LocalityCard.module.css';

/**
 * One locality, as the index grid and the home strip show it.
 *
 * Two variants, one record: `default` is the card of `/localities` — a 4:3
 * image, the name, the zone, the indicative price and the listing count — and
 * `compact` is the home page's overlay tile, which carries the name and the
 * count over the photograph.
 *
 * A locality without a photograph keeps its box: `LazyImage` draws the monogram
 * rather than letting the grid collapse (§8.2).
 *
 * @param {object} props
 * @param {object} props.locality a §6.2 record
 * @param {'default'|'compact'} [props.variant]
 * @param {2|3} [props.headingLevel] `3` inside a section that already has an h2;
 *   `2` on an index whose own h1 is the heading above these cards
 */
const LocalityCard = memo(function LocalityCard({
  locality,
  variant = 'default',
  headingLevel = 3,
}) {
  if (!locality) return null;

  const Heading = `h${headingLevel}`;

  const { name, slug, zone, heroImageUrl, avgPricePerSqft, propertyCount, isFeatured } = locality;
  const count = typeof propertyCount === 'number' ? propertyCount : null;
  const countLabel = count === null ? null : `${count} ${count === 1 ? 'property' : 'properties'}`;
  const compact = variant === 'compact';

  return (
    <Link
      to={PATHS.locality(slug)}
      className={[styles.card, compact ? styles.compact : ''].filter(Boolean).join(' ')}
    >
      <div className={styles.mediaBox}>
        <LazyImage
          src={heroImageUrl}
          alt=""
          ratio="4/3"
          sizes="(max-width: 599px) 100vw, (max-width: 1199px) 50vw, 25vw"
          className={styles.media}
        />
        {compact ? <span className={styles.scrim} aria-hidden="true" /> : null}
        {isFeatured && !compact ? (
          <span className={styles.featured}>
            <Icon icon="mdi:star" width="14" height="14" aria-hidden="true" />
            Featured
          </span>
        ) : null}
        {compact ? (
          <div className={styles.overlay}>
            <Heading className={styles.overlayName}>{name}</Heading>
            {countLabel ? (
              <span className={styles.overlayMeta}>
                <Icon icon="mdi:home-group" width="16" height="16" aria-hidden="true" />
                {countLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {compact ? null : (
        <div className={styles.body}>
          <Heading className={styles.name}>{name}</Heading>
          {zone ? (
            <span className={styles.zone}>
              <Chip tone="primary" variant="soft">
                {LOCALITY_ZONES.labelOf(zone)}
              </Chip>
            </span>
          ) : null}

          <div className={styles.meta}>
            {avgPricePerSqft ? (
              <span className={styles.metaItem}>
                <Icon icon="mdi:tag-outline" width="16" height="16" aria-hidden="true" />
                {`₹${formatNumber(avgPricePerSqft)}/sq ft avg`}
              </span>
            ) : null}
            {countLabel ? (
              <span className={styles.metaItem}>
                <Icon icon="mdi:home-group" width="16" height="16" aria-hidden="true" />
                {countLabel}
              </span>
            ) : null}
          </div>
        </div>
      )}
    </Link>
  );
});

export default LocalityCard;
