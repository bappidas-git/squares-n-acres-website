import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import { Button } from '../../ui';
import { formatMonthYear, formatNumber } from '../../../utils/format';
import SafeHtml from '../../editor/SafeHtml';
import SectionShell from './SectionShell';

import styles from './OverviewSection.module.css';

/** A value the record actually carries — `0` counts, `''` and `null` do not. */
const has = (value) => value !== null && value !== undefined && value !== '';

/** How much taller than its box the text must be before "Read more" appears. */
const CLAMP_SLACK = 8;

/**
 * The snapshot chips: the project-level facts a buyer scans before reading.
 *
 * Exported so the rule — a fact with nothing behind it is not a chip, and no
 * chip is ever an em dash (BUG-05) — can be asserted without a render.
 *
 * @param {object} property a record of §6.1
 * @returns {Array<{key: string, label: string, value: string, icon: string}>}
 */
export function snapshot(property) {
  if (!property || typeof property !== 'object') return [];

  const project = property.project ?? {};
  const chips = [];

  const add = (key, label, value, icon) => {
    if (has(value)) chips.push({ key, label, value: String(value), icon });
  };

  add(
    'projectArea',
    'Project area',
    has(project.projectAreaAcres)
      ? `${formatNumber(project.projectAreaAcres, { maximumFractionDigits: 2 })} acres`
      : null,
    'mdi:texture-box'
  );
  add(
    'towers',
    'Towers',
    has(project.totalTowers) ? formatNumber(project.totalTowers) : null,
    'mdi:office-building-outline'
  );
  add(
    'units',
    'Units',
    has(project.totalUnits) ? formatNumber(project.totalUnits) : null,
    'mdi:home-group'
  );
  add(
    'launch',
    'Launched',
    has(project.launchDate) ? formatMonthYear(project.launchDate) : null,
    'mdi:rocket-launch-outline'
  );

  // A home still being built has a possession promise; a finished one has an
  // age. Never both, and never a placeholder for the one it lacks.
  if (has(property.possessionDate) && property.constructionStatus !== 'ready-to-move') {
    add('possession', 'Possession', formatMonthYear(property.possessionDate), 'mdi:calendar-clock');
  } else if (has(property.ageOfPropertyYears)) {
    const years = Number(property.ageOfPropertyYears);
    add(
      'age',
      'Age',
      years <= 0 ? 'Newly built' : `${formatNumber(years)} year${years === 1 ? '' : 's'} old`,
      'mdi:calendar-check-outline'
    );
  }

  if (has(property.reraNumber)) {
    add('rera', 'RERA', property.reraNumber, 'mdi:file-certificate-outline');
  } else if (property.reraRegistered === true) {
    add('rera', 'RERA', 'Registered', 'mdi:file-certificate-outline');
  }

  return chips;
}

/**
 * What this property is, in the words the editor wrote plus the numbers the
 * project carries.
 *
 * The description is CMS-authored HTML clamped to about twelve lines, with
 * "Read more" only when there is more to read: a two-sentence listing is not
 * given a button that does nothing. The clamp is measured rather than guessed,
 * because the same paragraph is four lines wide on a desktop and twelve on a
 * phone.
 *
 * `SafeHtml` sanitises the markup against the editor's own allow-list and
 * renders the blocks an editor dropped into it — a call to action, a row of
 * listings — as the live components rather than as empty divs.
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 * @param {'bg'|'surface'} [props.background]
 * @param {(items: Array<{question: string, answer: string}>) => void} [props.onFaqItems]
 *   every question the description itself carries, so the page can publish them
 *   in its `FAQPage` alongside the listing's own (§9.3)
 */
export default function OverviewSection({ property, background = 'bg', onFaqItems }) {
  const bodyRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [clampable, setClampable] = useState(false);

  const description = property?.description ?? '';
  const chips = snapshot(property);

  const measure = useCallback(() => {
    const node = bodyRef.current;
    if (!node) return;
    setClampable(node.scrollHeight - node.clientHeight > CLAMP_SLACK);
  }, []);

  useEffect(() => {
    if (expanded) return undefined;
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [expanded, measure, description]);

  if (!description && chips.length === 0) return null;

  const title = property?.title ? `About ${property.title}` : 'Overview';

  return (
    <SectionShell id="overview" title={title} background={background}>
      {description ? (
        <div className={styles.body}>
          <div
            ref={bodyRef}
            className={[styles.description, expanded ? '' : styles.clamped]
              .filter(Boolean)
              .join(' ')}
          >
            <SafeHtml html={description} onFaqItems={onFaqItems} />
          </div>
          {clampable ? (
            <Button
              variant="ghost"
              size="sm"
              className={styles.toggle}
              onClick={() => setExpanded((open) => !open)}
              icon={
                <Icon icon={expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} aria-hidden="true" />
              }
              aria-expanded={expanded}
            >
              {expanded ? 'Read less' : 'Read more'}
            </Button>
          ) : null}
        </div>
      ) : null}

      {chips.length > 0 ? (
        <dl className={styles.snapshot}>
          {chips.map((chip) => (
            <div key={chip.key} className={styles.chip}>
              <Icon icon={chip.icon} className={styles.chipIcon} aria-hidden="true" />
              <dt className={styles.chipLabel}>{chip.label}</dt>
              <dd className={styles.chipValue}>{chip.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </SectionShell>
  );
}
