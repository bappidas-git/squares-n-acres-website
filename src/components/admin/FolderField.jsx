import { useId, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import useListboxNavigation from '../../hooks/useListboxNavigation';
import { cleanFolder, cloudinaryFolder } from '../../pages/admin/media/useMediaUpload';

import styles from './FolderField.module.css';

/** What "no folder" is called where a field offers it. */
export const NO_FOLDER_LABEL = 'No folder';

/**
 * The folders a list can offer, as `{ name, count }` whatever shape arrived —
 * `meta.folders` answers objects since prompt 51, and a caller may still hold
 * plain names.
 *
 * @param {Array<string|{name: string, count?: number}>} folders
 * @returns {Array<{name: string, count: number|null}>}
 */
export const folderEntries = (folders = []) =>
  (Array.isArray(folders) ? folders : [])
    .map((entry) =>
      typeof entry === 'string'
        ? { name: entry, count: null }
        : { name: entry?.name ?? '', count: Number.isFinite(entry?.count) ? entry.count : null }
    )
    .filter((entry) => entry.name);

/**
 * The folder a file is filed under — a combobox that offers the folders the
 * library has, with their counts, and always offers to **create** the one being
 * typed (prompt 51).
 *
 * A folder in this library is a string on its files (D12): it exists once a file
 * is filed in it, and there is no "folders" table to add one to. The field used
 * to be a text box with a browser `datalist`, which reads as "pick an existing
 * folder" — so editors could not see how to make one. Here the choice is
 * explicit: `Create "campaigns/diwali"` is an option like any other, and the
 * hint shows the Cloudinary path the upload will use.
 *
 * Keyboard: the combobox pattern the admin uses everywhere
 * (`useListboxNavigation`) — arrows move, Enter picks, Escape closes.
 *
 * @param {object} props
 * @param {string|null} props.value the folder as typed, or `null` for no folder
 * @param {(folder: string|null) => void} props.onChange
 * @param {Array<string|{name: string, count?: number}>} [props.folders]
 * @param {string} [props.label]
 * @param {string} [props.hint] replaces the Cloudinary-path hint
 * @param {string} [props.error]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.allowNone] offers "No folder" (a move out of every folder)
 * @param {boolean} [props.showPath] prints `sna/<folder>` under the box
 * @param {string} [props.id]
 * @param {string} [props.placeholder]
 */
export default function FolderField({
  value,
  onChange,
  folders = [],
  label = 'Folder',
  hint,
  error,
  disabled = false,
  allowNone = false,
  showPath = true,
  id,
  placeholder = 'Choose or type a folder',
}) {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}-folder`;
  const listId = `${inputId}-options`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const [open, setOpen] = useState(false);
  const typed = value ?? '';
  const clean = cleanFolder(typed);
  const entries = useMemo(() => folderEntries(folders), [folders]);

  // What the list offers for what is typed: the matching folders, "Create"
  // when the cleaned name is new, and "No folder" where the caller allows it.
  const options = useMemo(() => {
    const needle = typed.trim().toLowerCase();
    const matching = entries
      .filter((entry) => !needle || entry.name.toLowerCase().includes(needle))
      .map((entry) => ({ kind: 'folder', name: entry.name, count: entry.count }));
    const exists = entries.some((entry) => entry.name === clean);
    return [
      ...(allowNone ? [{ kind: 'none', name: null }] : []),
      ...(clean && !exists ? [{ kind: 'create', name: clean }] : []),
      ...matching,
    ];
  }, [entries, typed, clean, allowNone]);

  const pick = (option) => {
    onChange?.(option.kind === 'none' ? null : option.name);
    setOpen(false);
  };

  const nav = useListboxNavigation({
    id: listId,
    options,
    open: open && options.length > 0,
    resetKey: typed,
    onPick: pick,
    onClose: () => setOpen(false),
    onOpen: () => setOpen(true),
  });

  const listShown = open && options.length > 0 && !disabled;
  const pathHint = clean
    ? `Filed in “${clean}” — Cloudinary stores it under ${cloudinaryFolder(clean)}.`
    : value === null
      ? 'Not in any folder.'
      : 'No folder: Cloudinary stores it under sna.';

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <div className={styles.anchor}>
        <div className={styles.box}>
          <Icon
            icon="mdi:folder-outline"
            width="18"
            height="18"
            className={styles.icon}
            aria-hidden="true"
          />
          <input
            id={inputId}
            type="text"
            role="combobox"
            className={styles.input}
            value={typed}
            placeholder={value === null ? NO_FOLDER_LABEL : placeholder}
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            maxLength={120}
            aria-expanded={listShown}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={listShown ? nav.activeDescendant : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : hint || showPath ? hintId : undefined}
            onChange={(event) => {
              onChange?.(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={nav.onKeyDown}
          />
        </div>

        {listShown ? (
          <ul className={styles.options} id={listId} role="listbox" aria-label={`${label} options`}>
            {options.map((option, index) => (
              <li
                key={`${option.kind}:${option.name ?? ''}`}
                id={nav.optionId(index)}
                role="option"
                aria-selected={
                  option.kind === 'none' ? value === null : option.name === clean && Boolean(clean)
                }
                className={[styles.option, index === nav.activeIndex ? styles.optionActive : '']
                  .filter(Boolean)
                  .join(' ')}
                // The list closes on blur; a press must not move the focus first.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => nav.setActiveIndex(index)}
                onClick={() => pick(option)}
              >
                {option.kind === 'create' ? (
                  <>
                    <Icon
                      icon="mdi:folder-plus-outline"
                      width="18"
                      height="18"
                      aria-hidden="true"
                    />
                    <span className={styles.optionName}>Create “{option.name}”</span>
                  </>
                ) : option.kind === 'none' ? (
                  <>
                    <Icon icon="mdi:folder-off-outline" width="18" height="18" aria-hidden="true" />
                    <span className={styles.optionName}>{NO_FOLDER_LABEL}</span>
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:folder-outline" width="18" height="18" aria-hidden="true" />
                    <span className={styles.optionName}>{option.name}</span>
                    {option.count !== null ? (
                      <span className={styles.optionCount}>
                        {option.count} {option.count === 1 ? 'file' : 'files'}
                      </span>
                    ) : null}
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? (
        <span className={styles.error} id={errorId} role="alert">
          {error}
        </span>
      ) : hint || showPath ? (
        <span className={styles.hint} id={hintId}>
          {hint ?? pathHint}
        </span>
      ) : null}
    </div>
  );
}
