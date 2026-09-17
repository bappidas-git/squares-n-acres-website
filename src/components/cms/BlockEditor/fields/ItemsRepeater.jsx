import { Icon } from '@iconify/react';

import Button from '../../../ui/Button';
import IconButton from '../../../ui/IconButton';
import SortableList from '../../../admin/SortableList';

import styles from '../BlockEditor.module.css';

/**
 * The `items[]` half of a block: a reorderable list of identical little forms.
 *
 * Eight of the block types are a heading plus a list — features, steps, stats,
 * facts, checklist items, expandable cards, packages, quiz questions — and the
 * only thing that differs between them is which boxes one row holds. So the
 * schema names the boxes (`itemFields`) and this renders them, which is why a
 * new list-shaped block type costs no component.
 *
 * Reordering is `SortableList`: drag on a mouse, ↑/↓ buttons everywhere else,
 * announced through its live region. Rows are keyed by position rather than by
 * an id they may not have, so `renderRow` is given the index it is drawing.
 *
 * @param {object} props
 * @param {object} props.field the schema's `items` descriptor
 * @param {Array<object>} props.value
 * @param {(items: Array<object>) => void} props.onChange
 * @param {(item: object, index: number, setItem: (patch: object) => void) => React.ReactNode}
 *   props.renderRow one row's controls, drawn by `BlockForm`
 * @param {Record<string, string>} [props.errors] keyed `items.0.title`
 * @param {boolean} [props.disabled]
 */
export default function ItemsRepeater({
  field,
  value,
  onChange,
  renderRow,
  errors = {},
  disabled = false,
}) {
  const items = Array.isArray(value) ? value : [];
  const rows = items.map((item, index) => ({ key: index, item }));

  const setItem = (index, patch) =>
    onChange(items.map((item, at) => (at === index ? { ...item, ...patch } : item)));

  const remove = (index) => onChange(items.filter((_item, at) => at !== index));

  const duplicate = (index) => {
    const next = [...items];
    next.splice(index + 1, 0, { ...items[index] });
    onChange(next);
  };

  const add = () => onChange([...items, field.newItem ? field.newItem(items) : {}]);

  const nameOf = (item, index) => {
    const label = field.itemLabel?.(item, index);
    const text = typeof label === 'string' ? label.trim() : '';
    return text || `${singular(field.label)} ${index + 1}`;
  };

  const rowHasError = (index) =>
    Object.keys(errors).some((key) => key.startsWith(`${field.name}.${index}.`));

  return (
    <fieldset className={styles.repeater} disabled={disabled}>
      <legend className={styles.repeaterLegend}>{field.label}</legend>
      {field.hint ? <p className={styles.repeaterHint}>{field.hint}</p> : null}

      {items.length > 0 ? (
        <SortableList
          items={rows}
          disabled={disabled}
          label={`${field.label}, in order`}
          getId={(row) => row.key}
          getLabel={(row, index) => nameOf(row.item, index)}
          onReorder={(next) => onChange(next.map((row) => row.item))}
          renderItem={(row, index) => (
            <div className={styles.repeaterRow}>
              <div className={styles.repeaterHead}>
                <span className={styles.repeaterName}>
                  {index + 1}. {nameOf(row.item, index)}
                </span>
                {rowHasError(index) ? (
                  <span className={styles.repeaterError}>
                    <Icon icon="mdi:alert-circle-outline" width="14" height="14" aria-hidden />
                    Incomplete
                  </span>
                ) : null}
                <span className={styles.repeaterActions}>
                  <IconButton
                    label={`Duplicate ${nameOf(row.item, index)}`}
                    size="sm"
                    disabled={disabled}
                    onClick={() => duplicate(index)}
                  >
                    <Icon icon="mdi:content-copy" width="16" height="16" />
                  </IconButton>
                  <IconButton
                    label={`Remove ${nameOf(row.item, index)}`}
                    size="sm"
                    disabled={disabled}
                    onClick={() => remove(index)}
                  >
                    <Icon icon="mdi:close" width="18" height="18" />
                  </IconButton>
                </span>
              </div>
              <div className={styles.repeaterBody}>
                {renderRow(row.item, index, (patch) => setItem(index, patch))}
              </div>
            </div>
          )}
        />
      ) : (
        <p className={styles.repeaterEmpty}>Nothing here yet.</p>
      )}

      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        icon={<Icon icon="mdi:plus" width="16" height="16" />}
        onClick={add}
      >
        {field.addLabel ?? `Add ${singular(field.label).toLowerCase()}`}
      </Button>
    </fieldset>
  );
}

/** "Features" → "Feature"; good enough for the row labels the schema names. */
function singular(label = 'Item') {
  const text = String(label);
  if (/ies$/i.test(text)) return `${text.slice(0, -3)}y`;
  if (/s$/i.test(text) && !/ss$/i.test(text)) return text.slice(0, -1);
  return text;
}
