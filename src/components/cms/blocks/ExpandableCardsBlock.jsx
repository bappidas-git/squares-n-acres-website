import { useId, useState } from 'react';
import { Icon } from '@iconify/react';

import LegacyHtml from '../../common/LegacyHtml';
import { Container, Section, SectionHeader } from '../../ui';

import styles from './blocks.module.css';

/**
 * Cards that open (§6.10 `expandableCards`, D27) — the legal services, the
 * awareness page's "essential knowledge".
 *
 * A summary everybody reads and the detail behind it, which is the shape these
 * pages actually have: six subjects, a sentence each, and a paragraph for the
 * one the visitor came for. Each card is a `<button>` carrying `aria-expanded`
 * and `aria-controls`, and the detail is hidden rather than merely collapsed
 * while it is closed (§8.3).
 */
export default function ExpandableCardsBlock({ data = {}, background = 'bg' }) {
  const baseId = useId();
  const [open, setOpen] = useState(() => new Set());

  const items = (Array.isArray(data.items) ? data.items : []).filter((item) => item?.title);
  if (items.length === 0) return null;

  const toggle = (key) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Section background={background} spacing="lg">
      <Container>
        {data.title ? <SectionHeader title={data.title} align="center" /> : null}

        <ul className={styles.cards}>
          {items.map((item, index) => {
            const key = String(item.id ?? index);
            const isOpen = open.has(key);
            const panelId = `${baseId}-${key}`;

            return (
              <li
                key={key}
                className={[styles.card, isOpen ? styles.cardOpen : ''].filter(Boolean).join(' ')}
              >
                {item.icon ? (
                  <span className={styles.cardIcon} aria-hidden="true">
                    <Icon icon={item.icon} width="26" height="26" />
                  </span>
                ) : null}

                <h3 className={styles.cardTitle}>{item.title}</h3>
                {item.summary ? <p className={styles.cardSummary}>{item.summary}</p> : null}

                {item.html ? (
                  <>
                    <button
                      type="button"
                      className={styles.cardMore}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggle(key)}
                    >
                      {isOpen ? 'Show less' : 'Learn more'}
                      <Icon
                        icon={isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}
                        width="18"
                        height="18"
                        aria-hidden="true"
                      />
                    </button>
                    <div id={panelId} hidden={!isOpen}>
                      <LegacyHtml html={item.html} className={`prose ${styles.cardDetail}`} />
                    </div>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}

ExpandableCardsBlock.isEmpty = (data) =>
  !(Array.isArray(data?.items) ? data.items : []).some((item) => item?.title);
