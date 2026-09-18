import { Icon } from '@iconify/react';

import Button from '../../../../components/ui/Button';
import IconButton from '../../../../components/ui/IconButton';
import SortableList from '../../../../components/admin/SortableList';
import styles from '../SettingsPage.module.css';
import { LIMITS } from '../settingsSchema';
import { SwitchField, TextField } from '../../../../components/ui/FormField';

/** A column and a link, as the record describes them (§6.13 `footer.columns`). */
export const emptyColumn = () => ({ title: '', links: [] });
export const emptyLink = () => ({ label: '', href: '', external: false });

/**
 * The footer's link columns.
 *
 * An editor's columns come first in the footer and the generated ones — Buy by
 * type, Popular localities, Insights, Company — fill the row behind them
 * (`config/navigation.js`), so four is the point at which nothing generated is
 * left and eight links is what one column can hold before it out-runs the
 * brand block beside it.
 *
 * Both lists reorder by drag, by the ↑/↓ buttons and by `Alt+↑`/`Alt+↓`. A drag
 * inside a column's links is stopped from reaching the column list, or one
 * gesture would move two things.
 *
 * @param {object} props
 * @param {Array<{title: string, links: Array<object>}>} props.value
 * @param {(columns: Array<object>) => void} props.onChange
 * @param {(path: string) => string|undefined} [props.errorAt] `'0.links.1.href'`
 * @param {boolean} [props.disabled]
 */
export default function FooterColumnsEditor({ value = [], onChange, errorAt, disabled = false }) {
  const columns = Array.isArray(value) ? value : [];
  const full = columns.length >= LIMITS.footerColumns;

  const writeColumn = (index, next) =>
    onChange?.(columns.map((column, at) => (at === index ? next : column)));

  const linksOf = (column) => (Array.isArray(column?.links) ? column.links : []);

  const setLink = (columnIndex, linkIndex, field, next) => {
    const column = columns[columnIndex];
    writeColumn(columnIndex, {
      ...column,
      links: linksOf(column).map((link, at) =>
        at === linkIndex ? { ...link, [field]: next } : link
      ),
    });
  };

  const stopDrag = (event) => event.stopPropagation();

  return (
    <div className={styles.repeater}>
      <p className={styles.repeaterCount}>
        {columns.length} of {LIMITS.footerColumns} columns — the rest of the footer row is filled
        from the property types, the localities and the published pages.
      </p>

      {columns.length === 0 ? (
        <p className={styles.repeaterEmpty}>
          No columns of your own yet — the footer shows the generated ones.
        </p>
      ) : (
        <SortableList
          label="Footer columns"
          items={columns}
          disabled={disabled}
          getId={(_column, index) => index}
          getLabel={(column) => column?.title || 'A column with no title'}
          onReorder={(next) => onChange?.(next)}
          renderItem={(column, index) => {
            const links = linksOf(column);
            const linksFull = links.length >= LIMITS.footerLinks;

            return (
              <div className={styles.columnCard}>
                <div className={styles.columnHead}>
                  <TextField
                    label={`Column ${index + 1} title`}
                    value={column?.title ?? ''}
                    onChange={(event) =>
                      writeColumn(index, { ...column, title: event.target.value })
                    }
                    error={errorAt?.(`${index}.title`)}
                    placeholder="Services"
                    disabled={disabled}
                  />
                  <IconButton
                    label={`Remove the column ${column?.title || index + 1}`}
                    onClick={() => onChange?.(columns.filter((_column, at) => at !== index))}
                    disabled={disabled}
                  >
                    <Icon icon="mdi:trash-can-outline" width="18" height="18" />
                  </IconButton>
                </div>

                {links.length > 0 ? (
                  <div onDragStart={stopDrag} onDrop={stopDrag}>
                    <SortableList
                      label={`Links of ${column?.title || `column ${index + 1}`}`}
                      items={links}
                      disabled={disabled}
                      getId={(_link, position) => position}
                      getLabel={(link) => link?.label || 'A link with no label'}
                      onReorder={(next) => writeColumn(index, { ...column, links: next })}
                      renderItem={(link, position) => (
                        <div className={styles.linkRow}>
                          <TextField
                            label="Label"
                            value={link?.label ?? ''}
                            onChange={(event) =>
                              setLink(index, position, 'label', event.target.value)
                            }
                            error={errorAt?.(`${index}.links.${position}.label`)}
                            placeholder="Home loan assistance"
                            disabled={disabled}
                          />
                          <TextField
                            label="Target"
                            value={link?.href ?? ''}
                            onChange={(event) =>
                              setLink(index, position, 'href', event.target.value)
                            }
                            error={errorAt?.(`${index}.links.${position}.href`)}
                            placeholder="/buyer-assistance/home-loan"
                            disabled={disabled}
                          />
                          <SwitchField
                            label="Opens a new tab"
                            checked={Boolean(link?.external)}
                            onChange={(next) => setLink(index, position, 'external', next)}
                            disabled={disabled}
                          />
                          <IconButton
                            label={`Remove the link ${link?.label || position + 1}`}
                            onClick={() =>
                              writeColumn(index, {
                                ...column,
                                links: links.filter((_link, at) => at !== position),
                              })
                            }
                            disabled={disabled}
                          >
                            <Icon icon="mdi:close" width="18" height="18" />
                          </IconButton>
                        </div>
                      )}
                    />
                  </div>
                ) : (
                  <p className={styles.repeaterEmpty}>This column has no links yet.</p>
                )}

                <div className={styles.actionRow}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      writeColumn(index, { ...column, links: [...links, emptyLink()] })
                    }
                    disabled={disabled || linksFull}
                    icon={<Icon icon="mdi:link-variant-plus" width="16" height="16" />}
                  >
                    Add a link
                  </Button>
                  <span className={styles.repeaterCount}>
                    {links.length} of {LIMITS.footerLinks} links
                  </span>
                </div>
              </div>
            );
          }}
        />
      )}

      <div className={styles.actionRow}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange?.([...columns, emptyColumn()])}
          disabled={disabled || full}
          icon={<Icon icon="mdi:plus" width="16" height="16" />}
        >
          Add a column
        </Button>
        {full ? (
          <span className={styles.hint}>
            Four columns of your own leave no room for the generated ones.
          </span>
        ) : null}
      </div>
    </div>
  );
}
