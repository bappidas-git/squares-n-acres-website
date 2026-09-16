import { Suspense, lazy, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import { CONSTRUCTION_STATUS, TIMELINE_STATUS } from '../../../config/enums';
import { Chip, LazyImage } from '../../ui';
import { formatDate, formatMonthYear } from '../../../utils/format';
import SectionShell from './SectionShell';
import { toneStyles } from '../../ui/tones';

import styles from './ConstructionSection.module.css';

const PropertyLightbox = lazy(() => import('./PropertyLightbox'));

/** A number the record actually carries — `0` counts, `''` and `null` do not. */
const hasNumber = (value) =>
  value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

const TIMELINE_ICONS = {
  completed: 'mdi:check',
  'in-progress': 'mdi:progress-wrench',
  upcoming: 'mdi:circle-outline',
};

/**
 * The milestones in `order`, with anything unnamed dropped.
 *
 * Exported for the unit test.
 *
 * @param {Array<object>} timeline
 * @returns {Array<object>}
 */
export function orderedMilestones(timeline) {
  return (Array.isArray(timeline) ? timeline : [])
    .filter((entry) => entry && String(entry.milestone ?? '').trim() !== '')
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const order = (item) => (hasNumber(item.entry.order) ? Number(item.entry.order) : null);
      if (order(a) !== null && order(b) !== null && order(a) !== order(b)) {
        return order(a) - order(b);
      }
      return a.index - b.index;
    })
    .map((item) => item.entry);
}

/**
 * How far along the build is, as a whole percentage — or `null` when nothing in
 * the record can answer.
 *
 * The editor's own figure wins. Otherwise it is completed milestones over all
 * of them, which is where the boilerplate printed `Infinity%`: it divided by
 * `milestones.length - 1`, so one milestone divided by zero and none at all
 * divided by minus one (§11, additional defect 14).
 *
 * Exported for the unit test.
 *
 * @param {number|string|null} percent `constructionProgressPercent`
 * @param {Array<object>} milestones
 * @returns {number|null} 0–100, or `null` to hide the bar
 */
export function progressPercent(percent, milestones) {
  if (hasNumber(percent)) {
    return Math.min(100, Math.max(0, Math.round(Number(percent))));
  }

  const list = Array.isArray(milestones) ? milestones : [];
  if (list.length === 0) return null;

  const done = list.filter((entry) => entry.status === 'completed').length;
  return Math.round((done / list.length) * 100);
}

/**
 * Where the building has got to: a progress bar and the milestones behind it.
 *
 * Only shown while a project is being built — `getVisibleSections` keeps it off
 * ready-to-move and resale listings, which have no progress left to report.
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 * @param {'bg'|'surface'} [props.background]
 */
export default function ConstructionSection({ property, background = 'bg' }) {
  const [lightbox, setLightbox] = useState(null);

  const milestones = useMemo(() => orderedMilestones(property?.constructionTimeline), [property]);

  const percent = progressPercent(property?.constructionProgressPercent, milestones);

  if (percent === null && milestones.length === 0) return null;

  const photos = milestones.filter((entry) => String(entry.imageUrl ?? '').trim() !== '');
  const slides = photos.map((entry) => ({
    src: entry.imageUrl,
    alt: `${entry.milestone} — construction progress`,
    description: entry.date ? `${entry.milestone} · ${formatDate(entry.date)}` : entry.milestone,
  }));

  const statusLabel = CONSTRUCTION_STATUS.labelOf(property?.constructionStatus);

  return (
    <SectionShell
      id="construction"
      title="Construction progress"
      subtitle={
        property?.possessionDate
          ? `Possession expected ${formatMonthYear(property.possessionDate)}.`
          : undefined
      }
      background={background}
      action={
        statusLabel ? (
          <Chip tone="warning" variant="soft">
            {statusLabel}
          </Chip>
        ) : null
      }
    >
      {percent !== null ? (
        <div className={styles.progress}>
          <div className={styles.progressHead}>
            <span className={styles.progressLabel}>Overall progress</span>
            <span className={styles.progressValue}>{percent}%</span>
          </div>
          <div
            className={styles.track}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Overall construction progress"
          >
            <div className={styles.fill} style={{ width: `${percent}%` }} />
          </div>
        </div>
      ) : null}

      {milestones.length > 0 ? (
        <ol className={styles.timeline}>
          {milestones.map((entry) => {
            const status = TIMELINE_STATUS.has(entry.status) ? entry.status : 'upcoming';
            const tone = TIMELINE_STATUS.meta[status]?.tone ?? 'neutral';
            const palette = toneStyles(tone);
            const photoIndex = photos.indexOf(entry);

            return (
              <li
                key={entry.id ?? entry.milestone}
                className={styles.milestone}
                style={{ '--dot-color': palette.border, '--dot-bg': palette.background }}
              >
                <span className={styles.dot}>
                  <Icon icon={TIMELINE_ICONS[status]} width="16" height="16" aria-hidden="true" />
                </span>

                <div className={styles.body}>
                  <h3 className={styles.milestoneTitle}>{entry.milestone}</h3>
                  <p className={styles.milestoneMeta}>
                    <span className={styles.statusText}>{TIMELINE_STATUS.labelOf(status)}</span>
                    {entry.date ? ` · ${formatMonthYear(entry.date)}` : ''}
                  </p>
                  {entry.note ? <p className={styles.note}>{entry.note}</p> : null}
                  {photoIndex >= 0 ? (
                    <button
                      type="button"
                      className={styles.photoButton}
                      onClick={() => setLightbox(photoIndex)}
                      aria-label={`View the site photograph for ${entry.milestone}`}
                    >
                      <LazyImage
                        src={entry.imageUrl}
                        alt={`${entry.milestone} — construction progress`}
                        ratio="4/3"
                        sizes="220px"
                        className={styles.photo}
                      />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      {property?.updatedAt ? (
        <p className={styles.updated}>Last updated {formatDate(property.updatedAt)}.</p>
      ) : null}

      {lightbox !== null ? (
        <Suspense fallback={null}>
          <PropertyLightbox
            open
            index={lightbox}
            slides={slides}
            onClose={() => setLightbox(null)}
            onIndexChange={setLightbox}
          />
        </Suspense>
      ) : null}
    </SectionShell>
  );
}
