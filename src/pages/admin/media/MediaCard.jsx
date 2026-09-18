import { memo } from 'react';
import { Icon } from '@iconify/react';

import LazyImage from '../../../components/ui/LazyImage';
import { cloudinaryUrl } from '../../../utils/cloudinary';
import { formatBytes } from './useMediaUpload';

import styles from './MediaLibraryPage.module.css';

/** The mark a file that cannot be shown as a picture gets instead. */
const TYPE_ICONS = {
  image: 'mdi:image-outline',
  video: 'mdi:play-box-outline',
  document: 'mdi:file-document-outline',
};

/** What the card prints under the name: the shape and the weight, when known. */
export function describeSize(item) {
  const parts = [];
  if (item.width && item.height) parts.push(`${item.width} × ${item.height}`);
  const bytes = formatBytes(item.bytes);
  if (bytes) parts.push(bytes);
  if (item.format) parts.push(String(item.format).toUpperCase());
  return parts.join(' · ');
}

/**
 * One file in the library grid.
 *
 * A picture is its own thumbnail — 320px through Cloudinary where that is
 * possible, the original where it is not — and a PDF or a video is its icon,
 * because a first frame is not something this API can produce.
 *
 * The tile is one button: pressing it opens the file in the drawer, or selects
 * it in the picker. "Copy URL" is a second button beside it rather than inside
 * it, because a button inside a button is neither valid nor reachable by
 * keyboard — and copying an address is the one thing an editor does to a file
 * without wanting to look at it.
 *
 * @param {object} props
 * @param {object} props.item a `media` record
 * @param {boolean} [props.selectable] renders the selection state
 * @param {boolean} [props.selected]
 * @param {number} [props.selectionIndex] 1-based; shown in the ring when multiple
 * @param {(item: object) => void} props.onOpen
 * @param {(item: object) => void} [props.onCopy]
 */
function MediaCard({ item, selectable = false, selected = false, selectionIndex, onOpen, onCopy }) {
  const usedIn = Array.isArray(item.usedIn) ? item.usedIn.length : null;
  const name = item.title || item.alt || item.url;
  const size = describeSize(item);
  const isImage = item.type === 'image';

  return (
    <li className={styles.cardItem}>
      <button
        type="button"
        className={[styles.card, selected ? styles.cardSelected : ''].filter(Boolean).join(' ')}
        aria-pressed={selectable ? selected : undefined}
        onClick={() => onOpen?.(item)}
      >
        <span className={styles.thumb}>
          {isImage ? (
            <LazyImage
              src={cloudinaryUrl(item.url, { w: 320, merge: true })}
              alt=""
              ratio="1"
              sizes="(max-width: 599px) 50vw, (max-width: 1199px) 25vw, 16vw"
            />
          ) : (
            <span className={styles.thumbIcon}>
              <Icon
                icon={TYPE_ICONS[item.type] ?? TYPE_ICONS.document}
                width="32"
                height="32"
                aria-hidden="true"
              />
              <span className={styles.thumbFormat}>
                {String(item.format || item.type).toUpperCase()}
              </span>
            </span>
          )}

          {selectable && selected ? (
            <span className={styles.tick} aria-hidden="true">
              {selectionIndex ?? <Icon icon="mdi:check" width="16" height="16" />}
            </span>
          ) : null}
        </span>

        <span className={styles.cardBody}>
          <span className={styles.cardName} title={name}>
            {name}
          </span>
          {size ? <span className={styles.cardMeta}>{size}</span> : null}
          {usedIn !== null ? (
            <span
              className={[styles.usedBadge, usedIn === 0 ? styles.usedBadgeIdle : '']
                .filter(Boolean)
                .join(' ')}
            >
              {usedIn === 0 ? 'Not used yet' : `Used in ${usedIn}`}
            </span>
          ) : null}
        </span>
      </button>

      {onCopy ? (
        <button
          type="button"
          className={styles.copy}
          aria-label={`Copy the address of ${name}`}
          onClick={() => onCopy(item)}
        >
          <Icon icon="mdi:link-variant" width="16" height="16" aria-hidden="true" />
        </button>
      ) : null}
    </li>
  );
}

export default memo(MediaCard);
