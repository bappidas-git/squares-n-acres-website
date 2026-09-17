import { useMemo } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import PATHS from '../../../routes/paths';
import styles from './CategoryTiles.module.css';
import useCategoryCounts from './useCategoryCounts';
import { Container, Section, SectionHeader } from '../../ui';
import { HOME } from '../../../config/copy';
import { formatNumber } from '../../../utils/format';

/**
 * Six ways into the same inventory, each with the number of listings behind it.
 *
 * Every tile is a real category route with its own heading and canonical, not a
 * `?type=` query the listing never read — `type=lease` in particular matched
 * nothing at all, so the "Lease office space" tile used to return an empty
 * search (BUG-10, D92).
 *
 * The counts come from `GET /properties?perPage=1` (`meta.total`), cached for
 * five minutes. A count that has not arrived, or whose request failed, is not
 * drawn: no tile ever says "0" when the truth is "we do not know yet" (§7).
 */

/** The tiles, with the filters each one counts. */
export const CATEGORIES = [
  {
    key: 'ready-to-move',
    label: 'Ready to move',
    caption: 'Move in now',
    icon: 'mdi:home-clock-outline',
    to: PATHS.buyStatus('ready-to-move'),
    params: { listingType: 'sale', constructionStatus: 'ready-to-move' },
  },
  {
    key: 'under-construction',
    label: 'Under construction',
    caption: 'Possession dated',
    icon: 'mdi:crane',
    to: PATHS.buyStatus('under-construction'),
    params: { listingType: 'sale', constructionStatus: 'under-construction' },
  },
  {
    key: 'pre-launch',
    label: 'New launch',
    caption: 'Early pricing',
    icon: 'mdi:rocket-launch-outline',
    to: PATHS.buyStatus('pre-launch'),
    params: { listingType: 'sale', constructionStatus: 'pre-launch' },
  },
  {
    key: 'plots',
    label: 'Plots & land',
    caption: 'Build your own',
    icon: 'mdi:map-outline',
    to: PATHS.plots,
    params: { segment: 'land' },
  },
  {
    key: 'rent',
    label: 'Rent a home',
    caption: 'Rent, deposit, furnishing',
    icon: 'mdi:key-variant',
    to: PATHS.rent,
    params: { listingType: 'rent' },
  },
  {
    key: 'commercial',
    label: 'Commercial',
    caption: 'Offices, shops, sheds',
    icon: 'mdi:storefront-outline',
    to: PATHS.commercial,
    params: { segment: 'commercial' },
  },
];

export default function CategoryTiles() {
  const requests = useMemo(
    () => CATEGORIES.map((category) => ({ key: category.key, params: category.params })),
    []
  );
  const { counts } = useCategoryCounts(requests);

  return (
    <Section background="bg" spacing="lg">
      <Container>
        <SectionHeader
          title={HOME.categories.title}
          subtitle={HOME.categories.subtitle}
          align="center"
        />

        <ul className={styles.grid}>
          {CATEGORIES.map((category) => {
            const count = counts[category.key];

            return (
              <li key={category.key}>
                <Link to={category.to} className={styles.tile}>
                  <span className={styles.iconWrap} aria-hidden="true">
                    <Icon icon={category.icon} className={styles.icon} />
                  </span>
                  <span className={styles.body}>
                    <span className={styles.label}>{category.label}</span>
                    <span className={styles.caption}>{category.caption}</span>
                  </span>
                  {typeof count === 'number' ? (
                    <span className={styles.count}>
                      {formatNumber(count)}
                      <span className={styles.countWord}>
                        {count === 1 ? 'listing' : 'listings'}
                      </span>
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
