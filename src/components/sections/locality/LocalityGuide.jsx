import { Icon } from '@iconify/react';

import LegacyHtml from '../../common/LegacyHtml';

import styles from './LocalitySections.module.css';

/**
 * The written half of a locality guide: the editor's description and the
 * highlights beside it.
 *
 * The description is CMS-authored HTML rendered through the temporary
 * `LegacyHtml`; prompt 32 swaps in `SafeHtml` with the allow-list the Tiptap
 * editor writes with (registered under "Pending rewrites").
 *
 * Nothing renders when a locality has neither — an empty "About" heading is
 * worse than no section (§7 of prompt 14).
 *
 * @param {object} props
 * @param {object} props.locality a §6.2 record
 */
export default function LocalityGuide({ locality }) {
  const { name, description, highlights } = locality;
  const items = Array.isArray(highlights) ? highlights.filter(Boolean) : [];

  if (!description && items.length === 0) return null;

  return (
    <section className={styles.block} aria-labelledby="locality-about">
      <h2 className={styles.blockTitle} id="locality-about">
        About {name}
      </h2>

      <div className={styles.guideLayout}>
        {description ? <LegacyHtml html={description} className={styles.prose} /> : null}

        {items.length > 0 ? (
          <div className={styles.highlights}>
            <h3 className={styles.highlightsTitle}>Why people choose it</h3>
            <ul className={styles.highlightList}>
              {items.map((item) => (
                <li key={item} className={styles.highlightItem}>
                  <Icon
                    icon="mdi:check-circle-outline"
                    width="20"
                    height="20"
                    className={styles.highlightIcon}
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
