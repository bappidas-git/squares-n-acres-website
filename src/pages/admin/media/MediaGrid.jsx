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
 * The grid of files — six columns on a desktop, four on a tablet, two on a
 * phone (§6), with square thumbnails so a row never goes ragged.
 *
 * It owns the four states every data view in the product owns (§8.2): the
 * skeleton that matches this exact layout, the error with a retry, the empty
 * state its caller words (a filtered library says something different from an
 * empty one), and the grid itself.
 *
 * @param {object} props
 * @param {object[]} props.items
 * @param {boolean} [props.loading]
 * @param {object} [props.error]
 * @param {() => void} [props.onRetry]
 * @param {{title: string, text?: string, action?: React.ReactNode}} [props.emptyState]
 * @param {(item: object) => void} props.onOpen
 * @param {(item: object) => void} [props.onCopy]
 * @param {Array<string|number>} [props.selectedIds] in selection order
 * @param {boolean} [props.selectable]
 * @param {string} props.label the accessible name of the list
 */
export default function MediaGrid({
  items = [],
  loading = false,
  error = null,
  onRetry,
  emptyState,
  onOpen,
  onCopy,
  selectedIds = [],
  selectable = false,
  label = 'Media library',
}) {
  if (error && items.length === 0) {
    return (
      <ErrorState
        title="The library could not be loaded"
        text="Nothing is lost — the files are still there. Try again."
        onRetry={onRetry}
      />
    );
  }

  if (loading && items.length === 0) {
    return (
      <ul className={styles.grid} aria-busy="true" aria-label={`${label}, loading`}>
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

  return (
    <ul
      className={[styles.grid, loading ? styles.gridStale : ''].filter(Boolean).join(' ')}
      aria-label={label}
      aria-busy={loading || undefined}
    >
      {items.map((item) => (
        <MediaCard
          key={item.id}
          item={item}
          selectable={selectable}
          selected={order.has(String(item.id))}
          selectionIndex={selectedIds.length > 1 ? order.get(String(item.id)) : undefined}
          onOpen={onOpen}
          onCopy={onCopy}
        />
      ))}
    </ul>
  );
}
