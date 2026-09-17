import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import LocalityCard from '../locality/LocalityCard';
import PATHS from '../../../routes/paths';
import styles from './ExploreLocalities.module.css';
import { Container, Section, SectionHeader } from '../../ui';
import { HOME } from '../../../config/copy';
import { useLocalities } from '../../../hooks/useMasterData';

/**
 * The featured-localities strip. Reads `MasterDataContext` (D93) rather than
 * fetching, so the home page asks for the locality list once no matter how
 * many sections need it.
 *
 * The card is `LocalityCard` in its compact variant — the same component the
 * `/localities` grid uses — so a change to how a locality is presented happens
 * once (prompt 14).
 */

export default function ExploreLocalities() {
  const featured = useLocalities({ featuredOnly: true });

  if (featured.length === 0) return null;

  return (
    <Section background="bg" spacing="lg">
      <Container>
        <SectionHeader
          title={HOME.localities.title}
          subtitle={HOME.localities.subtitle}
          action={
            <Link to={PATHS.localities} className={styles.viewAll}>
              {HOME.viewAll}
              <Icon icon="mdi:arrow-right" width="18" height="18" aria-hidden="true" />
            </Link>
          }
        />

        <ul className={styles.grid}>
          {featured.slice(0, 8).map((locality) => (
            <li key={locality.id}>
              <LocalityCard locality={locality} variant="compact" />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
