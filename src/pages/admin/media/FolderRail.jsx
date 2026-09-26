import { Icon } from '@iconify/react';

import { Button, SelectField } from '../../../components/ui';
import { NO_FOLDER_LABEL } from '../../../components/admin/FolderField';
import { formatNumber } from '../../../utils/format';

import styles from './MediaLibraryPage.module.css';

/**
 * The select's value for "No folder": a folder is filed without a slash at
 * either end, so no folder can be called this.
 */
const UNFILED = '/unfiled';

/** A count as the rail prints it, or nothing when the API did not send one. */
const countOf = (count) => (Number.isFinite(count) ? formatNumber(count) : '');

/**
 * The library's folders, always in view (prompt 51).
 *
 * The Folder filter used to be one select among four, offering only the
 * folders that already held something — which read as "folders are something
 * this screen does not make". Here they are the first thing beside the grid,
 * each with what it holds, "No folder" for the files in none, the folder just
 * made (dashed, until a file lands in it), and the two things an editor does
 * to folders: make one, and tidy them.
 *
 * A list at 1024 px and wider; a select below, where a column would squeeze
 * the grid to one tile.
 *
 * @param {object} props
 * @param {Array<{name: string, count: number|null}>} props.folders
 * @param {number|null} props.unfiled files in no folder
 * @param {string[]} [props.pending] folders made on this page, empty so far
 * @param {string} [props.folder] the folder on screen
 * @param {boolean} [props.unfiledOnly] "No folder" is on screen
 * @param {(choice: {folder?: string, unfiled?: boolean}) => void} props.onChange
 * @param {() => void} props.onNewFolder
 * @param {() => void} props.onManage
 * @param {boolean} [props.unusedOnly]
 * @param {(on: boolean) => void} props.onUnusedChange
 */
export default function FolderRail({
  folders = [],
  unfiled = null,
  pending = [],
  folder = '',
  unfiledOnly = false,
  onChange,
  onNewFolder,
  onManage,
  unusedOnly = false,
  onUnusedChange,
}) {
  const counted = folders.some((entry) => entry.count !== null);
  const total = counted
    ? folders.reduce((sum, entry) => sum + (entry.count ?? 0), 0) + (unfiled ?? 0)
    : null;
  const allSelected = !folder && !unfiledOnly;
  const showUnfiled = unfiledOnly || (unfiled ?? 0) > 0;

  const item = ({ key, label, count, selected, onPick, icon, dashed = false, note }) => (
    <li key={key}>
      <button
        type="button"
        className={[
          styles.railItem,
          selected ? styles.railItemSelected : '',
          dashed ? styles.railItemPending : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-pressed={selected}
        onClick={onPick}
      >
        <Icon icon={icon} width="18" height="18" aria-hidden="true" className={styles.railIcon} />
        <span className={styles.railName}>{label}</span>
        {note ? (
          <span className={styles.railNote}>{note}</span>
        ) : (
          <span className={styles.railCount}>{countOf(count)}</span>
        )}
      </button>
    </li>
  );

  const selectValue = unfiledOnly ? UNFILED : folder || '';

  return (
    <section className={styles.rail} aria-labelledby="media-folders-heading">
      <div className={styles.railHead}>
        <h2 className={styles.railTitle} id="media-folders-heading">
          Folders
        </h2>
        <span className={styles.railActions}>
          <Button
            variant="outline"
            size="sm"
            icon={<Icon icon="mdi:folder-plus-outline" width="16" height="16" />}
            onClick={onNewFolder}
          >
            New folder
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Icon icon="mdi:folder-edit-outline" width="16" height="16" />}
            disabled={folders.length === 0}
            title={folders.length === 0 ? 'No folder holds a file yet.' : undefined}
            onClick={onManage}
          >
            Manage
          </Button>
        </span>
      </div>

      <ul className={styles.railList}>
        {item({
          key: 'all',
          label: 'All files',
          count: total,
          selected: allSelected,
          icon: 'mdi:folder-multiple-outline',
          onPick: () => onChange?.({ folder: undefined, unfiled: undefined }),
        })}
        {folders.map((entry) =>
          item({
            key: `folder:${entry.name}`,
            label: entry.name,
            count: entry.count,
            selected: !unfiledOnly && folder === entry.name,
            icon: folder === entry.name ? 'mdi:folder-open-outline' : 'mdi:folder-outline',
            onPick: () => onChange?.({ folder: entry.name, unfiled: undefined }),
          })
        )}
        {pending.map((name) =>
          item({
            key: `pending:${name}`,
            label: name,
            selected: !unfiledOnly && folder === name,
            icon: 'mdi:folder-plus-outline',
            dashed: true,
            note: 'Empty',
            onPick: () => onChange?.({ folder: name, unfiled: undefined }),
          })
        )}
        {showUnfiled
          ? item({
              key: 'unfiled',
              label: NO_FOLDER_LABEL,
              count: unfiled,
              selected: unfiledOnly,
              icon: 'mdi:folder-off-outline',
              onPick: () => onChange?.({ folder: undefined, unfiled: true }),
            })
          : null}
      </ul>

      <div className={styles.railSelect}>
        <SelectField
          label="Folder"
          value={selectValue}
          placeholder={total === null ? 'All files' : `All files (${countOf(total)})`}
          options={[
            ...folders.map((entry) => ({
              value: entry.name,
              label: entry.count === null ? entry.name : `${entry.name} (${countOf(entry.count)})`,
            })),
            ...pending.map((name) => ({ value: name, label: `${name} (empty)` })),
            ...(showUnfiled
              ? [
                  {
                    value: UNFILED,
                    label:
                      unfiled === null
                        ? NO_FOLDER_LABEL
                        : `${NO_FOLDER_LABEL} (${countOf(unfiled)})`,
                  },
                ]
              : []),
          ]}
          onChange={(event) => {
            const next = event.target.value;
            if (next === UNFILED) onChange?.({ folder: undefined, unfiled: true });
            else onChange?.({ folder: next || undefined, unfiled: undefined });
          }}
        />
      </div>

      <p className={styles.railHint}>
        A folder appears here once a file is filed in it. A slash makes a folder inside a folder.
      </p>

      <label className={styles.railUnused}>
        <input
          type="checkbox"
          checked={unusedOnly}
          onChange={(event) => onUnusedChange?.(event.target.checked)}
        />
        <span>
          Only files nothing uses
          <span className={styles.railUnusedHint}>
            Nothing on the site shows them, so they can go without breaking a page.
          </span>
        </span>
      </label>
    </section>
  );
}
