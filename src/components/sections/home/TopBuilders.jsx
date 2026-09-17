import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import DeveloperCard from '../developer/DeveloperCard';
import PATHS from '../../../routes/paths';
import styles from './TopBuilders.module.css';
import { Carousel, Container, Section, SectionHeader } from '../../ui';
import { HOME } from '../../../config/copy';
import { useDevelopers } from '../../../hooks/useMasterData';

/**
 * The featured builders, as the compact `DeveloperCard` of `/builders`.
 *
 * Developers are one of the seven collections `MasterDataContext` already
 * holds (D93), so this section costs no request of its own; it hides itself
 * when no builder is featured.
 */

/** Cards per view, by breakpoint (§8.1). */
const ITEMS_PER_VIEW = { xs: 2.1, sm: 3, md: 4, lg: 5 };

export default function TopBuilders() {
  const developers = useDevelopers({ featuredOnly: true });

  if (developers.length === 0) return null;

  return (
    <Section background="bg" spacing="lg">
      <Container>
        <SectionHeader
          title={HOME.builders.title}
          subtitle={HOME.builders.subtitle}
          action={
            <Link to={PATHS.builders} className={styles.viewAll}>
              {HOME.viewAll}
              <Icon icon="mdi:arrow-right" width="18" height="18" aria-hidden="true" />
            </Link>
          }
        />

        <Carousel itemsPerView={ITEMS_PER_VIEW} label={HOME.builders.title} dots={false}>
          {developers.map((developer) => (
            <DeveloperCard key={developer.id} developer={developer} variant="compact" />
          ))}
        </Carousel>
      </Container>
    </Section>
  );
}
