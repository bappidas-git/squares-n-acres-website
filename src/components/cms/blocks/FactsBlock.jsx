import { Icon } from '@iconify/react';

import { Container, Section, SectionHeader } from '../../ui';

import styles from './blocks.module.css';

/**
 * The "Did you know" cards of the awareness page (§6.10 `facts`, D27).
 *
 * Unlike `stats`, the headline is a word as often as a number — "Escrow",
 * "30 years" — so nothing is counted up and nothing is formatted: what the
 * editor typed is what the card says.
 */
export default function FactsBlock({ data = {}, background = 'surface' }) {
  const items = (Array.isArray(data.items) ? data.items : []).filter((item) => item?.stat);
  if (items.length === 0) return null;

  return (
    <Section background={background} spacing="lg">
      <Container>
        {data.title ? <SectionHeader title={data.title} align="center" /> : null}

        <ul className={styles.factGrid}>
          {items.map((item, index) => (
            <li key={`${item.stat}-${index}`} className={styles.fact}>
              {item.icon ? (
                <span className={styles.factIcon} aria-hidden="true">
                  <Icon icon={item.icon} width="24" height="24" />
                </span>
              ) : null}
              <p className={styles.factStat}>{item.stat}</p>
              {item.label ? <p className={styles.factLabel}>{item.label}</p> : null}
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

FactsBlock.isEmpty = (data) =>
  !(Array.isArray(data?.items) ? data.items : []).some((item) => item?.stat);
