import { useState } from 'react';
import { Icon } from '@iconify/react';

import { Button } from '../../ui';
import SectionShell from './SectionShell';

import styles from './HighlightsSection.module.css';

/** Two columns of three is what a desktop shows before asking for more. */
const INITIAL = 6;

/**
 * The listing's selling points, one line each.
 *
 * The boilerplate numbered them "N Big Reasons This Project Stands Out" and
 * printed the word "Feature" whenever a record had none; a highlight here is a
 * string the editor wrote (D40) and an empty list means the section is not on
 * the page at all.
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 * @param {'bg'|'surface'} [props.background]
 */
export default function HighlightsSection({ property, background = 'bg' }) {
  const [expanded, setExpanded] = useState(false);

  const items = (Array.isArray(property?.highlights) ? property.highlights : [])
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);

  if (items.length === 0) return null;

  const shown = expanded ? items : items.slice(0, INITIAL);
  const hidden = items.length - shown.length;

  return (
    <SectionShell id="highlights" title="Highlights" background={background}>
      <ul className={styles.list}>
        {shown.map((item) => (
          <li key={item} className={styles.item}>
            <Icon icon="mdi:check-circle-outline" className={styles.icon} aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {items.length > INITIAL ? (
        <Button
          variant="ghost"
          size="sm"
          className={styles.toggle}
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          icon={<Icon icon={expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} aria-hidden="true" />}
        >
          {expanded ? 'Show fewer' : `Show ${hidden} more`}
        </Button>
      ) : null}
    </SectionShell>
  );
}
