import { Icon } from '@iconify/react';

import useCountUp from '../../../hooks/useCountUp';
import useInView from '../../../hooks/useInView';
import { Chip, StatCard } from '../../ui';
import { formatNumber } from '../../../utils/format';

import styles from './DeveloperSections.module.css';

/**
 * One counted figure. The counter is a hook and the figures are rendered in a
 * loop, so each one is its own component; `enabled` holds it at zero until the
 * row is on screen, and `prefers-reduced-motion` skips the animation entirely.
 */
function CountedValue({ value, enabled }) {
  const current = useCountUp(value, { enabled, duration: 1400 });
  return formatNumber(current);
}

/**
 * The four numbers a builder page opens with — established, total, ongoing,
 * completed — and the RERA registrations underneath them.
 *
 * Each figure renders only when the record carries it, so a builder that keeps
 * no counts shows the registrations alone and one that keeps neither renders
 * nothing at all (§8.2).
 *
 * The year of establishment is a label, not a quantity: it is printed as it is
 * written, without thousands grouping and without counting up to it from zero.
 *
 * @param {object} props
 * @param {object} props.developer a §6.5 record
 * @param {2|3} [props.headingLevel] the level the block's heading is printed at
 * @param {string} [props.headingId] unique on the page it is rendered into
 */
export default function DeveloperStats({
  developer,
  headingLevel = 2,
  headingId = 'developer-facts',
}) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });

  const { establishedYear, totalProjects, ongoingProjects, completedProjects, reraIds } = developer;

  const counted = (value, key, icon, label) =>
    typeof value === 'number' && Number.isFinite(value)
      ? { key, icon, label, value: <CountedValue value={value} enabled={inView} /> }
      : null;

  const stats = [
    establishedYear
      ? {
          key: 'established',
          icon: 'mdi:calendar-star',
          label: 'Established',
          value: String(establishedYear),
        }
      : null,
    counted(totalProjects, 'total', 'mdi:office-building-outline', 'Total projects'),
    counted(ongoingProjects, 'ongoing', 'mdi:crane', 'Ongoing'),
    counted(completedProjects, 'completed', 'mdi:check-decagram-outline', 'Completed'),
  ].filter(Boolean);

  const ids = (Array.isArray(reraIds) ? reraIds : []).filter(Boolean);

  if (stats.length === 0 && ids.length === 0) return null;

  const Heading = `h${headingLevel}`;

  return (
    <section className={styles.block} aria-labelledby={headingId} ref={ref}>
      <Heading className={styles.blockTitle} id={headingId}>
        At a glance
      </Heading>

      {stats.length > 0 ? (
        <div className={styles.statsGrid}>
          {stats.map((stat) => (
            <StatCard
              key={stat.key}
              className={styles.statCard}
              icon={<Icon icon={stat.icon} width="22" height="22" />}
              value={stat.value}
              label={stat.label}
            />
          ))}
        </div>
      ) : null}

      {ids.length > 0 ? (
        <div className={styles.reraIds}>
          <span className={styles.reraLabel}>
            <Icon icon="mdi:file-certificate-outline" width="18" height="18" aria-hidden="true" />
            {ids.length === 1 ? 'RERA registration' : 'RERA registrations'}
          </span>
          {ids.map((id) => (
            <Chip key={id} tone="info" variant="soft" className={styles.reraId}>
              {id}
            </Chip>
          ))}
        </div>
      ) : null}
    </section>
  );
}
