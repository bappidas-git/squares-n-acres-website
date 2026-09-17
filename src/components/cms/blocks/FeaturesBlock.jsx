import { Icon } from '@iconify/react';

import { Container, Section, SectionHeader } from '../../ui';

import styles from './blocks.module.css';

/**
 * A grid of icon, heading and sentence (§6.10 `features`) — "Why choose us",
 * the values on the About page, the rooms an interior designer covers.
 *
 * Four across on a desktop, two on a tablet, one on a phone. With no items
 * there is no section at all: an editor who has not filled the block in yet
 * leaves a gap, not a heading over nothing (§8.2, D81).
 */
export default function FeaturesBlock({ data = {}, background = 'surface' }) {
  const items = (Array.isArray(data.items) ? data.items : []).filter((item) => item?.title);
  if (items.length === 0) return null;

  return (
    <Section background={background} spacing="lg">
      <Container>
        {data.title ? (
          <SectionHeader title={data.title} subtitle={data.subtitle} align="center" />
        ) : null}

        <ul className={styles.featureGrid}>
          {items.map((item, index) => (
            <li key={`${item.title}-${index}`} className={styles.feature}>
              {item.icon ? (
                <span className={styles.featureIcon} aria-hidden="true">
                  <Icon icon={item.icon} width="28" height="28" />
                </span>
              ) : null}
              <h3 className={styles.featureTitle}>{item.title}</h3>
              {item.text ? <p className={styles.featureText}>{item.text}</p> : null}
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

FeaturesBlock.isEmpty = (data) =>
  !(Array.isArray(data?.items) ? data.items : []).some((item) => item?.title);
