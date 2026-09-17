import { Icon } from '@iconify/react';

import styles from './HomeFeatures.module.css';
import { Container, Section, SectionHeader } from '../../ui';

/**
 * TEMPORARY — the `features` block of the `home` CMS page (D81).
 *
 * "Why choose us" used to be four objects hardcoded in a component, so the
 * only way to change a word of it was a deploy (BUG-11). It is now
 * `pages/slug/home` → the block of type `features`, and this renders it.
 *
 * Prompt 30 moves this file to `components/cms/blocks/FeaturesBlock.jsx` and
 * the CMS renderer mounts it for every page that carries the block; the markup
 * below is what moves. Registered in `docs/PROJECT_STATE.md` → "Pending
 * rewrites" (owner 30).
 *
 * @param {object} props
 * @param {{title?: string, subtitle?: string, items?: Array<{icon?: string,
 *   title: string, text?: string}>}} [props.data] the block's `data` (§6.10)
 */
export default function HomeFeatures({ data }) {
  const items = Array.isArray(data?.items) ? data.items.filter((item) => item?.title) : [];

  // No block, no section — there is no hardcoded copy to fall back on (D81).
  if (items.length === 0) return null;

  return (
    <Section background="surface" spacing="lg">
      <Container>
        <SectionHeader title={data.title} subtitle={data.subtitle} align="center" />

        <ul className={styles.grid}>
          {items.map((item) => (
            <li key={item.title} className={styles.item}>
              {item.icon ? (
                <span className={styles.iconWrap} aria-hidden="true">
                  <Icon icon={item.icon} className={styles.icon} />
                </span>
              ) : null}
              <h3 className={styles.title}>{item.title}</h3>
              {item.text ? <p className={styles.text}>{item.text}</p> : null}
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
