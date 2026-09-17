import { Icon } from '@iconify/react';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import { RowSummary } from './SeoEntityTable';
import { publicUrlOfRow } from './seoEntityServices';

import styles from './SeoDashboardPage.module.css';

/** The three fields the API compares, and what to call each one on screen. */
export const DUPLICATE_FIELDS = [
  { key: 'title', label: 'Identical SEO titles', icon: 'mdi:format-title' },
  { key: 'description', label: 'Identical meta descriptions', icon: 'mdi:text-box-outline' },
  { key: 'focusKeyword', label: 'Identical focus keywords', icon: 'mdi:key-outline' },
];

/** Case and spacing do not make two titles different (the API groups the same way). */
const normalise = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

/**
 * The rows that share a value, grouped by that value.
 *
 * The API has already said **which** rows collide (`duplicateOf`), so this is a
 * single pass over the flagged rows rather than the pairwise comparison of the
 * whole site the browser would otherwise be doing on every render.
 *
 * @param {Array<object>} rows every row of the site
 * @param {string} field `title`, `description` or `focusKeyword`
 * @returns {Array<{value: string, rows: Array<object>}>}
 */
export function groupDuplicates(rows = [], field) {
  const groups = new Map();

  for (const row of rows) {
    if (!(row?.duplicateOf?.[field] ?? []).length) continue;

    const raw = String(row.seo?.[field] ?? '').trim();
    if (!raw) continue; // Two records with nothing written are not duplicates.

    const key = normalise(raw);
    const group = groups.get(key);
    if (group) group.rows.push(row);
    else groups.set(key, { value: raw, rows: [row] });
  }

  return [...groups.values()].sort((left, right) => right.rows.length - left.rows.length);
}

/**
 * Duplicates (§4.5 of prompt 37).
 *
 * Two pages that claim the same title are two pages competing for the same
 * result, and Google picks one. This tab is the list of those fights, grouped
 * by the value they are fighting over, with a way into each record.
 *
 * @param {object} props
 * @param {Array<object>} props.rows every row of the site
 * @param {(row: object, field?: string) => void} props.onEdit
 */
export default function SeoDuplicatesTab({ rows = [], onEdit }) {
  const sections = DUPLICATE_FIELDS.map((field) => ({
    ...field,
    groups: groupDuplicates(rows, field.key),
  }));

  const anything = sections.some((section) => section.groups.length > 0);

  if (!anything) {
    return (
      <EmptyState
        icon={<Icon icon="mdi:check-decagram-outline" width="40" height="40" />}
        title="No duplicated titles, descriptions or keywords"
        text="Every record that has one of these written has written its own. Records that have none are not counted — fill them in from the Issues tab."
      />
    );
  }

  return (
    <div className={styles.duplicates}>
      {sections.map((section) =>
        section.groups.length === 0 ? null : (
          <section key={section.key} className={styles.duplicateSection}>
            <h2 className={styles.sectionTitle}>
              <Icon icon={section.icon} width="20" height="20" aria-hidden="true" />
              {section.label}
              <span className={styles.sectionCount}>{section.groups.length}</span>
            </h2>

            {section.groups.map((group) => (
              <Card key={`${section.key}:${group.value}`} className={styles.duplicateGroup}>
                <p className={styles.duplicateValue}>“{group.value}”</p>
                <p className={styles.duplicateCount}>
                  {group.rows.length} records use this{' '}
                  {section.key === 'focusKeyword' ? 'keyword' : section.key}
                </p>
                <ul className={styles.duplicateRows}>
                  {group.rows.map((row) => {
                    const url = publicUrlOfRow(row);
                    return (
                      <li key={row.key ?? `${row.type}:${row.id}`}>
                        <RowSummary row={row} />
                        <span className={styles.duplicateActions}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit?.(row, `seo.${section.key}`)}
                          >
                            Edit SEO
                          </Button>
                          {url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              icon={<Icon icon="mdi:open-in-new" width="16" height="16" />}
                            >
                              Open
                            </Button>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))}
          </section>
        )
      )}
    </div>
  );
}
