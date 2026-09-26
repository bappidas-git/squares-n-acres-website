import { Icon } from '@iconify/react';

import EmptyState from '../../../components/ui/EmptyState';
import ErrorState from '../../../components/ui/ErrorState';
import MediaCard from './MediaCard';
import Skeleton from '../../../components/ui/Skeleton';

import styles from './MediaLibraryPage.module.css';

/** How many placeholder tiles a first load shows. */
const SKELETON_COUNT = 12;

/**
 * The distinct folders among a page of files, for the filter and the datalist.
 *
 * It lives beside the grid rather than beside the library page because the
 * picker needs it too, and the picker must not import the page — the page is
 * a route chunk of its own.
 *
 * @param {object[]} items
 * @returns {string[]} sorted, no blanks
 */
export const foldersOf = (items = []) =>
  [...new Set(items.map((item) => item.folder).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  );

/**
 * The folders a screen offers: every folder in the library, as the list's
 * `meta.folders` names them, plus the one being filtered on (QA-63) — each as
 * `{ name, count }`, the count `null` where it is not known.
 *
 * They used to be the folders of the page on screen — two of the eleven on the
 * first page, and once a folder was chosen, that folder alone, so moving to
 * another one meant resetting the filter first. An API that does not send
 * `meta.folders` still gets the old answer rather than none, and one that
 * sends plain names (before prompt 51) gets its folders without counts: the
 * shape changed in lock-step with the mock, and this reads both.
 *
 * @param {object|null} meta the list's `meta`
 * @param {object[]} items the page on screen, the fallback
 * @param {string} [selected] the folder filter's value, always offered
 * @returns {Array<{name: string, count: number|null}>}
 */
export function libraryFolders(meta, items = [], selected = '') {
  const listed = Array.isArray(meta?.folders)
    ? meta.folders
        .map((entry) =>
          typeof entry === 'string'
            ? { name: entry, count: null }
            : {
                name: typeof entry?.name === 'string' ? entry.name : '',
                count: Number.isFinite(entry?.count) ? entry.count : null,
              }
        )
        .filter((entry) => entry.name !== '')
    : foldersOf(items).map((name) => ({ name, count: null }));
  if (!selected || listed.some((entry) => entry.name === selected)) return listed;
  // The folder on screen holds nothing the other filters let through — or it
  // is one just made and not filed into yet.
  const counted = listed.some((entry) => entry.count !== null);
  return [...listed, { name: selected, count: counted ? 0 : null }].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}

/**
 * How many files sit in no folder, as `meta.unfiled` says — `null` from an API
 * that does not count them.
 *
 * @param {object|null} meta
 * @returns {number|null}
 */
export const libraryUnfiled = (meta) => (Number.isFinite(meta?.unfiled) ? meta.unfiled : null);

/**
 * A folder as a select option: "properties (284)", or the bare name when its
 * count is not known.
 *
 * @param {{name: string, count: number|null}} entry
 * @returns {{value: string, label: string}}
 */
export const folderOption = (entry) => ({
  value: entry.name,
  label: entry.count === null ? entry.name : `${entry.name} (${entry.count})`,
});

/**
 * The grid of files — six columns on a desktop, four on a tablet, two on a
 * phone (§6), with square thumbnails so a row never goes ragged.
 *
 * It owns the four states every data view in the product owns (§8.2): the
 * skeleton that matches this exact layout, the error with a retry, the empty
 * state its caller words (a filtered library says something different from an
 * empty one), and the grid itself.
 *
 * A failed request shows its error whatever was on screen before (QA-63). The
 * last answer's tiles used to stay under the new filter — twenty-four
 * photographs under "Type: Document", page one's files under "page 2" — with
 * nothing to say the request had failed. A request on its way dims the grid
 * it is about to replace.
 *
 * @param {object} props
 * @param {object[]} props.items
 * @param {boolean} [props.loading] the first answer is on its way
 * @param {boolean} [props.refreshing] a later answer is on its way
 * @param {object} [props.error]
 * @param {() => void} [props.onRetry]
 * @param {{title: string, text?: string, action?: React.ReactNode}} [props.emptyState]
 * @param {(item: object, event: React.MouseEvent) => void} props.onOpen the
 *   event says whether Shift was held — a range, in the library's select mode
 * @param {(item: object) => void} [props.onCopy]
 * @param {Array<string|number>} [props.selectedIds] in selection order
 * @param {boolean} [props.selectable]
 * @param {boolean} [props.checkboxes] every tile shows its box, ticked or not —
 *   the library's select mode (prompt 51); the picker shows only the ticks
 * @param {string} props.label the accessible name of the list
 * @param {Array<string>} [props.unavailableUrls] files the caller's field already
 *   holds, badged `unavailableLabel` and not selectable
 * @param {string} [props.unavailableLabel]
 * @param {string} [props.className] added to the grid — the library narrows it
 *   beside its folder rail
 */
export default function MediaGrid({
  items = [],
  loading = false,
  refreshing = false,
  error = null,
  onRetry,
  emptyState,
  onOpen,
  onCopy,
  selectedIds = [],
  selectable = false,
  checkboxes = false,
  label = 'Media library',
  unavailableUrls = [],
  unavailableLabel = 'Already added',
  className = '',
}) {
  if (error) {
    return (
      <ErrorState
        title="The library could not be loaded"
        text="Nothing is lost — the files are still there. Try again."
        onRetry={onRetry}
      />
    );
  }

  const busy = loading || refreshing;

  if (busy && items.length === 0) {
    return (
      <ul
        className={[styles.grid, className].filter(Boolean).join(' ')}
        aria-busy="true"
        aria-label={`${label}, loading`}
      >
        {Array.from({ length: SKELETON_COUNT }, (_unused, index) => (
          <li key={index} className={styles.cardItem}>
            <span className={styles.skeletonCard}>
              <Skeleton variant="rounded" className={styles.skeletonThumb} />
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="50%" />
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Icon icon="mdi:image-multiple-outline" width="32" height="32" aria-hidden="true" />}
        title={emptyState?.title ?? 'Nothing here yet'}
        text={emptyState?.text}
        action={emptyState?.action}
      />
    );
  }

  const order = new Map(selectedIds.map((id, index) => [String(id), index + 1]));
  const held = new Set(unavailableUrls);

  return (
    <ul
      className={[styles.grid, className, busy ? styles.gridStale : ''].filter(Boolean).join(' ')}
      aria-label={label}
      aria-busy={busy || undefined}
    >
      {items.map((item) => (
        <MediaCard
          key={item.id}
          item={item}
          selectable={selectable}
          checkbox={checkboxes}
          selected={order.has(String(item.id))}
          selectionIndex={selectedIds.length > 1 ? order.get(String(item.id)) : undefined}
          onOpen={onOpen}
          onCopy={onCopy}
          unavailable={held.has(item.url) ? unavailableLabel : ''}
        />
      ))}
    </ul>
  );
}
