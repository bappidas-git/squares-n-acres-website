import { Icon } from '@iconify/react';

import { Breadcrumbs, Container, LazyImage } from '../../ui';
import { LOCALITY_ZONES } from '../../../config/enums';
import { formatNumber } from '../../../utils/format';

import styles from './LocalitySections.module.css';

/**
 * The top of a locality guide: the photograph, the page's one `<h1>`, the zone
 * it sits in and the three numbers a buyer opens the page for.
 *
 * A statistic renders only when the record carries it, so a locality with no
 * indicative price shows two figures rather than an em dash (§8.2).
 *
 * @param {object} props
 * @param {object} props.locality a §6.2 record
 * @param {{label: string, to?: string}[]} [props.breadcrumbs]
 */
export default function LocalityHero({ locality, breadcrumbs = [] }) {
  const { name, zone, heroImageUrl, avgPricePerSqft, propertyCount, pincodes, city } = locality;
  const codes = Array.isArray(pincodes) ? pincodes : [];

  const stats = [
    avgPricePerSqft
      ? {
          key: 'price',
          icon: 'mdi:tag-outline',
          label: 'Indicative price',
          value: `₹${formatNumber(avgPricePerSqft)}/sq ft`,
        }
      : null,
    typeof propertyCount === 'number'
      ? {
          key: 'properties',
          icon: 'mdi:home-group',
          label: propertyCount === 1 ? 'Property listed' : 'Properties listed',
          value: formatNumber(propertyCount),
        }
      : null,
    codes.length > 0
      ? {
          key: 'pincodes',
          icon: 'mdi:mailbox-outline',
          label: codes.length === 1 ? 'Pincode' : 'Pincodes',
          value: codes.join(', '),
        }
      : null,
  ].filter(Boolean);

  return (
    <header className={styles.hero}>
      <LazyImage
        src={heroImageUrl}
        alt=""
        ratio="auto"
        loading="eager"
        className={styles.heroImage}
      />
      <span className={styles.heroScrim} aria-hidden="true" />

      <Container className={styles.heroContent}>
        {breadcrumbs.length > 0 ? (
          <Breadcrumbs items={breadcrumbs} onDark className={styles.heroCrumbs} />
        ) : null}

        {zone ? (
          <p className={styles.heroZone}>
            <Icon icon="mdi:map-marker-outline" width="16" height="16" aria-hidden="true" />
            {LOCALITY_ZONES.labelOf(zone)}
            {city?.name ? ` · ${city.name}` : ''}
          </p>
        ) : null}

        <h1 className={styles.heroTitle}>Properties in {name}</h1>

        {stats.length > 0 ? (
          <dl className={styles.heroStats}>
            {stats.map((stat) => (
              <div key={stat.key} className={styles.heroStat}>
                <dt className={styles.heroStatLabel}>
                  <Icon icon={stat.icon} width="16" height="16" aria-hidden="true" />
                  {stat.label}
                </dt>
                <dd className={styles.heroStatValue}>{stat.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Container>
    </header>
  );
}
