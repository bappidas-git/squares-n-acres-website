import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import IconPicker from '../../../../../components/admin/IconPicker';
import SortableList from '../../../../../components/admin/SortableList';
import { Button, IconButton, TextField } from '../../../../../components/ui';
import { SPEC_GROUPS } from '../../../../../config/enums';

import styles from './SpecificationsRepeater.module.css';

/**
 * A grouped `{ group, label, value, icon? }` list — used twice on the
 * Highlights & specifications tab (00_MASTER_CONTEXT.md §6.1, D39).
 *
 * `specifications` and `constructionSpecs` are the same shape with one
 * difference: a specification may carry an Iconify id, a construction
 * specification may not. One component with `withIcon` rather than two files
 * that drift apart.
 *
 * Both lists are stored flat and ordered on the record; an editor thinks in
 * `SPEC_GROUPS` ("what goes under Flooring?"), so the rows are shown grouped,
 * a group with nothing in it is not a heading over nothing, and a drag inside
 * a group is translated into **one** `moveItem` of the flat list — the legacy
 * Details tab rewrote every row on every drag, which is what made it crawl.
 *
 * @param {object} props
 * @param {string} props.path the dotted list this renders (`specifications`)
 * @param {Array<object>} props.rows the flat list
 * @param {Record<string, string>} props.errors keyed `<path>.<i>.<field>`
 * @param {boolean} [props.withIcon] render the icon button per row
 * @param {boolean} [props.disabled]
 * @param {(group: string) => void} props.onAdd
 * @param {(id: string|number, patch: object) => void} props.onUpdate
 * @param {(id: string|number) => void} props.onRemove
 * @param {(from: number, to: number) => void} props.onMove flat indexes
 * @param {string} [props.labelPlaceholder]
 * @param {string} [props.valuePlaceholder]
 * @param {React.ReactNode} [props.emptyText]
 */
export default function SpecificationsRepeater({
  path,
  rows = [],
  errors = {},
  withIcon = false,
  disabled = false,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
  labelPlaceholder = 'e.g. Living / Dining',
  valuePlaceholder = 'e.g. Vitrified tiles',
  emptyText,
}) {
  const [iconFor, setIconFor] = useState(null);

  // Each row keeps the index it holds in the stored list, because that is what
  // the error keys and `moveItem` are written in.
  const groups = useMemo(() => {
    const indexed = rows.map((row, index) => ({ row, index }));
    return SPEC_GROUPS.entries
      .map((entry) => ({
        ...entry,
        items: indexed.filter(({ row }) => (row.group ?? 'other') === entry.value),
      }))
      .filter((group) => group.items.length > 0);
  }, [rows]);

  const complete = rows.filter(
    (row) => String(row.label ?? '').trim() !== '' && String(row.value ?? '').trim() !== ''
  ).length;
  const blank = rows.length - complete;

  return (
    <div className={styles.wrapper}>
      <p className={styles.empty}>
        {rows.length === 0
          ? emptyText
          : `${complete} ${complete === 1 ? 'row' : 'rows'} across ${groups.length} ${
              groups.length === 1 ? 'group' : 'groups'
            }.`}
        {blank > 0 ? (
          <span className={styles.blank}>
            {' '}
            {blank} {blank === 1 ? 'row has' : 'rows have'} no value yet and{' '}
            {blank === 1 ? 'is' : 'are'} not saved.
          </span>
        ) : null}
      </p>

      {groups.map((group) => (
        <section className={styles.group} key={group.value}>
          <div className={styles.groupHead}>
            <h4 className={styles.groupTitle}>
              {group.label}
              <span className={styles.groupCount}>({group.items.length})</span>
            </h4>
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onAdd?.(group.value)}
              icon={<Icon icon="mdi:plus" width="16" height="16" />}
            >
              Add row to {group.label}
            </Button>
          </div>

          <SortableList
            label={`${group.label} rows in order`}
            items={group.items}
            disabled={disabled}
            getId={({ row }) => row.id}
            getLabel={({ row }, position) => row.label || `${group.label} row ${position + 1}`}
            onReorder={(_next, { from, to }) => {
              const flatFrom = group.items[from]?.index;
              const flatTo = group.items[to]?.index;
              if (flatFrom === undefined || flatTo === undefined) return;
              onMove?.(flatFrom, flatTo);
            }}
            renderItem={({ row, index }) => (
              <div
                className={[styles.row, withIcon ? styles.withIcon : ''].filter(Boolean).join(' ')}
              >
                {withIcon ? (
                  <button
                    type="button"
                    className={styles.iconButton}
                    disabled={disabled}
                    aria-label={`Choose an icon for ${row.label || `row ${index + 1}`}`}
                    onClick={() => setIconFor(row)}
                  >
                    <Icon
                      icon={row.icon || 'mdi:plus'}
                      width="22"
                      height="22"
                      aria-hidden="true"
                      className={row.icon ? styles.iconSet : styles.iconEmpty}
                    />
                  </button>
                ) : null}

                <TextField
                  label="Label"
                  value={row.label ?? ''}
                  error={errors[`${path}.${index}.label`]}
                  disabled={disabled}
                  maxLength={120}
                  placeholder={labelPlaceholder}
                  onChange={(event) => onUpdate?.(row.id, { label: event.target.value })}
                />
                <TextField
                  label="Value"
                  value={row.value ?? ''}
                  error={errors[`${path}.${index}.value`]}
                  disabled={disabled}
                  maxLength={240}
                  placeholder={valuePlaceholder}
                  onChange={(event) => onUpdate?.(row.id, { value: event.target.value })}
                />

                <span className={styles.rowAction}>
                  <IconButton
                    label={`Remove ${row.label || `row ${index + 1}`}`}
                    size="sm"
                    disabled={disabled}
                    onClick={() => onRemove?.(row.id)}
                  >
                    <Icon icon="mdi:close" width="18" height="18" />
                  </IconButton>
                </span>
              </div>
            )}
          />
        </section>
      ))}

      <div className={styles.actions}>
        {SPEC_GROUPS.entries.map((entry) => (
          <Button
            key={entry.value}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onAdd?.(entry.value)}
            icon={<Icon icon="mdi:plus" width="16" height="16" />}
          >
            {entry.label}
          </Button>
        ))}
      </div>

      {withIcon ? (
        <IconPicker
          open={Boolean(iconFor)}
          currentIcon={iconFor?.icon ?? ''}
          onClose={() => setIconFor(null)}
          onSelect={(icon) => {
            if (iconFor) onUpdate?.(iconFor.id, { icon });
            setIconFor(null);
          }}
        />
      ) : null}
    </div>
  );
}
