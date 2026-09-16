import { useState } from 'react';
import { Icon } from '@iconify/react';

import { AMENITY_CATEGORIES } from '../../../config/enums';
import { Button } from '../../ui';
import SectionShell from './SectionShell';

import styles from './AmenitiesSection.module.css';

/** How many amenities a section prints before it offers the rest. */
const INITIAL = 12;

/** The default icon for an amenity whose record carries none. */
const FALLBACK_ICON = 'mdi:check-circle-outline';

/**
 * The listing's amenities grouped by category, in `AMENITY_CATEGORIES` order.
 *
 * A commercial listing reads its own category first: a conference room matters
 * more to somebody leasing an office than the swimming pool does.
 *
 * Exported for the unit test.
 *
 * @param {Array<{id: number, name: string, icon?: string, category?: string}>} amenities
 * @param {string} [segment] a `SEGMENTS` value
 * @returns {Array<{value: string, label: string, icon: string, items: Array<object>}>}
 */
export function groupAmenities(amenities, segment) {
  const list = (Array.isArray(amenities) ? amenities : []).filter((item) => item && item.name);

  const groups = AMENITY_CATEGORIES.entries
    .map((category) => ({
      value: category.value,
      label: category.label,
      icon: category.icon,
      items: list.filter((item) => (item.category ?? 'basic') === category.value),
    }))
    .filter((group) => group.items.length > 0);

  if (segment !== 'commercial') return groups;

  return [
    ...groups.filter((group) => group.value === 'commercial'),
    ...groups.filter((group) => group.value !== 'commercial'),
  ];
}

/**
 * What the project offers, as chips grouped by what kind of thing it is.
 *
 * The record embeds the amenities the editor ticked (`{id, name, slug, icon,
 * category}`, §6.1), so nothing is fetched and nothing is guessed: an amenity
 * with no icon gets the check mark rather than a broken glyph.
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 * @param {'bg'|'surface'} [props.background]
 */
export default function AmenitiesSection({ property, background = 'bg' }) {
  const [expanded, setExpanded] = useState(false);

  const groups = groupAmenities(property?.amenities, property?.segment);
  const total = groups.reduce((count, group) => count + group.items.length, 0);

  if (total === 0) return null;

  // The cut runs across the flattened list so that the first groups are whole.
  let budget = expanded ? total : INITIAL;
  const shown = groups
    .map((group) => {
      const items = group.items.slice(0, Math.max(budget, 0));
      budget -= items.length;
      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);

  return (
    <SectionShell
      id="amenities"
      title="Amenities"
      subtitle={`${total} ${total === 1 ? 'amenity' : 'amenities'} across ${groups.length} ${
        groups.length === 1 ? 'category' : 'categories'
      }.`}
      background={background}
    >
      <div className={styles.groups}>
        {shown.map((group) => (
          <div key={group.value} className={styles.group}>
            <h3 className={styles.groupTitle}>
              <Icon icon={group.icon} className={styles.groupIcon} aria-hidden="true" />
              {group.label}
            </h3>
            <ul className={styles.chips}>
              {group.items.map((item) => (
                <li key={item.id ?? item.slug ?? item.name} className={styles.chip}>
                  <Icon
                    icon={item.icon || FALLBACK_ICON}
                    className={styles.chipIcon}
                    aria-hidden="true"
                  />
                  {item.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {total > INITIAL ? (
        <Button
          variant="ghost"
          size="sm"
          className={styles.toggle}
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          icon={<Icon icon={expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} aria-hidden="true" />}
        >
          {expanded ? 'Show fewer' : `Show all ${total} amenities`}
        </Button>
      ) : null}
    </SectionShell>
  );
}
