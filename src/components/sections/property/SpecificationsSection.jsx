import { useState } from 'react';
import { Icon } from '@iconify/react';

import { Button } from '../../ui';
import { SPEC_GROUPS } from '../../../config/enums';
import SectionShell from './SectionShell';

import styles from './SpecificationsSection.module.css';

/** How many rows a block prints before it offers the rest. */
const INITIAL_ROWS = 8;

/**
 * The icon that stands for each `SPEC_GROUPS` value.
 *
 * Presentation, so it lives here rather than in the enum (which is the shared
 * contract the mock server reads too). A row's own `icon` always wins.
 */
const GROUP_ICONS = {
  structure: 'mdi:home-outline',
  flooring: 'mdi:floor-plan',
  kitchen: 'mdi:countertop-outline',
  'doors-windows': 'mdi:door-open',
  bathroom: 'mdi:shower-head',
  electrical: 'mdi:lightning-bolt-outline',
  'walls-painting': 'mdi:format-paint',
  security: 'mdi:shield-check-outline',
  'lift-common-areas': 'mdi:elevator-passenger-outline',
  other: 'mdi:information-outline',
};

const filled = (value) => value !== null && value !== undefined && String(value).trim() !== '';

/**
 * Rows grouped in `SPEC_GROUPS` order, empty groups dropped.
 *
 * Exported for the unit test.
 *
 * @param {Array<{group?: string, label?: string, value?: string, icon?: string}>} rows
 * @returns {Array<{value: string, label: string, icon: string, items: Array<object>}>}
 */
export function groupSpecifications(rows) {
  const list = (Array.isArray(rows) ? rows : []).filter(
    (row) => row && filled(row.label) && filled(row.value)
  );

  return SPEC_GROUPS.entries
    .map((group) => ({
      value: group.value,
      label: group.label,
      icon: GROUP_ICONS[group.value] ?? GROUP_ICONS.other,
      items: list.filter((row) => (row.group ?? 'other') === group.value),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * One grouped block of label/value rows, collapsed past eight.
 *
 * A block with a heading of its own pushes its groups down a level, so the
 * page never skips from an H2 to an H4 (§8.3).
 *
 * @param {object} props
 * @param {string} [props.title] the H3 above the block
 * @param {Array<object>} props.groups the output of {@link groupSpecifications}
 * @param {number} props.count how many rows there are in total
 * @param {boolean} [props.withIcons]
 */
function SpecBlock({ title, groups, count, withIcons = true }) {
  const [expanded, setExpanded] = useState(false);
  const GroupHeading = title ? 'h4' : 'h3';

  // The cut runs across the flattened list, so a group is never half-printed
  // without the visitor being told there is more.
  let budget = expanded ? count : INITIAL_ROWS;
  const shown = groups
    .map((group) => {
      const items = group.items.slice(0, Math.max(budget, 0));
      budget -= items.length;
      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);

  return (
    <div className={styles.block}>
      {title ? <h3 className={styles.blockTitle}>{title}</h3> : null}

      <div className={styles.groups}>
        {shown.map((group) => (
          <div key={group.value} className={styles.group}>
            <GroupHeading className={styles.groupTitle}>
              {withIcons ? (
                <Icon icon={group.icon} className={styles.groupIcon} aria-hidden="true" />
              ) : null}
              {group.label}
            </GroupHeading>
            <dl className={styles.rows}>
              {group.items.map((row) => (
                <div key={`${group.value}-${row.label}`} className={styles.row}>
                  <dt className={styles.label}>
                    {withIcons && row.icon ? (
                      <Icon icon={row.icon} className={styles.rowIcon} aria-hidden="true" />
                    ) : null}
                    {row.label}
                  </dt>
                  <dd className={styles.value}>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {count > INITIAL_ROWS ? (
        <Button
          variant="ghost"
          size="sm"
          className={styles.toggle}
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          icon={<Icon icon={expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} aria-hidden="true" />}
        >
          {expanded ? 'Show fewer' : `Show all ${count}`}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * The specification sheet, and the construction specifications below it.
 *
 * Both live under the one `specifications` toggle (D39) because they answer the
 * same question — what is this building made of — and an editor who fills one
 * in rarely means to hide the other.
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 * @param {'bg'|'surface'} [props.background]
 */
export default function SpecificationsSection({ property, background = 'bg' }) {
  const specs = groupSpecifications(property?.specifications);
  const construction = groupSpecifications(property?.constructionSpecs);

  const specCount = specs.reduce((total, group) => total + group.items.length, 0);
  const constructionCount = construction.reduce((total, group) => total + group.items.length, 0);

  if (specCount === 0 && constructionCount === 0) return null;

  return (
    <SectionShell id="specifications" title="Specifications" background={background}>
      {specCount > 0 ? (
        <SpecBlock
          title={constructionCount > 0 ? 'Project specifications' : undefined}
          groups={specs}
          count={specCount}
        />
      ) : null}

      {constructionCount > 0 ? (
        <SpecBlock
          title="Construction specifications"
          groups={construction}
          count={constructionCount}
          withIcons={false}
        />
      ) : null}
    </SectionShell>
  );
}
