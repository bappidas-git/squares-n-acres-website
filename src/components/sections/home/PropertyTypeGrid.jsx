import { useMemo } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import PATHS from '../../../routes/paths';
import styles from './PropertyTypeGrid.module.css';
import useCategoryCounts from './useCategoryCounts';
import { Container, Section, SectionHeader } from '../../ui';
import { HOME } from '../../../config/copy';
import { formatNumber } from '../../../utils/format';
import { segmentKind } from '../../../config/segments';
import { usePropertyTypes } from '../../../hooks/useMasterData';

/**
 * Every active property type, with its own icon and its own listing route.
 *
 * The types are master data (§6.3), so a type an editor adds appears here, in
 * the header's Buy menu and in the footer without a code change. A commercial
 * type links to `/commercial/<slug>`; everything else to `/buy/<slug>` (D25).
 *
 * The counts share `useCategoryCounts`' cache with the tiles above: every
 * type's number is in the one `GET /properties/counts` answer the Plots, Rent
 * and Commercial tiles read too.
 */

/** Where a type's listings live (D25), by its segment's kind (QA-52). */
export const typeHref = (type) =>
  segmentKind(type.segment) === 'commercial'
    ? PATHS.commercialType(type.slug)
    : PATHS.buyType(type.slug);

export default function PropertyTypeGrid() {
  const types = usePropertyTypes();

  const requests = useMemo(
    () =>
      types.map((type) => ({
        key: String(type.id),
        params: { propertyTypeId: type.id },
      })),
    [types]
  );
  const { counts } = useCategoryCounts(requests);

  if (types.length === 0) return null;

  return (
    <Section background="surface" spacing="lg">
      <Container>
        <SectionHeader
          title={HOME.propertyTypes.title}
          subtitle={HOME.propertyTypes.subtitle}
          align="center"
        />

        <ul className={styles.grid}>
          {types.map((type) => {
            const count = counts[String(type.id)];

            return (
              <li key={type.id}>
                <Link to={typeHref(type)} className={styles.tile}>
                  <Icon
                    icon={type.icon || 'mdi:home-outline'}
                    className={styles.icon}
                    aria-hidden="true"
                  />
                  <span className={styles.name}>{type.name}</span>
                  {typeof count === 'number' ? (
                    <span className={styles.count}>{formatNumber(count)}</span>
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
